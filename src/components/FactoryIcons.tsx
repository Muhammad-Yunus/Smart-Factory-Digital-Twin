export function OrderClipboardIcon() {
  return (
    <svg viewBox="0 0 40 40" className="w-7 h-7 xl:w-[30px] xl:h-[30px] shrink-0" aria-hidden="true">
      <ellipse cx="20" cy="34" rx="14" ry="4" fill="#78350F" opacity="0.55" />
      <rect x="9" y="8" width="22" height="24" rx="2" fill="#1E293B" stroke="#D4A44A" strokeWidth="1.4" />
      <rect x="14" y="5" width="12" height="5" rx="1" fill="#F59E0B" />
      <line x1="14" y1="16" x2="26" y2="16" stroke="#FDE047" strokeWidth="1.6" />
      <line x1="14" y1="21" x2="26" y2="21" stroke="#CBD5E1" strokeWidth="1.4" />
      <line x1="14" y1="26" x2="22" y2="26" stroke="#CBD5E1" strokeWidth="1.4" />
    </svg>
  );
}

export function OutboundOrderIcon() {
  return (
    <svg viewBox="0 0 40 40" className="w-7 h-7 xl:w-[30px] xl:h-[30px] shrink-0" aria-hidden="true">
      <ellipse cx="20" cy="34" rx="14" ry="4" fill="#78350F" opacity="0.55" />
      <path d="M10 9 H24 L30 15 V31 H10 Z" fill="#1E293B" stroke="#D4A44A" strokeWidth="1.4" />
      <path d="M24 9 V15 H30" fill="none" stroke="#FACC15" strokeWidth="1.4" />
      <path d="M15 24 L25 18 M25 18 L21 17 M25 18 L24 22" stroke="#FACC15" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function InboundWarehouseIcon() {
  return (
    <svg viewBox="0 0 40 40" className="w-7 h-7 xl:w-[30px] xl:h-[30px] shrink-0" aria-hidden="true">
      <ellipse cx="20" cy="34" rx="14" ry="4" fill="#78350F" opacity="0.55" />
      <path d="M6 17 L20 7 L34 17 V31 H6 Z" fill="#1E293B" stroke="#D4A44A" strokeWidth="1.4" />
      <rect x="13" y="20" width="14" height="11" fill="#451A03" stroke="#F59E0B" strokeWidth="1.2" />
      <path d="M20 12 V25 M16 21 L20 25 L24 21" stroke="#FDE047" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function RingKpiEmblem({
  kind,
}: {
  kind: 'tasks' | 'completion' | 'outbound' | 'inbound';
}) {
  return (
    <div className="relative w-10 h-10 xl:w-[42px] xl:h-[42px] shrink-0 flex items-center justify-center">
      <svg viewBox="0 0 56 56" className="w-full h-full" aria-hidden="true">
        <defs>
          <radialGradient id={`kpiBg-${kind}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#78350F" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#091224" stopOpacity="0.95" />
          </radialGradient>
        </defs>
        <circle cx="28" cy="28" r="26" fill="none" stroke="#D4A44A" strokeOpacity="0.35" strokeWidth="1" strokeDasharray="4 3" />
        <circle cx="28" cy="28" r="22" fill={`url(#kpiBg-${kind})`} stroke="#EAB308" strokeWidth="1.5" />
        <circle cx="28" cy="28" r="18" fill="none" stroke="#FDE047" strokeOpacity="0.45" strokeWidth="0.9" strokeDasharray="10 4" />
        {kind === 'tasks' ? (
          <g stroke="#FACC15" strokeWidth="1.6" fill="none">
            <rect x="21" y="19" width="14" height="18" rx="1.5" />
            <path d="M24 19 V17 H32 V19" />
            <line x1="24" y1="25" x2="32" y2="25" />
            <line x1="24" y1="29" x2="32" y2="29" />
            <line x1="24" y1="33" x2="29" y2="33" />
          </g>
        ) : null}
        {kind === 'completion' ? (
          <g stroke="#FACC15" strokeWidth="1.6" fill="none">
            <circle cx="28" cy="28" r="8.5" />
            <path d="M28 19.5 V28 H36.5" fill="#FACC15" fillOpacity="0.3" />
          </g>
        ) : null}
        {kind === 'outbound' ? (
          <g stroke="#FACC15" strokeWidth="1.6" fill="none">
            <path d="M21 20 H31 L35 24 V36 H21 Z" />
            <path d="M25 30 L32 25 M29 24 H32.5 V27.5" />
          </g>
        ) : null}
        {kind === 'inbound' ? (
          <g stroke="#FACC15" strokeWidth="1.6" fill="none">
            <path d="M18 26 L28 19 L38 26 V36 H18 Z" />
            <path d="M28 24 V33 M25 30 L28 33 L31 30" />
          </g>
        ) : null}
      </svg>
    </div>
  );
}

export function AlertBeaconIcon() {
  return (
    <div className="relative w-8 h-8 rounded-full bg-[#241219] border border-red-500/45 flex items-center justify-center shrink-0">
      <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
        <path
          d="M7 16 L8.5 9.5 C9 7.8 10.3 6.8 12 6.8 C13.7 6.8 15 7.8 15.5 9.5 L17 16 Z"
          fill="#EF4444"
          stroke="#FCA5A5"
          strokeWidth="1"
        />
        <rect x="5.5" y="16" width="13" height="2.4" rx="0.8" fill="#B91C1C" />
        <line x1="12" y1="3" x2="12" y2="5" stroke="#FCA5A5" strokeWidth="1.4" strokeLinecap="round" />
        <line x1="6.5" y1="5.5" x2="8" y2="7" stroke="#FCA5A5" strokeWidth="1.3" strokeLinecap="round" />
        <line x1="17.5" y1="5.5" x2="16" y2="7" stroke="#FCA5A5" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    </div>
  );
}
