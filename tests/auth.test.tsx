import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server, apiError } from './msw/server';
import { API, adminAccount, authResponse, studentAccount } from './fixtures';
import { renderRoute } from './render';
import LoginPage from '@/features/auth/pages/LoginPage';
import { RequireAdmin } from '@/lib/auth/RequireAdmin';
import { useSession, readRefreshToken } from '@/lib/auth/session';

async function fillAndSubmit(email = 'priya@spacz.in', password = 'secret123') {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(/email or phone/i), email);
  await user.type(screen.getByLabelText(/^password$/i), password);
  await user.click(screen.getByRole('button', { name: /sign in/i }));
  return user;
}

describe('Login', () => {
  it('signs in an admin and redirects to the requested page', async () => {
    server.use(http.post(`${API}/api/auth/login`, () => HttpResponse.json(authResponse(adminAccount))));
    const { router } = renderRoute(<LoginPage />, { path: '/login', route: '/login?redirect=%2Fvendors', extra: [{ path: '/vendors', element: <div>VENDORS</div> }] });
    await fillAndSubmit();
    expect(await screen.findByText('VENDORS')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/vendors');
    expect(useSession.getState().accessToken).toBe('access-1');
  });

  it('shows a clear message for invalid credentials and clears the password', async () => {
    server.use(http.post(`${API}/api/auth/login`, () => apiError(401, 'INVALID_CREDENTIALS', 'Bad credentials')));
    renderRoute(<LoginPage />, { path: '/login' });
    await fillAndSubmit();
    expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect email or password.');
    expect(screen.getByLabelText(/^password$/i)).toHaveValue('');
  });

  it('shows the locked-account message', async () => {
    server.use(http.post(`${API}/api/auth/login`, () => apiError(403, 'ACCOUNT_LOCKED', 'Locked')));
    renderRoute(<LoginPage />, { path: '/login' });
    await fillAndSubmit();
    expect(await screen.findByRole('alert')).toHaveTextContent(/temporarily locked/i);
  });

  it('rejects a non-admin account and revokes its session', async () => {
    let revoked: string | null = null;
    server.use(
      http.post(`${API}/api/auth/login`, () => HttpResponse.json(authResponse(studentAccount, 9))),
      http.post(`${API}/api/auth/logout`, async ({ request }) => {
        revoked = ((await request.json()) as { refreshToken: string }).refreshToken;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    renderRoute(<LoginPage />, { path: '/login' });
    await fillAndSubmit('ravi@example.com');
    expect(await screen.findByRole('alert')).toHaveTextContent(/administrators only/i);
    expect(revoked).toBe('refresh-9');
    expect(useSession.getState().accessToken).toBeNull();
    expect(readRefreshToken()).toBeNull();
  });

  it('validates required fields before calling the server', async () => {
    renderRoute(<LoginPage />, { path: '/login' });
    await userEvent.setup().click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByText(/enter your email or phone/i)).toBeInTheDocument();
    expect(screen.getByText(/enter your password/i)).toBeInTheDocument();
  });
});

describe('RequireAdmin', () => {
  it('redirects to /login when there is no session', async () => {
    const { router } = renderRoute(
      <RequireAdmin>
        <div>SECRET</div>
      </RequireAdmin>,
      { path: '/users' },
    );
    expect(await screen.findByText('LOGIN PAGE')).toBeInTheDocument();
    expect(router.state.location.search).toContain('redirect=%2Fusers');
    expect(screen.queryByText('SECRET')).not.toBeInTheDocument();
  });

  it('restores a session from the refresh token', async () => {
    localStorage.setItem('spacz.admin.refresh', 'refresh-0');
    server.use(http.post(`${API}/api/auth/refresh`, () => HttpResponse.json(authResponse(adminAccount, 3))));
    renderRoute(
      <RequireAdmin>
        <div>SECRET</div>
      </RequireAdmin>,
      { path: '/users' },
    );
    expect(await screen.findByText('SECRET')).toBeInTheDocument();
    expect(useSession.getState().user?.role).toBe('ADMIN');
  });

  it('sends a non-admin restored session to the forbidden page', async () => {
    localStorage.setItem('spacz.admin.refresh', 'refresh-0');
    server.use(
      http.post(`${API}/api/auth/refresh`, () => HttpResponse.json(authResponse(studentAccount, 3))),
      http.get(`${API}/api/auth/me`, () => HttpResponse.json(studentAccount)),
    );
    renderRoute(
      <RequireAdmin>
        <div>SECRET</div>
      </RequireAdmin>,
      { path: '/users' },
    );
    expect(await screen.findByText('FORBIDDEN PAGE')).toBeInTheDocument();
    await waitFor(() => expect(readRefreshToken()).toBeNull());
  });

  it('keeps the session and offers retry when the gateway is down', async () => {
    localStorage.setItem('spacz.admin.refresh', 'refresh-0');
    server.use(http.post(`${API}/api/auth/refresh`, () => HttpResponse.error()));
    renderRoute(
      <RequireAdmin>
        <div>SECRET</div>
      </RequireAdmin>,
      { path: '/users' },
    );
    expect(await screen.findByText(/can’t reach the spacz gateway/i)).toBeInTheDocument();
    expect(readRefreshToken()).toBe('refresh-0');
  });
});
