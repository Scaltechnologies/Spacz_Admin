import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { qk } from '@/lib/api/query-keys';
import { invalidateAll, moderationInvalidation, toastError, toastSuccess } from '@/lib/api/mutations';
import { isStaleStateError } from '@/lib/api/errors';
import type { AdminVendor, AdminVendorDetail, PageResponse, VendorStatus } from '@/lib/api/types';
import type { ModerationAction } from '@/lib/status';

export interface VendorListParams {
  search?: string;
  status?: VendorStatus;
  city?: string;
  page?: number;
  size?: number;
  sort?: string;
}

/** Only `createdAt` is confirmed sortable for vendors (backend default `createdAt,desc`). */
export const VENDOR_SORTABLE = ['createdAt'];

export const vendorsApi = {
  list: (p: VendorListParams, signal?: AbortSignal) =>
    api.get<PageResponse<AdminVendor>>('/api/admin/vendors', { ...p }, signal),
  get: (vendorId: number, signal?: AbortSignal) => api.get<AdminVendorDetail>(`/api/admin/vendors/${vendorId}`, undefined, signal),
  moderate: (vendorId: number, action: ModerationAction, reason?: string) =>
    api.post<AdminVendor>(`/api/admin/vendors/${vendorId}/${action}`, reason ? { reason } : {}),
};

export function useVendors(p: VendorListParams, opts?: { enabled?: boolean }) {
  return useQuery({
    queryKey: qk.vendors.list(p),
    queryFn: ({ signal }) => vendorsApi.list(p, signal),
    placeholderData: keepPreviousData,
    enabled: opts?.enabled ?? true,
  });
}

export function useVendor(vendorId: number | null | undefined) {
  return useQuery({
    queryKey: qk.vendors.detail(vendorId ?? -1),
    queryFn: ({ signal }) => vendorsApi.get(vendorId!, signal),
    enabled: !!vendorId,
  });
}

const PAST: Record<ModerationAction, string> = { approve: 'approved', reject: 'rejected', suspend: 'suspended', activate: 'activated' };

export function useModerateVendor() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (v: { vendorId: number; action: ModerationAction; reason?: string; label?: string }) =>
      vendorsApi.moderate(v.vendorId, v.action, v.reason),
    onSuccess: (updated, v) => {
      client.setQueryData<AdminVendorDetail>(qk.vendors.detail(v.vendorId), (old) => (old ? { ...old, vendor: updated } : old));
      toastSuccess(`${updated.profile.businessName ?? v.label ?? 'Vendor'} ${PAST[v.action]}`, `Status is now ${updated.profile.status}.`);
    },
    onError: (e, v) => {
      toastError(e, `Could not ${v.action} ${v.label ?? 'vendor'}`);
      if (isStaleStateError(e)) void client.invalidateQueries({ queryKey: qk.vendors.detail(v.vendorId) });
    },
    onSettled: () => invalidateAll(client, [...moderationInvalidation.vendor]),
  });
}
