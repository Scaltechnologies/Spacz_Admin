import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { qk } from '@/lib/api/query-keys';
import type { ActorRole, AuditAction, AuditEntityType, AuditLog, PageResponse } from '@/lib/api/types';

export interface AuditListParams {
  search?: string;
  /** Single action only — the backend does not accept a list. */
  action?: AuditAction;
  actorUserId?: number;
  actorRole?: ActorRole;
  entityType?: AuditEntityType;
  entityId?: number;
  /** ISO instant, inclusive. */
  from?: string;
  /** ISO instant, exclusive. */
  to?: string;
  page?: number;
  size?: number;
}

export const auditApi = {
  list: (p: AuditListParams, signal?: AbortSignal) => api.get<PageResponse<AuditLog>>('/api/admin/audit-logs', { ...p }, signal),
};

export function useAuditLogs(p: AuditListParams, opts?: { enabled?: boolean; refetchInterval?: number }) {
  return useQuery({
    queryKey: qk.audit.list(p),
    queryFn: ({ signal }) => auditApi.list(p, signal),
    placeholderData: keepPreviousData,
    enabled: opts?.enabled ?? true,
    refetchInterval: opts?.refetchInterval,
  });
}

export const MAX_EXPORT_ROWS = 5000;

/** Pages through the filtered audit log for CSV export (capped). */
export async function fetchAllAuditLogs(
  p: AuditListParams,
  onProgress: (loaded: number, total: number) => void,
  signal?: AbortSignal,
): Promise<{ rows: AuditLog[]; total: number; truncated: boolean }> {
  const size = 100;
  const rows: AuditLog[] = [];
  let page = 0;
  let total = 0;
  for (;;) {
    const res = await auditApi.list({ ...p, page, size }, signal);
    total = res.totalElements;
    rows.push(...res.content);
    onProgress(Math.min(rows.length, MAX_EXPORT_ROWS), Math.min(total, MAX_EXPORT_ROWS));
    if (res.last || rows.length >= MAX_EXPORT_ROWS || res.content.length === 0) break;
    page++;
  }
  return { rows: rows.slice(0, MAX_EXPORT_ROWS), total, truncated: total > MAX_EXPORT_ROWS };
}
