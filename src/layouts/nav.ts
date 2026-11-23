import {
  BookOpen,
  Building2,
  ClipboardCheck,
  CreditCard,
  GraduationCap,
  LayoutDashboard,
  Library,
  Settings,
  ShieldCheck,
  Sparkles,
  Ticket,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { DashboardResponse } from '@/lib/api/types';

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  /** Live badge count derived from the dashboard response — never hardcoded. */
  badge?: (d: DashboardResponse | undefined) => number | null;
  shortcut?: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard, shortcut: 'G D' },
      {
        label: 'Approvals',
        to: '/approvals',
        icon: ClipboardCheck,
        shortcut: 'G A',
        badge: (d) => {
          const v = d?.vendors?.pendingVendors;
          const h = d?.studyHalls?.pendingApproval;
          if (v === undefined && h === undefined) return null;
          return (v ?? 0) + (h ?? 0);
        },
      },
    ],
  },
  {
    label: 'Manage',
    items: [
      { label: 'Users', to: '/users', icon: Users, shortcut: 'G U' },
      { label: 'Vendors & Partners', to: '/vendors', icon: Building2, shortcut: 'G V', badge: (d) => d?.vendors?.pendingVendors ?? null },
      { label: 'Study Halls', to: '/studyhalls', icon: Library, shortcut: 'G H', badge: (d) => d?.studyHalls?.pendingApproval ?? null },
      { label: 'Bookings', to: '/bookings', icon: Ticket, shortcut: 'G B' },
      { label: 'Transactions', to: '/transactions', icon: CreditCard },
    ],
  },
  {
    label: 'Catalog',
    items: [
      { label: 'Exams & Programs', to: '/catalog/programs', icon: GraduationCap },
      { label: 'Amenities', to: '/catalog/amenities', icon: Sparkles },
    ],
  },
  {
    label: 'System',
    items: [
      { label: 'Audit Logs', to: '/audit-logs', icon: ShieldCheck, shortcut: 'G L' },
      { label: 'Settings', to: '/settings/profile', icon: Settings },
    ],
  },
];

export const ROUTE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  approvals: 'Approvals',
  users: 'Users',
  vendors: 'Vendors & Partners',
  studyhalls: 'Study Halls',
  bookings: 'Bookings',
  transactions: 'Transactions',
  catalog: 'Catalog',
  programs: 'Exams & Programs',
  amenities: 'Amenities',
  'audit-logs': 'Audit Logs',
  settings: 'Settings',
  profile: 'Profile',
  security: 'Security',
  appearance: 'Appearance',
  '403': 'Forbidden',
};

export const DocsIcon = BookOpen;
