import { useId } from 'react';
import { cn } from '@/lib/utils';

/** SPACZ mark: an "S" path inside an indigo tile with the amber study-lamp dot. */
export function LogoMark({ className }: { className?: string }) {
  const id = `spacz-tile-${useId().replace(/:/g, "")}`;
  return (
    <svg viewBox="0 0 32 32" className={cn('size-8 shrink-0', className)} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={{ stopColor: "var(--primary)" }} />
          <stop offset="1" style={{ stopColor: "color-mix(in oklch, var(--primary) 70%, black)" }} />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill={`url(#${id})`} />
      <path
        d="M10 20.5c0 1.9 2.2 3 6 3s6-1.4 6-3.6c0-4.8-11.6-2.6-11.6-7.6C10.4 10.1 12.6 8.5 16 8.5c3 0 5.2 1.1 5.6 3"
        fill="none"
        stroke="#fff"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <circle cx="23.5" cy="8.5" r="2.2" style={{ fill: "var(--accent)" }} />
    </svg>
  );
}

export function Logo({ className, subtitle }: { className?: string; subtitle?: string }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <LogoMark />
      <div className="min-w-0 leading-tight">
        <div className="text-[15px] font-semibold tracking-tight">
          SPACZ <span className="text-muted-foreground font-medium">Admin</span>
        </div>
        {subtitle && <div className="truncate text-[11px] text-muted-foreground">{subtitle}</div>}
      </div>
    </div>
  );
}
