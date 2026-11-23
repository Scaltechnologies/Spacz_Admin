# SPACZ Admin Console

The administration console for SPACZ: approve vendors and study halls, moderate accounts, curate
the exam and amenity catalogs, oversee bookings, and audit every action. It talks to the
`spacz-platform` Spring Boot microservices through the API gateway.

**Stack:** React 19 · TypeScript (strict) · Vite 6 · Tailwind CSS v4 · Radix UI (shadcn-style
components in `src/components/ui`) · React Router 7 · TanStack Query 5 / Table 8 · Zustand ·
React Hook Form + Zod · Recharts · Lucide · Sonner · Motion.

## Quick start

```bash
cp .env.example .env          # VITE_API_BASE_URL=http://localhost:8080 (the gateway)
npm install
npm run dev                   # http://localhost:5173 (already allowed by the gateway's CORS)
```

Start the backend first (`Spacz_backend/spacz-platform`: `docker compose up -d --build`) and sign in
with the bootstrap admin from that project's `.env` (`BOOTSTRAP_ADMIN_EMAIL` / `BOOTSTRAP_ADMIN_PASSWORD`).

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with HMR |
| `npm run build` | Type-check and production build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Vitest + Testing Library + MSW (no backend needed) |
| `npm run test:e2e` | Playwright against the real backend (see below) |

## Environment

| Variable | Default | Purpose |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:8080` | Gateway origin. Never point at individual services |
| `VITE_APP_NAME` | `SPACZ Admin` | Display name |

Vite inlines these at build time, so build once per environment.

## Routes

| Route | Page |
|---|---|
| `/login` | Email/password or phone-OTP sign-in (ADMIN only) |
| `/dashboard` | KPIs, status charts, attention queue, recent activity |
| `/approvals?tab=vendors\|halls&selected=` | Master-detail review queue (J/K, A, R shortcuts) |
| `/users`, `/users/:id?tab=` | Accounts; detail tabs: overview, exams, memberships, bookings, activity, audit (vendor accounts: vendor tab) |
| `/vendors`, `/vendors/:vendorId?tab=` | Vendors; detail tabs: overview, halls, bookings, audit |
| `/studyhalls?view=grid\|table`, `/studyhalls/:id?tab=` | Halls; detail tabs: overview, photos, seating (live seat map), bookings, audit |
| `/bookings?status=&preset=&from=&to=&open=` | Bookings with a read-only detail drawer |
| `/transactions` | Payment gap report (no payment API exists yet) |
| `/catalog/programs` | Exams & programs (grouped, create/edit, deactivate/reactivate) |
| `/catalog/amenities` | Amenities (card grid, icon picker, retire/restore) |
| `/audit-logs` | Audit explorer, expandable rows, raw JSON, CSV export (≤ 5,000 rows) |
| `/settings/profile` · `/security` · `/appearance` | Admin profile, password & session, theme/accent/density/motion |
| `/403`, `*` | Forbidden, not found |

All list filters, paging, sorting, tabs, view mode and open drawers live in the URL.

## Project structure

```
src/
  app/            router, query client, error/404/403 pages
  layouts/        AdminLayout (sidebar, top bar, ⌘K command palette, breadcrumbs, shortcuts)
  lib/
    api/          typed client (single-flight refresh, timeouts, error envelope), DTO types, query keys
    auth/         session store (token storage lives only here), boot/sign-in/out, RequireAdmin guard
    format.ts     INR, IST dates, phone, relative time
    status.ts     status → label/colour, moderation state machines
    schemas.ts    Zod schemas mirroring backend bean validation
  components/
    ui/           Radix-based primitives (button, input, dialog/sheet, menus, tabs, …)
    data-table/   server-paginated DataTable, toolbar controls
    shared/       StatusBadge, KpiCard, ModerationDialog, SeatGrid, Timeline, states, …
  features/       auth · dashboard · approvals · users · vendors · studyhalls · bookings ·
                  transactions · catalog · audit · account  (each: api.ts hooks + pages)
  hooks/          useUrlState, useUrlSearch, useHotkeys, useDebounce, …
  styles/         design tokens (light/dark, accents, density)
tests/            unit + component tests, MSW handlers, DTO fixtures (test-only)
e2e/              Playwright specs against the live backend
docs/             BACKEND_INTEGRATION.md (endpoint inventory) · BACKEND_GAPS.md
```

## Security notes

- The access token (15 min) is kept **in memory only**. The rotating refresh token is in
  `localStorage` (as the backend documents) so reloads keep the session. Any XSS could read it, so
  this is **not** equivalent to an HttpOnly cookie. All of this lives in `src/lib/auth/session.ts`.
  Mitigations: strict CSP (`nginx.conf`), refresh-token reuse detection in auth-service. The proper
  fix is an HttpOnly refresh cookie (see `docs/BACKEND_GAPS.md`).
- Parallel 401s share **one** refresh; each request is retried at most once. Reusing a rotated
  refresh token would make the backend revoke every session, so this matters.
- After any login the role is checked. Non-ADMIN sessions are revoked server-side and refused.
- Logout revokes the refresh token and signs out other open tabs (BroadcastChannel).
- Tokens and passwords are never logged. CSV exports neutralise spreadsheet formulas.

## Testing

```bash
npm test
```

52 tests: API client (single-flight refresh, retry-once, expiry, error parsing, 204, network), auth
(login, invalid/locked credentials, non-admin rejection, session restore, offline boot), dashboard
(KPIs, partial data, zero-seat occupancy, queue approve), vendor/hall/user moderation (reason
rules, stale-status refetch, admin protection, partial data), catalogs (create, duplicate code,
validation, soft deactivate, retire), bookings (filters → API, URL state, read-only drawer), audit
export paging and cap, plus formatters, CSV, schemas and state machines.

End-to-end (real backend):

```bash
npx playwright install chromium
E2E_ADMIN_EMAIL=admin@spacz.local E2E_ADMIN_PASSWORD='…' npm run test:e2e
```

The E2E suite seeds its own pending vendor through the public API, then covers login, reload
persistence, vendor approval → audit log, program create/deactivate, logout, and the mobile drawer.

## Deployment

Static build served by any web server or CDN with an SPA fallback to `index.html`.

```bash
docker build --build-arg VITE_API_BASE_URL=https://api.spacz.in -t spacz/admin-web .
docker run -p 8085:80 -e API_ORIGIN=https://api.spacz.in spacz/admin-web
```

`nginx.conf` sets the SPA fallback, long-lived caching for fingerprinted assets, `no-cache` for
the shell, and security headers (CSP with `connect-src` = gateway, `X-Frame-Options: DENY`,
`Referrer-Policy`, `Permissions-Policy`). Add the console's origin to the gateway's
`CORS_ALLOWED_ORIGINS`.
