import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { qk } from '@/lib/api/query-keys';
import type { DashboardResponse } from '@/lib/api/types';

export const fetchDashboard = (signal?: AbortSignal) => api.get<DashboardResponse>('/api/admin/dashboard', undefined, signal);

/** Dashboard metrics; refreshed every 60s and on window focus. Also feeds sidebar badges. */
export function useDashboard() {
  return useQuery({
    queryKey: qk.dashboard,
    queryFn: ({ signal }) => fetchDashboard(signal),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    staleTime: 20_000,
  });
}
