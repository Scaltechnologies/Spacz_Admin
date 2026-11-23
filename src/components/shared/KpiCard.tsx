import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { ArrowUpRight, CloudOff } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton, Tooltip } from '@/components/ui/primitives';
import { formatNumber } from '@/lib/format';
import { cn } from '@/lib/utils';
import { usePrefs } from '@/lib/prefs';

/** Counts up once on first render (skipped with reduced motion). */
function useCountUp(target: number, enabled: boolean) {
  const reduced = usePrefs((s) => s.reducedMotion);
  const [value, setValue] = useState(enabled && !reduced ? 0 : target);
  const done = useRef(!enabled || reduced);
  useEffect(() => {
    if (done.current || typeof window === 'undefined') {
      setValue(target);
      return;
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      done.current = true;
      setValue(target);
      return;
    }
    const start = performance.now();
    const duration = 700;
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      setValue(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
      else done.current = true;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return value;
}

export interface KpiSubItem {
  label: string;
  value: ReactNode;
  tone?: 'warning' | 'danger' | 'success' | 'muted';
  to?: string;
}

export function KpiCard({
  icon,
  label,
  value,
  suffix,
  sub,
  to,
  loading,
  unavailable,
  accent = 'primary',
}: {
  icon: ReactNode;
  label: string;
  value: number | null | undefined;
  suffix?: ReactNode;
  sub?: KpiSubItem[];
  to?: string;
  loading?: boolean;
  unavailable?: string | false;
  accent?: 'primary' | 'success' | 'warning' | 'info' | 'violet' | 'rose';
}) {
  const animated = useCountUp(value ?? 0, value !== null && value !== undefined);
  const accentCls = {
    primary: 'bg-primary-soft text-primary',
    success: 'bg-success/12 text-success',
    warning: 'bg-warning/15 text-amber-600 dark:text-amber-300',
    info: 'bg-info/10 text-info',
    violet: 'bg-violet-500/10 text-violet-600 dark:text-violet-300',
    rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-300',
  }[accent];

  const body = (
    <Card
      className={cn(
        'group relative h-full overflow-hidden p-5 transition-[border-color,box-shadow]',
        to && !unavailable && 'hover:border-primary/40 hover:shadow-pop',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className={cn('flex size-10 items-center justify-center rounded-xl [&_svg]:size-5', accentCls)}>{icon}</div>
        {to && !unavailable && (
          <ArrowUpRight className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
        )}
      </div>
      <div className="mt-4 text-[13px] font-medium text-muted-foreground">{label}</div>
      {loading ? (
        <>
          <Skeleton className="mt-2 h-8 w-24" />
          <Skeleton className="mt-3 h-4 w-40" />
        </>
      ) : unavailable ? (
        <Tooltip content={unavailable}>
          <div className="mt-1.5 flex items-center gap-2 text-muted-foreground">
            <CloudOff className="size-5" aria-hidden />
            <span className="text-lg font-semibold">Unavailable</span>
          </div>
        </Tooltip>
      ) : (
        <>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-[30px] leading-none font-semibold tracking-tight tabular">{formatNumber(animated)}</span>
            {suffix && <span className="text-sm text-muted-foreground">{suffix}</span>}
          </div>
          {sub && sub.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs">
              {sub.map((s) => (
                <span key={s.label} className="inline-flex items-center gap-1 text-muted-foreground">
                  <span
                    className={cn(
                      'font-semibold tabular',
                      s.tone === 'warning' && 'text-amber-600 dark:text-amber-300',
                      s.tone === 'danger' && 'text-destructive',
                      s.tone === 'success' && 'text-success',
                      (!s.tone || s.tone === 'muted') && 'text-foreground',
                    )}
                  >
                    {s.value}
                  </span>
                  {s.label}
                </span>
              ))}
            </div>
          )}
        </>
      )}
    </Card>
  );

  if (to && !unavailable && !loading) {
    return (
      <Link to={to} className="block rounded-2xl focus-visible:ring-[3px] focus-visible:ring-primary/30 focus-visible:outline-none" aria-label={`${label}: open details`}>
        {body}
      </Link>
    );
  }
  return body;
}
