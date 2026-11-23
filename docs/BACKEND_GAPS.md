# Backend gaps

Features the console needs but the backend does not provide yet. Nothing below is faked in the UI;
each item says what the console does today and what endpoint or field would close the gap.

| # | Gap | Console today | Needed |
|---|---|---|---|
| 1 | **No payment service.** No payment/transaction entity, no admin transaction, refund or settlement API in any service | `/transactions` explains the gap and links to confirmed bookings. No totals, rates or refunds shown | `GET /api/admin/payments` (filters: status, from, to, bookingId, userId; paginated) · `GET /api/admin/payments/{id}` · `GET /api/admin/payments/stats?from=&to=` · `POST /api/admin/payments/{id}/refund {amount?, reason}` (audited). DTO in `src/features/transactions/TransactionsPage.tsx` |
| 2 | **No time-series metrics** | Dashboard shows current-state charts only; no trends, growth % or revenue lines | `GET /api/admin/dashboard/trends?days=30` → `[{date, registrations, bookings, confirmedRevenue}]` |
| 3 | **Bookings carry only `userId`** | Student column shows the account ID with a link | Add `studentName`, `studentPhone` to admin `BookingDto` |
| 4 | **No `vendorId` filter on `/api/admin/bookings`** | Vendor → Bookings tab picks one hall at a time | `vendorId` query param |
| 5 | **No admin view of a hall's enrollments** (incl. walk-ins) | Not shown on the hall page | `GET /api/admin/studyhalls/{id}/enrollments` |
| 6 | **No admin booking actions** | Booking drawer is read-only | `POST /api/admin/bookings/{id}/cancel {reason}` (audited), once payments exist |
| 7 | **Audit `action` filter is single-valued** | Single-select action filter | Accept `action` as a list |
| 8 | **User search is email/phone only** | Placeholder says so | Search user-service profiles by name |
| 9 | **Only `createdAt` is sortable for users and vendors** | Other columns aren't sortable | Whitelist `lastLoginAt`, `email` (users), `businessName`, `submittedAt` (vendors) |
| 10 | **Hall summaries lack `submittedAt`** | Hall queue is ordered by `submittedAt` server-side but can't display the time | Add `submittedAt` to `StudyHallSummaryDto` |
| 11 | **No admin management** | New admins only via `BOOTSTRAP_ADMIN_*` | `POST /api/admin/admins` (invite) and a list endpoint |
| 12 | **Refresh token in JS-readable storage** | Documented trade-off in `src/lib/auth/session.ts`; strict CSP in `nginx.conf` | HttpOnly, `SameSite=Strict` refresh cookie on `/api/auth/refresh` |
| 13 | **No distinct-cities endpoint** | City filters are free text with suggestions from loaded rows | `GET /api/studyhalls/cities` |
| 14 | **No notifications API** | No bell in the top bar (it would have nothing real to show) | Admin notification feed, if wanted |
| 15 | **No file upload** | Images and logos are URLs set by vendors | Pre-signed upload endpoint, only if admins need to upload |

Resolved during inspection: the plan's "admins can't see the seat map of a pending hall" is no longer
true. `VendorAccess.viewableHall` treats ADMIN as privileged, so the console renders real seat maps in
the approval panel for any status.
