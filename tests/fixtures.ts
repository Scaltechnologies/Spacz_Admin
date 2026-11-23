/**
 * TEST FIXTURES ONLY — never imported by production code.
 * Shapes mirror the Java DTOs (AccountDto, AdminVendorDto, StudyHallDetailDto, DashboardResponse, …).
 */
import type {
  Account,
  AdminVendor,
  AuditLog,
  AuthResponse,
  Booking,
  DashboardResponse,
  PageResponse,
  Program,
  StudyHallDetail,
  StudyHallSummary,
} from '@/lib/api/types';

export const API = 'http://localhost:8080';

export function page<T>(content: T[], over: Partial<PageResponse<T>> = {}): PageResponse<T> {
  return { content, page: 0, size: 20, totalElements: content.length, totalPages: 1, first: true, last: true, ...over };
}

export const adminAccount: Account = {
  id: 1,
  email: 'priya@spacz.in',
  phone: '+919000000001',
  role: 'ADMIN',
  status: 'ACTIVE',
  passwordSet: true,
  lastLoginAt: '2026-10-18T04:00:00Z',
  createdAt: '2026-01-01T00:00:00Z',
};

export const studentAccount: Account = {
  id: 7,
  email: 'ravi@example.com',
  phone: '+919876543210',
  role: 'USER',
  status: 'ACTIVE',
  passwordSet: false,
  lastLoginAt: null,
  createdAt: '2026-09-01T10:00:00Z',
};

export function authResponse(user: Account, n = 1): AuthResponse {
  return { accessToken: `access-${n}`, refreshToken: `refresh-${n}`, tokenType: 'Bearer', expiresIn: 900, user };
}

export const dashboard: DashboardResponse = {
  users: { totalUsers: 1240, activeUsers: 1200, suspendedUsers: 40, totalVendorAccounts: 52, totalAdmins: 3 },
  vendors: { totalVendors: 52, draftVendors: 5, pendingVendors: 7, approvedVendors: 36, suspendedVendors: 2, rejectedVendors: 2 },
  studyHalls: { totalStudyHalls: 80, activeStudyHalls: 64, pendingApproval: 4, suspendedStudyHalls: 2, totalSeats: 3200, activePrograms: 18 },
  bookings: { totalBookings: 9100, todaysBookings: 41, occupiedSeatsToday: 800, pendingBookings: 6, confirmedBookings: 2100, activeEnrollments: 1900 },
  unavailableServices: [],
  generatedAt: '2026-10-18T05:00:00Z',
};

export const pendingVendor: AdminVendor = {
  profile: {
    id: 11,
    vendorId: 42,
    businessName: 'Sunrise Academy',
    contactName: 'Anil Kumar',
    email: 'anil@sunrise.in',
    phone: '+919811111111',
    addressLine: '12 MG Road',
    city: 'Hyderabad',
    state: 'Telangana',
    pincode: '500001',
    gstNumber: '36ABCDE1234F1Z5',
    description: 'Quiet AC study hall near the metro.',
    logoUrl: null,
    status: 'PENDING',
    statusReason: null,
    missingForSubmission: [],
    submittedAt: '2026-10-17T09:00:00Z',
    approvedAt: null,
    createdAt: '2026-10-10T09:00:00Z',
    updatedAt: '2026-10-17T09:00:00Z',
  },
  studyHallCount: 2,
  activeStudyHallCount: 0,
};

export const vendorAccount: Account = { ...studentAccount, id: 42, email: 'anil@sunrise.in', role: 'VENDOR', passwordSet: true };

export const hallSummary: StudyHallSummary = {
  id: 5,
  vendorId: 42,
  vendorBusinessName: 'Sunrise Academy',
  name: 'Focus Point Library',
  addressLine: 'Ameerpet',
  city: 'Hyderabad',
  state: 'Telangana',
  pricePerDay: 150,
  pricePerMonth: 2500,
  status: 'PENDING_APPROVAL',
  coverImageUrl: null,
  seatCount: 40,
};

export const hallDetail: StudyHallDetail = {
  ...hallSummary,
  description: 'Silent zone, 24x7.',
  pincode: '500016',
  latitude: null,
  longitude: null,
  contactPhone: '+919822222222',
  contactEmail: null,
  rules: null,
  statusReason: null,
  images: [],
  amenities: [{ id: 1, code: 'WIFI', name: 'Wi-Fi', icon: 'wifi', description: null, active: true }],
  programs: [{ programId: 1, code: 'EAMCET', name: 'TS EAMCET' }],
  operatingHours: [],
  blocks: [],
  totalSeats: 40,
  submittedAt: '2026-10-16T08:00:00Z',
  approvedAt: null,
  createdAt: '2026-10-15T08:00:00Z',
  updatedAt: '2026-10-16T08:00:00Z',
};

export const booking: Booking = {
  id: 900,
  bookingReference: 'SPZ-7Q4K2M',
  userId: 7,
  studyHallId: 5,
  studyHallName: 'Focus Point Library',
  studyHallCity: 'Hyderabad',
  seatId: 33,
  seatNumber: 'A12',
  programId: 1,
  programName: 'TS EAMCET',
  plan: 'MONTHLY',
  startDate: '2026-10-01',
  endDate: '2026-11-30',
  units: 2,
  unitPrice: 2500,
  totalPrice: 5000,
  status: 'CONFIRMED',
  holdExpiresAt: null,
  confirmedAt: '2026-09-30T10:05:00Z',
  cancelledAt: null,
  cancellationReason: null,
  createdAt: '2026-09-30T10:00:00Z',
};

export const program: Program = { id: 1, code: 'EAMCET', name: 'TS EAMCET', description: null, category: 'Engineering', active: true };

export function auditLog(id: number, over: Partial<AuditLog> = {}): AuditLog {
  return {
    id,
    actorUserId: 1,
    actorEmail: 'priya@spacz.in',
    actorRole: 'ADMIN',
    action: 'VENDOR_APPROVED',
    entityType: 'VENDOR',
    entityId: 42,
    description: 'Approved vendor Sunrise Academy',
    ipAddress: '10.0.0.1',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/140.0 Safari/537.36',
    correlationId: `corr-${id}`,
    sourceService: 'admin-service',
    timestamp: '2026-10-18T04:30:00Z',
    ...over,
  };
}
