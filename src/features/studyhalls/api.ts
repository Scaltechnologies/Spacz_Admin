import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { qk } from '@/lib/api/query-keys';
import { invalidateAll, moderationInvalidation, toastError, toastSuccess } from '@/lib/api/mutations';
import { isStaleStateError } from '@/lib/api/errors';
import type { PageResponse, SeatMap, StudyHallDetail, StudyHallStatus, StudyHallSummary } from '@/lib/api/types';
import type { ModerationAction } from '@/lib/status';

export interface HallListParams {
  search?: string;
  status?: StudyHallStatus;
  city?: string;
  vendorId?: number;
  page?: number;
  size?: number;
  sort?: string;
}

/** StudyHallAdminServiceImpl.SORTABLE */
export const HALL_SORTABLE = ['name', 'city', 'createdAt', 'updatedAt', 'submittedAt', 'pricePerDay', 'status'];

export const hallsApi = {
  list: (p: HallListParams, signal?: AbortSignal) =>
    api.get<PageResponse<StudyHallSummary>>('/api/admin/studyhalls', { ...p }, signal),
  get: (id: number, signal?: AbortSignal) => api.get<StudyHallDetail>(`/api/admin/studyhalls/${id}`, undefined, signal),
  /** Public for live halls; VendorAccess.viewableHall lets ADMIN (and the owner) read it in any status. */
  seats: (id: number, startDate: string, endDate: string, signal?: AbortSignal) =>
    api.get<SeatMap>(`/api/studyhalls/${id}/seats`, { startDate, endDate }, signal),
  moderate: (id: number, action: ModerationAction, reason?: string) =>
    api.post<StudyHallDetail>(`/api/admin/studyhalls/${id}/${action}`, reason ? { reason } : {}),
};

export function useHalls(p: HallListParams, opts?: { enabled?: boolean }) {
  return useQuery({
    queryKey: qk.halls.list(p),
    queryFn: ({ signal }) => hallsApi.list(p, signal),
    placeholderData: keepPreviousData,
    enabled: opts?.enabled ?? true,
  });
}

export function useHall(id: number | null | undefined) {
  return useQuery({
    queryKey: qk.halls.detail(id ?? -1),
    queryFn: ({ signal }) => hallsApi.get(id!, signal),
    enabled: !!id,
  });
}

export function useSeatMap(id: number, startDate: string, endDate: string, enabled: boolean) {
  return useQuery({
    queryKey: qk.halls.seats(id, startDate, endDate),
    queryFn: ({ signal }) => hallsApi.seats(id, startDate, endDate, signal),
    enabled,
    placeholderData: keepPreviousData,
  });
}

const PAST: Record<ModerationAction, string> = { approve: 'approved', reject: 'rejected', suspend: 'suspended', activate: 'activated' };

export function useModerateHall() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: number; action: ModerationAction; reason?: string; label?: string }) => hallsApi.moderate(v.id, v.action, v.reason),
    onSuccess: (updated, v) => {
      client.setQueryData(qk.halls.detail(v.id), updated);
      const extra =
        v.action !== 'reject' && updated.status === 'APPROVED'
          ? 'It will go live automatically once the vendor is approved.'
          : `Status is now ${updated.status.replace('_', ' ')}.`;
      toastSuccess(`${updated.name} ${PAST[v.action]}`, extra);
    },
    onError: (e, v) => {
      toastError(e, `Could not ${v.action} ${v.label ?? 'study hall'}`);
      if (isStaleStateError(e)) void client.invalidateQueries({ queryKey: qk.halls.detail(v.id) });
    },
    onSettled: () => invalidateAll(client, [...moderationInvalidation.hall]),
  });
}
