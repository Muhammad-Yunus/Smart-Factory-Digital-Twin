import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { AlertTriangle, FileCode2, KeyRound, MessageSquareText } from 'lucide-react';
import { ApiKeysModal } from './components/ApiKeysModal';
import { AuthGate } from './components/AuthGate';
import {
  CompletionRingGauge,
  EquipmentLiveBarChart,
  ErrorTrendChart,
  OrderTrendChart,
  RackOccupancyDonut,
} from './components/Charts';
import { Factory3DScene } from './components/Factory3DScene';
import {
  AlertBeaconIcon,
  InboundWarehouseIcon,
  OrderClipboardIcon,
  OutboundOrderIcon,
  RingKpiEmblem,
} from './components/FactoryIcons';
import { SectionHeader } from './components/SectionHeader';
import { TopHeader } from './components/TopHeader';
import type {
  AuthUser,
  DashboardPeriod,
  DashboardStatePayload,
  EquipmentCategory,
  NotificationFilter,
  TaskStatusFilter,
} from './types/dashboard';

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [showApiKeysModal, setShowApiKeysModal] = useState(false);

  const [period, setPeriod] = useState<DashboardPeriod>('today');
  const [equipmentTab, setEquipmentTab] = useState<EquipmentCategory>('stacker');
  const [taskFilter, setTaskFilter] = useState<TaskStatusFilter>('All');
  const [notifFilter, setNotifFilter] = useState<NotificationFilter>('All');
  const [selectedEquipmentCode, setSelectedEquipmentCode] = useState<string | null>(null);

  const [state, setState] = useState<DashboardStatePayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const periodRef = useRef<DashboardPeriod>(period);
  periodRef.current = period;

  // Restore session from HttpOnly cookie on browser reload
  useEffect(() => {
    let active = true;
    fetch('/api/auth/me')
      .then(async (res) => {
        if (!active || !res.ok) return;
        const data = (await res.json()) as { user?: AuthUser; token?: string };
        if (active && data.user && data.token) {
          setToken(data.token);
          setUser(data.user);
        }
      })
      .catch(() => {
        // Unauthenticated fallback handled by AuthGate
      })
      .finally(() => {
        if (active) setCheckingSession(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const fetchDashboardState = useCallback(
    async (authToken: string, targetPeriod: DashboardPeriod) => {
      setLoading(true);
      try {
        const res = await fetch(`/api/dashboard/state?range=${targetPeriod}`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        if (res.status === 401) {
          setToken(null);
          setUser(null);
          return;
        }
        if (res.ok) {
          const data = (await res.json()) as DashboardStatePayload;
          setState(data);
        }
      } catch (err) {
        console.error('[Dashboard] Fetch failed:', err);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // Connect Socket.IO when authenticated
  useEffect(() => {
    if (!token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setSocketConnected(false);
      return;
    }

    fetchDashboardState(token, periodRef.current);

    const socket = io({
      path: '/socket.io',
      auth: { token },
      query: { period: periodRef.current },
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setSocketConnected(true);
    });

    socket.on('disconnect', () => {
      setSocketConnected(false);
    });

    socket.on('dashboard:init', (payload: DashboardStatePayload) => {
      if (payload.period === periodRef.current) {
        setState(payload);
      }
    });

    socket.on('dashboard:updated', (payload: DashboardStatePayload) => {
      if (payload.period === periodRef.current) {
        setState(payload);
      } else {
        // Refresh active period when another period or shared tables changed
        fetchDashboardState(token, periodRef.current);
      }
    });

    socket.on('equipment:updated', (items) => {
      setState((prev) => (prev ? { ...prev, equipmentItems: items } : prev));
    });

    socket.on('tasks:updated', (tasks) => {
      setState((prev) => (prev ? { ...prev, tasks } : prev));
    });

    socket.on('notifications:created', (notifications) => {
      setState((prev) => (prev ? { ...prev, notifications } : prev));
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setSocketConnected(false);
    };
  }, [token, fetchDashboardState]);

  const handlePeriodChange = (nextPeriod: DashboardPeriod) => {
    setPeriod(nextPeriod);
    if (socketRef.current?.connected) {
      socketRef.current.emit('dashboard:subscribe', nextPeriod);
    }
    if (token) {
      fetchDashboardState(token, nextPeriod);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
      });
    } catch {
      // Ignore network error during sign-out cleanup
    }
    setToken(null);
    setUser(null);
    setState(null);
  };

  const kpi = state?.kpi;
  const filteredEquipment = useMemo(() => {
    const items = state?.equipmentItems ?? [];
    return items.filter((e) => e.category === equipmentTab);
  }, [state?.equipmentItems, equipmentTab]);

  const filteredTasks = useMemo(() => {
    const list = state?.tasks ?? [];
    if (taskFilter === 'All') return list;
    return list.filter((t) => t.status === taskFilter);
  }, [state?.tasks, taskFilter]);

  const filteredNotifications = useMemo(() => {
    const list = state?.notifications ?? [];
    if (notifFilter === 'All') return list;
    return list.filter((n) => n.severity === 'alert');
  }, [state?.notifications, notifFilter]);

  if (checkingSession) {
    return (
      <div className="min-h-screen w-full bg-[#040914] text-slate-300 flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="w-7 h-7 mx-auto rounded-full border-2 border-[#D4A44A] border-t-transparent animate-spin" />
          <p className="text-[12px] tracking-wide text-slate-400">
            Restoring Control Room Session...
          </p>
        </div>
      </div>
    );
  }

  if (!token || !user) {
    return (
      <AuthGate
        onAuthenticated={(newToken, authUser) => {
          setToken(newToken);
          setUser(authUser);
        }}
      />
    );
  }

  const hasTelemetry = Boolean(kpi);

  return (
    <div className="min-h-screen xl:h-screen w-full bg-[#040914] text-slate-100 flex flex-col xl:overflow-hidden">
      <TopHeader
        user={user}
        socketConnected={socketConnected}
        onOpenApiKeys={() => setShowApiKeysModal(true)}
        onLogout={handleLogout}
      />

      {/* Main Responsive Canvas */}
      <main className="relative flex-1 w-full xl:overflow-hidden xl:-mt-[16px]">
        {/* Desktop Full-Bleed 3D Backdrop (spans entire canvas behind subtle edge scrims) */}
        <div className="hidden xl:block absolute inset-0 z-0">
          <Factory3DScene
            equipmentItems={state?.equipmentItems ?? []}
            selectedEquipmentCode={selectedEquipmentCode}
            onSelectEquipment={setSelectedEquipmentCode}
          />
        </div>

        {/* Left & Right Atmospheric Edge Scrims on Desktop (ensures >=7:1 legibility) */}
        <div
          aria-hidden="true"
          className="hidden xl:block pointer-events-none absolute inset-y-0 left-0 w-[32%] z-10 bg-gradient-to-r from-[#040914]/95 via-[#040914]/82 to-transparent"
        />
        <div
          aria-hidden="true"
          className="hidden xl:block pointer-events-none absolute inset-y-0 right-0 w-[32%] z-10 bg-gradient-to-l from-[#040914]/95 via-[#040914]/82 to-transparent"
        />

        {/* Responsive 3-Zone Grid */}
        <div className="relative z-20 w-full xl:h-full px-3 lg:px-4 py-2.5 grid grid-cols-1 xl:grid-cols-[26.5%_47%_26.5%] gap-3 xl:gap-0 pointer-events-none">
          {/* =============================================================== */}
          {/* CENTER TOP KPI STRIP & MOBILE/TABLET 3D VIEWPORT                */}
          {/* =============================================================== */}
          <section className="order-1 xl:order-2 flex flex-col justify-between xl:px-4 pointer-events-none">
            {/* Top 4 Circular KPI Emblems */}
            <div className="pointer-events-auto grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 pt-0.5 xl:pt-[18px] pb-2">
              <div className="flex items-center gap-1.5 xl:gap-2 min-w-0">
                <RingKpiEmblem kind="tasks" />
                <div className="min-w-0">
                  <div className="text-[10px] xl:text-[10.5px] leading-tight text-slate-300 whitespace-nowrap">
                    Today&apos;s Tasks
                  </div>
                  <div className="flex items-baseline gap-1 leading-none mt-0.5">
                    <span className="font-display text-[20px] xl:text-[23px] font-bold text-white tabular-nums">
                      {kpi?.todayTasks ?? 0}
                    </span>
                    <span className="text-[10px] text-slate-400">tasks</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 xl:gap-2 min-w-0">
                <RingKpiEmblem kind="completion" />
                <div className="min-w-0">
                  <div className="text-[10px] xl:text-[10.5px] leading-tight text-slate-300 whitespace-nowrap">
                    Task Completion
                  </div>
                  <div className="flex items-baseline gap-1 leading-none mt-0.5">
                    <span className="font-display text-[20px] xl:text-[23px] font-bold text-white tabular-nums">
                      {kpi ? kpi.completionRate.toFixed(1) : '0.0'}
                    </span>
                    <span className="text-[10px] text-slate-400">%</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 xl:gap-2 min-w-0">
                <RingKpiEmblem kind="outbound" />
                <div className="min-w-0">
                  <div className="text-[10px] xl:text-[10.5px] leading-tight text-slate-300 whitespace-nowrap">
                    Today&apos;s Outbound
                  </div>
                  <div className="flex items-baseline gap-1 leading-none mt-0.5">
                    <span className="font-display text-[20px] xl:text-[23px] font-bold text-white tabular-nums">
                      {kpi?.todayOutbound ?? 0}
                    </span>
                    <span className="text-[10px] text-slate-400">tasks</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 xl:gap-2 min-w-0">
                <RingKpiEmblem kind="inbound" />
                <div className="min-w-0">
                  <div className="text-[10px] xl:text-[10.5px] leading-tight text-slate-300 whitespace-nowrap">
                    Today&apos;s Inbound
                  </div>
                  <div className="flex items-baseline gap-1 leading-none mt-0.5">
                    <span className="font-display text-[20px] xl:text-[23px] font-bold text-white tabular-nums">
                      {kpi?.todayInbound ?? 0}
                    </span>
                    <span className="text-[10px] text-slate-400">tasks</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile/Tablet Dedicated 3D Viewport */}
            <div className="xl:hidden pointer-events-auto relative w-full h-[420px] sm:h-[500px] rounded-[4px] border border-[#D4A44A]/35 overflow-hidden bg-[#040914]">
              <Factory3DScene
                equipmentItems={state?.equipmentItems ?? []}
                selectedEquipmentCode={selectedEquipmentCode}
                onSelectEquipment={setSelectedEquipmentCode}
              />
            </div>

            {/* Empty DB Notice when no external ingest data has arrived yet */}
            {!loading && !hasTelemetry ? (
              <div className="pointer-events-auto mx-auto mb-4 max-w-md px-4 py-3 bg-[#091224]/92 border border-[#D4A44A]/60 rounded-[4px] text-center shadow-xl">
                <div className="text-[12px] font-semibold text-amber-200">
                  Awaiting External Telemetry Ingest
                </div>
                <p className="mt-1 text-[11px] text-slate-300">
                  PostgreSQL is connected and ready. Push real data to{' '}
                  <code className="font-mono-tabular text-cyan-300">/api/ingest/batch</code>{' '}
                  with an API key or run the external simulator script.
                </p>
                <div className="mt-2.5 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowApiKeysModal(true)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium bg-[#8A6124] hover:bg-[#A6762E] text-white rounded-[2px] border border-[#F5C55B]/60"
                  >
                    <KeyRound className="w-3 h-3" />
                    Generate API Key
                  </button>
                  <a
                    href="/api/docs"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-[2px] border border-slate-600"
                  >
                    <FileCode2 className="w-3 h-3 text-cyan-400" />
                    Swagger Docs
                  </a>
                </div>
              </div>
            ) : (
              <div className="hidden xl:block" />
            )}
          </section>

          {/* =============================================================== */}
          {/* LEFT TELEMETRY COLUMN                                           */}
          {/* =============================================================== */}
          <aside className="order-2 xl:order-1 pointer-events-auto flex flex-col justify-between gap-2.5 xl:pr-2 xl:h-full xl:overflow-y-auto twin-scroll">
            {/* Period Filter Tabs: Today | Last 7 Days | This Month */}
            <div className="grid grid-cols-3 gap-2 shrink-0">
              {(
                [
                  { id: 'today', label: 'Today' },
                  { id: '7d', label: 'Last 7 Days' },
                  { id: 'month', label: 'This Month' },
                ] as const
              ).map((tab) => {
                const active = period === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handlePeriodChange(tab.id)}
                    className={`py-1.5 px-2 text-[12px] font-medium transition-colors whitespace-nowrap border-y border-x rounded-[1px] ${
                      active
                        ? 'bg-[#6D4D23]/60 border-[#EAB308] text-white shadow-[inset_0_0_12px_rgba(234,179,8,0.2)]'
                        : 'bg-[#0F182A]/85 border-slate-700/80 text-slate-300 hover:text-white hover:border-[#D4A44A]/50'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* 3 Order KPI Blocks */}
            <div className="grid grid-cols-3 gap-1 xl:gap-1.5 py-1 shrink-0">
              <div className="flex items-center gap-1 min-w-0">
                <OrderClipboardIcon />
                <div className="min-w-0">
                  <div className="text-[9.5px] xl:text-[10px] leading-tight text-slate-300 whitespace-nowrap">
                    Total Orders
                  </div>
                  <div className="flex items-baseline gap-1 leading-none mt-0.5">
                    <span className="font-display text-[17px] xl:text-[19px] font-bold text-white tabular-nums">
                      {kpi?.totalOrders ?? 0}
                    </span>
                    <span className="text-[9px] text-slate-400">orders</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 min-w-0">
                <OutboundOrderIcon />
                <div className="min-w-0">
                  <div className="text-[9.5px] xl:text-[10px] leading-tight text-slate-300 whitespace-nowrap">
                    Outbound Orders
                  </div>
                  <div className="flex items-baseline gap-1 leading-none mt-0.5">
                    <span className="font-display text-[17px] xl:text-[19px] font-bold text-white tabular-nums">
                      {kpi?.outboundOrders ?? 0}
                    </span>
                    <span className="text-[9px] text-slate-400">orders</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 min-w-0">
                <InboundWarehouseIcon />
                <div className="min-w-0">
                  <div className="text-[9.5px] xl:text-[10px] leading-tight text-slate-300 whitespace-nowrap">
                    Inbound Orders
                  </div>
                  <div className="flex items-baseline gap-1 leading-none mt-0.5">
                    <span className="font-display text-[17px] xl:text-[19px] font-bold text-white tabular-nums">
                      {kpi?.inboundOrders ?? 0}
                    </span>
                    <span className="text-[9px] text-slate-400">orders</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Panel 1: AS/RS Order Task Trend + Completion Ring */}
            <div className="shrink-0">
              <SectionHeader title="AS/RS Order Task Trend" />
              <div className="relative flex items-center gap-1.5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-center gap-5 text-[10px] text-slate-300 mb-0.5">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-[#FACC15]" />
                      Outbound
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-[#EA580C]" />
                      Inbound
                    </span>
                  </div>
                  <div className="h-[112px]">
                    <OrderTrendChart data={state?.orderTrends ?? []} />
                  </div>
                </div>
                <div className="shrink-0">
                  <CompletionRingGauge value={kpi?.ringCompletionRate ?? 0} />
                </div>
              </div>
            </div>

            {/* Panel 2: AS/RS Equipment Error Trend */}
            <div className="shrink-0">
              <SectionHeader title="AS/RS Equipment Error Trend" />
              <div className="flex items-center justify-between text-[11px] mb-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-slate-300">Total Errors</span>
                  <span className="font-display text-[18px] font-bold text-white tabular-nums leading-none">
                    {kpi?.totalErrors ?? 0}
                  </span>
                  <span className="text-[10px] text-slate-400">times</span>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-slate-300">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-[#EAB308]" />
                    Stacker Crane
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-slate-200" />
                    Conveyor Line
                  </span>
                </div>
              </div>
              <div className="text-[9.5px] text-slate-400 mb-0.5">Unit/Times</div>
              <div className="h-[110px]">
                <ErrorTrendChart data={state?.errorTrends ?? []} />
              </div>
            </div>

            {/* Panel 3: AS/RS Equipment Stats */}
            <div className="flex-1 min-h-[168px] flex flex-col">
              <SectionHeader
                title="AS/RS Equipment Stats"
                rightSlot={
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setEquipmentTab('stacker')}
                      className={`px-1.5 py-0.5 text-[10px] font-medium border rounded-[1px] transition-colors whitespace-nowrap ${
                        equipmentTab === 'stacker'
                          ? 'bg-[#6D4D23]/65 border-[#EAB308] text-white'
                          : 'bg-[#0F182A]/85 border-slate-700 text-slate-300 hover:text-white'
                      }`}
                    >
                      Stacker Crane
                    </button>
                    <button
                      type="button"
                      onClick={() => setEquipmentTab('conveyor')}
                      className={`px-1.5 py-0.5 text-[10px] font-medium border rounded-[1px] transition-colors whitespace-nowrap ${
                        equipmentTab === 'conveyor'
                          ? 'bg-[#6D4D23]/65 border-[#EAB308] text-white'
                          : 'bg-[#0F182A]/85 border-slate-700 text-slate-300 hover:text-white'
                      }`}
                    >
                      Conveyor Line
                    </button>
                  </div>
                }
              />

              <div className="flex-1 overflow-auto twin-scroll">
                <table className="w-full text-left border-collapse text-[10.5px]">
                  <thead>
                    <tr className="text-slate-300 border-b border-slate-700/70">
                      <th className="py-1 px-1 font-medium whitespace-nowrap">Equip</th>
                      <th className="py-1 px-1 font-medium whitespace-nowrap">Total</th>
                      <th className="py-1 px-1 font-medium whitespace-nowrap">Inbound</th>
                      <th className="py-1 px-1 font-medium whitespace-nowrap">Outbound</th>
                      <th className="py-1 px-1 font-medium whitespace-nowrap">Runtime</th>
                      <th className="py-1 px-1 font-medium whitespace-nowrap">Status</th>
                      <th className="py-1 px-1 font-medium whitespace-nowrap">Detail</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {filteredEquipment.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-4 text-center text-slate-400">
                          No equipment records ingested.
                        </td>
                      </tr>
                    ) : (
                      filteredEquipment.map((eq) => {
                        const isSelected = selectedEquipmentCode === eq.code;
                        const statusColor =
                          eq.status === 'Running'
                            ? 'text-emerald-400'
                            : eq.status === 'Standby'
                              ? 'text-teal-300'
                              : eq.status === 'Fault'
                                ? 'text-red-400'
                                : 'text-slate-400';
                        const dotColor =
                          eq.status === 'Running'
                            ? 'bg-emerald-400'
                            : eq.status === 'Standby'
                              ? 'bg-teal-300'
                              : eq.status === 'Fault'
                                ? 'bg-red-400'
                                : 'bg-slate-400';

                        return (
                          <tr
                            key={eq.id}
                            onClick={() =>
                              setSelectedEquipmentCode(isSelected ? null : eq.code)
                            }
                            className={`cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-amber-500/15'
                                : 'hover:bg-slate-800/40'
                            }`}
                          >
                            <td className="py-1.5 px-1 font-mono-tabular text-slate-100">
                              {eq.code}
                            </td>
                            <td className="py-1.5 px-1 font-mono-tabular text-slate-200">
                              {eq.totalTasks}
                            </td>
                            <td className="py-1.5 px-1 font-mono-tabular text-slate-200">
                              {eq.inboundTasks}
                            </td>
                            <td className="py-1.5 px-1 font-mono-tabular text-slate-200">
                              {eq.outboundTasks}
                            </td>
                            <td className="py-1.5 px-1 font-mono-tabular text-slate-200">
                              {eq.runtimeHours}
                            </td>
                            <td className="py-1.5 px-1 whitespace-nowrap">
                              <span className={`inline-flex items-center gap-1 ${statusColor}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                                {eq.status}
                              </span>
                            </td>
                            <td className="py-1.5 px-1 font-mono-tabular text-slate-400">
                              {eq.statusDetail}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </aside>

          {/* =============================================================== */}
          {/* RIGHT TELEMETRY COLUMN                                          */}
          {/* =============================================================== */}
          <aside className="order-3 pointer-events-auto flex flex-col justify-between gap-2.5 xl:pl-2 xl:h-full xl:overflow-y-auto twin-scroll">
            {/* Panel 1: Real-time Data */}
            <div className="shrink-0">
              <SectionHeader title="Real-time Data" />
              <div className="grid grid-cols-1 sm:grid-cols-[0.86fr_1fr_1.18fr] gap-2 sm:gap-1.5 items-stretch">
                {/* Sub-col 1: Live Tasks */}
                <div className="flex flex-col gap-1.5">
                  <div className="text-[11px] font-medium text-slate-200">Live Tasks</div>

                  <div className="bg-[#0B1426]/85 border border-slate-700/75 px-2 py-1.5 text-center rounded-[2px]">
                    <div className="text-[10px] text-slate-300">Pending</div>
                    <div className="font-display text-[17px] font-bold text-[#F59E0B] leading-tight tabular-nums">
                      {kpi?.pendingTasks ?? 0}
                    </div>
                    <div className="mt-1 pt-1 border-t border-slate-700/60 text-[9px] text-slate-300 font-mono-tabular">
                      Out {kpi?.pendingOutbound ?? 0} | In {kpi?.pendingInbound ?? 0}
                    </div>
                  </div>

                  <div className="bg-[#0B1426]/85 border border-slate-700/75 px-2 py-1.5 text-center rounded-[2px]">
                    <div className="text-[10px] text-slate-300">Running</div>
                    <div className="font-display text-[17px] font-bold text-[#F59E0B] leading-tight tabular-nums">
                      {kpi?.runningTasks ?? 0}
                    </div>
                    <div className="mt-1 pt-1 border-t border-slate-700/60 text-[9px] text-slate-300 font-mono-tabular">
                      Out {kpi?.runningOutbound ?? 0} | In {kpi?.runningInbound ?? 0}
                    </div>
                  </div>
                </div>

                {/* Sub-col 2: Live Status Bar Chart */}
                <div className="flex flex-col">
                  <div className="text-[11px] font-medium text-slate-200 mb-1">
                    Live Status
                  </div>
                  <div className="flex-1">
                    <EquipmentLiveBarChart items={state?.equipmentLiveStatus ?? []} />
                  </div>
                </div>

                {/* Sub-col 3: Rack Occupancy Donut */}
                <div className="flex flex-col">
                  <div className="text-[11px] font-medium text-slate-200 mb-1">
                    Rack Occupancy
                  </div>
                  <div className="flex-1">
                    <RackOccupancyDonut
                      total={kpi?.rackTotal ?? 0}
                      normalPct={kpi?.rackNormalPct ?? 0}
                      offlinePct={kpi?.rackOfflinePct ?? 0}
                      alertPct={kpi?.rackAlertPct ?? 0}
                      disabledPct={kpi?.rackDisabledPct ?? 0}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Panel 2: Task Details */}
            <div className="flex-1 min-h-[168px] flex flex-col">
              <SectionHeader
                title="Task Details"
                rightSlot={
                  <div className="flex items-center gap-1">
                    {(
                      [
                        { id: 'All', label: 'All' },
                        { id: 'Pending', label: 'Pending' },
                        { id: 'Running', label: 'Running' },
                        { id: 'Completed', label: 'Done' },
                      ] as const
                    ).map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setTaskFilter(f.id)}
                        className={`px-1.5 py-0.5 text-[10px] font-medium border rounded-[1px] transition-colors whitespace-nowrap ${
                          taskFilter === f.id
                            ? 'bg-[#6D4D23]/65 border-[#EAB308] text-white'
                            : 'bg-[#0F182A]/85 border-slate-700 text-slate-300 hover:text-white'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                }
              />

              <div className="flex-1 overflow-auto twin-scroll">
                <table className="w-full text-left border-collapse text-[10.5px]">
                  <thead>
                    <tr className="text-slate-300 border-b border-slate-700/70">
                      <th className="py-1 px-1 font-medium whitespace-nowrap">Order No</th>
                      <th className="py-1 px-1 font-medium whitespace-nowrap">Mat. No</th>
                      <th className="py-1 px-1 font-medium whitespace-nowrap">Type</th>
                      <th className="py-1 px-1 font-medium whitespace-nowrap">Location</th>
                      <th className="py-1 px-1 font-medium whitespace-nowrap">Status</th>
                      <th className="py-1 px-1 font-medium whitespace-nowrap">Equip</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {filteredTasks.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-4 text-center text-slate-400">
                          No tasks matching filter.
                        </td>
                      </tr>
                    ) : (
                      filteredTasks.slice(0, 8).map((t) => {
                        const statusColor =
                          t.status === 'Completed'
                            ? 'text-emerald-400'
                            : t.status === 'Running'
                              ? 'text-amber-300'
                              : 'text-slate-300';
                        const dotColor =
                          t.status === 'Completed'
                            ? 'bg-emerald-400'
                            : t.status === 'Running'
                              ? 'bg-amber-300'
                              : 'bg-slate-400';

                        return (
                          <tr key={t.id} className="hover:bg-slate-800/40">
                            <td className="py-1.5 px-1 font-mono-tabular text-slate-200 max-w-[68px] truncate">
                              {t.orderNo}
                            </td>
                            <td className="py-1.5 px-1 font-mono-tabular text-slate-200 max-w-[56px] truncate">
                              {t.materialNo}
                            </td>
                            <td className="py-1.5 px-1 text-slate-200 whitespace-nowrap">
                              {t.taskType}
                            </td>
                            <td className="py-1.5 px-1 font-mono-tabular text-slate-400">
                              {t.location}
                            </td>
                            <td className="py-1.5 px-1 whitespace-nowrap">
                              <span className={`inline-flex items-center gap-1 ${statusColor}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                                {t.status}
                              </span>
                            </td>
                            <td className="py-1.5 px-1 font-mono-tabular text-slate-400">
                              {t.equipmentCode}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Panel 3: Notifications */}
            <div className="shrink-0 flex flex-col">
              <SectionHeader
                title="Notifications"
                rightSlot={
                  <div className="flex items-center gap-1">
                    {(
                      [
                        { id: 'All', label: 'All' },
                        { id: 'Alert', label: 'Alerts' },
                      ] as const
                    ).map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setNotifFilter(f.id)}
                        className={`px-2 py-0.5 text-[10px] font-medium border rounded-[1px] transition-colors whitespace-nowrap ${
                          notifFilter === f.id
                            ? 'bg-[#6D4D23]/65 border-[#EAB308] text-white'
                            : 'bg-[#0F182A]/85 border-slate-700 text-slate-300 hover:text-white'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                }
              />

              {/* Summary Boxes */}
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div className="flex items-center gap-2.5 px-2.5 py-2 bg-[#0B1426]/85 border border-slate-700/75 rounded-[2px]">
                  <div className="w-8 h-8 rounded-[2px] bg-[#162238] border border-slate-600/60 flex items-center justify-center shrink-0">
                    <MessageSquareText className="w-4 h-4 text-[#D4A44A]" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] text-slate-300 truncate">Total Alerts</div>
                    <div className="flex items-baseline gap-1 leading-none mt-0.5">
                      <span className="font-display text-[17px] font-bold text-white tabular-nums">
                        {kpi?.totalNotifications ?? 0}
                      </span>
                      <span className="text-[9px] text-slate-400">msgs</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 px-2.5 py-2 bg-[#0B1426]/85 border border-slate-700/75 rounded-[2px]">
                  <div className="w-8 h-8 rounded-[2px] bg-[#241219] border border-red-500/40 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] text-slate-300 truncate">Error Alerts</div>
                    <div className="flex items-baseline gap-1 leading-none mt-0.5">
                      <span className="font-display text-[17px] font-bold text-red-500 tabular-nums">
                        {kpi?.alertNotifications ?? 0}
                      </span>
                      <span className="text-[9px] text-slate-400">msgs</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Alert Feed List */}
              <div className="space-y-1.5 max-h-[158px] overflow-y-auto twin-scroll">
                {filteredNotifications.length === 0 ? (
                  <div className="py-4 text-center text-[11px] text-slate-400 border border-slate-800/60 rounded-[2px]">
                    No notifications recorded.
                  </div>
                ) : (
                  filteredNotifications.slice(0, 6).map((n) => (
                    <div
                      key={n.id}
                      className="flex items-center gap-2.5 px-2.5 py-1.5 bg-[#091224]/85 border border-slate-800/80 hover:border-red-500/40 rounded-[2px] transition-colors"
                    >
                      <AlertBeaconIcon />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 text-[11px]">
                          <span className="font-medium text-slate-100 truncate">
                            {n.title}
                          </span>
                          <span className="font-mono-tabular text-[10px] text-slate-400 shrink-0">
                            {n.occurredAt}
                          </span>
                        </div>
                        <div className="font-mono-tabular text-[10px] text-slate-300 truncate mt-0.5">
                          {n.referenceCode}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </aside>
        </div>
      </main>

      {showApiKeysModal ? (
        <ApiKeysModal token={token} onClose={() => setShowApiKeysModal(false)} />
      ) : null}
    </div>
  );
}
