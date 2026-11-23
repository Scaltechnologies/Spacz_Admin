import { lazy } from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router';
import { RequireAdmin } from '@/lib/auth/RequireAdmin';
import { AdminLayout } from '@/layouts/AdminLayout';
import { ForbiddenPage, NotFoundPage, RouteErrorPage } from './pages';

const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage'));
const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage'));
const ApprovalsPage = lazy(() => import('@/features/approvals/ApprovalsPage'));
const UsersListPage = lazy(() => import('@/features/users/UsersListPage'));
const UserDetailPage = lazy(() => import('@/features/users/UserDetailPage'));
const VendorsListPage = lazy(() => import('@/features/vendors/VendorsListPage'));
const VendorDetailPage = lazy(() => import('@/features/vendors/VendorDetailPage'));
const StudyHallsListPage = lazy(() => import('@/features/studyhalls/StudyHallsListPage'));
const StudyHallDetailPage = lazy(() => import('@/features/studyhalls/StudyHallDetailPage'));
const BookingsPage = lazy(() => import('@/features/bookings/BookingsPage'));
const TransactionsPage = lazy(() => import('@/features/transactions/TransactionsPage'));
const ProgramsPage = lazy(() => import('@/features/catalog/ProgramsPage'));
const AmenitiesPage = lazy(() => import('@/features/catalog/AmenitiesPage'));
const AuditLogPage = lazy(() => import('@/features/audit/AuditLogPage'));
const SettingsLayout = lazy(() => import('@/features/account/SettingsLayout'));
const ProfilePage = lazy(() => import('@/features/account/ProfilePage'));
const SecurityPage = lazy(() => import('@/features/account/SecurityPage'));
const AppearancePage = lazy(() => import('@/features/account/AppearancePage'));

export const routes = [
  { path: '/login', element: <LoginPage />, errorElement: <RouteErrorPage /> },
  { path: '/403', element: <ForbiddenPage /> },
  {
    element: (
      <RequireAdmin>
        <AdminLayout />
      </RequireAdmin>
    ),
    errorElement: <RouteErrorPage />,
    children: [
      {
        errorElement: <RouteErrorPage />,
        children: [
          { index: true, element: <Navigate to="/dashboard" replace /> },
          { path: 'dashboard', element: <DashboardPage /> },
          { path: 'approvals', element: <ApprovalsPage /> },
          { path: 'users', element: <UsersListPage /> },
          { path: 'users/:id', element: <UserDetailPage /> },
          { path: 'vendors', element: <VendorsListPage /> },
          { path: 'vendors/:vendorId', element: <VendorDetailPage /> },
          { path: 'studyhalls', element: <StudyHallsListPage /> },
          { path: 'studyhalls/:id', element: <StudyHallDetailPage /> },
          { path: 'bookings', element: <BookingsPage /> },
          { path: 'transactions', element: <TransactionsPage /> },
          { path: 'catalog', element: <Navigate to="/catalog/programs" replace /> },
          { path: 'catalog/programs', element: <ProgramsPage /> },
          { path: 'catalog/amenities', element: <AmenitiesPage /> },
          { path: 'audit-logs', element: <AuditLogPage /> },
          {
            path: 'settings',
            element: <SettingsLayout />,
            children: [
              { index: true, element: <Navigate to="profile" replace /> },
              { path: 'profile', element: <ProfilePage /> },
              { path: 'security', element: <SecurityPage /> },
              { path: 'appearance', element: <AppearancePage /> },
            ],
          },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
];

export function createRouter() {
  return createBrowserRouter(routes);
}

export { Outlet };
