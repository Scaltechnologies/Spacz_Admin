import { Fragment, useRef, useState } from 'react';
import { Link } from 'react-router';
import { ChevronRight, Download, ShieldCheck, X } from 'lucide-react';
import { toast } from 'sonner';
import { fetchAllAuditLogs, MAX_EXPORT_ROWS, useAuditLogs, type AuditListParams } from './api';
import { actorLabel } from './components';
import { PageHeader, InfoGrid, JsonViewer, RelativeTime } from '@/components/shared/layout-bits';
import { SearchInput } from '@/components/data-table/toolbar';
import { AuditActionBadge, RoleBadge } from '@/components/shared/StatusBadge';
import { CopyButton } from '@/components/shared/CopyButton';
import { EmptyState, ErrorState } from '@/components/shared/states';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { NativeSelect, Skeleton } from '@/components/ui/primitives';
import { usePagingState, useUrlSearch } from '@/hooks';
import { errorMessage } from '@/lib/api/errors';
import { ADMIN_AUDIT_ACTIONS, PLATFORM_AUDIT_ACTIONS } from '@/lib/status';
import { formatDateTime, formatNumber, humanize, TIME_ZONE } from '@/lib/format';
import { cn, downloadFile, timestampForFile, toCsv } from '@/lib/utils';
import { parseUserAgent } from '@/lib/user-agent';
import { ACTOR_ROLES, AUDIT_ACTIONS, AUDIT_ENTITY_TYPES, type ActorRole, type AuditAction, type AuditEntityType, type AuditLog } from '@/lib/api/types';

/** datetime-local value (IST wall clock) → ISO instant. */
function istLocalToIso(v: string): string | undefined {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)) return undefined;
  const d = new Date(`${v}:00+05:30`);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

function entityPath(log: AuditLog): string | null {
  if (log.entityId === null) return null;
  switch (log.entityType) {
    case 'VENDOR':
      return `/vendors/${log.entityId}`;
    case 'STUDY_HALL':
      return `/studyhalls/${log.entityId}`;
    case 'USER_ACCOUNT':
      return `/users/${log.entityId}`;
    case 'PROGRAM':
      return '/catalog/programs';
    case 'AMENITY':
      return '/catalog/amenities';
    default:
      return null;
  }
}


export default function AuditLogPage() {
  const url = usePagingState(25);
  const search = useUrlSearch();
  const action = url.getEnum<AuditAction>('action', AUDIT_ACTIONS);
  const actorRole = url.getEnum<ActorRole>('actorRole', ACTOR_ROLES);
  const entityType = url.getEnum<AuditEntityType>('entityType', AUDIT_ENTITY_TYPES);
  const entityId = url.getInt('entityId', 0, { min: 1 }) || undefined;
  const actorUserId = url.getInt('actorUserId', 0, { min: 1 }) || undefined;
  const fromLocal = url.get('from');
  const toLocal = url.get('to');
  const size = url.getInt('size', 25, { allowed: [10, 25, 50, 100] });
  const [expanded, setExpanded] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const params: AuditListParams = {
    search: search.applied || undefined,
    action,
    actorRole,
    entityType,
    entityId,
    actorUserId,
    from: istLocalToIso(fromLocal),
    to: istLocalToIso(toLocal),
  };
  const { data, isLoading, isFetching, error, refetch } = useAuditLogs({ ...params, page: url.page, size });
  const anyFilter = Object.values(params).some((v) => v !== undefined);

  const exportCsv = async () => {
    setExporting(true);
    const controller = new AbortController();
    abortRef.current = controller;
    const id = toast.loading('Preparing export…');
    try {
      const { rows, total, truncated } = await fetchAllAuditLogs(
        params,
        (loaded, t) => toast.loading(`Fetching ${formatNumber(loaded)} of ${formatNumber(t)} events…`, { id }),
        controller.signal,
      );
      const csv = toCsv(rows, [
        { header: 'Timestamp (UTC)', value: (r) => r.timestamp },
        { header: `Timestamp (${TIME_ZONE})`, value: (r) => formatDateTime(r.timestamp) },
        { header: 'Action', value: (r) => r.action },
        { header: 'Actor user ID', value: (r) => r.actorUserId },
        { header: 'Actor email', value: (r) => r.actorEmail },
        { header: 'Actor role', value: (r) => r.actorRole },
        { header: 'Entity type', value: (r) => r.entityType },
        { header: 'Entity ID', value: (r) => r.entityId },
        { header: 'Description', value: (r) => r.description },
        { header: 'Source service', value: (r) => r.sourceService },
        { header: 'IP address', value: (r) => r.ipAddress },
        { header: 'User agent', value: (r) => r.userAgent },
        { header: 'Correlation ID', value: (r) => r.correlationId },
      ]);
      downloadFile(`spacz-audit-${timestampForFile()}.csv`, csv);
      toast.success(`Exported ${formatNumber(rows.length)} audit events`, {
        id,
        description: truncated ? `Capped at ${formatNumber(MAX_EXPORT_ROWS)} of ${formatNumber(total)}. Narrow the filters to export the rest.` : 'All events matching the current filters.',
      });
    } catch (e) {
      if (controller.signal.aborted) toast.info('Export cancelled', { id });
      else toast.error('Export failed', { id, description: errorMessage(e) });
    } finally {
      setExporting(false);
      abortRef.current = null;
    }
  };

  return (
    <div>
      <PageHeader
        title="Audit Logs"
        description="Every admin action and platform event, newest first. Times are shown in IST."
        actions={
          exporting ? (
            <Button variant="outline" onClick={() => abortRef.current?.abort()}>
              <X /> Cancel export
            </Button>
          ) : (
            <Button variant="outline" onClick={() => void exportCsv()} disabled={!data?.totalElements}>
              <Download /> Export CSV
            </Button>
          )
        }
      />

      <Card className="overflow-hidden">
        <div className="space-y-3 border-b p-3">
          <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center">
            <SearchInput value={search.value} onChange={search.setValue} placeholder="Description or actor email…" />
            <NativeSelect aria-label="Action" value={action ?? ''} onChange={(e) => url.set({ action: e.target.value })} className="w-full lg:w-60">
              <option value="">Action: All</option>
              <optgroup label="Admin actions">
                {ADMIN_AUDIT_ACTIONS.map((a) => (
                  <option key={a} value={a}>
                    {humanize(a)}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Platform events">
                {PLATFORM_AUDIT_ACTIONS.map((a) => (
                  <option key={a} value={a}>
                    {humanize(a)}
                  </option>
                ))}
              </optgroup>
            </NativeSelect>
            <NativeSelect aria-label="Actor role" value={actorRole ?? ''} onChange={(e) => url.set({ actorRole: e.target.value })} className="w-full lg:w-44">
              <option value="">Actor: All roles</option>
              {ACTOR_ROLES.map((r) => (
                <option key={r} value={r}>
                  {humanize(r)}
                </option>
              ))}
            </NativeSelect>
            <NativeSelect aria-label="Entity type" value={entityType ?? ''} onChange={(e) => url.set({ entityType: e.target.value })} className="w-full lg:w-44">
              <option value="">Entity: All</option>
              {AUDIT_ENTITY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {humanize(t)}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <Input
              type="number"
              min={1}
              placeholder="Entity ID"
              aria-label="Entity ID"
              defaultValue={entityId ?? ''}
              key={`e${entityId ?? ''}`}
              onBlur={(e) => url.set({ entityId: e.target.value || undefined })}
              onKeyDown={(e) => e.key === 'Enter' && url.set({ entityId: (e.target as HTMLInputElement).value || undefined })}
              className="w-full sm:w-32"
            />
            <Input
              type="number"
              min={1}
              placeholder="Actor user ID"
              aria-label="Actor user ID"
              defaultValue={actorUserId ?? ''}
              key={`a${actorUserId ?? ''}`}
              onBlur={(e) => url.set({ actorUserId: e.target.value || undefined })}
              onKeyDown={(e) => e.key === 'Enter' && url.set({ actorUserId: (e.target as HTMLInputElement).value || undefined })}
              className="w-full sm:w-36"
            />
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              From
              <Input type="datetime-local" value={fromLocal} onChange={(e) => url.set({ from: e.target.value })} className="w-auto" aria-label="From (IST, inclusive)" />
            </label>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              To
              <Input type="datetime-local" value={toLocal} min={fromLocal} onChange={(e) => url.set({ to: e.target.value })} className="w-auto" aria-label="To (IST, exclusive)" />
            </label>
            {anyFilter && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  url.set({ search: undefined, action: undefined, actorRole: undefined, entityType: undefined, entityId: undefined, actorUserId: undefined, from: undefined, to: undefined })
                }
              >
                <X /> Clear filters
              </Button>
            )}
            <span className="text-xs text-muted-foreground sm:ml-auto">One action at a time (backend limit) · “To” is exclusive</span>
          </div>
        </div>

        {isLoading ? (
          <div className="divide-y">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex gap-4 px-4 py-3.5">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 flex-1" />
              </div>
            ))}
          </div>
        ) : error ? (
          <ErrorState error={error} onRetry={() => void refetch()} />
        ) : !data?.content.length ? (
          <EmptyState icon={<ShieldCheck className="size-6" />} title={anyFilter ? 'No events match these filters' : 'No audit events yet'} />
        ) : (
          <div className={cn('scrollbar-thin overflow-x-auto', isFetching && 'opacity-70')}>
            <table className="w-full text-[13px]">
              <caption className="sr-only">Audit events</caption>
              <thead className="bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th scope="col" className="w-8" />
                  {['Time', 'Actor', 'Action', 'Entity', 'Description', 'Source'].map((h) => (
                    <th key={h} scope="col" className="h-10 px-3 text-left font-medium whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.content.map((log) => {
                  const open = expanded === log.id;
                  const path = entityPath(log);
                  const ua = parseUserAgent(log.userAgent);
                  return (
                    <Fragment key={log.id}>
                      <tr
                        className={cn('cursor-pointer border-t transition-colors hover:bg-muted/40', open && 'bg-muted/40')}
                        onClick={() => setExpanded(open ? null : log.id)}
                        aria-expanded={open}
                        tabIndex={0}
                        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setExpanded(open ? null : log.id))}
                        style={{ height: 'var(--row-h)' }}
                      >
                        <td className="pl-3">
                          <ChevronRight className={cn('size-4 text-muted-foreground transition-transform', open && 'rotate-90')} aria-hidden />
                        </td>
                        <td className="px-3 whitespace-nowrap">
                          <RelativeTime value={log.timestamp} />
                        </td>
                        <td className="px-3">
                          <div className="flex items-center gap-1.5">
                            <span className="max-w-48 truncate">{actorLabel(log)}</span>
                            {log.actorRole && <RoleBadge role={log.actorRole} />}
                          </div>
                        </td>
                        <td className="px-3">
                          <AuditActionBadge action={log.action} />
                        </td>
                        <td className="px-3 whitespace-nowrap">
                          {log.entityType ? (
                            path ? (
                              <Link to={path} onClick={(e) => e.stopPropagation()} className="hover:text-primary hover:underline">
                                {humanize(log.entityType)} <span className="font-mono">#{log.entityId}</span>
                              </Link>
                            ) : (
                              <>
                                {humanize(log.entityType)} {log.entityId !== null && <span className="font-mono">#{log.entityId}</span>}
                              </>
                            )
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="max-w-md px-3">
                          <span className="line-clamp-1 text-muted-foreground">{log.description ?? '—'}</span>
                        </td>
                        <td className="px-3 text-xs whitespace-nowrap text-muted-foreground">{log.sourceService ?? '—'}</td>
                      </tr>
                      {open && (
                        <tr className="bg-muted/20">
                          <td />
                          <td colSpan={6} className="px-3 py-4">
                            <div className="grid gap-5 xl:grid-cols-2">
                              <InfoGrid
                                items={[
                                  { label: 'Timestamp', value: formatDateTime(log.timestamp) },
                                  { label: 'Event ID', value: `#${log.id}`, mono: true },
                                  { label: 'Description', value: log.description, span: 2 },
                                  { label: 'IP address', value: log.ipAddress, mono: true, copy: log.ipAddress },
                                  { label: 'Client', value: ua ?? log.userAgent },
                                  {
                                    label: 'Correlation ID',
                                    value: log.correlationId && (
                                      <span className="inline-flex items-center gap-1 font-mono text-xs">
                                        {log.correlationId} <CopyButton value={log.correlationId} label="Copy correlation ID" />
                                      </span>
                                    ),
                                    span: 2,
                                  },
                                ]}
                              />
                              <JsonViewer value={log} />
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {data && data.totalElements > 0 && (
          <div className="flex flex-col gap-2 border-t px-4 py-3 text-[13px] sm:flex-row sm:items-center sm:justify-between">
            <span className="text-muted-foreground tabular">
              {formatNumber(url.page * size + 1)}–{formatNumber(url.page * size + data.content.length)} of {formatNumber(data.totalElements)}
            </span>
            <div className="flex items-center gap-2">
              <NativeSelect value={size} onChange={(e) => url.set({ size: Number(e.target.value) === 25 ? undefined : e.target.value, page: undefined })} className="w-20" aria-label="Rows per page">
                {[10, 25, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </NativeSelect>
              <Button variant="outline" size="sm" disabled={data.first} onClick={() => url.set({ page: url.page - 1 })}>
                Previous
              </Button>
              <Button variant="outline" size="sm" disabled={data.last} onClick={() => url.set({ page: url.page + 1 })}>
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
