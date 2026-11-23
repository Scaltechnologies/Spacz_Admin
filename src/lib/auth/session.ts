import { create } from 'zustand';
import type { Account } from '@/lib/api/types';

/**
 * Session module — the only place that knows where tokens live.
 *
 * - The access token (15 min) is kept in memory only.
 * - The refresh token (7 days, single-use, rotated on every refresh) is kept in localStorage so a
 *   page reload can restore the session, as documented by the backend (FRONTEND_INTEGRATION.md §2).
 *
 * Security trade-off: localStorage is readable by any script running on this origin, so an XSS bug
 * could exfiltrate the refresh token. This is NOT equivalent to an HttpOnly cookie. The backend's
 * reuse detection limits the damage (a reused refresh token revokes every session), and the proper
 * fix is an HttpOnly, SameSite=Strict refresh cookie on /api/auth/refresh (backend change, see
 * docs/BACKEND_GAPS.md). Keep a strict CSP in production.
 */
const REFRESH_KEY = 'spacz.admin.refresh';
const CHANNEL = 'spacz-admin-session';

export type SessionStatus = 'unknown' | 'authenticated' | 'anonymous';

interface SessionState {
  status: SessionStatus;
  accessToken: string | null;
  accessExpiresAt: number | null;
  user: Account | null;
  setTokens: (accessToken: string, expiresIn: number, refreshToken: string) => void;
  setUser: (user: Account) => void;
  clear: () => void;
}

export const useSession = create<SessionState>()((set) => ({
  status: 'unknown',
  accessToken: null,
  accessExpiresAt: null,
  user: null,
  setTokens: (accessToken, expiresIn, refreshToken) => {
    writeRefreshToken(refreshToken);
    set({ accessToken, accessExpiresAt: Date.now() + expiresIn * 1000 });
  },
  setUser: (user) => set({ user, status: 'authenticated' }),
  clear: () => {
    writeRefreshToken(null);
    set({ status: 'anonymous', accessToken: null, accessExpiresAt: null, user: null });
  },
}));

export function readRefreshToken(): string | null {
  try {
    return localStorage.getItem(REFRESH_KEY);
  } catch {
    return null;
  }
}

function writeRefreshToken(token: string | null) {
  try {
    if (token) localStorage.setItem(REFRESH_KEY, token);
    else localStorage.removeItem(REFRESH_KEY);
  } catch {
    /* storage unavailable (private mode) — session simply won't survive a reload */
  }
}

// ---- cross-tab logout ----
let channel: BroadcastChannel | null = null;
try {
  channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL) : null;
} catch {
  channel = null;
}

export function broadcastLogout() {
  channel?.postMessage({ type: 'logout' });
}

export function onRemoteLogout(handler: () => void) {
  if (!channel) return () => {};
  const listener = (e: MessageEvent) => {
    if (e.data?.type === 'logout') handler();
  };
  channel.addEventListener('message', listener);
  return () => channel?.removeEventListener('message', listener);
}
