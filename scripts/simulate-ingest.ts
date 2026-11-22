import 'dotenv/config';

/**
 * External System Simulator Script for Smart Factory Digital Twin
 * --------------------------------------------------------------
 * Simulates an external WMS/PLC/SCADA integration pushing real telemetry
 * over HTTP to the protected /api/ingest/* endpoints using X-API-Key.
 *
 * Usage:
 *   INGEST_API_KEY="sf_live_..." npm run simulate -- --seed
 *   INGEST_API_KEY="sf_live_..." npm run simulate -- --loop
 */

const BASE_URL = process.env.SIMULATE_URL || 'http://127.0.0.1:3000';
const API_KEY = process.env.INGEST_API_KEY || '';

if (!API_KEY) {
  console.error(
    'Error: INGEST_API_KEY environment variable is required.\n' +
      'Create an API key in the dashboard UI (API Keys panel) or set INGEST_API_KEY in .env,\n' +
      'then run: INGEST_API_KEY="sf_live_..." npm run simulate -- --seed',
  );
  process.exit(1);
}

const args = process.argv.slice(2);
const seedOnly = args.includes('--seed');
const runLoop = args.includes('--loop') || !seedOnly;

async function postIngest(endpoint: string, body: unknown) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${endpoint} -> ${res.status}: ${text}`);
  }
  return res.json();
}

function buildBaselinePayloads() {
  const todayPayload = {
    period: 'today',
    replaceTasks: true,
    replaceNotifications: true,
    kpi: {
      period: 'today',
      totalOrders: 421,
      outboundOrders: 231,
      inboundOrders: 102,
      todayTasks: 976,
      completionRate: 44.3,
      todayOutbound: 231,
      todayInbound: 123,
      ringCompletionRate: 98.4,
      totalErrors: 0,
      pendingTasks: 1,
      pendingOutbound: 0,
      pendingInbound: 1,
      runningTasks: 42,
      runningOutbound: 22,
      runningInbound: 20,
      rackTotal: 4222,
      rackNormalPct: 10,
      rackOfflinePct: 20,
      rackAlertPct: 14,
      rackDisabledPct: 32,
      totalNotifications: 7684,
      alertNotifications: 234,
    },
    orderTrends: [
      { timeLabel: '00', sortOrder: 0, outbound: 55, inbound: 45 },
      { timeLabel: '02', sortOrder: 1, outbound: 78, inbound: 28 },
      { timeLabel: '04', sortOrder: 2, outbound: 92, inbound: 86 },
      { timeLabel: '06', sortOrder: 3, outbound: 52, inbound: 64 },
      { timeLabel: '08', sortOrder: 4, outbound: 185, inbound: 62 },
      { timeLabel: '10', sortOrder: 5, outbound: 98, inbound: 128 },
      { timeLabel: '12', sortOrder: 6, outbound: 168, inbound: 58 },
      { timeLabel: '14', sortOrder: 7, outbound: 60, inbound: 84 },
    ],
    errorTrends: [
      { timeLabel: '00', sortOrder: 0, stackerErrors: 52, conveyorErrors: 48 },
      { timeLabel: '02', sortOrder: 1, stackerErrors: 38, conveyorErrors: 58 },
      { timeLabel: '04', sortOrder: 2, stackerErrors: 22, conveyorErrors: 72 },
      { timeLabel: '06', sortOrder: 3, stackerErrors: 48, conveyorErrors: 56 },
      { timeLabel: '08', sortOrder: 4, stackerErrors: 78, conveyorErrors: 36 },
      { timeLabel: '10', sortOrder: 5, stackerErrors: 95, conveyorErrors: 48 },
      { timeLabel: '12', sortOrder: 6, stackerErrors: 122, conveyorErrors: 65 },
      { timeLabel: '14', sortOrder: 7, stackerErrors: 84, conveyorErrors: 42 },
      { timeLabel: '16', sortOrder: 8, stackerErrors: 58, conveyorErrors: 74 },
      { timeLabel: '18', sortOrder: 9, stackerErrors: 112, conveyorErrors: 92 },
      { timeLabel: '20', sortOrder: 10, stackerErrors: 138, conveyorErrors: 68 },
      { timeLabel: '22', sortOrder: 11, stackerErrors: 62, conveyorErrors: 28 },
      { timeLabel: '24', sortOrder: 12, stackerErrors: 54, conveyorErrors: 18 },
    ],
    equipmentLiveStatus: [
      {
        category: 'stacker',
        offlineCount: 1,
        faultCount: 0,
        idleCount: 2,
        runningCount: 5,
        activeTotal: 155,
      },
      {
        category: 'conveyor',
        offlineCount: 0,
        faultCount: 1,
        idleCount: 3,
        runningCount: 8,
        activeTotal: 96,
      },
    ],
    equipment: [
      {
        code: '1004',
        category: 'stacker',
        totalTasks: 231,
        inboundTasks: 23,
        outboundTasks: 23,
        runtimeHours: 23,
        status: 'Standby',
        statusDetail: '--',
        zoneLocation: '11-23-1',
        workMode: 'Working',
        loadState: 'Loaded',
        aisleProgress: 0.35,
        liftProgress: 0.72,
      },
      {
        code: '1004-B',
        category: 'stacker',
        totalTasks: 231,
        inboundTasks: 23,
        outboundTasks: 23,
        runtimeHours: 23,
        status: 'Standby',
        statusDetail: '--',
        zoneLocation: '11-23-1',
        workMode: 'Working',
        loadState: 'Loaded',
        aisleProgress: 0.56,
        liftProgress: 0.45,
      },
      {
        code: '1004-C',
        category: 'stacker',
        totalTasks: 231,
        inboundTasks: 23,
        outboundTasks: 23,
        runtimeHours: 23,
        status: 'Running',
        statusDetail: '--',
        zoneLocation: '08-14-3',
        workMode: 'Working',
        loadState: 'Loaded',
        aisleProgress: 0.68,
        liftProgress: 0.58,
      },
      {
        code: '1004-D',
        category: 'stacker',
        totalTasks: 231,
        inboundTasks: 23,
        outboundTasks: 23,
        runtimeHours: 23,
        status: 'Standby',
        statusDetail: '--',
        zoneLocation: '04-09-2',
        workMode: 'Standby',
        loadState: 'Empty',
        aisleProgress: 0.22,
        liftProgress: 0.3,
      },
      {
        code: '1004-E',
        category: 'stacker',
        totalTasks: 231,
        inboundTasks: 23,
        outboundTasks: 23,
        runtimeHours: 23,
        status: 'Running',
        statusDetail: '--',
        zoneLocation: '12-04-4',
        workMode: 'Working',
        loadState: 'Loaded',
        aisleProgress: 0.78,
        liftProgress: 0.62,
      },
      {
        code: '1002',
        category: 'conveyor',
        totalTasks: 184,
        inboundTasks: 94,
        outboundTasks: 90,
        runtimeHours: 19,
        status: 'Running',
        statusDetail: 'Line-A',
        zoneLocation: 'CV-01',
        workMode: 'Working',
        loadState: 'Loaded',
        aisleProgress: 0.4,
        liftProgress: 0.1,
      },
      {
        code: '1002-B',
        category: 'conveyor',
        totalTasks: 162,
        inboundTasks: 80,
        outboundTasks: 82,
        runtimeHours: 18,
        status: 'Running',
        statusDetail: 'Line-B',
        zoneLocation: 'CV-02',
        workMode: 'Working',
        loadState: 'Loaded',
        aisleProgress: 0.75,
        liftProgress: 0.1,
      },
    ],
    tasks: [
      {
        orderNo: '57489201',
        materialNo: '231048',
        taskType: 'Outbound',
        location: '--',
        status: 'Completed',
        equipmentCode: '--',
      },
      {
        orderNo: '57489202',
        materialNo: '231049',
        taskType: 'Outbound',
        location: '--',
        status: 'Completed',
        equipmentCode: '--',
      },
      {
        orderNo: '57489203',
        materialNo: '231050',
        taskType: 'Outbound',
        location: '--',
        status: 'Completed',
        equipmentCode: '--',
      },
      {
        orderNo: '57489204',
        materialNo: '231051',
        taskType: 'Outbound',
        location: '--',
        status: 'Completed',
        equipmentCode: '--',
      },
      {
        orderNo: '57489205',
        materialNo: '231052',
        taskType: 'Outbound',
        location: '--',
        status: 'Completed',
        equipmentCode: '--',
      },
    ],
    notifications: [
      {
        sourceCode: '1003',
        severity: 'alert',
        title: 'Alert [1003]',
        referenceCode: '342543645756756867867',
        occurredAt: '05-06 12:09:02',
      },
      {
        sourceCode: '1003',
        severity: 'alert',
        title: 'Alert [1003]',
        referenceCode: '342543645756756867867',
        occurredAt: '05-06 12:09:02',
      },
      {
        sourceCode: '1003',
        severity: 'alert',
        title: 'Alert [1003]',
        referenceCode: '342543645756756867867',
        occurredAt: '05-06 12:09:02',
      },
    ],
  };

  const sevenDayPayload = {
    period: '7d',
    kpi: {
      ...todayPayload.kpi,
      period: '7d',
      totalOrders: 2840,
      outboundOrders: 1580,
      inboundOrders: 1260,
      todayTasks: 6420,
      completionRate: 88.6,
      todayOutbound: 1580,
      todayInbound: 1260,
      ringCompletionRate: 96.8,
      totalErrors: 3,
    },
    orderTrends: [
      { timeLabel: 'Mon', sortOrder: 0, outbound: 180, inbound: 140 },
      { timeLabel: 'Tue', sortOrder: 1, outbound: 210, inbound: 165 },
      { timeLabel: 'Wed', sortOrder: 2, outbound: 245, inbound: 190 },
      { timeLabel: 'Thu', sortOrder: 3, outbound: 220, inbound: 175 },
      { timeLabel: 'Fri', sortOrder: 4, outbound: 280, inbound: 210 },
      { timeLabel: 'Sat', sortOrder: 5, outbound: 235, inbound: 195 },
      { timeLabel: 'Sun', sortOrder: 6, outbound: 210, inbound: 185 },
    ],
    errorTrends: todayPayload.errorTrends,
  };

  const monthPayload = {
    period: 'month',
    kpi: {
      ...todayPayload.kpi,
      period: 'month',
      totalOrders: 12490,
      outboundOrders: 6910,
      inboundOrders: 5580,
      todayTasks: 28140,
      completionRate: 92.4,
      todayOutbound: 6910,
      todayInbound: 5580,
      ringCompletionRate: 97.9,
      totalErrors: 9,
    },
    orderTrends: [
      { timeLabel: 'W1', sortOrder: 0, outbound: 210, inbound: 175 },
      { timeLabel: 'W2', sortOrder: 1, outbound: 265, inbound: 220 },
      { timeLabel: 'W3', sortOrder: 2, outbound: 240, inbound: 195 },
      { timeLabel: 'W4', sortOrder: 3, outbound: 295, inbound: 250 },
    ],
    errorTrends: todayPayload.errorTrends,
  };

  return { todayPayload, sevenDayPayload, monthPayload };
}

async function seedAll() {
  const { todayPayload, sevenDayPayload, monthPayload } = buildBaselinePayloads();
  await postIngest('/api/ingest/batch', sevenDayPayload);
  await postIngest('/api/ingest/batch', monthPayload);
  await postIngest('/api/ingest/batch', todayPayload);
  console.log('[Simulator] Seeded baseline Smart Factory Digital Twin telemetry via /api/ingest/batch');
}

async function runLiveLoop() {
  let tick = 0;
  console.log('[Simulator] Starting continuous external telemetry stream (Ctrl+C to stop)...');

  setInterval(async () => {
    tick += 1;
    const wave = (Math.sin(tick * 0.45) + 1) / 2;
    const wave2 = (Math.cos(tick * 0.35) + 1) / 2;

    try {
      await postIngest('/api/ingest/equipment', {
        items: [
          {
            code: '1004',
            category: 'stacker',
            totalTasks: 231 + tick,
            inboundTasks: 23 + Math.floor(tick / 2),
            outboundTasks: 23 + Math.ceil(tick / 2),
            runtimeHours: 23,
            status: 'Running',
            statusDetail: '--',
            zoneLocation: `11-${20 + (tick % 8)}-${1 + (tick % 4)}`,
            workMode: 'Working',
            loadState: tick % 2 === 0 ? 'Loaded' : 'Empty',
            aisleProgress: Number((0.15 + wave * 0.72).toFixed(3)),
            liftProgress: Number((0.2 + wave2 * 0.65).toFixed(3)),
          },
          {
            code: '1004-B',
            category: 'stacker',
            totalTasks: 231 + Math.floor(tick / 2),
            inboundTasks: 23,
            outboundTasks: 23,
            runtimeHours: 23,
            status: 'Running',
            statusDetail: '--',
            zoneLocation: `09-${12 + (tick % 6)}-2`,
            workMode: 'Working',
            loadState: 'Loaded',
            aisleProgress: Number((0.82 - wave * 0.65).toFixed(3)),
            liftProgress: Number((0.75 - wave2 * 0.5).toFixed(3)),
          },
        ],
      });

      const orderId = String(57489205 + tick);
      await postIngest('/api/ingest/tasks', {
        tasks: [
          {
            orderNo: orderId,
            materialNo: String(231050 + (tick % 25)),
            taskType: tick % 2 === 0 ? 'Outbound' : 'Inbound',
            location: `11-${20 + (tick % 8)}-${1 + (tick % 4)}`,
            status: tick % 3 === 0 ? 'Running' : 'Completed',
            equipmentCode: '1004',
          },
        ],
      });

      await postIngest('/api/ingest/telemetry', {
        kpi: {
          period: 'today',
          totalOrders: 421 + tick,
          outboundOrders: 231 + Math.ceil(tick / 2),
          inboundOrders: 102 + Math.floor(tick / 2),
          todayTasks: 976 + tick,
          completionRate: Number((44.3 + (tick % 12) * 0.2).toFixed(1)),
          todayOutbound: 231 + Math.ceil(tick / 2),
          todayInbound: 123 + Math.floor(tick / 2),
          ringCompletionRate: 98.4,
          totalErrors: 0,
          pendingTasks: (tick % 4) + 1,
          pendingOutbound: tick % 2,
          pendingInbound: 1,
          runningTasks: 40 + (tick % 6),
          runningOutbound: 21 + (tick % 3),
          runningInbound: 19 + (tick % 3),
          rackTotal: 4222,
          rackNormalPct: 10,
          rackOfflinePct: 20,
          rackAlertPct: 14,
          rackDisabledPct: 32,
          totalNotifications: 7684 + Math.floor(tick / 5),
          alertNotifications: 234,
        },
      });

      console.log(`[Simulator] Tick #${tick} ingested at ${new Date().toLocaleTimeString()}`);
    } catch (err) {
      console.error('[Simulator] Tick failed:', err);
    }
  }, 2500);
}

async function main() {
  await seedAll();
  if (runLoop && !seedOnly) {
    await runLiveLoop();
  }
}

main().catch((err) => {
  console.error('[Simulator] Fatal error:', err);
  process.exit(1);
});
