import { describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server, apiError } from './msw/server';
import { API, adminAccount, authResponse } from './fixtures';
import { api, applyAuthResponse, onSessionExpired, refreshSession, toSearchParams } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import { readRefreshToken, useSession } from '@/lib/auth/session';

describe('toSearchParams', () => {
  it('drops empty values and joins arrays', () => {
    expect(toSearchParams({ a: 1, b: '', c: undefined, d: null, e: ['x', '', 'y'], f: false })).toBe('?a=1&e=x%2Cy&f=false');
    expect(toSearchParams({})).toBe('');
  });
});

describe('API client', () => {
  it('attaches the bearer token', async () => {
    applyAuthResponse(authResponse(adminAccount, 1));
    let auth: string | null = null;
    server.use(
      http.get(`${API}/api/admin/dashboard`, ({ request }) => {
        auth = request.headers.get('authorization');
        return HttpResponse.json({ ok: true });
      }),
    );
    await api.get('/api/admin/dashboard');
    expect(auth).toBe('Bearer access-1');
  });

  it('runs exactly one refresh for parallel 401s and retries each request once', async () => {
    applyAuthResponse(authResponse(adminAccount, 1));
    let refreshCalls = 0;
    const seen: string[] = [];
    server.use(
      http.post(`${API}/api/auth/refresh`, async ({ request }) => {
        refreshCalls++;
        const body = (await request.json()) as { refreshToken: string };
        expect(body.refreshToken).toBe('refresh-1');
        await new Promise((r) => setTimeout(r, 20));
        return HttpResponse.json(authResponse(adminAccount, 2));
      }),
      http.get(`${API}/api/admin/users`, ({ request }) => {
        const token = request.headers.get('authorization');
        seen.push(token ?? '');
        if (token === 'Bearer access-1') return apiError(401, 'UNAUTHORIZED', 'expired');
        return HttpResponse.json({ ok: true });
      }),
    );

    const results = await Promise.all([api.get('/api/admin/users'), api.get('/api/admin/users'), api.get('/api/admin/users')]);
    expect(results).toHaveLength(3);
    expect(refreshCalls).toBe(1);
    expect(seen.filter((s) => s === 'Bearer access-2')).toHaveLength(3);
    expect(readRefreshToken()).toBe('refresh-2'); // rotated token stored
  });

  it('retries at most once, then reports session expiry', async () => {
    applyAuthResponse(authResponse(adminAccount, 1));
    const expired = vi.fn();
    const off = onSessionExpired(expired);
    let calls = 0;
    server.use(
      http.post(`${API}/api/auth/refresh`, () => HttpResponse.json(authResponse(adminAccount, 2))),
      http.get(`${API}/api/admin/users`, () => {
        calls++;
        return apiError(401, 'UNAUTHORIZED', 'nope');
      }),
    );
    await expect(api.get('/api/admin/users')).rejects.toBeInstanceOf(ApiError);
    expect(calls).toBe(2); // original + one retry
    off();
  });

  it('clears the session and redirects when the refresh token is rejected', async () => {
    applyAuthResponse(authResponse(adminAccount, 1));
    const expired = vi.fn();
    const off = onSessionExpired(expired);
    server.use(
      http.post(`${API}/api/auth/refresh`, () => apiError(401, 'INVALID_CREDENTIALS', 'Refresh token revoked')),
      http.get(`${API}/api/admin/users`, () => apiError(401, 'UNAUTHORIZED', 'expired')),
    );
    await expect(api.get('/api/admin/users')).rejects.toMatchObject({ code: 'SESSION_EXPIRED' });
    expect(expired).toHaveBeenCalledOnce();
    expect(useSession.getState().accessToken).toBeNull();
    expect(readRefreshToken()).toBeNull();
    off();
  });

  it('keeps the session when the gateway is unreachable during refresh', async () => {
    applyAuthResponse(authResponse(adminAccount, 1));
    server.use(http.post(`${API}/api/auth/refresh`, () => HttpResponse.error()));
    await expect(refreshSession()).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
    expect(readRefreshToken()).toBe('refresh-1');
  });

  it('parses the backend error envelope including field errors and correlation ID', async () => {
    server.use(
      http.post(`${API}/api/programs`, () =>
        apiError(400, 'VALIDATION_ERROR', 'Request validation failed', { fieldErrors: [{ field: 'code', message: 'must not be blank' }] }),
      ),
    );
    const err = (await api.post('/api/programs', {}).catch((e: unknown) => e)) as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.correlationId).toBe('corr-test');
    expect(err.fieldErrors).toEqual([{ field: 'code', message: 'must not be blank' }]);
  });

  it('never turns a failure into an empty success', async () => {
    server.use(http.get(`${API}/api/admin/vendors`, () => new HttpResponse('<html>Bad gateway</html>', { status: 502 })));
    await expect(api.get('/api/admin/vendors')).rejects.toMatchObject({ status: 502 });
  });

  it('returns undefined for 204 responses', async () => {
    server.use(http.delete(`${API}/api/programs/3`, () => new HttpResponse(null, { status: 204 })));
    await expect(api.del('/api/programs/3')).resolves.toBeUndefined();
  });

  it('maps network failures to NETWORK_ERROR', async () => {
    server.use(http.get(`${API}/api/admin/vendors`, () => HttpResponse.error()));
    await expect(api.get('/api/admin/vendors')).rejects.toMatchObject({ code: 'NETWORK_ERROR', status: 0 });
  });
});
