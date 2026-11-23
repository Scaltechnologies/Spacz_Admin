/**
 * Domain types mirroring the Java DTOs exposed through the SPACZ gateway.
 * Field names and nullability follow the records in spacz-platform (admin-service client DTOs,
 * studyhall-service DTOs, auth-service AccountDto). Timestamps are ISO-8601 UTC strings,
 * dates are YYYY-MM-DD, money is a JSON number (INR).
 */

// ---------- common ----------
export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export type Role = 'ADMIN' | 'USER' | 'VENDOR';
export type AccountStatus = 'ACTIVE' | 'SUSPENDED' | 'DISABLED';
export type VendorStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED' | 'ACTIVE' | 'INACTIVE';
export type StudyHallStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'SUSPENDED'
  | 'ACTIVE'
  | 'INACTIVE';
export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'EXPIRED';
export type BookingPlan = 'DAILY' | 'MONTHLY';
export type EnrollmentStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
export type EnrollmentSource = 'BOOKING' | 'WALK_IN';
export type SeatStatus = 'AVAILABLE' | 'RESERVED' | 'MAINTENANCE' | 'INACTIVE';
export type SeatType = 'STANDARD' | 'PREMIUM' | 'CABIN' | 'WINDOW' | 'ACCESSIBLE';
export type PreparationStatus = 'PLANNED' | 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED' | 'DROPPED';
export type ActivityType =
  | 'PROFILE_CREATED'
  | 'PROFILE_UPDATED'
  | 'PROGRAM_ADDED'
  | 'PROGRAM_UPDATED'
  | 'PROGRAM_REMOVED'
  | 'BOOKING_CREATED'
  | 'BOOKING_CONFIRMED'
  | 'BOOKING_CANCELLED'
  | 'BOOKING_COMPLETED'
  | 'BOOKING_EXPIRED';

export const AUDIT_ACTIONS = [
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
  'USER_REGISTERED',
  'VENDOR_REGISTERED',
  'VENDOR_SUBMITTED',
  'STUDY_HALL_CREATED',
  'STUDY_HALL_UPDATED',
  'STUDY_HALL_SUBMITTED',
  'STUDY_HALL_DELETED',
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];
export const AUDIT_ENTITY_TYPES = ['VENDOR', 'STUDY_HALL', 'USER_ACCOUNT', 'PROGRAM', 'AMENITY'] as const;
export type AuditEntityType = (typeof AUDIT_ENTITY_TYPES)[number];
export const ACTOR_ROLES = ['ADMIN', 'VENDOR', 'USER', 'SYSTEM'] as const;
export type ActorRole = (typeof ACTOR_ROLES)[number];

// ---------- auth ----------
export interface Account {
  id: number;
  email: string | null;
  phone: string | null;
  role: Role;
  status: AccountStatus;
  passwordSet: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  user: Account;
}

export interface OtpRequestResponse {
  phone: string;
  expiresInSeconds: number;
  resendAfterSeconds: number;
  /** Development only (OTP_EXPOSE_CODE=true). */
  devCode?: string;
}

// ---------- admin ----------
export interface AdminProfile {
  id: number;
  adminUserId: number;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  title: string | null;
  lastSeenAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  totalVendorAccounts: number;
  totalAdmins: number;
}
export interface VendorStats {
  totalVendors: number;
  draftVendors: number;
  pendingVendors: number;
  approvedVendors: number;
  suspendedVendors: number;
  rejectedVendors: number;
}
export interface StudyHallStats {
  totalStudyHalls: number;
  activeStudyHalls: number;
  pendingApproval: number;
  suspendedStudyHalls: number;
  totalSeats: number;
  activePrograms: number;
}
export interface BookingStats {
  totalBookings: number;
  todaysBookings: number;
  occupiedSeatsToday: number;
  pendingBookings: number;
  confirmedBookings: number;
  activeEnrollments: number;
}
/** Each group is null when the service that owns it did not respond. */
export interface DashboardResponse {
  users: UserStats | null;
  vendors: VendorStats | null;
  studyHalls: StudyHallStats | null;
  bookings: BookingStats | null;
  unavailableServices: string[] | null;
  generatedAt: string;
}

// ---------- user-service ----------
export interface UserProfile {
  id: number;
  userId: number;
  email: string | null;
  firstName: string;
  lastName: string | null;
  phone: string | null;
  profileImageUrl: string | null;
  dateOfBirth: string | null;
  city: string | null;
  state: string | null;
  educationLevel: string | null;
  preferredCity: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserProgram {
  id: number;
  userId: number;
  programId: number;
  programCode: string;
  programName: string;
  startDate: string | null;
  targetDate: string | null;
  status: PreparationStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Activity {
  id: number;
  type: ActivityType;
  description: string;
  referenceType: string | null;
  referenceId: number | null;
  createdAt: string;
}

// ---------- studyhall-service ----------
export interface VendorProfile {
  id: number;
  vendorId: number;
  businessName: string | null;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  addressLine: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  gstNumber: string | null;
  description: string | null;
  logoUrl: string | null;
  status: VendorStatus;
  statusReason: string | null;
  missingForSubmission: string[] | null;
  submittedAt: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminVendor {
  profile: VendorProfile;
  studyHallCount: number;
  activeStudyHallCount: number;
}

/** `account` is omitted (NON_NULL) when auth-service could not be reached. */
export interface AdminVendorDetail {
  vendor: AdminVendor;
  account?: Account;
}

export interface Enrollment {
  id: number;
  studyHallId: number;
  studyHallName: string;
  student: { userId: number | null; name: string; phone: string | null; email: string | null; account: boolean };
  program: ProgramRef | null;
  seatId: number | null;
  seatNumber: string | null;
  plan: BookingPlan | null;
  startDate: string;
  endDate: string | null;
  status: EnrollmentStatus;
  source: EnrollmentSource;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Fields are omitted (NON_NULL) when they do not apply or failed to load (see `warnings`). */
export interface AdminUserDetail {
  account: Account;
  profile?: UserProfile;
  programs?: UserProgram[];
  enrollments?: Enrollment[];
  vendor?: AdminVendor;
  warnings?: string[];
}

export interface StudyHallSummary {
  id: number;
  vendorId: number;
  vendorBusinessName: string | null;
  name: string;
  addressLine: string | null;
  city: string | null;
  state: string | null;
  pricePerDay: number;
  pricePerMonth: number | null;
  status: StudyHallStatus;
  coverImageUrl: string | null;
  seatCount: number;
}

export interface HallImage {
  id: number;
  url: string;
  caption: string | null;
  displayOrder: number;
  cover: boolean;
}

export interface Amenity {
  id: number;
  code: string;
  name: string;
  icon: string | null;
  description: string | null;
  active: boolean;
}

export interface ProgramRef {
  programId: number;
  code: string;
  name: string;
}

export type DayOfWeek = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';

export interface OperatingHours {
  dayOfWeek: DayOfWeek;
  openTime: string | null;
  closeTime: string | null;
  closed: boolean;
}

export interface BlockSummary {
  id: number;
  name: string;
  totalRows: number;
  totalColumns: number;
  seatCount: number;
  dailyPrice: number | null;
  monthlyPrice: number | null;
  amenities: string[] | null;
}

export interface StudyHallDetail {
  id: number;
  vendorId: number;
  vendorBusinessName: string | null;
  name: string;
  description: string | null;
  addressLine: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  latitude: number | null;
  longitude: number | null;
  contactPhone: string | null;
  contactEmail: string | null;
  pricePerDay: number;
  pricePerMonth: number | null;
  rules: string | null;
  status: StudyHallStatus;
  statusReason: string | null;
  images: HallImage[] | null;
  amenities: Amenity[] | null;
  programs: ProgramRef[] | null;
  operatingHours: OperatingHours[] | null;
  blocks: BlockSummary[] | null;
  totalSeats: number;
  submittedAt: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Seat {
  id: number;
  blockId: number;
  seatNumber: string;
  row: number;
  column: number;
  seatType: SeatType;
  status: SeatStatus;
  pricePerDay: number | null;
  pricePerMonth: number | null;
  /** Present when the seat map is requested for a date range. */
  available?: boolean;
}

export interface Block {
  id: number;
  name: string;
  totalRows: number;
  totalColumns: number;
  displayOrder: number;
  dailyPrice: number | null;
  monthlyPrice: number | null;
  amenities: Amenity[] | null;
  seats: Seat[];
}

export interface SeatMap {
  studyHallId: number;
  startDate: string;
  endDate: string;
  blocks: Block[];
}

export interface Booking {
  id: number;
  bookingReference: string;
  userId: number;
  studyHallId: number;
  studyHallName: string | null;
  studyHallCity: string | null;
  seatId: number;
  seatNumber: string | null;
  programId: number | null;
  programName: string | null;
  plan: BookingPlan;
  startDate: string;
  endDate: string;
  units: number;
  unitPrice: number;
  totalPrice: number;
  status: BookingStatus;
  holdExpiresAt: string | null;
  confirmedAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  createdAt: string;
}

export interface Program {
  id: number;
  code: string;
  name: string;
  description: string | null;
  category: string;
  active: boolean;
}

export interface ProgramInput {
  code: string;
  name: string;
  description?: string | null;
  category: string;
  active?: boolean;
}

export interface AmenityInput {
  code: string;
  name: string;
  icon?: string | null;
  description?: string | null;
  active?: boolean;
}

// ---------- audit ----------
export interface AuditLog {
  id: number;
  actorUserId: number | null;
  actorEmail: string | null;
  actorRole: ActorRole | null;
  action: AuditAction;
  entityType: AuditEntityType | null;
  entityId: number | null;
  description: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  correlationId: string | null;
  sourceService: string | null;
  timestamp: string;
}
