import {
  boolean,
  integer,
  pgTable,
  real,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull().default('operator'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const apiKeys = pgTable('api_keys', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  keyPrefix: text('key_prefix').notNull(),
  keyHash: text('key_hash').notNull().unique(),
  isActive: boolean('is_active').notNull().default(true),
  createdByUserId: integer('created_by_user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const kpiSnapshots = pgTable('kpi_snapshots', {
  id: serial('id').primaryKey(),
  period: text('period').notNull().unique(), // 'today' | '7d' | 'month'
  totalOrders: integer('total_orders').notNull().default(0),
  outboundOrders: integer('outbound_orders').notNull().default(0),
  inboundOrders: integer('inbound_orders').notNull().default(0),
  todayTasks: integer('today_tasks').notNull().default(0),
  completionRate: real('completion_rate').notNull().default(0),
  todayOutbound: integer('today_outbound').notNull().default(0),
  todayInbound: integer('today_inbound').notNull().default(0),
  ringCompletionRate: real('ring_completion_rate').notNull().default(0),
  totalErrors: integer('total_errors').notNull().default(0),
  pendingTasks: integer('pending_tasks').notNull().default(0),
  pendingOutbound: integer('pending_outbound').notNull().default(0),
  pendingInbound: integer('pending_inbound').notNull().default(0),
  runningTasks: integer('running_tasks').notNull().default(0),
  runningOutbound: integer('running_outbound').notNull().default(0),
  runningInbound: integer('running_inbound').notNull().default(0),
  rackTotal: integer('rack_total').notNull().default(0),
  rackNormalPct: real('rack_normal_pct').notNull().default(0),
  rackOfflinePct: real('rack_offline_pct').notNull().default(0),
  rackAlertPct: real('rack_alert_pct').notNull().default(0),
  rackDisabledPct: real('rack_disabled_pct').notNull().default(0),
  totalNotifications: integer('total_notifications').notNull().default(0),
  alertNotifications: integer('alert_notifications').notNull().default(0),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const orderTrends = pgTable('order_trends', {
  id: serial('id').primaryKey(),
  period: text('period').notNull().default('today'),
  timeLabel: text('time_label').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  outbound: integer('outbound').notNull().default(0),
  inbound: integer('inbound').notNull().default(0),
});

export const errorTrends = pgTable('error_trends', {
  id: serial('id').primaryKey(),
  period: text('period').notNull().default('today'),
  timeLabel: text('time_label').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  stackerErrors: integer('stacker_errors').notNull().default(0),
  conveyorErrors: integer('conveyor_errors').notNull().default(0),
});

export const equipmentLiveStatus = pgTable('equipment_live_status', {
  id: serial('id').primaryKey(),
  category: text('category').notNull().unique(), // 'stacker' | 'conveyor'
  offlineCount: integer('offline_count').notNull().default(0),
  faultCount: integer('fault_count').notNull().default(0),
  idleCount: integer('idle_count').notNull().default(0),
  runningCount: integer('running_count').notNull().default(0),
  activeTotal: integer('active_total').notNull().default(0),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const equipmentItems = pgTable('equipment_items', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  category: text('category').notNull().default('stacker'), // 'stacker' | 'conveyor'
  totalTasks: integer('total_tasks').notNull().default(0),
  inboundTasks: integer('inbound_tasks').notNull().default(0),
  outboundTasks: integer('outbound_tasks').notNull().default(0),
  runtimeHours: integer('runtime_hours').notNull().default(0),
  status: text('status').notNull().default('Standby'), // 'Standby' | 'Running' | 'Fault' | 'Offline'
  statusDetail: text('status_detail').notNull().default('--'),
  zoneLocation: text('zone_location').notNull().default('11-23-1'),
  workMode: text('work_mode').notNull().default('Working'),
  loadState: text('load_state').notNull().default('Loaded'),
  aisleProgress: real('aisle_progress').notNull().default(0.45),
  liftProgress: real('lift_progress').notNull().default(0.55),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const warehouseTasks = pgTable('warehouse_tasks', {
  id: serial('id').primaryKey(),
  orderNo: text('order_no').notNull().unique(),
  materialNo: text('material_no').notNull(),
  taskType: text('task_type').notNull(), // 'Outbound' | 'Inbound'
  location: text('location').notNull().default('--'),
  status: text('status').notNull().default('Pending'), // 'Pending' | 'Running' | 'Completed'
  equipmentCode: text('equipment_code').notNull().default('--'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  sourceCode: text('source_code').notNull(),
  severity: text('severity').notNull().default('alert'), // 'alert' | 'info'
  title: text('title').notNull(),
  referenceCode: text('reference_code').notNull(),
  occurredAt: text('occurred_at').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
