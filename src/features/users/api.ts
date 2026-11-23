import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { qk } from '@/lib/api/query-keys';
import { invalidateAll, moderationInvalidation, toastError, toastSuccess } from '@/lib/api/mutations';
import { isStaleStateError } from '@/lib/api/errors';
import type { Account, AccountStatus, Activity, AdminUserDetail, PageResponse, Role } from '@/lib/api/types';

export interface UserListParams {
  search?: string;
  role?: Role;
  status?: AccountStatus;
  page?: number;
  size?: number;
  sort?: string;
}

/** Only `createdAt` is confirmed sortable (default `createdAt,desc`). */
export const USER_SORTABLE = ['createdAt'];

export const usersApi = {
  list: (p: UserListParams, signal?: AbortSignal) => api.get<PageResponse<Account>>('/api/admin/users', { ...p }, signal),
  get: (id: number, signal?: AbortSignal) => api.get<AdminUserDetail>(`/api/admin/users/${id}`, undefined, signal),
  activity: (id: number, p: { page?: number; size?: number }, signal?: AbortSignal) =>
    api.get<PageResponse<Activity>>(`/api/admin/users/${id}/activity`, { ...p }, signal),
  suspend: (id: number, reason: string) => api.post<Account>(`/api/admin/users/${id}/suspend`, { reason }),
  activate: (id: number, reason?: string) => api.post<Account>(`/api/admin/users/${id}/activate`, reason ? { reason } : {}),
};

export function useUsers(p: UserListParams, opts?: { enabled?: boolean }) {
  return useQuery({
    queryKey: qk.users.list(p),
    queryFn: ({ signal }) => usersApi.list(p, signal),
    placeholderData: keepPreviousData,
    enabled: opts?.enabled ?? true,
  });
}

export function useUser(id: number | null | undefined) {
  return useQuery({
    queryKey: qk.users.detail(id ?? -1),
    queryFn: ({ signal }) => usersApi.get(id!, signal),
    enabled: !!id,
  });
}

export function useUserActivity(id: number, p: { page: number; size: number }, enabled = true) {
  return useQuery({
    queryKey: qk.users.activity(id, p),
    queryFn: ({ signal }) => usersApi.activity(id, p, signal),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useModerateUser() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: number; action: 'suspend' | 'activate'; reason?: string; label?: string }) =>
      v.action === 'suspend' ? usersApi.suspend(v.id, v.reason ?? '') : usersApi.activate(v.id, v.reason),
    onSuccess: (account, v) => {
      client.setQueryData<AdminUserDetail>(qk.users.detail(v.id), (old) => (old ? { ...old, account } : old));
      toastSuccess(
        `${v.label ?? 'Account'} ${v.action === 'suspend' ? 'suspended' : 'activated'}`,
        v.action === 'suspend' ? 'They can no longer sign in. Existing sessions end within 15 minutes.' : 'They can sign in again.',
      );
    },
    onError: (e, v) => {
      toastError(e, `Could not ${v.action} ${v.label ?? 'account'}`);
      if (isStaleStateError(e)) void client.invalidateQueries({ queryKey: qk.users.detail(v.id) });
    },
    onSettled: () => invalidateAll(client, [...moderationInvalidation.user]),
  });
}
