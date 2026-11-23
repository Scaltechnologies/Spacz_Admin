import { describe, expect, it } from 'vitest';
import { screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server, apiError } from './msw/server';
import { API, hallDetail, hallSummary, page, pendingVendor, studentAccount, vendorAccount } from './fixtures';
import { renderRoute, signInAsAdmin } from './render';
import ApprovalsPage from '@/features/approvals/ApprovalsPage';
import UserDetailPage from '@/features/users/UserDetailPage';

describe('Vendor approvals', () => {
  function setup() {
    signInAsAdmin();
    const calls: { action: string; body: unknown }[] = [];
    let status = 'PENDING';
    server.use(
      http.get(`${API}/api/admin/vendors`, () => HttpResponse.json(page(status === 'PENDING' ? [pendingVendor] : []))),
      http.get(`${API}/api/admin/vendors/42`, () =>
        HttpResponse.json({ vendor: { ...pendingVendor, profile: { ...pendingVendor.profile, status } }, account: vendorAccount }),
      ),
      http.post(`${API}/api/admin/vendors/42/:action`, async ({ params, request }) => {
        const body = await request.json();
        calls.push({ action: String(params.action), body });
        status = params.action === 'reject' ? 'REJECTED' : 'APPROVED';
        return HttpResponse.json({ ...pendingVendor, profile: { ...pendingVendor.profile, status, statusReason: (body as { reason?: string }).reason ?? null } });
      }),
    );
    return calls;
  }

  it('requires a reason to reject, then sends it', async () => {
    const calls = setup();
    renderRoute(<ApprovalsPage />, { path: '/approvals' });
    const user = userEvent.setup();
    await screen.findByRole('heading', { name: 'Sunrise Academy' });
    await user.click(screen.getByRole('button', { name: /^reject$/i }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /^reject$/i }));
    expect(await within(dialog).findByText('A reason is required')).toBeInTheDocument();
    expect(calls).toHaveLength(0);

    await user.click(within(dialog).getByRole('button', { name: 'Invalid GST number' }));
    await user.click(within(dialog).getByRole('button', { name: /^reject$/i }));
    await waitFor(() => expect(calls).toEqual([{ action: 'reject', body: { reason: 'Invalid GST number' } }]));
    expect(await screen.findByText(/sunrise academy rejected/i)).toBeInTheDocument();
  });

  it('approves with an optional note and empties the queue', async () => {
    const calls = setup();
    renderRoute(<ApprovalsPage />, { path: '/approvals' });
    const user = userEvent.setup();
    await screen.findByRole('heading', { name: 'Sunrise Academy' });
    await user.click(screen.getByRole('button', { name: /approve vendor/i }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /^approve$/i }));
    await waitFor(() => expect(calls).toEqual([{ action: 'approve', body: {} }]));
    expect(await screen.findByText('No vendors waiting')).toBeInTheDocument();
  });

  it('refreshes the record when the status changed underneath', async () => {
    signInAsAdmin();
    let detailCalls = 0;
    server.use(
      http.get(`${API}/api/admin/vendors`, () => HttpResponse.json(page([pendingVendor]))),
      http.get(`${API}/api/admin/vendors/42`, () => {
        detailCalls++;
        return HttpResponse.json({ vendor: pendingVendor, account: vendorAccount });
      }),
      http.post(`${API}/api/admin/vendors/42/approve`, () =>
        apiError(422, 'INVALID_STATUS_TRANSITION', 'Cannot approve a vendor in status APPROVED'),
      ),
    );
    renderRoute(<ApprovalsPage />, { path: '/approvals' });
    const user = userEvent.setup();
    await screen.findByRole('heading', { name: 'Sunrise Academy' });
    const before = detailCalls;
    await user.click(screen.getByRole('button', { name: /approve vendor/i }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: /^approve$/i }));
    expect(await screen.findByText('Status changed')).toBeInTheDocument();
    expect(await screen.findByText(/cannot approve a vendor in status approved/i)).toBeInTheDocument();
    await waitFor(() => expect(detailCalls).toBeGreaterThan(before));
  });
});

describe('Study hall moderation', () => {
  it('approves a pending hall and explains the vendor dependency', async () => {
    signInAsAdmin();
    let approved = false;
    server.use(
      http.get(`${API}/api/admin/studyhalls`, () => HttpResponse.json(page([hallSummary]))),
      http.get(`${API}/api/admin/studyhalls/5`, () => HttpResponse.json(hallDetail)),
      http.get(`${API}/api/admin/vendors/42`, () => HttpResponse.json({ vendor: pendingVendor, account: vendorAccount })),
      http.post(`${API}/api/admin/studyhalls/5/approve`, () => {
        approved = true;
        return HttpResponse.json({ ...hallDetail, status: 'APPROVED' });
      }),
    );
    renderRoute(<ApprovalsPage />, { path: '/approvals', route: '/approvals?tab=halls' });
    const user = userEvent.setup();
    await screen.findByRole('heading', { name: 'Focus Point Library' });
    expect(await screen.findByText(/vendor not approved yet/i)).toBeInTheDocument();
    expect(screen.getByText('No photos')).toBeInTheDocument(); // quality hint
    await user.click(screen.getByRole('button', { name: /approve hall/i }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent(/goes live automatically once the vendor is approved/i);
    await user.click(within(dialog).getByRole('button', { name: /^approve$/i }));
    expect(await screen.findByText(/focus point library approved/i)).toBeInTheDocument();
    expect(approved).toBe(true);
  });
});

describe('User suspension', () => {
  function userDetail(status: 'ACTIVE' | 'SUSPENDED') {
    return { account: { ...studentAccount, status }, programs: [], enrollments: [] };
  }

  it('suspends a student with a mandatory reason', async () => {
    signInAsAdmin();
    let body: unknown = null;
    let status: 'ACTIVE' | 'SUSPENDED' = 'ACTIVE';
    server.use(
      http.get(`${API}/api/admin/users/7`, () => HttpResponse.json(userDetail(status))),
      http.post(`${API}/api/admin/users/7/suspend`, async ({ request }) => {
        body = await request.json();
        status = 'SUSPENDED';
        return HttpResponse.json({ ...studentAccount, status });
      }),
    );
    renderRoute(<UserDetailPage />, { path: '/users/:id', route: '/users/7' });
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: /suspend/i }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText(/reason for suspension/i), 'Fraudulent bookings');
    await user.click(within(dialog).getByRole('button', { name: /^suspend$/i }));
    await waitFor(() => expect(body).toEqual({ reason: 'Fraudulent bookings' }));
    expect(await screen.findByRole('button', { name: /activate/i })).toBeInTheDocument();
  });

  it('activates a suspended account without requiring a reason', async () => {
    signInAsAdmin();
    let called = false;
    server.use(
      http.get(`${API}/api/admin/users/7`, () => HttpResponse.json(userDetail('SUSPENDED'))),
      http.post(`${API}/api/admin/users/7/activate`, () => {
        called = true;
        return HttpResponse.json({ ...studentAccount, status: 'ACTIVE' });
      }),
    );
    renderRoute(<UserDetailPage />, { path: '/users/:id', route: '/users/7' });
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: /activate/i }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: /^activate$/i }));
    await waitFor(() => expect(called).toBe(true));
  });

  it('hides moderation for administrator accounts', async () => {
    signInAsAdmin();
    server.use(http.get(`${API}/api/admin/users/9`, () => HttpResponse.json({ account: { ...studentAccount, id: 9, role: 'ADMIN' } })));
    renderRoute(<UserDetailPage />, { path: '/users/:id', route: '/users/9' });
    expect(await screen.findByText(/administrator accounts are protected/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /suspend/i })).not.toBeInTheDocument();
  });

  it('shows partial-data warnings but keeps the profile', async () => {
    signInAsAdmin();
    server.use(
      http.get(`${API}/api/admin/users/7`, () => HttpResponse.json({ account: studentAccount, warnings: ['Exam choices could not be loaded'] })),
    );
    renderRoute(<UserDetailPage />, { path: '/users/:id', route: '/users/7' });
    expect(await screen.findByText('Exam choices could not be loaded')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'ravi@example.com' })).toBeInTheDocument();
  });
});
