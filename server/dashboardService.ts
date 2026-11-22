import { asc, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../src/db/index.ts';
import {
  equipmentItems,
  equipmentLiveStatus,
  errorTrends,
  kpiSnapshots,
  notifications,
  orderTrends,
  warehouseTasks,
} from '../src/db/schema.ts';
import type {
  DashboardPeriod,
  DashboardStatePayload,
} from '../src/types/dashboard.ts';

export const kpiIngestSchema = z.object({
  period: z.enum(['today', '7d', 'month']).default('today'),
  totalOrders: z.number().int().min(0),
  outboundOrders: z.number().int().min(0),
  inboundOrders: z.number().int().min(0),
  todayTasks: z.number().int().min(0),
  completionRate: z.number().min(0).max(100),
  todayOutbound: z.number().int().min(0),
  todayInbound: z.number().int().min(0),
  ringCompletionRate: z.number().min(0).max(100),
  totalErrors: z.number().int().min(0),
  pendingTasks: z.number().int().min(0),
  pendingOutbound: z.number().int().min(0),
  pendingInbound: z.number().int().min(0),
  runningTasks: z.number().int().min(0),
  runningOutbound: z.number().int().min(0),
  runningInbound: z.number().int().min(0),
  rackTotal: z.number().int().min(0),
  rackNormalPct: z.number().min(0).max(100),
  rackOfflinePct: z.number().min(0).max(100),
  rackAlertPct: z.number().min(0).max(100),
  rackDisabledPct: z.number().min(0).max(100),
  totalNotifications: z.number().int().min(0),
  alertNotifications: z.number().int().min(0),
});

export const orderTrendPointSchema = z.object({
  timeLabel: z.string().min(1).max(16),
  sortOrder: z.number().int().min(0),
  outbound: z.number().int().min(0),
  inbound: z.number().int().min(0),
});

export const errorTrendPointSchema = z.object({
  timeLabel: z.string().min(1).max(16),
  sortOrder: z.number().int().min(0),
  stackerErrors: z.number().int().min(0),
  conveyorErrors: z.number().int().min(0),
});

export const equipmentLiveStatusSchema = z.object({
  category: z.enum(['stacker', 'conveyor']),
  offlineCount: z.number().int().min(0),
  faultCount: z.number().int().min(0),
  idleCount: z.number().int().min(0),
  runningCount: z.number().int().min(0),
  activeTotal: z.number().int().min(0),
});

export const equipmentItemIngestSchema = z.object({
  code: z.string().min(1).max(32),
  category: z.enum(['stacker', 'conveyor']),
  totalTasks: z.number().int().min(0),
  inboundTasks: z.number().int().min(0),
  outboundTasks: z.number().int().min(0),
  runtimeHours: z.number().int().min(0),
  status: z.enum(['Standby', 'Running', 'Fault', 'Offline']),
  statusDetail: z.string().max(64).default('--'),
  zoneLocation: z.string().max(32).default('11-23-1'),
  workMode: z.string().max(32).default('Working'),
  loadState: z.string().max(32).default('Loaded'),
  aisleProgress: z.number().min(0).max(1).default(0.5),
  liftProgress: z.number().min(0).max(1).default(0.5),
});

export const taskIngestSchema = z.object({
  orderNo: z.string().min(1).max(64),
  materialNo: z.string().min(1).max(64),
  taskType: z.enum(['Outbound', 'Inbound']),
  location: z.string().max(32).default('--'),
  status: z.enum(['Pending', 'Running', 'Completed']),
  equipmentCode: z.string().max(32).default('--'),
});

export const notificationIngestSchema = z.object({
  sourceCode: z.string().min(1).max(32),
  severity: z.enum(['alert', 'info']).default('alert'),
  title: z.string().min(1).max(128),
  referenceCode: z.string().min(1).max(64),
  occurredAt: z.string().min(1).max(32),
});

export const telemetryIngestSchema = z.object({
  kpi: kpiIngestSchema.optional(),
  orderTrends: z.array(orderTrendPointSchema).optional(),
  errorTrends: z.array(errorTrendPointSchema).optional(),
  equipmentLiveStatus: z.array(equipmentLiveStatusSchema).optional(),
});

export const batchIngestSchema = z.object({
  period: z.enum(['today', '7d', 'month']).default('today'),
  kpi: kpiIngestSchema.optional(),
  orderTrends: z.array(orderTrendPointSchema).optional(),
  errorTrends: z.array(errorTrendPointSchema).optional(),
  equipmentLiveStatus: z.array(equipmentLiveStatusSchema).optional(),
  equipment: z.array(equipmentItemIngestSchema).optional(),
  tasks: z.array(taskIngestSchema).optional(),
  notifications: z.array(notificationIngestSchema).optional(),
  replaceTasks: z.boolean().optional(),
  replaceNotifications: z.boolean().optional(),
});

export async function getDashboardState(
  period: DashboardPeriod = 'today',
): Promise<DashboardStatePayload> {
  const [kpiRow] = await db
    .select()
    .from(kpiSnapshots)
    .where(eq(kpiSnapshots.period, period))
    .limit(1);

  const [orderRows, errorRows, liveRows, equipRows, taskRows, notifRows] =
    await Promise.all([
      db
        .select()
        .from(orderTrends)
        .where(eq(orderTrends.period, period))
        .orderBy(asc(orderTrends.sortOrder)),
      db
        .select()
        .from(errorTrends)
        .where(eq(errorTrends.period, period))
        .orderBy(asc(errorTrends.sortOrder)),
      db.select().from(equipmentLiveStatus),
      db.select().from(equipmentItems).orderBy(asc(equipmentItems.id)),
      db
        .select()
        .from(warehouseTasks)
        .orderBy(desc(warehouseTasks.updatedAt), desc(warehouseTasks.id))
        .limit(50),
      db
        .select()
        .from(notifications)
        .orderBy(desc(notifications.id))
        .limit(30),
    ]);

  return {
    period,
    kpi: kpiRow
      ? {
          period: kpiRow.period as DashboardPeriod,
          totalOrders: kpiRow.totalOrders,
          outboundOrders: kpiRow.outboundOrders,
          inboundOrders: kpiRow.inboundOrders,
          todayTasks: kpiRow.todayTasks,
          completionRate: kpiRow.completionRate,
          todayOutbound: kpiRow.todayOutbound,
          todayInbound: kpiRow.todayInbound,
          ringCompletionRate: kpiRow.ringCompletionRate,
          totalErrors: kpiRow.totalErrors,
          pendingTasks: kpiRow.pendingTasks,
          pendingOutbound: kpiRow.pendingOutbound,
          pendingInbound: kpiRow.pendingInbound,
          runningTasks: kpiRow.runningTasks,
          runningOutbound: kpiRow.runningOutbound,
          runningInbound: kpiRow.runningInbound,
          rackTotal: kpiRow.rackTotal,
          rackNormalPct: kpiRow.rackNormalPct,
          rackOfflinePct: kpiRow.rackOfflinePct,
          rackAlertPct: kpiRow.rackAlertPct,
          rackDisabledPct: kpiRow.rackDisabledPct,
          totalNotifications: kpiRow.totalNotifications,
          alertNotifications: kpiRow.alertNotifications,
          updatedAt: kpiRow.updatedAt.toISOString(),
        }
      : null,
    orderTrends: orderRows.map((r) => ({
      timeLabel: r.timeLabel,
      outbound: r.outbound,
      inbound: r.inbound,
    })),
    errorTrends: errorRows.map((r) => ({
      timeLabel: r.timeLabel,
      stackerErrors: r.stackerErrors,
      conveyorErrors: r.conveyorErrors,
    })),
    equipmentLiveStatus: liveRows.map((r) => ({
      category: r.category as 'stacker' | 'conveyor',
      offlineCount: r.offlineCount,
      faultCount: r.faultCount,
      idleCount: r.idleCount,
      runningCount: r.runningCount,
      activeTotal: r.activeTotal,
    })),
    equipmentItems: equipRows.map((r) => ({
      id: r.id,
      code: r.code,
      category: r.category as 'stacker' | 'conveyor',
      totalTasks: r.totalTasks,
      inboundTasks: r.inboundTasks,
      outboundTasks: r.outboundTasks,
      runtimeHours: r.runtimeHours,
      status: r.status as 'Standby' | 'Running' | 'Fault' | 'Offline',
      statusDetail: r.statusDetail,
      zoneLocation: r.zoneLocation,
      workMode: r.workMode,
      loadState: r.loadState,
      aisleProgress: r.aisleProgress,
      liftProgress: r.liftProgress,
    })),
    tasks: taskRows.map((r) => ({
      id: r.id,
      orderNo: r.orderNo,
      materialNo: r.materialNo,
      taskType: r.taskType as 'Outbound' | 'Inbound',
      location: r.location,
      status: r.status as 'Pending' | 'Running' | 'Completed',
      equipmentCode: r.equipmentCode,
      updatedAt: r.updatedAt.toISOString(),
    })),
    notifications: notifRows.map((r) => ({
      id: r.id,
      sourceCode: r.sourceCode,
      severity: r.severity as 'alert' | 'info',
      title: r.title,
      referenceCode: r.referenceCode,
      occurredAt: r.occurredAt,
    })),
  };
}

export async function applyTelemetryIngest(
  period: DashboardPeriod,
  data: z.infer<typeof telemetryIngestSchema>,
): Promise<void> {
  await db.transaction(async (tx) => {
    if (data.kpi) {
      const k = { ...data.kpi, period };
      await tx
        .insert(kpiSnapshots)
        .values({
          period: k.period,
          totalOrders: k.totalOrders,
          outboundOrders: k.outboundOrders,
          inboundOrders: k.inboundOrders,
          todayTasks: k.todayTasks,
          completionRate: k.completionRate,
          todayOutbound: k.todayOutbound,
          todayInbound: k.todayInbound,
          ringCompletionRate: k.ringCompletionRate,
          totalErrors: k.totalErrors,
          pendingTasks: k.pendingTasks,
          pendingOutbound: k.pendingOutbound,
          pendingInbound: k.pendingInbound,
          runningTasks: k.runningTasks,
          runningOutbound: k.runningOutbound,
          runningInbound: k.runningInbound,
          rackTotal: k.rackTotal,
          rackNormalPct: k.rackNormalPct,
          rackOfflinePct: k.rackOfflinePct,
          rackAlertPct: k.rackAlertPct,
          rackDisabledPct: k.rackDisabledPct,
          totalNotifications: k.totalNotifications,
          alertNotifications: k.alertNotifications,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: kpiSnapshots.period,
          set: {
            totalOrders: k.totalOrders,
            outboundOrders: k.outboundOrders,
            inboundOrders: k.inboundOrders,
            todayTasks: k.todayTasks,
            completionRate: k.completionRate,
            todayOutbound: k.todayOutbound,
            todayInbound: k.todayInbound,
            ringCompletionRate: k.ringCompletionRate,
            totalErrors: k.totalErrors,
            pendingTasks: k.pendingTasks,
            pendingOutbound: k.pendingOutbound,
            pendingInbound: k.pendingInbound,
            runningTasks: k.runningTasks,
            runningOutbound: k.runningOutbound,
            runningInbound: k.runningInbound,
            rackTotal: k.rackTotal,
            rackNormalPct: k.rackNormalPct,
            rackOfflinePct: k.rackOfflinePct,
            rackAlertPct: k.rackAlertPct,
            rackDisabledPct: k.rackDisabledPct,
            totalNotifications: k.totalNotifications,
            alertNotifications: k.alertNotifications,
            updatedAt: new Date(),
          },
        });
    }

    if (data.orderTrends && data.orderTrends.length > 0) {
      await tx.delete(orderTrends).where(eq(orderTrends.period, period));
      await tx.insert(orderTrends).values(
        data.orderTrends.map((pt) => ({
          period,
          timeLabel: pt.timeLabel,
          sortOrder: pt.sortOrder,
          outbound: pt.outbound,
          inbound: pt.inbound,
        })),
      );
    }

    if (data.errorTrends && data.errorTrends.length > 0) {
      await tx.delete(errorTrends).where(eq(errorTrends.period, period));
      await tx.insert(errorTrends).values(
        data.errorTrends.map((pt) => ({
          period,
          timeLabel: pt.timeLabel,
          sortOrder: pt.sortOrder,
          stackerErrors: pt.stackerErrors,
          conveyorErrors: pt.conveyorErrors,
        })),
      );
    }

    if (data.equipmentLiveStatus && data.equipmentLiveStatus.length > 0) {
      for (const item of data.equipmentLiveStatus) {
        await tx
          .insert(equipmentLiveStatus)
          .values({
            category: item.category,
            offlineCount: item.offlineCount,
            faultCount: item.faultCount,
            idleCount: item.idleCount,
            runningCount: item.runningCount,
            activeTotal: item.activeTotal,
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: equipmentLiveStatus.category,
            set: {
              offlineCount: item.offlineCount,
              faultCount: item.faultCount,
              idleCount: item.idleCount,
              runningCount: item.runningCount,
              activeTotal: item.activeTotal,
              updatedAt: new Date(),
            },
          });
      }
    }
  });
}

export async function applyEquipmentIngest(
  items: z.infer<typeof equipmentItemIngestSchema>[],
): Promise<void> {
  await db.transaction(async (tx) => {
    for (const item of items) {
      await tx
        .insert(equipmentItems)
        .values({
          code: item.code,
          category: item.category,
          totalTasks: item.totalTasks,
          inboundTasks: item.inboundTasks,
          outboundTasks: item.outboundTasks,
          runtimeHours: item.runtimeHours,
          status: item.status,
          statusDetail: item.statusDetail,
          zoneLocation: item.zoneLocation,
          workMode: item.workMode,
          loadState: item.loadState,
          aisleProgress: item.aisleProgress,
          liftProgress: item.liftProgress,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: equipmentItems.code,
          set: {
            category: item.category,
            totalTasks: item.totalTasks,
            inboundTasks: item.inboundTasks,
            outboundTasks: item.outboundTasks,
            runtimeHours: item.runtimeHours,
            status: item.status,
            statusDetail: item.statusDetail,
            zoneLocation: item.zoneLocation,
            workMode: item.workMode,
            loadState: item.loadState,
            aisleProgress: item.aisleProgress,
            liftProgress: item.liftProgress,
            updatedAt: new Date(),
          },
        });
    }
  });
}

export async function applyTasksIngest(
  tasks: z.infer<typeof taskIngestSchema>[],
  replaceAll = false,
): Promise<void> {
  await db.transaction(async (tx) => {
    if (replaceAll) {
      await tx.delete(warehouseTasks);
    }
    for (const t of tasks) {
      await tx
        .insert(warehouseTasks)
        .values({
          orderNo: t.orderNo,
          materialNo: t.materialNo,
          taskType: t.taskType,
          location: t.location,
          status: t.status,
          equipmentCode: t.equipmentCode,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: warehouseTasks.orderNo,
          set: {
            materialNo: t.materialNo,
            taskType: t.taskType,
            location: t.location,
            status: t.status,
            equipmentCode: t.equipmentCode,
            updatedAt: new Date(),
          },
        });
    }
  });
}

export async function applyNotificationsIngest(
  items: z.infer<typeof notificationIngestSchema>[],
  replaceAll = false,
): Promise<void> {
  await db.transaction(async (tx) => {
    if (replaceAll) {
      await tx.delete(notifications);
    }
    if (items.length > 0) {
      await tx.insert(notifications).values(
        items.map((n) => ({
          sourceCode: n.sourceCode,
          severity: n.severity,
          title: n.title,
          referenceCode: n.referenceCode,
          occurredAt: n.occurredAt,
        })),
      );
    }
  });
}
