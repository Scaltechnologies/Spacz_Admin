import { ApiError, type ApiErrorBody } from './errors';
import type { AuthResponse } from './types';
import { readRefreshToken, useSession } from '@/lib/auth/session';

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, '') ?? 'http://localhost:8080';

const DEFAULT_TIMEOUT_MS = 20_000;

/** Auth endpoints that must never trigger a refresh-and-retry on 401. */
const NO_REFRESH_PATHS = ['/api/auth/login', '/api/auth/refresh', '/api/auth/logout', '/api/auth/otp/'];

export type QueryValue = string | number | boolean | null | undefined;
export type Query = Record<string, QueryValue | QueryValue[]>;

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  query?: Query;
  body?: unknown;
  signal?: AbortSignal;
  /** Attach the bearer token (default true). */
  auth?: boolean;
  timeoutMs?: number;
}

/** Builds a query string, dropping undefined/null/empty values. Arrays are comma-joined. */
export function toSearchParams(query?: Query): string {
  if (!query) return '';
  const params = new URLSearchParams();
  for (const [key, raw] of Object.entries(query)) {
    if (Array.isArray(raw)) {
      const values = raw.filter((v) => v !== undefined && v !== null && v !== '');
      if (values.length) params.set(key, values.join(','));
    } else if (raw !== undefined && raw !== null && raw !== '') {
      params.set(key, String(raw));
    }
  }
  const s = params.toString();
  return s ? `?${s}` : '';
}

// ---------------------------------------------------------------------------
// Session expiry hook — the router registers a handler that redirects to /login.
// ---------------------------------------------------------------------------
let sessionExpiredHandler: (() => void) | null = null;
export function onSessionExpired(handler: () => void) {
  sessionExpiredHandler = handler;
  return () => {
    if (sessionExpiredHandler === handler) sessionExpiredHandler = null;
  };
}

// ---------------------------------------------------------------------------
// Single-flight refresh. The backend rotates refresh tokens and treats reuse of an old
// token as theft (it revokes every session), so parallel 401s MUST share one refresh.
// ---------------------------------------------------------------------------
let refreshInFlight: Promise<boolean> | null = null;
let proactiveTimer: ReturnType<typeof setTimeout> | null = null;

export type RefreshOutcome = boolean;

/**
 * Exchanges the stored refresh token for a new pair.
 * Resolves true on success, false when the token is missing or rejected (session is cleared).
 * Rejects with a network ApiError when the gateway is unreachable (session is kept, so a
 * temporary outage doesn't log the admin out).
 */
export function refreshSession(): Promise<boolean> {
  refreshInFlight ??= doRefresh().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

async function doRefresh(): Promise<boolean> {
  const refreshToken = readRefreshToken();
  if (!refreshToken) return false;
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
  } catch {
    throw ApiError.network();
  }
  if (!res.ok) {
    if (res.status >= 500) throw new ApiError(await parseErrorBody(res));
    useSession.getState().clear();
    return false;
  }
  const data = (await res.json()) as AuthResponse;
  applyAuthResponse(data);
  return true;
}

/** Stores a login/refresh response and schedules a refresh one minute before expiry. */
export function applyAuthResponse(data: AuthResponse) {
  const session = useSession.getState();
  session.setTokens(data.accessToken, data.expiresIn, data.refreshToken);
  if (data.user) session.setUser(data.user);
  scheduleProactiveRefresh(data.expiresIn);
}

function scheduleProactiveRefresh(expiresIn: number) {
  if (proactiveTimer) clearTimeout(proactiveTimer);
  const ms = Math.max(10_000, (expiresIn - 60) * 1000);
  proactiveTimer = setTimeout(() => {
    if (!useSession.getState().accessToken) return;
    refreshSession()
      .then((ok) => {
        if (!ok) sessionExpiredHandler?.();
      })
      .catch(() => {
        /* offline: the next request will retry through the 401 path */
      });
  }, ms);
}

export function cancelProactiveRefresh() {
  if (proactiveTimer) clearTimeout(proactiveTimer);
  proactiveTimer = null;
}

// ---------------------------------------------------------------------------
// Core request
// ---------------------------------------------------------------------------
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return send<T>(path, options, true);
}

async function send<T>(path: string, options: RequestOptions, allowRefresh: boolean): Promise<T> {
  const { method = 'GET', query, body, signal, auth = true, timeoutMs = DEFAULT_TIMEOUT_MS } = options;

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const token = useSession.getState().accessToken;
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const forwardAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener('abort', forwardAbort, { once: true });
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}${toSearchParams(query)}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (e) {
    if (signal?.aborted) throw e; // caller cancelled (e.g. TanStack Query) — propagate the AbortError
    if (timedOut) throw ApiError.timeout();
    throw ApiError.network();
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', forwardAbort);
  }

  if (res.status === 401 && auth && allowRefresh && !NO_REFRESH_PATHS.some((p) => path.startsWith(p))) {
    const refreshed = await refreshSession();
    if (refreshed) return send<T>(path, options, false);
    sessionExpiredHandler?.();
    throw new ApiError({ status: 401, error: 'SESSION_EXPIRED', message: 'Your session has expired. Please sign in again.' });
  }

  if (res.status === 204 || res.status === 205) return undefined as T;

  if (!res.ok) throw new ApiError(await parseErrorBody(res));

  const text = await res.text();
  if (!text) return undefined as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ApiError({ status: res.status, error: 'MALFORMED_RESPONSE', message: 'The server returned an unreadable response.' });
  }
}

async function parseErrorBody(res: Response): Promise<ApiErrorBody> {
  const correlationId = res.headers.get('X-Correlation-Id') ?? undefined;
  try {
    const body = (await res.json()) as Partial<ApiErrorBody>;
    if (body && typeof body === 'object' && (body.error || body.message)) {
      return {
        status: body.status ?? res.status,
        error: body.error ?? `HTTP_${res.status}`,
        message: body.message ?? res.statusText,
        path: body.path,
        correlationId: body.correlationId ?? correlationId,
        fieldErrors: body.fieldErrors,
        timestamp: body.timestamp,
      };
    }
  } catch {
    /* non-JSON error body */
  }
  return {
    status: res.status,
    error: res.status === 503 ? 'SERVICE_UNAVAILABLE' : `HTTP_${res.status}`,
    message: res.statusText || `Request failed with status ${res.status}`,
    correlationId,
  };
}

export const api = {
  get: <T>(path: string, query?: Query, signal?: AbortSignal) => request<T>(path, { query, signal }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body: body ?? {} }),
  put: <T>(path: string, body: unknown) => request<T>(path, { method: 'PUT', body }),
  del: <T = void>(path: string) => request<T>(path, { method: 'DELETE' }),
};
