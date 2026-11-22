import 'dotenv/config';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { and, count, desc, eq, or } from 'drizzle-orm';
import { Server as SocketIOServer } from 'socket.io';
import swaggerUi from 'swagger-ui-express';
import { z } from 'zod';
import { db, ensureDatabaseTables, sqlClient } from './src/db/index.ts';
import { apiKeys, users } from './src/db/schema.ts';
import type { AuthenticatedRequest } from './server/auth.ts';
import {
  clearSessionCookie,
  generateIngestApiKey,
  hashPassword,
  requireIngestApiKey,
  requireUserAuth,
  setSessionCookie,
  signUserToken,
  verifyPassword,
  verifyUserToken,
} from './server/auth.ts';
import {
  applyEquipmentIngest,
  applyNotificationsIngest,
  applyTasksIngest,
  applyTelemetryIngest,
  batchIngestSchema,
  equipmentItemIngestSchema,
  getDashboardState,
  notificationIngestSchema,
  taskIngestSchema,
  telemetryIngestSchema,
} from './server/dashboardService.ts';
import { buildOpenApiSpec } from './server/swagger.ts';
import type { DashboardPeriod } from './src/types/dashboard.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);

const registerSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3)
    .max(32)
    .regex(/^[a-zA-Z0-9_.-]+$/, 'Username may contain letters, numbers, _, ., -'),
  email: z.string().trim().email().max(120),
  password: z.string().min(6).max(128),
});

const loginSchema = z.object({
  identifier: z.string().trim().min(1).max(120),
  password: z.string().min(1).max(128),
});

const createKeySchema = z.object({
  name: z.string().trim().min(2).max(64),
});

async function startServer() {
  await ensureDatabaseTables();

  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });
  app.use(express.json({ limit: '2mb' }));

  // Lightweight in-memory rate limiter for auth endpoints (25 req/min per IP)
  const authRateMap = new Map<string, { count: number; resetAt: number }>();
  const authRateLimiter: express.RequestHandler = (req, res, next) => {
    const ip = req.ip || 'unknown';
    const now = Date.now();
    if (authRateMap.size > 2000) {
      for (const [k, v] of authRateMap) {
        if (v.resetAt <= now) authRateMap.delete(k);
      }
    }
    const entry = authRateMap.get(ip);
    if (!entry || entry.resetAt <= now) {
      authRateMap.set(ip, { count: 1, resetAt: now + 60_000 });
      next();
      return;
    }
    entry.count += 1;
    if (entry.count > 25) {
      res.status(429).json({
        error: 'Too Many Requests',
        message: 'Too many authentication attempts. Please wait a minute and try again.',
      });
      return;
    }
    next();
  };

  const httpServer = http.createServer(app);

  const io = new SocketIOServer(httpServer, {
    path: '/socket.io',
    transports: ['websocket', 'polling'],
  });

  // Authenticate every WebSocket client using User Bearer JWT
  io.use((socket, next) => {
    const token =
      typeof socket.handshake.auth?.token === 'string'
        ? socket.handshake.auth.token
        : '';
    if (!token) {
      next(new Error('Authentication token required'));
      return;
    }
    const user = verifyUserToken(token);
    if (!user) {
      next(new Error('Invalid or expired session token'));
      return;
    }
    socket.data.user = user;
    next();
  });

  io.on('connection', async (socket) => {
    const rawPeriod = socket.handshake.query?.period;
    const period: DashboardPeriod =
      rawPeriod === '7d' || rawPeriod === 'month' ? rawPeriod : 'today';
    try {
      const state = await getDashboardState(period);
      socket.emit('dashboard:init', state);
    } catch (err) {
      console.error('[Socket.IO] Failed to load initial state:', err);
    }

    socket.on('dashboard:subscribe', async (requestedPeriod: unknown) => {
      const p: DashboardPeriod =
        requestedPeriod === '7d' || requestedPeriod === 'month'
          ? requestedPeriod
          : 'today';
      try {
        const state = await getDashboardState(p);
        socket.emit('dashboard:init', state);
      } catch (err) {
        console.error('[Socket.IO] Failed to switch period:', err);
      }
    });
  });

  async function broadcastDashboardUpdate(period: DashboardPeriod = 'today') {
    try {
      const state = await getDashboardState(period);
      io.emit('dashboard:updated', state);
    } catch (err) {
      console.error('[Socket.IO] Broadcast error:', err);
    }
  }

  // Health Check (verifies live PostgreSQL connectivity)
  app.get('/api/health', async (_req, res) => {
    try {
      await sqlClient`SELECT 1`;
      res.json({
        ok: true,
        database: 'connected',
        service: 'smart-factory-digital-twin',
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.error('[Health] Database probe failed:', err);
      res.status(503).json({
        ok: false,
        database: 'disconnected',
        service: 'smart-factory-digital-twin',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Swagger OpenAPI JSON & Interactive UI
  app.get('/api/docs/openapi.json', (req, res) => {
    const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const host = req.headers['x-forwarded-host'] || req.headers.host || `localhost:${PORT}`;
    res.json(buildOpenApiSpec(`${proto}://${host}`));
  });
  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(undefined, {
      swaggerOptions: {
        url: '/api/docs/openapi.json',
        persistAuthorization: true,
      },
      customSiteTitle: 'Smart Factory Digital Twin — API Docs',
    }),
  );

  // =========================================================================
  // APP AUTH ROUTES (User-based Login / Registration)
  // =========================================================================

  app.get('/api/auth/status', async (_req, res) => {
    try {
      const [row] = await db.select({ total: count() }).from(users);
      res.json({ hasUsers: Number(row?.total ?? 0) > 0 });
    } catch (err) {
      console.error('[AuthStatus] Error:', err);
      res.status(500).json({ error: 'Database unavailable' });
    }
  });

  app.post('/api/auth/register', authRateLimiter, async (req, res) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
      return;
    }

    const { username, email, password } = parsed.data;
    const normalizedEmail = email.toLowerCase();

    try {
      const existing = await db
        .select({ id: users.id })
        .from(users)
        .where(or(eq(users.email, normalizedEmail), eq(users.username, username)))
        .limit(1);

      if (existing.length > 0) {
        res.status(409).json({ error: 'Username or email is already registered' });
        return;
      }

      const [userCountRow] = await db.select({ total: count() }).from(users);
      const role = Number(userCountRow?.total ?? 0) === 0 ? 'admin' : 'operator';

      const [created] = await db
        .insert(users)
        .values({
          username,
          email: normalizedEmail,
          passwordHash: hashPassword(password),
          role,
        })
        .returning({
          id: users.id,
          username: users.username,
          email: users.email,
          role: users.role,
        });

      const token = signUserToken(created);
      setSessionCookie(req, res, token);
      res.status(201).json({ token, user: created });
    } catch (err) {
      console.error('[Register] Error:', err);
      res.status(500).json({ error: 'Failed to register user' });
    }
  });

  app.post('/api/auth/login', authRateLimiter, async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
      return;
    }

    const { identifier, password } = parsed.data;
    const normalized = identifier.toLowerCase();

    try {
      const [found] = await db
        .select()
        .from(users)
        .where(or(eq(users.email, normalized), eq(users.username, identifier)))
        .limit(1);

      if (!found || !verifyPassword(password, found.passwordHash)) {
        res.status(401).json({ error: 'Invalid username/email or password' });
        return;
      }

      const userPayload = {
        id: found.id,
        username: found.username,
        email: found.email,
        role: found.role,
      };
      const token = signUserToken(userPayload);
      setSessionCookie(req, res, token);
      res.json({ token, user: userPayload });
    } catch (err) {
      console.error('[Login] Error:', err);
      res.status(500).json({ error: 'Failed to authenticate user' });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    clearSessionCookie(req, res);
    res.json({ ok: true });
  });

  app.get('/api/auth/me', requireUserAuth, (req: AuthenticatedRequest, res) => {
    const userPayload = {
      id: req.user!.sub,
      username: req.user!.username,
      email: req.user!.email,
      role: req.user!.role,
    };
    const token = signUserToken(userPayload);
    res.json({ user: userPayload, token });
  });

  // =========================================================================
  // API KEY MANAGEMENT (Protected by User Session Auth)
  // =========================================================================

  app.get('/api/keys', requireUserAuth, async (_req: AuthenticatedRequest, res) => {
    try {
      const rows = await db
        .select({
          id: apiKeys.id,
          name: apiKeys.name,
          keyPrefix: apiKeys.keyPrefix,
          isActive: apiKeys.isActive,
          lastUsedAt: apiKeys.lastUsedAt,
          createdAt: apiKeys.createdAt,
        })
        .from(apiKeys)
        .orderBy(desc(apiKeys.createdAt));

      res.json({
        keys: rows.map((k) => ({
          ...k,
          lastUsedAt: k.lastUsedAt ? k.lastUsedAt.toISOString() : null,
          createdAt: k.createdAt.toISOString(),
        })),
      });
    } catch (err) {
      console.error('[ListKeys] Error:', err);
      res.status(500).json({ error: 'Failed to fetch API keys' });
    }
  });

  app.post('/api/keys', requireUserAuth, async (req: AuthenticatedRequest, res) => {
    const parsed = createKeySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
      return;
    }

    try {
      const { rawKey, prefix, hash } = generateIngestApiKey();
      const [created] = await db
        .insert(apiKeys)
        .values({
          name: parsed.data.name,
          keyPrefix: prefix,
          keyHash: hash,
          isActive: true,
          createdByUserId: req.user!.sub,
        })
        .returning({
          id: apiKeys.id,
          name: apiKeys.name,
          keyPrefix: apiKeys.keyPrefix,
          isActive: apiKeys.isActive,
          createdAt: apiKeys.createdAt,
        });

      res.status(201).json({
        key: {
          ...created,
          lastUsedAt: null,
          createdAt: created.createdAt.toISOString(),
        },
        rawKey,
      });
    } catch (err) {
      console.error('[CreateKey] Error:', err);
      res.status(500).json({ error: 'Failed to create ingest API key' });
    }
  });

  app.delete('/api/keys/:id', requireUserAuth, async (req: AuthenticatedRequest, res) => {
    const keyId = Number(req.params.id);
    if (!Number.isInteger(keyId) || keyId <= 0) {
      res.status(400).json({ error: 'Invalid key ID' });
      return;
    }

    try {
      const condition =
        req.user!.role === 'admin'
          ? eq(apiKeys.id, keyId)
          : and(eq(apiKeys.id, keyId), eq(apiKeys.createdByUserId, req.user!.sub));

      const [updated] = await db
        .update(apiKeys)
        .set({ isActive: false })
        .where(condition)
        .returning({ id: apiKeys.id });

      if (!updated) {
        res.status(404).json({ error: 'API key not found or access denied' });
        return;
      }
      res.json({ ok: true, id: updated.id });
    } catch (err) {
      console.error('[RevokeKey] Error:', err);
      res.status(500).json({ error: 'Failed to revoke API key' });
    }
  });

  // =========================================================================
  // DASHBOARD READ ROUTES (Protected by User Session Auth)
  // =========================================================================

  app.get('/api/dashboard/state', requireUserAuth, async (req, res) => {
    const rawRange = req.query.range;
    const period: DashboardPeriod =
      rawRange === '7d' || rawRange === 'month' ? rawRange : 'today';

    try {
      const state = await getDashboardState(period);
      res.json(state);
    } catch (err) {
      console.error('[DashboardState] Error:', err);
      res.status(500).json({ error: 'Failed to load dashboard state' });
    }
  });

  // =========================================================================
  // EXTERNAL INGEST API ROUTES (Protected strictly by X-API-Key)
  // =========================================================================

  app.post('/api/ingest/batch', requireIngestApiKey, async (req, res) => {
    const parsed = batchIngestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid ingest batch payload', details: parsed.error.flatten() });
      return;
    }

    const data = parsed.data;
    const period: DashboardPeriod = data.period;

    try {
      if (data.kpi || data.orderTrends || data.errorTrends || data.equipmentLiveStatus) {
        await applyTelemetryIngest(period, {
          kpi: data.kpi,
          orderTrends: data.orderTrends,
          errorTrends: data.errorTrends,
          equipmentLiveStatus: data.equipmentLiveStatus,
        });
      }
      if (data.equipment && data.equipment.length > 0) {
        await applyEquipmentIngest(data.equipment);
      }
      if (data.tasks && data.tasks.length > 0) {
        await applyTasksIngest(data.tasks, Boolean(data.replaceTasks));
      }
      if (data.notifications && data.notifications.length > 0) {
        await applyNotificationsIngest(data.notifications, Boolean(data.replaceNotifications));
      }

      await broadcastDashboardUpdate(period);
      res.json({ ok: true, period, broadcasted: true });
    } catch (err) {
      console.error('[IngestBatch] Error:', err);
      res.status(500).json({ error: 'Failed to ingest batch telemetry' });
    }
  });

  app.post('/api/ingest/telemetry', requireIngestApiKey, async (req, res) => {
    const parsed = telemetryIngestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid telemetry payload', details: parsed.error.flatten() });
      return;
    }

    const period: DashboardPeriod = parsed.data.kpi?.period ?? 'today';
    try {
      await applyTelemetryIngest(period, parsed.data);
      await broadcastDashboardUpdate(period);
      res.json({ ok: true, period, broadcasted: true });
    } catch (err) {
      console.error('[IngestTelemetry] Error:', err);
      res.status(500).json({ error: 'Failed to ingest telemetry' });
    }
  });

  app.post('/api/ingest/equipment', requireIngestApiKey, async (req, res) => {
    const schema = z.object({
      items: z.array(equipmentItemIngestSchema).min(1),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid equipment payload', details: parsed.error.flatten() });
      return;
    }

    try {
      await applyEquipmentIngest(parsed.data.items);
      const state = await getDashboardState('today');
      io.emit('equipment:updated', state.equipmentItems);
      io.emit('dashboard:updated', state);
      res.json({ ok: true, count: parsed.data.items.length, broadcasted: true });
    } catch (err) {
      console.error('[IngestEquipment] Error:', err);
      res.status(500).json({ error: 'Failed to ingest equipment' });
    }
  });

  app.post('/api/ingest/tasks', requireIngestApiKey, async (req, res) => {
    const schema = z.object({
      replaceAll: z.boolean().optional(),
      tasks: z.array(taskIngestSchema).min(1),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid tasks payload', details: parsed.error.flatten() });
      return;
    }

    try {
      await applyTasksIngest(parsed.data.tasks, Boolean(parsed.data.replaceAll));
      const state = await getDashboardState('today');
      io.emit('tasks:updated', state.tasks);
      io.emit('dashboard:updated', state);
      res.json({ ok: true, count: parsed.data.tasks.length, broadcasted: true });
    } catch (err) {
      console.error('[IngestTasks] Error:', err);
      res.status(500).json({ error: 'Failed to ingest tasks' });
    }
  });

  app.post('/api/ingest/notifications', requireIngestApiKey, async (req, res) => {
    const schema = z.object({
      replaceAll: z.boolean().optional(),
      notifications: z.array(notificationIngestSchema).min(1),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid notifications payload',
        details: parsed.error.flatten(),
      });
      return;
    }

    try {
      await applyNotificationsIngest(
        parsed.data.notifications,
        Boolean(parsed.data.replaceAll),
      );
      const state = await getDashboardState('today');
      io.emit('notifications:created', state.notifications);
      io.emit('dashboard:updated', state);
      res.json({ ok: true, count: parsed.data.notifications.length, broadcasted: true });
    } catch (err) {
      console.error('[IngestNotifications] Error:', err);
      res.status(500).json({ error: 'Failed to ingest notifications' });
    }
  });

  // Return JSON 404 for unknown API paths instead of falling through to SPA HTML
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'API endpoint not found' });
  });

  // Global JSON error middleware (e.g., malformed JSON body)
  app.use(
    (
      err: Error & { status?: number; type?: string },
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      if (err.type === 'entity.parse.failed') {
        res.status(400).json({ error: 'Malformed JSON request body' });
        return;
      }
      console.error('[Express] Unhandled error:', err);
      res.status(err.status || 500).json({ error: 'Internal Server Error' });
    },
  );

  // =========================================================================
  // VITE / STATIC CLIENT SERVING
  // =========================================================================

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath, { maxAge: '1d', index: false }));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Smart Factory Digital Twin listening on http://0.0.0.0:${PORT}`);
    console.log(`[Swagger] API Docs available at http://0.0.0.0:${PORT}/api/docs`);
  });

  const shutdown = async (signal: string) => {
    console.log(`[Server] Received ${signal}, shutting down gracefully...`);
    io.close();
    httpServer.close(async () => {
      await sqlClient.end({ timeout: 5 });
      process.exit(0);
    });
  };
  process.once('SIGTERM', () => void shutdown('SIGTERM'));
  process.once('SIGINT', () => void shutdown('SIGINT'));
}

startServer().catch((err) => {
  console.error('[Server] Fatal startup failure:', err);
  process.exit(1);
});
