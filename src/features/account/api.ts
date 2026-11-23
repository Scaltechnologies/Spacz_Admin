import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { qk } from '@/lib/api/query-keys';
import { toastSuccess } from '@/lib/api/mutations';
import type { AdminProfile } from '@/lib/api/types';
import { authApi } from '@/features/auth/api';
import { useSession } from '@/lib/auth/session';

export interface AdminProfileInput {
  fullName: string;
  email?: string | null;
  phone?: string | null;
  title?: string | null;
}

export const accountApi = {
  /** Auto-created on first call. */
  me: (signal?: AbortSignal) => api.get<AdminProfile>('/api/admin/me', undefined, signal),
  update: (body: AdminProfileInput) => api.put<AdminProfile>('/api/admin/me', body),
};

export function useAdminProfile() {
  return useQuery({ queryKey: qk.adminMe, queryFn: ({ signal }) => accountApi.me(signal), staleTime: 5 * 60_000 });
}

export function useAuthAccount() {
  return useQuery({
    queryKey: qk.authMe,
    queryFn: async ({ signal }) => {
      const me = await authApi.me(signal);
      useSession.getState().setUser(me);
      return me;
    },
    staleTime: 60_000,
  });
}

export function useUpdateAdminProfile() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: accountApi.update,
    onSuccess: (p) => {
      client.setQueryData(qk.adminMe, p);
      toastSuccess('Profile saved');
    },
  });
}

export function useChangePassword() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: authApi.changePassword,
    onSuccess: () => {
      toastSuccess('Password updated', 'Use your new password next time you sign in.');
      void client.invalidateQueries({ queryKey: qk.authMe });
    },
  });
}
