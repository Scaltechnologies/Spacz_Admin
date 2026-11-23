import { applyAuthResponse, cancelProactiveRefresh, refreshSession } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import type { AuthResponse } from '@/lib/api/types';
import { authApi } from '@/features/auth/api';
import { broadcastLogout, readRefreshToken, useSession } from './session';

export class NotAdminError extends Error {
  constructor() {
    super('This console is for SPACZ administrators only. Your session has been signed out.');
    this.name = 'NotAdminError';
  }
}

/**
 * Accepts a login/OTP response. Non-admin accounts are rejected and their freshly issued
 * session is revoked server-side before anything is stored.
 */
export async function completeSignIn(res: AuthResponse) {
  if (res.user?.role !== 'ADMIN') {
    await authApi.logout(res.refreshToken).catch(() => undefined);
    throw new NotAdminError();
  }
  applyAuthResponse(res);
}

export type BootResult = 'authenticated' | 'anonymous' | 'forbidden' | 'offline';

/**
 * Restores a session after a reload: refresh token → new pair → /api/auth/me → role check.
 * Network failures are reported as 'offline' (session kept) instead of logging the admin out.
 */
export async function bootstrapSession(): Promise<BootResult> {
  const session = useSession.getState();
  if (session.accessToken && session.user) return session.user.role === 'ADMIN' ? 'authenticated' : 'forbidden';
  if (!readRefreshToken()) {
    session.clear();
    return 'anonymous';
  }
  try {
    const ok = await refreshSession();
    if (!ok) return 'anonymous';
    const me = await authApi.me();
    if (me.role !== 'ADMIN') {
      await signOut();
      return 'forbidden';
    }
    useSession.getState().setUser(me);
    return 'authenticated';
  } catch (e) {
    if (e instanceof ApiError && (e.isNetwork || e.status >= 500)) return 'offline';
    useSession.getState().clear();
    return 'anonymous';
  }
}

/** Revokes the refresh token server-side (best effort) and clears local state in every tab. */
export async function signOut() {
  const refreshToken = readRefreshToken();
  cancelProactiveRefresh();
  useSession.getState().clear();
  broadcastLogout();
  if (refreshToken) await authApi.logout(refreshToken).catch(() => undefined);
}
