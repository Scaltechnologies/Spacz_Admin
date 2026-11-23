import type { ReactNode } from 'react';
import { AlertTriangle, Inbox, RefreshCw, ServerCrash, ShieldAlert, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isApiError, errorMessage } from '@/lib/api/errors';
import { cn } from '@/lib/utils';
import { CopyButton } from './CopyButton';

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 px-6 py-14 text-center', className)}>
      <div className="relative flex size-14 items-center justify-center rounded-2xl bg-primary-soft text-primary">
        <div className="absolute inset-0 -z-10 scale-150 rounded-full bg-primary/5 blur-xl" aria-hidden />
        {icon ?? <Inbox className="size-6" aria-hidden />}
      </div>
      <div className="max-w-sm space-y-1">
        <h3 className="text-[15px] font-semibold">{title}</h3>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function ErrorState({
  error,
  onRetry,
  title,
  className,
  compact,
}: {
  error: unknown;
  onRetry?: () => void;
  title?: string;
  className?: string;
  compact?: boolean;
}) {
  const api = isApiError(error) ? error : null;
  const Icon = api?.isNetwork ? WifiOff : api?.status === 403 ? ShieldAlert : api && api.status >= 500 ? ServerCrash : AlertTriangle;
  const heading =
    title ??
    (api?.code === 'NOT_FOUND'
      ? 'Not found'
      : api?.isNetwork
        ? 'Can’t reach the server'
        : api?.status === 403
          ? 'Access denied'
          : api && api.status >= 500
            ? 'The server had a problem'
            : 'Something went wrong');
  return (
    <div
      role="alert"
      className={cn('flex flex-col items-center justify-center gap-3 text-center', compact ? 'px-4 py-6' : 'px-6 py-14', className)}
    >
      <div className="flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <Icon className="size-5" aria-hidden />
      </div>
      <div className="max-w-md space-y-1">
        <h3 className="text-[15px] font-semibold">{heading}</h3>
        <p className="text-sm text-muted-foreground">{errorMessage(error)}</p>
        {api?.correlationId && (
          <p className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
            Reference <code className="font-mono">{api.correlationId}</code>
            <CopyButton value={api.correlationId} label="Copy reference" />
          </p>
        )}
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw /> Try again
        </Button>
      )}
    </div>
  );
}

export function PartialDataBanner({
  title = 'Some data could not be loaded',
  items,
  onRetry,
  retrying,
}: {
  title?: string;
  items: string[];
  onRetry?: () => void;
  retrying?: boolean;
}) {
  if (!items.length) return null;
  return (
    <div
      role="status"
      className="flex flex-col gap-3 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm sm:flex-row sm:items-center"
    >
      <AlertTriangle className="size-4 shrink-0 text-amber-600 dark:text-amber-300" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="font-medium">{title}</p>
        <p className="text-muted-foreground">{items.join(' · ')}</p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} loading={retrying}>
          {!retrying && <RefreshCw />} Retry
        </Button>
      )}
    </div>
  );
}

export function Callout({
  tone = 'info',
  icon,
  title,
  children,
  className,
}: {
  tone?: 'info' | 'warning' | 'danger' | 'success';
  icon?: ReactNode;
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  const styles = {
    info: 'border-info/30 bg-info/8',
    warning: 'border-warning/40 bg-warning/10',
    danger: 'border-destructive/30 bg-destructive/8',
    success: 'border-success/30 bg-success/8',
  }[tone];
  return (
    <div className={cn('flex gap-3 rounded-xl border px-4 py-3 text-sm', styles, className)}>
      {icon && <span className="mt-0.5 shrink-0 [&_svg]:size-4">{icon}</span>}
      <div className="min-w-0 space-y-0.5">
        {title && <p className="font-medium">{title}</p>}
        {children && <div className="text-muted-foreground">{children}</div>}
      </div>
    </div>
  );
}
