import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.ts';

const dbHost = process.env.DB_HOST;
const dbPort = Number(process.env.DB_PORT || 5432);
const dbName = process.env.DB_NAME;
const dbUser = process.env.DB_USER;
const dbPassword = process.env.DB_PASSWORD;

const hasDbConfig = Boolean(dbHost && dbName && dbUser);

if (!hasDbConfig) {
  console.warn(
    '[DB] DB_HOST, DB_NAME, or DB_USER is not set. Please configure DB_* variables in .env or environment secrets.',
  );
}

const useSsl =
  process.env.DB_SSL === 'true' ||
  process.env.DB_SSL === 'require' ||
  Boolean(dbHost?.includes('supabase.com'));

export const sqlClient = postgres({
  host: dbHost || 'localhost',
  port: dbPort,
  database: dbName || 'postgres',
  user: dbUser || 'postgres',
  password: dbPassword || '',
  prepare: false, // Required for Supabase PgBouncer / Supavisor pooler
  ssl: useSsl ? 'require' : undefined,
  max: 10,
  idle_timeout: 20,
  connect_timeout: 15,
  onnotice: () => {},
});

export const db = drizzle(sqlClient, { schema });

export async function ensureDatabaseTables(): Promise<void> {
  if (!hasDbConfig) return;

  await sqlClient`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'operator',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  await sqlClient`
    CREATE TABLE IF NOT EXISTS api_keys (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      key_prefix TEXT NOT NULL,
      key_hash TEXT NOT NULL UNIQUE,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_by_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      last_used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  await sqlClient`
    CREATE TABLE IF NOT EXISTS kpi_snapshots (
      id SERIAL PRIMARY KEY,
      period TEXT NOT NULL UNIQUE,
      total_orders INTEGER NOT NULL DEFAULT 0,
      outbound_orders INTEGER NOT NULL DEFAULT 0,
      inbound_orders INTEGER NOT NULL DEFAULT 0,
      today_tasks INTEGER NOT NULL DEFAULT 0,
      completion_rate REAL NOT NULL DEFAULT 0,
      today_outbound INTEGER NOT NULL DEFAULT 0,
      today_inbound INTEGER NOT NULL DEFAULT 0,
      ring_completion_rate REAL NOT NULL DEFAULT 0,
      total_errors INTEGER NOT NULL DEFAULT 0,
      pending_tasks INTEGER NOT NULL DEFAULT 0,
      pending_outbound INTEGER NOT NULL DEFAULT 0,
      pending_inbound INTEGER NOT NULL DEFAULT 0,
      running_tasks INTEGER NOT NULL DEFAULT 0,
      running_outbound INTEGER NOT NULL DEFAULT 0,
      running_inbound INTEGER NOT NULL DEFAULT 0,
      rack_total INTEGER NOT NULL DEFAULT 0,
      rack_normal_pct REAL NOT NULL DEFAULT 0,
      rack_offline_pct REAL NOT NULL DEFAULT 0,
      rack_alert_pct REAL NOT NULL DEFAULT 0,
      rack_disabled_pct REAL NOT NULL DEFAULT 0,
      total_notifications INTEGER NOT NULL DEFAULT 0,
      alert_notifications INTEGER NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  await sqlClient`
    CREATE TABLE IF NOT EXISTS order_trends (
      id SERIAL PRIMARY KEY,
      period TEXT NOT NULL DEFAULT 'today',
      time_label TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      outbound INTEGER NOT NULL DEFAULT 0,
      inbound INTEGER NOT NULL DEFAULT 0
    );
  `;

  await sqlClient`
    CREATE TABLE IF NOT EXISTS error_trends (
      id SERIAL PRIMARY KEY,
      period TEXT NOT NULL DEFAULT 'today',
      time_label TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      stacker_errors INTEGER NOT NULL DEFAULT 0,
      conveyor_errors INTEGER NOT NULL DEFAULT 0
    );
  `;

  await sqlClient`
    CREATE TABLE IF NOT EXISTS equipment_live_status (
      id SERIAL PRIMARY KEY,
      category TEXT NOT NULL UNIQUE,
      offline_count INTEGER NOT NULL DEFAULT 0,
      fault_count INTEGER NOT NULL DEFAULT 0,
      idle_count INTEGER NOT NULL DEFAULT 0,
      running_count INTEGER NOT NULL DEFAULT 0,
      active_total INTEGER NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  await sqlClient`
    CREATE TABLE IF NOT EXISTS equipment_items (
      id SERIAL PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      category TEXT NOT NULL DEFAULT 'stacker',
      total_tasks INTEGER NOT NULL DEFAULT 0,
      inbound_tasks INTEGER NOT NULL DEFAULT 0,
      outbound_tasks INTEGER NOT NULL DEFAULT 0,
      runtime_hours INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'Standby',
      status_detail TEXT NOT NULL DEFAULT '--',
      zone_location TEXT NOT NULL DEFAULT '11-23-1',
      work_mode TEXT NOT NULL DEFAULT 'Working',
      load_state TEXT NOT NULL DEFAULT 'Loaded',
      aisle_progress REAL NOT NULL DEFAULT 0.45,
      lift_progress REAL NOT NULL DEFAULT 0.55,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  await sqlClient`
    CREATE TABLE IF NOT EXISTS warehouse_tasks (
      id SERIAL PRIMARY KEY,
      order_no TEXT NOT NULL UNIQUE,
      material_no TEXT NOT NULL,
      task_type TEXT NOT NULL,
      location TEXT NOT NULL DEFAULT '--',
      status TEXT NOT NULL DEFAULT 'Pending',
      equipment_code TEXT NOT NULL DEFAULT '--',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  await sqlClient`
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      source_code TEXT NOT NULL,
      severity TEXT NOT NULL DEFAULT 'alert',
      title TEXT NOT NULL,
      reference_code TEXT NOT NULL,
      occurred_at TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;
}
