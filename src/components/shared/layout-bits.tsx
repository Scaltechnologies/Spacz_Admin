import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDateTime, formatRelative } from '@/lib/format';
import { Tooltip } from '@/components/ui/primitives';
import { CopyButton } from './CopyButton';

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  eyebrow?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-4 pb-6 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="min-w-0 space-y-1">
        {eyebrow && <div className="text-xs font-medium tracking-wide text-primary uppercase">{eyebrow}</div>}
        <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-[28px]">{title}</h1>
        {description && <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Relative time that ticks, with the absolute IST timestamp in a tooltip. */
export function RelativeTime({ value, className }: { value: string | null | undefined; className?: string }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);
  if (!value) return <span className={cn('text-muted-foreground', className)}>—</span>;
  return (
    <Tooltip content={formatDateTime(value)}>
      <time dateTime={value} className={cn('whitespace-nowrap', className)}>
        {formatRelative(value)}
      </time>
    </Tooltip>
  );
}

export interface InfoItem {
  label: string;
  value: ReactNode;
  copy?: string | number | null;
  mono?: boolean;
  span?: 1 | 2;
}

/** Label/value definition grid. */
export function InfoGrid({ items, className, columns = 2 }: { items: InfoItem[]; className?: string; columns?: 1 | 2 | 3 }) {
  return (
    <dl
      className={cn(
        'grid gap-x-6 gap-y-4',
        columns === 1 && 'grid-cols-1',
        columns === 2 && 'grid-cols-1 sm:grid-cols-2',
        columns === 3 && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
        className,
      )}
    >
      {items.map((it) => (
        <div key={it.label} className={cn('min-w-0 space-y-1', it.span === 2 && 'sm:col-span-2')}>
          <dt className="text-xs font-medium text-muted-foreground">{it.label}</dt>
          <dd className={cn('flex min-w-0 items-center gap-1 text-sm break-words', it.mono && 'font-mono text-[13px]')}>
            <span className="min-w-0">{it.value === null || it.value === undefined || it.value === '' ? <span className="text-muted-foreground">—</span> : it.value}</span>
            {it.copy !== undefined && it.copy !== null && it.copy !== '' && <CopyButton value={it.copy} label={`Copy ${it.label.toLowerCase()}`} />}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function SectionTitle({ children, action, className }: { children: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('mb-3 flex items-center justify-between gap-2', className)}>
      <h2 className="text-sm font-semibold tracking-tight">{children}</h2>
      {action}
    </div>
  );
}

export function EntityLink({ to, children, className }: { to: string; children: ReactNode; className?: string }) {
  return (
    <Link
      to={to}
      onClick={(e) => e.stopPropagation()}
      className={cn('group/link inline-flex items-center gap-0.5 font-medium text-foreground underline-offset-4 hover:text-primary hover:underline', className)}
    >
      {children}
      <ArrowUpRight className="size-3.5 opacity-0 transition-opacity group-hover/link:opacity-100" aria-hidden />
    </Link>
  );
}

export interface TimelineEntry {
  id: string | number;
  title: ReactNode;
  description?: ReactNode;
  time?: string | null;
  icon?: ReactNode;
  tone?: 'success' | 'danger' | 'warning' | 'info' | 'neutral' | 'primary' | 'violet';
  meta?: ReactNode;
}

const TIMELINE_TONES = {
  success: 'bg-success/12 text-success',
  danger: 'bg-destructive/10 text-destructive',
  warning: 'bg-warning/15 text-amber-700 dark:text-amber-300',
  info: 'bg-info/10 text-info',
  neutral: 'bg-muted text-muted-foreground',
  primary: 'bg-primary-soft text-primary',
  violet: 'bg-violet-500/10 text-violet-600 dark:text-violet-300',
};

export function Timeline({ items, className }: { items: TimelineEntry[]; className?: string }) {
  return (
    <ol className={cn('relative space-y-0', className)}>
      {items.map((item, i) => (
        <li key={item.id} className="relative flex gap-3 pb-5 last:pb-0">
          {i < items.length - 1 && <span className="absolute top-8 bottom-0 left-[15px] w-px bg-border" aria-hidden />}
          <span
            className={cn(
              'relative z-[1] flex size-8 shrink-0 items-center justify-center rounded-full ring-4 ring-card [&_svg]:size-3.5',
              TIMELINE_TONES[item.tone ?? 'neutral'],
            )}
          >
            {item.icon ?? <span className="size-1.5 rounded-full bg-current" />}
          </span>
          <div className="min-w-0 flex-1 pt-1">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
              <div className="min-w-0 text-sm font-medium">{item.title}</div>
              {item.time && <RelativeTime value={item.time} className="text-xs text-muted-foreground" />}
            </div>
            {item.description && <div className="mt-0.5 text-[13px] text-muted-foreground">{item.description}</div>}
            {item.meta && <div className="mt-1 text-xs text-muted-foreground">{item.meta}</div>}
          </div>
        </li>
      ))}
    </ol>
  );
}

export function JsonViewer({ value, className }: { value: unknown; className?: string }) {
  const json = JSON.stringify(value, null, 2);
  return (
    <div className={cn('relative rounded-xl border bg-muted/50', className)}>
      <div className="absolute top-2 right-2">
        <CopyButton value={json} label="Copy JSON" />
      </div>
      <pre className="scrollbar-thin max-h-80 overflow-auto p-4 font-mono text-xs leading-relaxed">{json}</pre>
    </div>
  );
}

export function StatPill({ label, value, className }: { label: string; value: ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-xl border bg-card px-3.5 py-2.5', className)}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-base font-semibold tabular">{value}</div>
    </div>
  );
}
