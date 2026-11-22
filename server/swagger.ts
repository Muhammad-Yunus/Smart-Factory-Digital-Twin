export function buildOpenApiSpec(baseUrl = '') {
  return {
    openapi: '3.0.3',
    info: {
      title: 'Smart Factory Digital Twin API',
      version: '1.0.0',
      description:
        'REST & Telemetry Ingest API for the 3D AS/RS Smart Factory Digital Twin. ' +
        'Authentication is strictly separated: Application UI routes use User Bearer JWT tokens (`BearerAuth`), ' +
        'while External System Ingest routes (`/api/ingest/*`) authenticate via `X-API-Key` (`IngestApiKey`). ' +
        'Every successful ingest call persists to PostgreSQL via Drizzle ORM and immediately broadcasts real-time updates to connected dashboards over Socket.IO.',
    },
    servers: [
      {
        url: baseUrl || '/',
        description: 'Active Smart Factory Server',
      },
    ],
    tags: [
      {
        name: 'External Ingest (API Key)',
        description:
          'Endpoints for external WMS, ERP, PLC, and SCADA systems. Requires X-API-Key header.',
      },
      {
        name: 'App Auth (User Session)',
        description: 'User registration, login, and profile endpoints.',
      },
      {
        name: 'API Key Management (User Session)',
        description: 'Create and revoke ingest API keys for external integrations.',
      },
      {
        name: 'Dashboard State (User Session)',
        description: 'Query current synchronized factory state from PostgreSQL.',
      },
    ],
    components: {
      securitySchemes: {
        IngestApiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description:
            'External system API key generated from the dashboard API Keys panel (e.g., sf_live_...).',
        },
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'User session token returned by /api/auth/login or /api/auth/register.',
        },
      },
      schemas: {
        KpiSnapshot: {
          type: 'object',
          required: [
            'period',
            'totalOrders',
            'outboundOrders',
            'inboundOrders',
            'todayTasks',
            'completionRate',
            'todayOutbound',
            'todayInbound',
            'ringCompletionRate',
            'totalErrors',
            'pendingTasks',
            'pendingOutbound',
            'pendingInbound',
            'runningTasks',
            'runningOutbound',
            'runningInbound',
            'rackTotal',
            'rackNormalPct',
            'rackOfflinePct',
            'rackAlertPct',
            'rackDisabledPct',
            'totalNotifications',
            'alertNotifications',
          ],
          properties: {
            period: { type: 'string', enum: ['today', '7d', 'month'], example: 'today' },
            totalOrders: { type: 'integer', example: 421 },
            outboundOrders: { type: 'integer', example: 231 },
            inboundOrders: { type: 'integer', example: 102 },
            todayTasks: { type: 'integer', example: 976 },
            completionRate: { type: 'number', example: 44.3 },
            todayOutbound: { type: 'integer', example: 231 },
            todayInbound: { type: 'integer', example: 123 },
            ringCompletionRate: { type: 'number', example: 98.4 },
            totalErrors: { type: 'integer', example: 0 },
            pendingTasks: { type: 'integer', example: 1 },
            pendingOutbound: { type: 'integer', example: 0 },
            pendingInbound: { type: 'integer', example: 1 },
            runningTasks: { type: 'integer', example: 42 },
            runningOutbound: { type: 'integer', example: 22 },
            runningInbound: { type: 'integer', example: 20 },
            rackTotal: { type: 'integer', example: 4222 },
            rackNormalPct: { type: 'number', example: 10 },
            rackOfflinePct: { type: 'number', example: 20 },
            rackAlertPct: { type: 'number', example: 14 },
            rackDisabledPct: { type: 'number', example: 32 },
            totalNotifications: { type: 'integer', example: 7684 },
            alertNotifications: { type: 'integer', example: 234 },
          },
        },
        EquipmentItem: {
          type: 'object',
          required: [
            'code',
            'category',
            'totalTasks',
            'inboundTasks',
            'outboundTasks',
            'runtimeHours',
            'status',
          ],
          properties: {
            code: { type: 'string', example: '1004' },
            category: { type: 'string', enum: ['stacker', 'conveyor'], example: 'stacker' },
            totalTasks: { type: 'integer', example: 231 },
            inboundTasks: { type: 'integer', example: 23 },
            outboundTasks: { type: 'integer', example: 23 },
            runtimeHours: { type: 'integer', example: 23 },
            status: {
              type: 'string',
              enum: ['Standby', 'Running', 'Fault', 'Offline'],
              example: 'Running',
            },
            statusDetail: { type: 'string', example: '--' },
            zoneLocation: { type: 'string', example: '11-23-1' },
            workMode: { type: 'string', example: 'Working' },
            loadState: { type: 'string', example: 'Loaded' },
            aisleProgress: { type: 'number', minimum: 0, maximum: 1, example: 0.42 },
            liftProgress: { type: 'number', minimum: 0, maximum: 1, example: 0.65 },
          },
        },
        WarehouseTask: {
          type: 'object',
          required: ['orderNo', 'materialNo', 'taskType', 'status'],
          properties: {
            orderNo: { type: 'string', example: '57489201' },
            materialNo: { type: 'string', example: '231048' },
            taskType: { type: 'string', enum: ['Outbound', 'Inbound'], example: 'Outbound' },
            location: { type: 'string', example: '11-23-1' },
            status: {
              type: 'string',
              enum: ['Pending', 'Running', 'Completed'],
              example: 'Completed',
            },
            equipmentCode: { type: 'string', example: '1004' },
          },
        },
        NotificationInput: {
          type: 'object',
          required: ['sourceCode', 'title', 'referenceCode', 'occurredAt'],
          properties: {
            sourceCode: { type: 'string', example: '1003' },
            severity: { type: 'string', enum: ['alert', 'info'], example: 'alert' },
            title: { type: 'string', example: 'Alert [1003]' },
            referenceCode: { type: 'string', example: '342543645756756867867' },
            occurredAt: { type: 'string', example: '05-06 12:09:02' },
          },
        },
      },
    },
    paths: {
      '/api/ingest/batch': {
        post: {
          tags: ['External Ingest (API Key)'],
          summary: 'Ingest full or partial factory telemetry batch',
          description:
            'Upserts KPIs, order/error trends, equipment live status, equipment items, tasks, and notifications in a single transaction and broadcasts via Socket.IO.',
          security: [{ IngestApiKey: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    period: { type: 'string', enum: ['today', '7d', 'month'], default: 'today' },
                    kpi: { $ref: '#/components/schemas/KpiSnapshot' },
                    equipment: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/EquipmentItem' },
                    },
                    tasks: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/WarehouseTask' },
                    },
                    notifications: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/NotificationInput' },
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Batch ingested and broadcasted via Socket.IO' },
            401: { description: 'Missing or invalid X-API-Key' },
            403: { description: 'User Bearer token rejected on ingest endpoint' },
          },
        },
      },
      '/api/ingest/telemetry': {
        post: {
          tags: ['External Ingest (API Key)'],
          summary: 'Ingest KPI summary, trend curves, and equipment live bar data',
          security: [{ IngestApiKey: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    kpi: { $ref: '#/components/schemas/KpiSnapshot' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Telemetry updated and emitted' },
            401: { description: 'Invalid X-API-Key' },
          },
        },
      },
      '/api/ingest/equipment': {
        post: {
          tags: ['External Ingest (API Key)'],
          summary: 'Ingest real-time stacker crane & conveyor positions/statuses',
          security: [{ IngestApiKey: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['items'],
                  properties: {
                    items: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/EquipmentItem' },
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Equipment telemetry updated and emitted to 3D twin' },
          },
        },
      },
      '/api/ingest/tasks': {
        post: {
          tags: ['External Ingest (API Key)'],
          summary: 'Ingest inbound/outbound warehouse tasks',
          security: [{ IngestApiKey: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['tasks'],
                  properties: {
                    replaceAll: { type: 'boolean', default: false },
                    tasks: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/WarehouseTask' },
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Tasks upserted and emitted' },
          },
        },
      },
      '/api/ingest/notifications': {
        post: {
          tags: ['External Ingest (API Key)'],
          summary: 'Ingest factory equipment alerts and notifications',
          security: [{ IngestApiKey: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['notifications'],
                  properties: {
                    replaceAll: { type: 'boolean', default: false },
                    notifications: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/NotificationInput' },
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Notifications stored and emitted' },
          },
        },
      },
      '/api/auth/register': {
        post: {
          tags: ['App Auth (User Session)'],
          summary: 'Register a new application operator user',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['username', 'email', 'password'],
                  properties: {
                    username: { type: 'string', example: 'operator1' },
                    email: { type: 'string', example: 'operator@factory.io' },
                    password: { type: 'string', example: 'StrongPass123!' },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'User registered and Bearer token issued' },
          },
        },
      },
      '/api/auth/login': {
        post: {
          tags: ['App Auth (User Session)'],
          summary: 'Sign in with username/email and password',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['identifier', 'password'],
                  properties: {
                    identifier: { type: 'string', example: 'operator@factory.io' },
                    password: { type: 'string', example: 'StrongPass123!' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Authenticated with Bearer token' },
            401: { description: 'Invalid credentials' },
          },
        },
      },
      '/api/auth/me': {
        get: {
          tags: ['App Auth (User Session)'],
          summary: 'Verify current user session',
          security: [{ BearerAuth: [] }],
          responses: {
            200: { description: 'Active user profile' },
            401: { description: 'Unauthorized' },
          },
        },
      },
      '/api/keys': {
        get: {
          tags: ['API Key Management (User Session)'],
          summary: 'List external ingest API keys created by authenticated users',
          security: [{ BearerAuth: [] }],
          responses: {
            200: { description: 'List of API key metadata' },
          },
        },
        post: {
          tags: ['API Key Management (User Session)'],
          summary: 'Generate a new X-API-Key for external systems',
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name'],
                  properties: {
                    name: { type: 'string', example: 'WMS Production Connector' },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'Returns raw API key once; store securely' },
          },
        },
      },
      '/api/keys/{id}': {
        delete: {
          tags: ['API Key Management (User Session)'],
          summary: 'Revoke an ingest API key',
          security: [{ BearerAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'integer' },
            },
          ],
          responses: {
            200: { description: 'API key revoked' },
          },
        },
      },
      '/api/dashboard/state': {
        get: {
          tags: ['Dashboard State (User Session)'],
          summary: 'Fetch current Digital Twin state from PostgreSQL',
          security: [{ BearerAuth: [] }],
          parameters: [
            {
              name: 'range',
              in: 'query',
              schema: { type: 'string', enum: ['today', '7d', 'month'], default: 'today' },
            },
          ],
          responses: {
            200: { description: 'Complete dashboard snapshot' },
          },
        },
      },
    },
  };
}
