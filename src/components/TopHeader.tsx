import { useEffect, useState } from 'react';
import { Clock, FileCode2, KeyRound, LogOut } from 'lucide-react';
import type { AuthUser } from '../types/dashboard';

interface TopHeaderProps {
  user: AuthUser;
  socketConnected: boolean;
  onOpenApiKeys: () => void;
  onLogout: () => void;
}

function formatHeaderTime(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const weekday = d.toLocaleDateString('en-US', { weekday: 'long' });
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${yyyy}.${mm}.${dd} | ${weekday} | ${hh}:${min}:${ss}`;
}

export function TopHeader({
  user,
  socketConnected,
  onOpenApiKeys,
  onLogout,
}: TopHeaderProps) {
  const [nowStr, setNowStr] = useState(() => formatHeaderTime(new Date()));

  useEffect(() => {
    const id = window.setInterval(() => {
      setNowStr(formatHeaderTime(new Date()));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <header className="relative z-30 w-full h-[54px] lg:h-[60px] shrink-0 select-none overflow-visible pointer-events-none">
      {/* Precision-matched Stepped Architectural Gold-Bronze SVG Frame */}
      <svg
        viewBox="0 0 1920 60"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full pointer-events-none"
        aria-hidden="true"
      >
        <defs>
          {/* Center trapezoid warm golden-bronze radial glow */}
          <radialGradient id="hdrCenterGlow" cx="50%" cy="22%" r="60%">
            <stop offset="0%" stopColor="#8C6223" stopOpacity="0.72" />
            <stop offset="48%" stopColor="#3B2B15" stopOpacity="0.88" />
            <stop offset="100%" stopColor="#0C1320" stopOpacity="0.96" />
          </radialGradient>

          {/* Outer top ochre-gold bar */}
          <linearGradient id="hdrGoldBarL" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#9A6D29" stopOpacity="0.95" />
            <stop offset="70%" stopColor="#BA8739" stopOpacity="0.98" />
            <stop offset="100%" stopColor="#D6A34B" stopOpacity="1" />
          </linearGradient>
          <linearGradient id="hdrGoldBarR" x1="100%" y1="0%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#9A6D29" stopOpacity="0.95" />
            <stop offset="70%" stopColor="#BA8739" stopOpacity="0.98" />
            <stop offset="100%" stopColor="#D6A34B" stopOpacity="1" />
          </linearGradient>

          {/* Main dark metallic plate */}
          <linearGradient id="hdrPlateDark" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#121823" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#080E1A" stopOpacity="0.9" />
          </linearGradient>

          {/* Center bottom glow */}
          <filter id="hdrTipGlow" x="-20%" y="-100%" width="140%" height="300%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Full Stepped Dark Background Plate */}
        <polygon
          points="0,0 1920,0 1920,40 1456,40 1438,47 1222,47 1214,55 706,55 698,47 482,47 464,40 0,40"
          fill="url(#hdrPlateDark)"
        />

        {/* Top-Left & Top-Right Solid Ochre-Gold Ribbon Bending 45° Downward */}
        <polygon
          points="0,0 374,0 410,33 434,33 430,37 404,37 368,7 0,7"
          fill="url(#hdrGoldBarL)"
        />
        <polygon
          points="1920,0 1546,0 1510,33 1486,33 1490,37 1516,37 1552,7 1920,7"
          fill="url(#hdrGoldBarR)"
        />

        {/* Left Secondary Parallel 45° Slash Bracket */}
        <polygon
          points="396,0 416,0 450,31 430,31"
          fill="#8E6426"
          stroke="#C99642"
          strokeWidth="0.9"
        />

        {/* Right Secondary Parallel 45° Slash Bracket */}
        <polygon
          points="1524,0 1504,0 1470,31 1490,31"
          fill="#8E6426"
          stroke="#C99642"
          strokeWidth="0.9"
        />

        {/* Left Horizontal Chamfered Wing Plate (between slash & center banner) */}
        <polygon
          points="436,11 672,11 678,27 458,27"
          fill="#1D1A16"
          stroke="#A67932"
          strokeWidth="1.2"
        />
        <polygon
          points="448,14 666,14 669,20 455,20"
          fill="#5C421C"
          opacity="0.45"
        />

        {/* Right Horizontal Chamfered Wing Plate (mirrored) */}
        <polygon
          points="1484,11 1248,11 1242,27 1462,27"
          fill="#1D1A16"
          stroke="#A67932"
          strokeWidth="1.2"
        />
        <polygon
          points="1472,14 1254,14 1251,20 1465,20"
          fill="#5C421C"
          opacity="0.45"
        />

        {/* Subtle Inner Top Dark Cap Segments next to Center Banner */}
        <polygon
          points="430,0 676,0 672,9 442,9"
          fill="#101723"
          stroke="#594322"
          strokeWidth="0.8"
        />
        <polygon
          points="1490,0 1244,0 1248,9 1478,9"
          fill="#101723"
          stroke="#594322"
          strokeWidth="0.8"
        />

        {/* Center Title Trapezoid Chamber */}
        <polygon
          points="678,0 1242,0 1216,54 704,54"
          fill="url(#hdrCenterGlow)"
        />
        {/* Subtle Inner Top Accent inside Center Trapezoid */}
        <polygon
          points="712,0 1208,0 1202,4 718,4"
          fill="#D4A149"
          opacity="0.55"
        />
        {/* Center Trapezoid Gold Rim */}
        <polyline
          points="678,0 704,54 1216,54 1242,0"
          fill="none"
          stroke="#D6A44B"
          strokeWidth="1.5"
        />

        {/* Bottom Stepped Perimeter Hairline (Left & Right Wings) */}
        <polyline
          points="0,40 464,40 482,47 700,47"
          fill="none"
          stroke="#9E7432"
          strokeOpacity="0.82"
          strokeWidth="1.2"
        />
        <polyline
          points="1220,47 1438,47 1456,40 1920,40"
          fill="none"
          stroke="#9E7432"
          strokeOpacity="0.82"
          strokeWidth="1.2"
        />

        {/* Subtle Inner Baseline Under Timestamp & Right Wing */}
        <line
          x1="12"
          y1="37"
          x2="395"
          y2="37"
          stroke="#7A5B2A"
          strokeOpacity="0.45"
          strokeWidth="0.8"
        />
        <line
          x1="1525"
          y1="37"
          x2="1908"
          y2="37"
          stroke="#7A5B2A"
          strokeOpacity="0.45"
          strokeWidth="0.8"
        />

        {/* Glowing Warm-Gold Bottom Center Highlight Bar */}
        <line
          x1="875"
          y1="54.5"
          x2="1045"
          y2="54.5"
          stroke="#FFF3C4"
          strokeWidth="2.4"
          strokeLinecap="round"
          filter="url(#hdrTipGlow)"
        />
      </svg>

      {/* Header Content Layer */}
      <div className="relative z-10 h-full px-3 lg:px-5 flex items-start justify-between">
        {/* Left Wing: Clock + Date/Time (sitting cleanly inside 7px..37px band) */}
        <div className="pt-[8px] h-[38px] flex items-center gap-2 min-w-0 max-w-[26%] pointer-events-auto">
          <Clock className="w-3.5 h-3.5 text-slate-300/90 shrink-0" />
          <span className="font-mono-tabular text-[11px] lg:text-[12px] text-slate-200 tracking-[0.02em] truncate">
            {nowStr}
          </span>
        </div>

        {/* Symmetric Chevrons >>>> and <<<< in their Recessed Lower Shelves */}
        <div className="hidden lg:flex items-center justify-between w-[42%] max-w-[780px] absolute left-1/2 -translate-x-1/2 top-[30px] pointer-events-none px-1">
          <span
            aria-hidden="true"
            className="font-mono-tabular text-[11px] font-semibold tracking-[0.12em] text-[#C89A42]/90"
          >
            &gt;&gt;&gt;&gt;
          </span>
          <span
            aria-hidden="true"
            className="font-mono-tabular text-[11px] font-semibold tracking-[0.12em] text-[#C89A42]/90"
          >
            &lt;&lt;&lt;&lt;
          </span>
        </div>

        {/* Center Title inside Trapezoid */}
        <div className="absolute left-1/2 -translate-x-1/2 top-0 h-[53px] flex items-center justify-center pointer-events-none">
          <h1 className="font-display text-[15px] sm:text-[18px] lg:text-[23px] font-semibold tracking-[0.08em] text-[#FBF6E8] whitespace-nowrap drop-shadow-[0_2px_8px_rgba(0,0,0,0.65)]">
            Smart Factory Digital Twin
          </h1>
        </div>

        {/* Right Wing: Quiet, border-free architectural controls balancing the timestamp */}
        <div className="pt-[8px] h-[38px] flex items-center gap-2.5 lg:gap-3.5 shrink-0 pointer-events-auto text-[11px]">
          <span
            className={`hidden sm:inline-flex items-center gap-1.5 font-medium whitespace-nowrap ${
              socketConnected ? 'text-emerald-400/90' : 'text-amber-400/90'
            }`}
            title={socketConnected ? 'Socket.IO Connected' : 'Connecting to Socket.IO'}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                socketConnected ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            />
            {socketConnected ? 'Live' : 'Syncing'}
          </span>

          <button
            type="button"
            onClick={onOpenApiKeys}
            className="inline-flex items-center gap-1 text-slate-300 hover:text-[#FACC15] transition-colors whitespace-nowrap shrink-0"
          >
            <KeyRound className="w-3 h-3 text-[#D4A44A]" />
            <span className="hidden sm:inline">API Keys</span>
          </button>

          <a
            href="/api/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-slate-300 hover:text-cyan-300 transition-colors whitespace-nowrap shrink-0"
          >
            <FileCode2 className="w-3 h-3 text-cyan-400/90" />
            <span className="hidden md:inline">Swagger</span>
          </a>

          <button
            type="button"
            onClick={onLogout}
            title={`Signed in as ${user.username} — Sign Out`}
            className="inline-flex items-center gap-1 text-slate-400 hover:text-red-300 transition-colors whitespace-nowrap shrink-0"
          >
            <span className="hidden xl:inline max-w-[74px] truncate text-slate-300">
              {user.username}
            </span>
            <LogOut className="w-3 h-3" />
          </button>
        </div>
      </div>
    </header>
  );
}
