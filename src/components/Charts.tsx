import { useId } from 'react';
import type {
  EquipmentLiveStatusItem,
  ErrorTrendPoint,
  OrderTrendPoint,
} from '../types/dashboard';

function buildSmoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const midX = (p0.x + p1.x) / 2;
    d += ` C ${midX.toFixed(2)} ${p0.y.toFixed(2)}, ${midX.toFixed(2)} ${p1.y.toFixed(2)}, ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`;
  }
  return d;
}

function buildSmoothArea(
  points: { x: number; y: number }[],
  baselineY: number,
): string {
  if (points.length === 0) return '';
  const line = buildSmoothPath(points);
  const last = points[points.length - 1];
  const first = points[0];
  return `${line} L ${last.x.toFixed(2)} ${baselineY.toFixed(2)} L ${first.x.toFixed(2)} ${baselineY.toFixed(2)} Z`;
}

export function OrderTrendChart({ data }: { data: OrderTrendPoint[] }) {
  const uid = useId();
  const w = 310;
  const h = 112;
  const padL = 26;
  const padR = 8;
  const padT = 10;
  const padB = 20;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;
  const yTicks = [0, 50, 100, 200, 300];
  const maxY = 300;

  const mapY = (val: number) => {
    // Non-linear visual scale matching reference ticks (0, 50, 100, 200, 300)
    const clamped = Math.max(0, Math.min(maxY, val));
    let ratio = 0;
    if (clamped <= 100) {
      ratio = (clamped / 100) * 0.5;
    } else {
      ratio = 0.5 + ((clamped - 100) / 200) * 0.5;
    }
    return padT + plotH * (1 - ratio);
  };

  const ptsOut = data.map((d, i) => ({
    x: padL + (data.length > 1 ? (i / (data.length - 1)) * plotW : plotW / 2),
    y: mapY(d.outbound),
  }));
  const ptsIn = data.map((d, i) => ({
    x: padL + (data.length > 1 ? (i / (data.length - 1)) * plotW : plotW / 2),
    y: mapY(d.inbound),
  }));
  const baseY = padT + plotH;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="w-full h-full overflow-visible select-none"
      role="img"
      aria-label="AS/RS Order Task Trend Area Chart"
    >
      <defs>
        <linearGradient id={`outGrad-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#EAB308" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#EAB308" stopOpacity="0.02" />
        </linearGradient>
        <linearGradient id={`inGrad-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F97316" stopOpacity="0.42" />
          <stop offset="100%" stopColor="#F97316" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {yTicks.map((tick) => {
        const y = mapY(tick);
        return (
          <g key={tick}>
            <line
              x1={padL}
              x2={w - padR}
              y1={y}
              y2={y}
              stroke="rgba(148, 163, 184, 0.16)"
              strokeDasharray="2 3"
              strokeWidth="1"
            />
            <text
              x={padL - 5}
              y={y + 3}
              textAnchor="end"
              className="fill-slate-400 text-[9px] font-mono-tabular"
            >
              {tick}
            </text>
          </g>
        );
      })}

      {data.length > 0 ? (
        <>
          <path d={buildSmoothArea(ptsIn, baseY)} fill={`url(#inGrad-${uid})`} />
          <path d={buildSmoothArea(ptsOut, baseY)} fill={`url(#outGrad-${uid})`} />
          <path
            d={buildSmoothPath(ptsIn)}
            fill="none"
            stroke="#EA580C"
            strokeWidth="1.5"
          />
          <path
            d={buildSmoothPath(ptsOut)}
            fill="none"
            stroke="#FACC15"
            strokeWidth="1.6"
          />
        </>
      ) : null}

      {data.map((d, i) => {
        const x = padL + (data.length > 1 ? (i / (data.length - 1)) * plotW : plotW / 2);
        return (
          <text
            key={`${d.timeLabel}-${i}`}
            x={x}
            y={h - 4}
            textAnchor="middle"
            className="fill-slate-400 text-[9px] font-mono-tabular"
          >
            {d.timeLabel}
          </text>
        );
      })}
    </svg>
  );
}

export function ErrorTrendChart({ data }: { data: ErrorTrendPoint[] }) {
  const uid = useId();
  const w = 360;
  const h = 112;
  const padL = 28;
  const padR = 8;
  const padT = 12;
  const padB = 20;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;
  const yTicks = [0, 50, 100, 200];

  const mapY = (val: number) => {
    const clamped = Math.max(0, Math.min(200, val));
    let ratio = 0;
    if (clamped <= 100) {
      ratio = (clamped / 100) * 0.66;
    } else {
      ratio = 0.66 + ((clamped - 100) / 100) * 0.34;
    }
    return padT + plotH * (1 - ratio);
  };

  const ptsStacker = data.map((d, i) => ({
    x: padL + (data.length > 1 ? (i / (data.length - 1)) * plotW : plotW / 2),
    y: mapY(d.stackerErrors),
  }));
  const ptsConveyor = data.map((d, i) => ({
    x: padL + (data.length > 1 ? (i / (data.length - 1)) * plotW : plotW / 2),
    y: mapY(d.conveyorErrors),
  }));
  const baseY = padT + plotH;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="w-full h-full overflow-visible select-none"
      role="img"
      aria-label="AS/RS Equipment Error Trend Chart"
    >
      <defs>
        <linearGradient id={`errStacker-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#EAB308" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#EAB308" stopOpacity="0.02" />
        </linearGradient>
        <linearGradient id={`errConv-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E2E8F0" stopOpacity="0.32" />
          <stop offset="100%" stopColor="#E2E8F0" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {yTicks.map((tick) => {
        const y = mapY(tick);
        return (
          <g key={tick}>
            <line
              x1={padL}
              x2={w - padR}
              y1={y}
              y2={y}
              stroke="rgba(148, 163, 184, 0.16)"
              strokeDasharray="2 3"
              strokeWidth="1"
            />
            <text
              x={padL - 5}
              y={y + 3}
              textAnchor="end"
              className="fill-slate-400 text-[9px] font-mono-tabular"
            >
              {tick}
            </text>
          </g>
        );
      })}

      {data.length > 0 ? (
        <>
          <path d={buildSmoothArea(ptsConveyor, baseY)} fill={`url(#errConv-${uid})`} />
          <path d={buildSmoothArea(ptsStacker, baseY)} fill={`url(#errStacker-${uid})`} />
          <path
            d={buildSmoothPath(ptsConveyor)}
            fill="none"
            stroke="#CBD5E1"
            strokeWidth="1.4"
          />
          <path
            d={buildSmoothPath(ptsStacker)}
            fill="none"
            stroke="#EAB308"
            strokeWidth="1.6"
          />
        </>
      ) : null}

      {data.map((d, i) => {
        const x = padL + (data.length > 1 ? (i / (data.length - 1)) * plotW : plotW / 2);
        return (
          <text
            key={`${d.timeLabel}-${i}`}
            x={x}
            y={h - 4}
            textAnchor="middle"
            className="fill-slate-400 text-[8.5px] font-mono-tabular"
          >
            {d.timeLabel}
          </text>
        );
      })}
    </svg>
  );
}

export function CompletionRingGauge({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - clamped / 100);

  return (
    <div className="relative w-[98px] h-[98px] xl:w-[104px] xl:h-[104px] flex items-center justify-center shrink-0 select-none">
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <defs>
          <linearGradient id="ringGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FDE047" />
            <stop offset="60%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#D97706" />
          </linearGradient>
        </defs>
        {/* Outer cyan segmented ring */}
        <circle
          cx="50"
          cy="50"
          r="46"
          fill="none"
          stroke="rgba(34, 211, 238, 0.35)"
          strokeWidth="1.5"
          strokeDasharray="10 6"
        />
        {/* Inner dark fill */}
        <circle
          cx="50"
          cy="50"
          r="42"
          fill="rgba(7, 14, 28, 0.88)"
          stroke="rgba(56, 189, 248, 0.25)"
          strokeWidth="1"
        />
        {/* Track */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="rgba(148, 163, 184, 0.16)"
          strokeWidth="5.5"
        />
        {/* Active Progress */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="url(#ringGoldGrad)"
          strokeWidth="5.5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform="rotate(-90 50 50)"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
        <div className="flex items-baseline gap-0.5 leading-none">
          <span className="font-display text-[17px] font-bold text-white tabular-nums">
            {clamped.toFixed(1)}
          </span>
          <span className="text-[10px] text-slate-300 font-medium">%</span>
        </div>
        <span className="mt-1 text-[8.5px] leading-tight text-slate-300 max-w-[64px]">
          Task Completion
        </span>
      </div>
    </div>
  );
}

export function EquipmentLiveBarChart({
  items,
}: {
  items: EquipmentLiveStatusItem[];
}) {
  const stacker = items.find((i) => i.category === 'stacker');
  const conveyor = items.find((i) => i.category === 'conveyor');
  const stackerVal = stacker?.activeTotal ?? 0;
  const conveyorVal = conveyor?.activeTotal ?? 0;
  const ticks = [0, 50, 100, 200, 300];
  const maxVal = 300;

  const mapBarH = (val: number) => {
    const c = Math.max(0, Math.min(maxVal, val));
    if (c <= 100) return (c / 100) * 50;
    return 50 + ((c - 100) / 200) * 50;
  };

  return (
    <div className="flex flex-col justify-between h-full">
      {/* Legend matching reference */}
      <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[9.5px] text-slate-300 mb-1">
        <div className="flex items-center gap-1 whitespace-nowrap">
          <span className="w-1.5 h-1.5 bg-[#EAB308] shrink-0" />
          <span>Offline</span>
        </div>
        <div className="flex items-center gap-1 whitespace-nowrap">
          <span className="w-1.5 h-1.5 bg-[#EF4444] shrink-0" />
          <span>Fault</span>
        </div>
        <div className="flex items-center gap-1 whitespace-nowrap">
          <span className="w-1.5 h-1.5 bg-slate-200 shrink-0" />
          <span>Idle</span>
        </div>
        <div className="flex items-center gap-1 whitespace-nowrap">
          <span className="w-1.5 h-1.5 bg-[#22C55E] shrink-0" />
          <span>Running</span>
        </div>
      </div>

      {/* Bar chart area */}
      <div className="relative flex-1 min-h-[96px] flex flex-col justify-end pt-1">
        <div className="relative h-[86px] w-full flex items-end pl-6 pr-1 pb-4">
          {/* Y grid lines & labels */}
          {ticks.map((t) => {
            const pct = mapBarH(t);
            return (
              <div
                key={t}
                className="absolute left-6 right-1 border-b border-dashed border-slate-700/60"
                style={{ bottom: `${16 + (pct / 100) * 68}px` }}
              >
                <span className="absolute -left-6 -top-1.5 text-[8.5px] font-mono-tabular text-slate-400 w-5 text-right">
                  {t}
                </span>
              </div>
            );
          })}

          {/* Bars */}
          <div className="relative z-10 w-full h-[68px] flex items-end justify-around px-1">
            <div className="flex flex-col items-center">
              <div
                className="w-2.5 rounded-t-[1px] bg-gradient-to-t from-[#EA580C] via-[#F59E0B] to-[#FDE047] transition-all duration-300"
                style={{ height: `${Math.max(4, (mapBarH(stackerVal) / 100) * 68)}px` }}
                title={`Stacker Crane: ${stackerVal}`}
              />
            </div>
            <div className="flex flex-col items-center">
              <div
                className="w-2.5 rounded-t-[1px] bg-gradient-to-t from-[#EA580C] via-[#F59E0B] to-[#FACC15] transition-all duration-300"
                style={{ height: `${Math.max(4, (mapBarH(conveyorVal) / 100) * 68)}px` }}
                title={`Conveyor Line: ${conveyorVal}`}
              />
            </div>
          </div>

          {/* X-axis labels */}
          <div className="absolute bottom-0 left-6 right-1 flex justify-around text-[9px] text-slate-300">
            <span className="truncate">Stacker</span>
            <span className="truncate">Conveyor</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function RackOccupancyDonut({
  total,
  normalPct,
  offlinePct,
  alertPct,
  disabledPct,
}: {
  total: number;
  normalPct: number;
  offlinePct: number;
  alertPct: number;
  disabledPct: number;
}) {
  const radius = 34;
  const c = 2 * Math.PI * radius;

  const segments = [
    { label: 'Normal', pct: normalPct, color: '#22C55E' },
    { label: 'Offline', pct: offlinePct, color: '#E2E8F0' },
    { label: 'Alert', pct: alertPct, color: '#EF4444' },
    { label: 'Disabled', pct: disabledPct, color: '#475569' },
  ];

  const sumPct = Math.max(
    1,
    segments.reduce((acc, s) => acc + Math.max(0, s.pct), 0),
  );

  let cumulative = 0;

  return (
    <div className="flex flex-col items-center justify-between h-full">
      <div className="relative w-[84px] h-[84px] xl:w-[88px] xl:h-[88px] flex items-center justify-center">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          {/* Outer subtle gold/slate tech ring */}
          <circle
            cx="50"
            cy="50"
            r="44"
            fill="none"
            stroke="rgba(148, 163, 184, 0.2)"
            strokeWidth="1"
          />
          <circle
            cx="50"
            cy="50"
            r="44"
            fill="none"
            stroke="#D4A44A"
            strokeWidth="1.5"
            strokeDasharray="24 46"
            transform="rotate(-35 50 50)"
          />
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="rgba(8, 15, 30, 0.75)"
            stroke="rgba(51, 65, 85, 0.45)"
            strokeWidth="5"
          />
          {segments.map((seg) => {
            const frac = Math.max(0, seg.pct) / sumPct;
            const len = Math.max(0, frac * c - 2);
            const offset = -cumulative * c;
            cumulative += frac;
            return (
              <circle
                key={seg.label}
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth="5"
                strokeDasharray={`${len} ${c - len}`}
                strokeDashoffset={offset}
                transform="rotate(-90 50 50)"
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
          <span className="font-display text-[15px] font-bold text-white leading-none tabular-nums">
            {total}
          </span>
          <span className="mt-0.5 text-[8px] text-slate-300">Total Slots</span>
        </div>
      </div>

      {/* 2x2 Legend with guaranteed non-clipping spacing */}
      <div className="w-full grid grid-cols-2 gap-x-1.5 gap-y-0.5 text-[8.5px] xl:text-[9px] mt-1">
        <div className="flex items-center justify-between gap-0.5 min-w-0 whitespace-nowrap">
          <span className="inline-flex items-center gap-1 min-w-0">
            <span className="w-1.5 h-1.5 bg-[#22C55E] shrink-0" />
            <span className="text-slate-300 truncate">Normal</span>
          </span>
          <span className="text-slate-100 font-mono-tabular shrink-0">{normalPct}%</span>
        </div>
        <div className="flex items-center justify-between gap-0.5 min-w-0 whitespace-nowrap">
          <span className="inline-flex items-center gap-1 min-w-0">
            <span className="w-1.5 h-1.5 bg-slate-200 shrink-0" />
            <span className="text-slate-300 truncate">Offline</span>
          </span>
          <span className="text-slate-100 font-mono-tabular shrink-0">{offlinePct}%</span>
        </div>
        <div className="flex items-center justify-between gap-0.5 min-w-0 whitespace-nowrap">
          <span className="inline-flex items-center gap-1 min-w-0">
            <span className="w-1.5 h-1.5 bg-[#EF4444] shrink-0" />
            <span className="text-slate-300 truncate">Alert</span>
          </span>
          <span className="text-slate-100 font-mono-tabular shrink-0">{alertPct}%</span>
        </div>
        <div className="flex items-center justify-between gap-0.5 min-w-0 whitespace-nowrap">
          <span className="inline-flex items-center gap-1 min-w-0">
            <span className="w-1.5 h-1.5 bg-slate-500 shrink-0" />
            <span className="text-slate-300 truncate">Disabled</span>
          </span>
          <span className="text-slate-100 font-mono-tabular shrink-0">{disabledPct}%</span>
        </div>
      </div>
    </div>
  );
}
