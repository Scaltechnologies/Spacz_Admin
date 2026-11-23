import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { qk } from '@/lib/api/query-keys';
import type { Booking, BookingStatus, PageResponse } from '@/lib/api/types';

export interface BookingListParams {
  studyHallId?: number;
  userId?: number;
  status?: BookingStatus;
  /** YYYY-MM-DD; returns bookings overlapping [from, to]. */
  from?: string;
  to?: string;
  page?: number;
  size?: number;
  sort?: string;
}

/** BookingServiceImpl.SORTABLE */
export const BOOKING_SORTABLE = ['createdAt', 'startDate', 'endDate', 'status', 'totalPrice'];

/** Admin bookings are read-only: the backend exposes no admin confirm/cancel/refund endpoints. */
export const bookingsApi = {
  list: (p: BookingListParams, signal?: AbortSignal) => api.get<PageResponse<Booking>>('/api/admin/bookings', { ...p }, signal),
  /** studyhall-service allows ADMIN on GET /api/bookings/{id}. */
  get: (id: number, signal?: AbortSignal) => api.get<Booking>(`/api/bookings/${id}`, undefined, signal),
};

export function useBookings(p: BookingListParams, opts?: { enabled?: boolean }) {
  return useQuery({
    queryKey: qk.bookings.list(p),
    queryFn: ({ signal }) => bookingsApi.list(p, signal),
    placeholderData: keepPreviousData,
    enabled: opts?.enabled ?? true,
  });
}

export function useBooking(id: number | null, initial?: Booking) {
  return useQuery({
    queryKey: qk.bookings.detail(id ?? -1),
    queryFn: ({ signal }) => bookingsApi.get(id!, signal),
    enabled: !!id && !initial,
    initialData: initial,
  });
}
