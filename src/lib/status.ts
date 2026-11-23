import type {
  AccountStatus,
  AuditAction,
  BookingStatus,
  EnrollmentStatus,
  PreparationStatus,
  Role,
  SeatStatus,
  StudyHallStatus,
  VendorStatus,
} from '@/lib/api/types';

export type Tone = 'success' | 'warning' | 'danger' | 'neutral' | 'info' | 'primary' | 'violet' | 'orange';

export interface StatusMeta {
  label: string;
  tone: Tone;
  pulse?: boolean;
}

const S: Record<string, StatusMeta> = {
  ACTIVE: { label: 'Active', tone: 'success' },
  APPROVED: { label: 'Approved', tone: 'success' },
  CONFIRMED: { label: 'Confirmed', tone: 'success' },
  AVAILABLE: { label: 'Available', tone: 'success' },
  PENDING: { label: 'Pending', tone: 'warning', pulse: true },
  PENDING_APPROVAL: { label: 'Pending approval', tone: 'warning', pulse: true },
  DRAFT: { label: 'Draft', tone: 'neutral' },
  REJECTED: { label: 'Rejected', tone: 'danger' },
  CANCELLED: { label: 'Cancelled', tone: 'danger' },
  SUSPENDED: { label: 'Suspended', tone: 'danger' },
  DISABLED: { label: 'Disabled', tone: 'danger' },
  INACTIVE: { label: 'Inactive', tone: 'neutral' },
  EXPIRED: { label: 'Expired', tone: 'neutral' },
  COMPLETED: { label: 'Completed', tone: 'info' },
  RESERVED: { label: 'Reserved', tone: 'violet' },
  MAINTENANCE: { label: 'Maintenance', tone: 'orange' },
  PLANNED: { label: 'Planned', tone: 'neutral' },
  IN_PROGRESS: { label: 'In progress', tone: 'primary' },
  PAUSED: { label: 'Paused', tone: 'warning' },
  DROPPED: { label: 'Dropped', tone: 'danger' },
};

export function statusMeta(status: string | null | undefined): StatusMeta {
  if (!status) return { label: 'Unknown', tone: 'neutral' };
  return S[status] ?? { label: status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, ' '), tone: 'neutral' };
}

export const ROLE_META: Record<Role, { label: string; tone: Tone }> = {
  USER: { label: 'Student', tone: 'primary' },
  VENDOR: { label: 'Vendor', tone: 'info' },
  ADMIN: { label: 'Admin', tone: 'violet' },
};

export const VENDOR_STATUSES: VendorStatus[] = ['PENDING', 'APPROVED', 'ACTIVE', 'DRAFT', 'REJECTED', 'SUSPENDED', 'INACTIVE'];
export const HALL_STATUSES: StudyHallStatus[] = ['PENDING_APPROVAL', 'ACTIVE', 'APPROVED', 'INACTIVE', 'SUSPENDED', 'REJECTED', 'DRAFT'];
export const ACCOUNT_STATUSES: AccountStatus[] = ['ACTIVE', 'SUSPENDED', 'DISABLED'];
export const BOOKING_STATUSES: BookingStatus[] = ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'EXPIRED'];
export const ROLES: Role[] = ['USER', 'VENDOR', 'ADMIN'];
export const ENROLLMENT_STATUSES: EnrollmentStatus[] = ['ACTIVE', 'COMPLETED', 'CANCELLED'];
export const PREPARATION_STATUSES: PreparationStatus[] = ['PLANNED', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'DROPPED'];
export const SEAT_STATUSES: SeatStatus[] = ['AVAILABLE', 'RESERVED', 'MAINTENANCE', 'INACTIVE'];

// ---------------------------------------------------------------------------
// Moderation state machines — mirror VendorProfile.apply / StudyHall.apply in studyhall-service.
// The backend is authoritative (422 INVALID_STATUS_TRANSITION); these only hide actions that would fail.
// ---------------------------------------------------------------------------
export type ModerationAction = 'approve' | 'reject' | 'suspend' | 'activate';

export const vendorActions: Record<VendorStatus, ModerationAction[]> = {
  DRAFT: [],
  PENDING: ['approve', 'reject'],
  REJECTED: ['approve'],
  APPROVED: ['suspend'],
  ACTIVE: ['suspend'],
  INACTIVE: ['suspend', 'activate'],
  SUSPENDED: ['activate'],
};

export const hallActions: Record<StudyHallStatus, ModerationAction[]> = {
  DRAFT: [],
  PENDING_APPROVAL: ['approve', 'reject', 'suspend'],
  APPROVED: ['suspend'],
  ACTIVE: ['suspend'],
  INACTIVE: ['suspend'],
  REJECTED: [],
  SUSPENDED: ['activate'],
};

/** Accounts: ACTIVE → suspend, SUSPENDED → activate. ADMIN accounts are protected by auth-service. */
export function accountActions(role: Role, status: AccountStatus, isSelf: boolean): ModerationAction[] {
  if (role === 'ADMIN' || isSelf) return [];
  if (status === 'ACTIVE') return ['suspend'];
  if (status === 'SUSPENDED') return ['activate'];
  return [];
}

/** Whether a reason is mandatory for the action (ReasonRequest vs OptionalReasonRequest). */
export const reasonRequired: Record<ModerationAction, boolean> = {
  approve: false,
  reject: true,
  suspend: true,
  activate: false,
};

// ---------------------------------------------------------------------------
// Audit action presentation
// ---------------------------------------------------------------------------
export const ADMIN_AUDIT_ACTIONS: AuditAction[] = [
  'USER_SUSPENDED',
  'USER_ACTIVATED',
  'VENDOR_APPROVED',
  'VENDOR_REJECTED',
  'VENDOR_SUSPENDED',
  'VENDOR_ACTIVATED',
  'STUDY_HALL_APPROVED',
  'STUDY_HALL_REJECTED',
  'STUDY_HALL_SUSPENDED',
  'STUDY_HALL_ACTIVATED',
  'PROGRAM_CREATED',
  'PROGRAM_UPDATED',
  'PROGRAM_DEACTIVATED',
  'AMENITY_CREATED',
  'AMENITY_UPDATED',
];
export const PLATFORM_AUDIT_ACTIONS: AuditAction[] = [
  'USER_REGISTERED',
  'VENDOR_REGISTERED',
  'VENDOR_SUBMITTED',
  'STUDY_HALL_CREATED',
  'STUDY_HALL_UPDATED',
  'STUDY_HALL_SUBMITTED',
  'STUDY_HALL_DELETED',
];

export function auditTone(action: string): Tone {
  if (/APPROVED|ACTIVATED|CREATED/.test(action)) return 'success';
  if (/REJECTED|SUSPENDED|DEACTIVATED|DELETED/.test(action)) return 'danger';
  if (/REGISTERED/.test(action)) return 'violet';
  if (/SUBMITTED/.test(action)) return 'warning';
  return 'info';
}
