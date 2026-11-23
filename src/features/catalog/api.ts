import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { qk } from '@/lib/api/query-keys';
import { invalidateAll, toastError, toastSuccess } from '@/lib/api/mutations';
import type { Amenity, AmenityInput, PageResponse, Program, ProgramInput } from '@/lib/api/types';

// ---------------------------------------------------------------------------
// Programs (exams / courses) — studyhall-service, writes require ADMIN
// ---------------------------------------------------------------------------
export interface ProgramListParams {
  search?: string;
  category?: string;
  active?: boolean;
  page?: number;
  size?: number;
  sort?: string;
}

export const programsApi = {
  list: (p: ProgramListParams, signal?: AbortSignal) => api.get<PageResponse<Program>>('/api/programs/all', { ...p }, signal),
  create: (body: ProgramInput) => api.post<Program>('/api/programs', body),
  update: (id: number, body: ProgramInput) => api.put<Program>(`/api/programs/${id}`, body),
  /** Soft delete: deactivates, kept for history. */
  deactivate: (id: number) => api.del(`/api/programs/${id}`),
};

export function usePrograms(p: ProgramListParams) {
  return useQuery({
    queryKey: qk.programs.list(p),
    queryFn: ({ signal }) => programsApi.list(p, signal),
    placeholderData: keepPreviousData,
  });
}

const programKeys = [qk.programs.all, qk.dashboard, qk.audit.all];

export function useSaveProgram() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (v: { id?: number; body: ProgramInput }) => (v.id ? programsApi.update(v.id, v.body) : programsApi.create(v.body)),
    onSuccess: (p, v) => toastSuccess(v.id ? `${p.name} updated` : `${p.name} created`),
    onSettled: () => invalidateAll(client, programKeys),
  });
}

export function useSetProgramActive() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (p: Program & { nextActive: boolean }) => {
      if (!p.nextActive) {
        await programsApi.deactivate(p.id);
        return { ...p, active: false } as Program;
      }
      return programsApi.update(p.id, { code: p.code, name: p.name, description: p.description, category: p.category, active: true });
    },
    onSuccess: (p) => toastSuccess(p.active ? `${p.name} reactivated` : `${p.name} deactivated`),
    onError: (e, p) => toastError(e, `Could not ${p.nextActive ? 'reactivate' : 'deactivate'} ${p.name}`),
    onSettled: () => invalidateAll(client, programKeys),
  });
}

// ---------------------------------------------------------------------------
// Amenities — whole list, no delete endpoint (retire = active:false)
// ---------------------------------------------------------------------------
export const amenitiesApi = {
  list: (signal?: AbortSignal) => api.get<Amenity[]>('/api/amenities/all', undefined, signal),
  create: (body: AmenityInput) => api.post<Amenity>('/api/amenities', body),
  update: (id: number, body: AmenityInput) => api.put<Amenity>(`/api/amenities/${id}`, body),
};

export function useAmenities() {
  return useQuery({ queryKey: qk.amenities, queryFn: ({ signal }) => amenitiesApi.list(signal), staleTime: 60_000 });
}

export function useSaveAmenity() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (v: { id?: number; body: AmenityInput }) => (v.id ? amenitiesApi.update(v.id, v.body) : amenitiesApi.create(v.body)),
    onSuccess: (a, v) => toastSuccess(v.id ? `${a.name} updated` : `${a.name} created`),
    onSettled: () => invalidateAll(client, [qk.amenities, qk.audit.all]),
  });
}

export function useSetAmenityActive() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (a: Amenity & { nextActive: boolean }) =>
      amenitiesApi.update(a.id, { code: a.code, name: a.name, icon: a.icon, description: a.description, active: a.nextActive }),
    onMutate: async (a) => {
      await client.cancelQueries({ queryKey: qk.amenities });
      const prev = client.getQueryData<Amenity[]>(qk.amenities);
      client.setQueryData<Amenity[]>(qk.amenities, (old) => old?.map((x) => (x.id === a.id ? { ...x, active: a.nextActive } : x)));
      return { prev };
    },
    onSuccess: (a) => toastSuccess(a.active ? `${a.name} restored` : `${a.name} retired`),
    onError: (e, a, ctx) => {
      if (ctx?.prev) client.setQueryData(qk.amenities, ctx.prev);
      toastError(e, `Could not ${a.nextActive ? 'restore' : 'retire'} ${a.name}`);
    },
    onSettled: () => invalidateAll(client, [qk.amenities, qk.audit.all]),
  });
}
