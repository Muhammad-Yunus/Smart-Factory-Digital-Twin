import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../src/db/index.ts';
import { apiKeys } from '../src/db/schema.ts';

if (
  process.env.NODE_ENV === 'production' &&
  (!process.env.AUTH_TOKEN_SECRET || process.env.AUTH_TOKEN_SECRET.length < 16)
) {
  console.warn(
    '[Auth] AUTH_TOKEN_SECRET is not set in production; using ephemeral runtime key (sessions reset on restart).',
  );
}

const RUNTIME_TOKEN_SECRET =
  process.env.AUTH_TOKEN_SECRET && process.env.AUTH_TOKEN_SECRET.length >= 16
    ? process.env.AUTH_TOKEN_SECRET
    : crypto.randomBytes(32).toString('hex');

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days
export const SESSION_COOKIE_NAME = 'sf_session';

export function parseCookieHeader(
  cookieHeader: string | undefined,
  name: string,
): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    if (key === name) {
      return decodeURIComponent(part.slice(idx + 1).trim());
    }
  }
  return null;
}

export function setSessionCookie(req: Request, res: Response, token: string): void {
  const forwardedProto = String(req.headers['x-forwarded-proto'] || '')
    .split(',')[0]
    .trim();
  const isHttps = req.secure || forwardedProto === 'https';
  const attrs = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    `Max-Age=${TOKEN_TTL_SECONDS}`,
    'HttpOnly',
    isHttps ? 'SameSite=None' : 'SameSite=Lax',
  ];
  if (isHttps) {
    attrs.push('Secure', 'Partitioned');
  }
  res.setHeader('Set-Cookie', attrs.join('; '));
}

export function clearSessionCookie(req: Request, res: Response): void {
  const forwardedProto = String(req.headers['x-forwarded-proto'] || '')
    .split(',')[0]
    .trim();
  const isHttps = req.secure || forwardedProto === 'https';
  const attrs = [
    `${SESSION_COOKIE_NAME}=`,
    'Path=/',
    'Max-Age=0',
    'HttpOnly',
    isHttps ? 'SameSite=None' : 'SameSite=Lax',
  ];
  if (isHttps) {
    attrs.push('Secure', 'Partitioned');
  }
  res.setHeader('Set-Cookie', attrs.join('; '));
}

export interface UserTokenPayload {
  sub: number;
  username: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

export interface AuthenticatedRequest extends Request {
  user?: UserTokenPayload;
  ingestKeyId?: number;
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  if (!salt || !keyHex) return false;
  const expectedBuf = Buffer.from(keyHex, 'hex');
  const actualBuf = crypto.scryptSync(password, salt, 64);
  if (expectedBuf.length !== actualBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}

function base64UrlEncode(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}

function base64UrlDecode(input: string): string {
  const padded = input.replaceAll('-', '+').replaceAll('_', '/');
  const padLen = (4 - (padded.length % 4)) % 4;
  return Buffer.from(padded + '='.repeat(padLen), 'base64').toString('utf8');
}

export function signUserToken(user: {
  id: number;
  username: string;
  email: string;
  role: string;
}): string {
  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payloadObj: UserTokenPayload = {
    sub: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    iat: now,
    exp: now + TOKEN_TTL_SECONDS,
  };
  const payload = base64UrlEncode(JSON.stringify(payloadObj));
  const data = `${header}.${payload}`;
  const sig = base64UrlEncode(
    crypto.createHmac('sha256', RUNTIME_TOKEN_SECRET).update(data).digest(),
  );
  return `${data}.${sig}`;
}

export function verifyUserToken(token: string): UserTokenPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, payload, sig] = parts;
    if (!header || !payload || !sig) return null;
    const data = `${header}.${payload}`;
    const expectedSig = base64UrlEncode(
      crypto.createHmac('sha256', RUNTIME_TOKEN_SECRET).update(data).digest(),
    );
    const sigBuf = Buffer.from(sig);
    const expectedBuf = Buffer.from(expectedSig);
    if (
      sigBuf.length !== expectedBuf.length ||
      !crypto.timingSafeEqual(sigBuf, expectedBuf)
    ) {
      return null;
    }
    const decoded = JSON.parse(base64UrlDecode(payload)) as UserTokenPayload;
    if (!decoded.exp || decoded.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

export function generateIngestApiKey(): {
  rawKey: string;
  prefix: string;
  hash: string;
} {
  const secretPart = crypto.randomBytes(24).toString('hex');
  const rawKey = `sf_live_${secretPart}`;
  const prefix = `${rawKey.slice(0, 14)}...`;
  const hash = hashApiKey(rawKey);
  return { rawKey, prefix, hash };
}

export function hashApiKey(rawKey: string): string {
  return crypto.createHash('sha256').update(rawKey).digest('hex');
}

export function requireUserAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers.authorization;
  let token = '';
  let fromCookie = false;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice('Bearer '.length).trim();
  } else {
    const cookieToken = parseCookieHeader(req.headers.cookie, SESSION_COOKIE_NAME);
    if (cookieToken) {
      token = cookieToken;
      fromCookie = true;
    }
  }

  if (!token) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'User session required. Please sign in to the application.',
    });
    return;
  }

  // CSRF defense for cookie-authenticated state-changing requests
  if (fromCookie && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const origin = req.headers.origin;
    const expectedHost = (req.headers['x-forwarded-host'] || req.headers.host || '') as string;
    const hasCustomHeader = Boolean(req.headers['x-requested-with']);
    let originMatches = false;
    if (origin && expectedHost) {
      try {
        originMatches = new URL(origin).host === expectedHost;
      } catch {
        originMatches = false;
      }
    }
    if (!originMatches && !hasCustomHeader) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'CSRF check failed for cookie-authenticated mutation.',
      });
      return;
    }
  }

  const payload = verifyUserToken(token);
  if (!payload) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Session token is invalid or expired.',
    });
    return;
  }

  req.user = payload;
  next();
}

export async function requireIngestApiKey(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  // Explicitly reject User Bearer tokens on ingest endpoints to enforce auth separation
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    res.status(403).json({
      error: 'Forbidden',
      message:
        'Ingest endpoints require an X-API-Key credential. User Bearer tokens are not accepted here.',
    });
    return;
  }

  let providedKey = req.header('x-api-key')?.trim();
  if (!providedKey && authHeader?.startsWith('ApiKey ')) {
    providedKey = authHeader.slice('ApiKey '.length).trim();
  }

  if (!providedKey) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing X-API-Key header for external ingest.',
    });
    return;
  }

  // Check optional environment-configured static ingest key
  const envKey = process.env.INGEST_API_KEY?.trim();
  if (envKey) {
    const a = Buffer.from(providedKey);
    const b = Buffer.from(envKey);
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
      req.ingestKeyId = 0;
      next();
      return;
    }
  }

  try {
    const keyHash = hashApiKey(providedKey);
    const [found] = await db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.keyHash, keyHash))
      .limit(1);

    if (!found || !found.isActive) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or revoked ingest API key.',
      });
      return;
    }

    await db
      .update(apiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiKeys.id, found.id));

    req.ingestKeyId = found.id;
    next();
  } catch (err) {
    console.error('[IngestAuth] Key verification error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
