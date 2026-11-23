import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { API, adminAccount, auditLog, dashboard, page } from '../fixtures';

/** Baseline handlers; tests override with server.use(...). */
export const handlers = [
  http.get(`${API}/api/admin/dashboard`, () => HttpResponse.json(dashboard)),
  http.get(`${API}/api/admin/me`, () =>
    HttpResponse.json({
      id: 1,
      adminUserId: 1,
      fullName: 'Priya Sharma',
      email: null,
      phone: null,
      title: 'Operations',
      lastSeenAt: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    }),
  ),
  http.get(`${API}/api/auth/me`, () => HttpResponse.json(adminAccount)),
  http.get(`${API}/api/admin/audit-logs`, () => HttpResponse.json(page([auditLog(1)]))),
  http.post(`${API}/api/auth/logout`, () => new HttpResponse(null, { status: 204 })),
];

export const server = setupServer(...handlers);

export function apiError(status: number, error: string, message: string, extra: Record<string, unknown> = {}) {
  return HttpResponse.json({ timestamp: '2026-10-18T00:00:00Z', status, error, message, path: '/', correlationId: 'corr-test', ...extra }, { status });
}
