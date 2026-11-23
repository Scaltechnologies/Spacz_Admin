import { Badge, toneDot } from '@/components/ui/badge';
import { ROLE_META, statusMeta, auditTone } from '@/lib/status';
import type { Role } from '@/lib/api/types';
import { cn } from '@/lib/utils';
import { humanize } from '@/lib/format';

export function StatusBadge({ status, className }: { status: string | null | undefined; className?: string }) {
  const meta = statusMeta(status);
  return (
    <Badge tone={meta.tone} className={className}>
      <span className={cn('size-1.5 rounded-full', toneDot[meta.tone], meta.pulse && 'animate-pulse-dot')} aria-hidden />
      {meta.label}
    </Badge>
  );
}

export function RoleBadge({ role, className }: { role: Role | string | null | undefined; className?: string }) {
  const meta = role && role in ROLE_META ? ROLE_META[role as Role] : { label: role === 'SYSTEM' ? 'System' : humanize(role), tone: 'neutral' as const };
  return (
    <Badge tone={meta.tone} className={className}>
      {meta.label}
    </Badge>
  );
}

export function AuditActionBadge({ action }: { action: string }) {
  const tone = auditTone(action);
  return (
    <Badge tone={tone} className="font-mono text-[11px] tracking-tight">
      {action}
    </Badge>
  );
}
