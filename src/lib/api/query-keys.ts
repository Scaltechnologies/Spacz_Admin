/** Central query-key factory. Prefix keys (e.g. ['vendors']) invalidate a whole family. */
export const qk = {
  dashboard: ['dashboard'] as const,
  authMe: ['auth-me'] as const,
  adminMe: ['admin-me'] as const,
  users: {
    all: ['users'] as const,
    list: (p: object) => ['users', 'list', p] as const,
    detail: (id: number) => ['users', 'detail', id] as const,
    activity: (id: number, p: object) => ['users', 'detail', id, 'activity', p] as const,
  },
  vendors: {
    all: ['vendors'] as const,
    list: (p: object) => ['vendors', 'list', p] as const,
    detail: (id: number) => ['vendors', 'detail', id] as const,
  },
  halls: {
    all: ['halls'] as const,
    list: (p: object) => ['halls', 'list', p] as const,
    detail: (id: number) => ['halls', 'detail', id] as const,
    seats: (id: number, start: string, end: string) => ['halls', 'detail', id, 'seats', start, end] as const,
  },
  bookings: {
    all: ['bookings'] as const,
    list: (p: object) => ['bookings', 'list', p] as const,
    detail: (id: number) => ['bookings', 'detail', id] as const,
  },
  programs: {
    all: ['programs'] as const,
    list: (p: object) => ['programs', 'list', p] as const,
  },
  amenities: ['amenities'] as const,
  audit: {
    all: ['audit'] as const,
    list: (p: object) => ['audit', 'list', p] as const,
  },
};
