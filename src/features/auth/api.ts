import { request } from '@/lib/api/client';
import type { Account, AuthResponse, OtpRequestResponse } from '@/lib/api/types';

export const authApi = {
  login: (email: string, password: string) =>
    request<AuthResponse>('/api/auth/login', { method: 'POST', auth: false, body: { email, password } }),

  /** OTP is login-only here: `role` is never sent, so the admin console can't register accounts. */
  requestOtp: (phone: string) =>
    request<OtpRequestResponse>('/api/auth/otp/request', { method: 'POST', auth: false, body: { phone } }),
  verifyOtp: (phone: string, code: string) =>
    request<AuthResponse>('/api/auth/otp/verify', { method: 'POST', auth: false, body: { phone, code } }),

  logout: (refreshToken: string) =>
    request<void>('/api/auth/logout', { method: 'POST', auth: false, body: { refreshToken } }),

  me: (signal?: AbortSignal) => request<Account>('/api/auth/me', { signal }),

  changePassword: (body: { currentPassword?: string; newPassword: string }) =>
    request<void>('/api/auth/me/password', { method: 'PUT', body }),
};
