import { describe, expect, it, vi } from 'vitest';
import { screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server, apiError } from './msw/server';
import { API, auditLog, booking, page, program } from './fixtures';
import { renderRoute, signInAsAdmin } from './render';
import ProgramsPage from '@/features/catalog/ProgramsPage';
import AmenitiesPage from '@/features/catalog/AmenitiesPage';
import BookingsPage from '@/features/bookings/BookingsPage';
import { fetchAllAuditLogs, MAX_EXPORT_ROWS } from '@/features/audit/api';
import type { ProgramInput } from '@/lib/api/types';

describe('Programs catalog', () => {
  it('creates a program and maps a duplicate code to the field', async () => {
    signInAsAdmin();
    const created: unknown[] = [];
    server.use(
      http.get(`${API}/api/programs/all`, () => HttpResponse.json(page([program]))),
      http.post(`${API}/api/programs`, async ({ request }) => {
        const body = (await request.json()) as ProgramInput;
        if (body.code === 'EAMCET') return apiError(409, 'DUPLICATE_RESOURCE', 'A program with code EAMCET already exists');
        created.push(body);
        return HttpResponse.json({ id: 2, ...body }, { status: 201 });
      }),
    );
    renderRoute(<ProgramsPage />, { path: '/catalog/programs' });
    const user = userEvent.setup();
    expect(await screen.findByText('TS EAMCET')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /new program/i }));
    const sheet = await screen.findByRole('dialog');
    await user.type(within(sheet).getByLabelText(/code/i), 'eamcet');
    await user.type(within(sheet).getByLabelText(/^name/i), 'Duplicate');
    await user.type(within(sheet).getByLabelText(/category/i), 'Engineering');
    await user.click(within(sheet).getByRole('button', { name: /create program/i }));
    expect(await within(sheet).findByText(/already exists/i)).toBeInTheDocument();

    await user.clear(within(sheet).getByLabelText(/code/i));
    await user.type(within(sheet).getByLabelText(/code/i), 'neet-ug');
    await user.click(within(sheet).getByRole('button', { name: /create program/i }));
    await waitFor(() => expect(created).toEqual([{ code: 'NEET-UG', name: 'Duplicate', description: null, category: 'Engineering', active: true }]));
  });

  it('validates the code pattern client-side', async () => {
    signInAsAdmin();
    server.use(http.get(`${API}/api/programs/all`, () => HttpResponse.json(page([program]))));
    renderRoute(<ProgramsPage />, { path: '/catalog/programs' });
    const user = userEvent.setup();
    await screen.findByText('TS EAMCET');
    await user.click(screen.getByRole('button', { name: /new program/i }));
    const sheet = await screen.findByRole('dialog');
    await user.type(within(sheet).getByLabelText(/code/i), 'bad code');
    await user.click(within(sheet).getByRole('button', { name: /create program/i }));
    expect(await within(sheet).findByText(/letters, digits, '_' and '-' only/i)).toBeInTheDocument();
  });

  it('deactivates with confirmation via DELETE (soft)', async () => {
    signInAsAdmin();
    let deleted = false;
    server.use(
      http.get(`${API}/api/programs/all`, () => HttpResponse.json(page([program]))),
      http.delete(`${API}/api/programs/1`, () => {
        deleted = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    renderRoute(<ProgramsPage />, { path: '/catalog/programs' });
    const user = userEvent.setup();
    await user.click(await screen.findByRole('switch', { name: /deactivate ts eamcet/i }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: /^deactivate$/i }));
    await waitFor(() => expect(deleted).toBe(true));
  });
});

describe('Amenities catalog', () => {
  it('creates an amenity with the chosen icon', async () => {
    signInAsAdmin();
    let body: Record<string, unknown> | null = null;
    server.use(
      http.get(`${API}/api/amenities/all`, () => HttpResponse.json([])),
      http.post(`${API}/api/amenities`, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ id: 3, ...body }, { status: 201 });
      }),
    );
    renderRoute(<AmenitiesPage />, { path: '/catalog/amenities' });
    const user = userEvent.setup();
    await screen.findByText(/no amenities yet/i);
    await user.click(screen.getByRole('button', { name: /new amenity/i }));
    const sheet = await screen.findByRole('dialog');
    await user.type(within(sheet).getByLabelText(/code/i), 'wifi');
    await user.type(within(sheet).getByLabelText(/^name/i), 'Wi-Fi');
    await user.click(within(sheet).getByRole('radio', { name: 'wifi' }));
    await user.click(within(sheet).getByRole('button', { name: /create amenity/i }));
    await waitFor(() => expect(body).toEqual({ code: 'WIFI', name: 'Wi-Fi', icon: 'wifi', description: null, active: true }));
  });

  it('offers retire instead of delete', async () => {
    signInAsAdmin();
    server.use(http.get(`${API}/api/amenities/all`, () => HttpResponse.json([{ id: 1, code: 'WIFI', name: 'Wi-Fi', icon: 'wifi', description: null, active: true }])));
    renderRoute(<AmenitiesPage />, { path: '/catalog/amenities' });
    expect(await screen.findByRole('button', { name: /retire/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
  });
});

describe('Bookings', () => {
  it('sends filters to the API, opens a read-only drawer, and keeps state in the URL', async () => {
    signInAsAdmin();
    const queries: URLSearchParams[] = [];
    server.use(
      http.get(`${API}/api/admin/bookings`, ({ request }) => {
        queries.push(new URL(request.url).searchParams);
        return HttpResponse.json(page([booking], { totalElements: 45, totalPages: 3, last: false }));
      }),
    );
    const { router } = renderRoute(<BookingsPage />, { path: '/bookings', route: '/bookings?status=CONFIRMED' });
    const user = userEvent.setup();
    expect((await screen.findAllByText('SPZ-7Q4K2M')).length).toBeGreaterThan(0);
    expect(queries.at(-1)?.get('status')).toBe('CONFIRMED');

    await user.click(screen.getByRole('button', { name: /next page/i }));
    await waitFor(() => expect(queries.at(-1)?.get('page')).toBe('1'));
    expect(router.state.location.search).toContain('page=1');

    await user.click(screen.getByRole('radio', { name: /^pending$/i }));
    await waitFor(() => expect(queries.at(-1)?.get('status')).toBe('PENDING'));
    expect(router.state.location.search).not.toContain('page='); // filter change resets paging

    await user.click(screen.getAllByText('SPZ-7Q4K2M')[0]);
    const drawer = await screen.findByRole('dialog');
    expect(within(drawer).getByText('₹5,000.00')).toBeInTheDocument();
    expect(within(drawer).getByText(/read-only for administrators/i)).toBeInTheDocument();
    expect(within(drawer).queryByRole('button', { name: /cancel booking|refund/i })).not.toBeInTheDocument();
    expect(router.state.location.search).toContain('open=900');
  });
});

describe('Audit export', () => {
  it('pages through filtered results and stops at the cap', async () => {
    let requests = 0;
    server.use(
      http.get(`${API}/api/admin/audit-logs`, ({ request }) => {
        requests++;
        const sp = new URL(request.url).searchParams;
        expect(sp.get('action')).toBe('VENDOR_APPROVED');
        const p = Number(sp.get('page'));
        const content = Array.from({ length: 100 }, (_, i) => auditLog(p * 100 + i));
        return HttpResponse.json(page(content, { page: p, size: 100, totalElements: 7000, totalPages: 70, first: p === 0, last: false }));
      }),
    );
    const progress = vi.fn();
    const res = await fetchAllAuditLogs({ action: 'VENDOR_APPROVED' }, progress);
    expect(res.rows).toHaveLength(MAX_EXPORT_ROWS);
    expect(res.truncated).toBe(true);
    expect(requests).toBe(MAX_EXPORT_ROWS / 100);
    expect(progress).toHaveBeenLastCalledWith(MAX_EXPORT_ROWS, MAX_EXPORT_ROWS);
  });
});
