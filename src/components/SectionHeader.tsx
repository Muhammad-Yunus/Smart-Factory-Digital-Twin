import type { ReactNode } from 'react';

interface SectionHeaderProps {
  title: string;
  rightSlot?: ReactNode;
}

export function SectionHeader({ title, rightSlot }: SectionHeaderProps) {
  return (
    <div className="mb-2 shrink-0">
      <div className="flex items-center justify-between gap-2 pb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          {/* Gold bracketed square indicator matching reference */}
          <span
            aria-hidden="true"
            className="inline-flex items-center justify-center w-[15px] h-[15px] shrink-0 border border-[#D4A44A]/80 bg-[#1B1811]/90 relative"
          >
            <span className="w-[5px] h-[5px] bg-[#EAB308]" />
          </span>
          <h2 className="text-[13px] xl:text-[14px] font-semibold tracking-[0.02em] text-slate-100 truncate">
            {title}
          </h2>
        </div>
        {rightSlot ? <div className="flex items-center gap-1 shrink-0">{rightSlot}</div> : null}
      </div>
      {/* Gold left tick + fading horizontal rule */}
      <div className="relative h-[1px] w-full bg-gradient-to-r from-[#D4A44A]/70 via-[#D4A44A]/25 to-transparent">
        <span
          aria-hidden="true"
          className="absolute left-0 top-[-1px] w-6 h-[2px] bg-[#F5C55B]"
        />
      </div>
    </div>
  );
}
