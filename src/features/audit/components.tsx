import { useState } from 'react';
import { Link } from 'react-router';
import { History } from 'lucide-react';
import { useAuditLogs } from './api';
import { Timeline } from '@/components/shared/layout-bits';
import { EmptyState, ErrorState } from '@/components/shared/states';
import { AuditActionBadge } from '@/components/shared/StatusBadge';
import { Skeleton } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { auditTone } from '@/lib/status';
import type { AuditEntityType, AuditLog } from '@/lib/api/types';

export function actorLabel(log: AuditLog) {
  if (log.actorEmail) return log.actorEmail;
  if (log.actorRole === 'SYSTEM' || !log.actorRole) return 'System';
  return log.actorUserId ? `${log.actorRole.toLowerCase()} #${log.actorUserId}` : log.actorRole.toLowerCase();
}

/** Audit history for one entity, newest first, with "load more". */
export function EntityAuditTimeline({
  entityType,
  entityId,
  pageSize = 10,
  emptyText = 'No audit events recorded for this record yet.',
}: {
  entityType: AuditEntityType;
  entityId: number;
  pageSize?: number;
  emptyText?: string;
}) {
  const [size, setSize] = useState(pageSize);
  const { data, isLoading, error, refetch, isFetching } = useAuditLogs({ entityType, entityId, size });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="size-8 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }
  if (error) return <ErrorState compact error={error} onRetry={() => void refetch()} />;
  if (!data?.content.length) return <EmptyState className="py-8" icon={<History className="size-6" />} title="No history yet" description={emptyText} />;

  return (
    <div className="space-y-4">
      <Timeline
        items={data.content.map((log) => {
          const tone = auditTone(log.action);
          return {
            id: log.id,
            tone: tone === 'orange' ? 'warning' : tone,
            title: <AuditActionBadge action={log.action} />,
            description: log.description,
            meta: (
              <>
                {actorLabel(log)}
                {log.sourceService && <> · {log.sourceService}</>}
              </>
            ),
            time: log.timestamp,
          };
        })}
      />
      <div className="flex flex-wrap items-center gap-2">
        {!data.last && (
          <Button variant="outline" size="sm" loading={isFetching} onClick={() => setSize((s) => Math.min(100, s + pageSize * 2))}>
            Load more
          </Button>
        )}
        <Button variant="link" size="sm" asChild>
          <Link to={`/audit-logs?entityType=${entityType}&entityId=${entityId}`}>Open in audit log</Link>
        </Button>
      </div>
    </div>
  );
}
