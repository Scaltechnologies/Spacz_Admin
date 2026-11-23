# Backend integration inventory

Every call the Admin Console makes, verified against the Java source in `Spacz_backend/spacz-platform`
(controllers, DTO records, entity state machines, sort whitelists). All calls go through the gateway
(`VITE_API_BASE_URL`, default `http://localhost:8080`).

Lists take `page` (0-based), `size`, `sort=field,dir` and return
`{content, page, size, totalElements, totalPages, first, last}`. Errors use the shared envelope
`{status, error, message, path, correlationId, fieldErrors[]}`.

## Authentication — auth-service

| Feature | Method & path | Request | Response | Auth | Notes |
|---|---|---|---|---|---|
| Login | `POST /api/auth/login` | `{email, password}` (email may be a phone) | `AuthResponse` | public | Non-ADMIN accounts are rejected and their session revoked via logout |
| Phone OTP | `POST /api/auth/otp/request` | `{phone}` | `{phone, expiresInSeconds, resendAfterSeconds, devCode?}` | public | `role` is never sent, so OTP can't register accounts |
| | `POST /api/auth/otp/verify` | `{phone, code}` | `AuthResponse` | public | `422 REGISTRATION_REQUIRED` shown as "no account" |
| Refresh | `POST /api/auth/refresh` | `{refreshToken}` | `AuthResponse` (rotated) | public | Single-flight; reuse of an old token revokes all sessions |
| Logout | `POST /api/auth/logout` | `{refreshToken}` | 204 | public | Also broadcast to other tabs |
| Account | `GET /api/auth/me` | — | `AccountDto` | any role | Role re-checked on boot |
| Password | `PUT /api/auth/me/password` | `{currentPassword?, newPassword}` | 204 | any role | `currentPassword` omitted when `passwordSet=false` |

## Admin — admin-service (all `ADMIN`)

| Feature | Method & path | Query / body | Response | Notes |
|---|---|---|---|---|
| Dashboard | `GET /api/admin/dashboard` | — | `DashboardResponse` | Groups are `null` when a service is down; `unavailableServices[]` |
| My profile | `GET` / `PUT /api/admin/me` | `{fullName*, email?, phone?, title?}` | `AdminProfileResponse` | Auto-created on first GET |
| Users | `GET /api/admin/users` | `search` (email/phone), `role`, `status` | `Page<AccountDto>` | Sort: `createdAt` only |
| User detail | `GET /api/admin/users/{id}` | — | `AdminUserDetailResponse` | `warnings[]` for partial data |
| User activity | `GET /api/admin/users/{id}/activity` | page | `Page<Activity>` | |
| Suspend / activate | `POST /api/admin/users/{id}/suspend` · `/activate` | `{reason*}` · `{reason?}` | `AccountDto` | ADMIN accounts are rejected by the backend; hidden in UI |
| Vendors | `GET /api/admin/vendors` | `search`, `status`, `city` | `Page<AdminVendorDto>` | Sort: `createdAt` only |
| Vendor detail | `GET /api/admin/vendors/{vendorId}` | — | `{vendor, account?}` | `vendorId` = auth account ID |
| Vendor moderation | `POST /api/admin/vendors/{vendorId}/approve` · `reject` · `suspend` · `activate` | `{reason}` (required for reject/suspend) | `AdminVendorDto` | |
| Study halls | `GET /api/admin/studyhalls` | `search`, `status`, `city`, `vendorId` | `Page<StudyHallSummaryDto>` | Sort: name, city, createdAt, updatedAt, submittedAt, pricePerDay, status |
| Hall detail | `GET /api/admin/studyhalls/{id}` | — | `StudyHallDetailDto` | Any status |
| Hall moderation | `POST /api/admin/studyhalls/{id}/approve` · `reject` · `suspend` · `activate` | `{reason}` | `StudyHallDetailDto` | |
| Bookings | `GET /api/admin/bookings` | `studyHallId`, `userId`, `status`, `from`, `to` (dates, overlap) | `Page<BookingDto>` | Read-only. Sort: createdAt, startDate, endDate, status, totalPrice |
| Audit log | `GET /api/admin/audit-logs` | `search`, `action` (single), `actorUserId`, `actorRole`, `entityType`, `entityId`, `from`, `to` (ISO instants, `to` exclusive) | `Page<AuditLogResponse>` | |

## Catalogs and shared reads — studyhall-service

| Feature | Method & path | Body | Response | Auth |
|---|---|---|---|---|
| Programs | `GET /api/programs/all` | `search`, `category`, `active` | `Page<ProgramResponse>` | ADMIN |
| | `POST /api/programs` · `PUT /api/programs/{id}` | `{code*, name*, description?, category*, active?}` | `ProgramResponse` | ADMIN |
| | `DELETE /api/programs/{id}` | — | 204 (soft deactivate) | ADMIN |
| Amenities | `GET /api/amenities/all` | — | `AmenityResponse[]` | ADMIN |
| | `POST /api/amenities` · `PUT /api/amenities/{id}` | `{code*, name*, icon?, description?, active?}` | `AmenityResponse` | ADMIN (no delete endpoint) |
| Seat map | `GET /api/studyhalls/{id}/seats?startDate=&endDate=` | — | `SeatMapResponse` | Public for live halls; `VendorAccess.viewableHall` lets ADMIN read any status. Max range 366 days |
| Booking deep link | `GET /api/bookings/{id}` | — | `BookingResponse` | ADMIN allowed (`BookingServiceImpl.get`) |

## Moderation state machines (from the entities)

| Vendor (`VendorProfile.apply`) | approve | reject | suspend | activate |
|---|:-:|:-:|:-:|:-:|
| PENDING | ✓ | ✓ | | |
| REJECTED | ✓ | | | |
| APPROVED / ACTIVE | | | ✓ | |
| INACTIVE | | | ✓ | ✓ |
| SUSPENDED | | | | ✓ |

| Study hall (`StudyHall.apply`) | approve | reject | suspend | activate |
|---|:-:|:-:|:-:|:-:|
| PENDING_APPROVAL | ✓ | ✓ | ✓ | |
| APPROVED / ACTIVE / INACTIVE | | | ✓ | |
| SUSPENDED | | | | ✓ (→ ACTIVE if vendor operational, else APPROVED) |
| DRAFT / REJECTED | | | | |

> `docs/ADMIN_FRONTEND_PLAN.md` §10 lists suspend for DRAFT and REJECTED halls; the entity does not allow it,
> so the console follows the code.
