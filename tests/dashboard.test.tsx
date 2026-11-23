import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from './msw/server';
import { API, dashboard, page, pendingVendor, hallSummary } from './fixtures';
import { renderRoute, signInAsAdmin } from './render';
import DashboardPage from '@/features/dashboard/DashboardPage';

function queueHandlers(vendors = [pendingVendor], halls = [hallSummary]) {
  return [
    http.get(`${API}/api/admin/vendors`, () => HttpResponse.json(page(vendors))),
    http.get(`${API}/api/admin/studyhalls`, () => HttpResponse.json(page(halls))),
  ];
}

describe('Dashboard', () => {
  it('renders KPIs from the dashboard response', async () => {
    signInAsAdmin();
    server.use(...queueHandlers());
    renderRoute(<DashboardPage />, { path: '/dashboard' });
    expect(await screen.findByText('1,240')).toBeInTheDocument(); // totalUsers
    expect(screen.getAllByText('25.0%').length).toBeGreaterThan(0); // 800 / 3200 occupied (KPI + gauge)
    expect(await screen.findByText('Sunrise Academy')).toBeInTheDocument();
    expect(screen.getByText('Focus Point Library')).toBeInTheDocument();
  });

  it('shows unavailable (not zero) when a service is down', async () => {
    signInAsAdmin();
    server.use(
      ...queueHandlers(),
      http.get(`${API}/api/admin/dashboard`, () =>
        HttpResponse.json({ ...dashboard, bookings: null, unavailableServices: ['studyhall-service'] }),
      ),
    );
    renderRoute(<DashboardPage />, { path: '/dashboard' });
    expect(await screen.findByText(/some metrics are unavailable/i)).toBeInTheDocument();
    const bookingsCard = screen.getByText('Bookings today').closest('div')!.parentElement!;
    expect(within(bookingsCard).getByText('Unavailable')).toBeInTheDocument();
    expect(screen.getByText('1,240')).toBeInTheDocument(); // other metrics still render
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('does not compute occupancy when there are no seats', async () => {
    signInAsAdmin();
    server.use(
      ...queueHandlers([], []),
      http.get(`${API}/api/admin/dashboard`, () =>
        HttpResponse.json({ ...dashboard, studyHalls: { ...dashboard.studyHalls!, totalSeats: 0 }, bookings: { ...dashboard.bookings!, occupiedSeatsToday: 0 } }),
      ),
    );
    renderRoute(<DashboardPage />, { path: '/dashboard' });
    expect(await screen.findByText(/occupancy can’t be calculated/i)).toBeInTheDocument();
    expect(await screen.findByText(/you’re all caught up/i)).toBeInTheDocument();
  });

  it('approves a vendor from the attention queue', async () => {
    signInAsAdmin();
    let approved = false;
    server.use(
      ...queueHandlers(),
      http.post(`${API}/api/admin/vendors/42/approve`, () => {
        approved = true;
        return HttpResponse.json({ ...pendingVendor, profile: { ...pendingVendor.profile, status: 'APPROVED' } });
      }),
    );
    renderRoute(<DashboardPage />, { path: '/dashboard' });
    const user = userEvent.setup();
    const row = (await screen.findByText('Sunrise Academy')).closest('li')!;
    await user.click(within(row).getByRole('button', { name: /approve/i }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /^approve$/i }));
    expect(await screen.findByText(/sunrise academy approved/i)).toBeInTheDocument();
    expect(approved).toBe(true);
  });
});
