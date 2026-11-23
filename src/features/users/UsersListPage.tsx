import { useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { Ban, Building2, Copy, Download, Eye, MoreHorizontal, RotateCcw, Users } from 'lucide-react';
import { useUsers, usersApi, USER_SORTABLE } from './api';
import { useAccountModeration } from '@/features/approvals/moderation';
import { DataTable, parseSort, serializeSort } from '@/components/data-table/DataTable';
import { FilterSelect, SearchInput, Segmented } from '@/components/data-table/toolbar';
import { PageHeader, RelativeTime } from '@/components/shared/layout-bits';
import { RoleBadge, StatusBadge } from '@/components/shared/StatusBadge';
import { MonoId } from '@/components/shared/CopyButton';
import { EmptyState } from '@/components/shared/states';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/primitives';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/menus';
import { useDashboard } from '@/features/dashboard/api';
import { usePagingState, useUrlSearch } from '@/hooks';
import { qk } from '@/lib/api/query-keys';
import { useSession } from '@/lib/auth/session';
import { ACCOUNT_STATUSES, ROLE_META, accountActions, statusMeta } from '@/lib/status';
import { formatDate, formatDateTime, formatPhone } from '@/lib/format';
import { copyToClipboard, downloadFile, timestampForFile, toCsv } from '@/lib/utils';
import type { Account, AccountStatus, Role } from '@/lib/api/types';
import { toast } from 'sonner';

type RoleTab = 'ALL' | Role;

export default function UsersListPage() {
  const navigate = useNavigate();
  const client = useQueryClient();
  const me = useSession((s) => s.user);
  const url = usePagingState();
  const search = useUrlSearch();
  const role = url.getEnum<Role>('role', ['USER', 'VENDOR', 'ADMIN']);
  const status = url.getEnum<AccountStatus>('status', ACCOUNT_STATUSES);
  const sort = parseSort(url.get('sort'), USER_SORTABLE);
  const { data: dash } = useDashboard();

  const params = { search: search.applied || undefined, role, status, page: url.page, size: url.size, sort: serializeSort(sort) };
  const { data, isLoading, isFetching, error, refetch } = useUsers(params);
  const moderation = useAccountModeration();

  const columns = useMemo<ColumnDef<Account, unknown>[]>(
    () => [
      {
        id: 'user',
        header: 'User',
        meta: { label: 'User' },
        enableHiding: false,
        cell: ({ row }) => {
          const a = row.original;
          const primary = a.email ?? formatPhone(a.phone);
          return (
            <div className="flex min-w-0 items-center gap-3">
              <Avatar name={a.email ?? a.phone} className="size-8 text-xs" />
              <div className="min-w-0">
                <div className="truncate font-medium">{primary}</div>
                {a.email && a.phone && <div className="truncate text-xs text-muted-foreground">{formatPhone(a.phone)}</div>}
              </div>
            </div>
          );
        },
      },
      { id: 'id', header: 'ID', meta: { label: 'ID' }, cell: ({ row }) => <MonoId value={row.original.id} /> },
      { id: 'role', header: 'Role', meta: { label: 'Role' }, cell: ({ row }) => <RoleBadge role={row.original.role} /> },
      { id: 'status', header: 'Status', meta: { label: 'Status' }, cell: ({ row }) => <StatusBadge status={row.original.status} /> },
      {
        id: 'login',
        header: 'Sign-in',
        meta: { label: 'Sign-in method' },
        cell: ({ row }) => <span className="text-muted-foreground">{row.original.passwordSet ? 'Password' : 'OTP only'}</span>,
      },
      {
        id: 'lastLogin',
        header: 'Last login',
        meta: { label: 'Last login' },
        cell: ({ row }) => <RelativeTime value={row.original.lastLoginAt} className="text-muted-foreground" />,
      },
      {
        id: 'createdAt',
        header: 'Joined',
        meta: { label: 'Joined', sortField: 'createdAt' },
        cell: ({ row }) => <span className="text-muted-foreground tabular">{formatDate(row.original.createdAt)}</span>,
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        enableHiding: false,
        meta: { cellClassName: 'w-12 text-right' },
        cell: ({ row }) => {
          const a = row.original;
          const acts = accountActions(a.role, a.status, a.id === me?.id);
          const label = a.email ?? a.phone ?? `Account #${a.id}`;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-xs" aria-label={`Actions for ${label}`} onClick={(e) => e.stopPropagation()}>
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem onSelect={() => navigate(`/users/${a.id}`)}>
                  <Eye /> View details
                </DropdownMenuItem>
                {a.role === 'VENDOR' && (
                  <DropdownMenuItem onSelect={() => navigate(`/vendors/${a.id}`)}>
                    <Building2 /> Open vendor profile
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onSelect={async () => {
                    if (await copyToClipboard(String(a.id))) toast.success('Account ID copied');
                  }}
                >
                  <Copy /> Copy ID
                </DropdownMenuItem>
                {acts.length > 0 && <DropdownMenuSeparator />}
                {acts.includes('suspend') && (
                  <DropdownMenuItem destructive onSelect={() => moderation.start({ id: a.id, name: label, role: a.role }, 'suspend')}>
                    <Ban /> Suspend account
                  </DropdownMenuItem>
                )}
                {acts.includes('activate') && (
                  <DropdownMenuItem onSelect={() => moderation.start({ id: a.id, name: label, role: a.role }, 'activate')}>
                    <RotateCcw /> Activate account
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [me?.id, moderation, navigate],
  );

  const exportCsv = () => {
    const rows = data?.content ?? [];
    const csv = toCsv(rows, [
      { header: 'ID', value: (r) => r.id },
      { header: 'Email', value: (r) => r.email },
      { header: 'Phone', value: (r) => r.phone },
      { header: 'Role', value: (r) => r.role },
      { header: 'Status', value: (r) => r.status },
      { header: 'Password set', value: (r) => (r.passwordSet ? 'yes' : 'no') },
      { header: 'Last login (IST)', value: (r) => (r.lastLoginAt ? formatDateTime(r.lastLoginAt) : '') },
      { header: 'Joined (IST)', value: (r) => formatDateTime(r.createdAt) },
    ]);
    downloadFile(`spacz-users-page${url.page + 1}-${timestampForFile()}.csv`, csv);
    toast.success(`Exported ${rows.length} users`, { description: 'Current page with the active filters.' });
  };

  const counts = dash?.users;
  const roleTab: RoleTab = role ?? 'ALL';

  return (
    <div>
      <PageHeader
        title="Users"
        description="Every SPACZ account: students, vendors and administrators."
        actions={
          <Button variant="outline" onClick={exportCsv} disabled={!data?.content.length}>
            <Download /> Export page
          </Button>
        }
      />

      <DataTable
        caption="User accounts"
        columns={columns}
        data={data?.content}
        loading={isLoading}
        fetching={isFetching}
        error={error}
        onRetry={() => void refetch()}
        getRowId={(r) => String(r.id)}
        onRowClick={(r) => navigate(`/users/${r.id}`)}
        onRowHover={(r) => void client.prefetchQuery({ queryKey: qk.users.detail(r.id), queryFn: ({ signal }) => usersApi.get(r.id, signal), staleTime: 30_000 })}
        sort={sort}
        onSortChange={(s) => url.set({ sort: serializeSort(s) })}
        page={url.page}
        size={url.size}
        totalElements={data?.totalElements}
        totalPages={data?.totalPages}
        onPageChange={(p) => url.set({ page: p })}
        onSizeChange={(s) => url.set({ size: s === 20 ? undefined : s, page: undefined })}
        toolbar={
          <>
            <Segmented
              label="Role"
              value={roleTab}
              onChange={(v) => url.set({ role: v === 'ALL' ? undefined : v })}
              options={[
                { value: 'ALL', label: 'All', count: counts ? counts.totalUsers : null },
                { value: 'USER', label: ROLE_META.USER.label + 's' },
                { value: 'VENDOR', label: ROLE_META.VENDOR.label + 's', count: counts?.totalVendorAccounts ?? null },
                { value: 'ADMIN', label: ROLE_META.ADMIN.label + 's', count: counts?.totalAdmins ?? null },
              ]}
            />
            <SearchInput value={search.value} onChange={search.setValue} placeholder="Email or phone…" label="Search users by email or phone" />
            <FilterSelect
              label="Status"
              value={status}
              onChange={(v) => url.set({ status: v })}
              options={ACCOUNT_STATUSES.map((s) => ({ value: s, label: statusMeta(s).label }))}
            />
          </>
        }
        empty={
          <EmptyState
            icon={<Users className="size-6" />}
            title={search.applied || role || status ? 'No users match these filters' : 'No users yet'}
            description={search.applied ? 'Search matches email or phone number only.' : undefined}
            action={
              (search.applied || role || status) && (
                <Button variant="outline" size="sm" onClick={() => url.set({ search: undefined, role: undefined, status: undefined })}>
                  Clear filters
                </Button>
              )
            }
          />
        }
        renderCard={(a) => (
          <div className="flex items-center gap-3">
            <Avatar name={a.email ?? a.phone} className="size-9 text-xs" />
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{a.email ?? formatPhone(a.phone)}</div>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <RoleBadge role={a.role} />
                <StatusBadge status={a.status} />
                <span className="text-xs text-muted-foreground">#{a.id}</span>
              </div>
            </div>
          </div>
        )}
      />
      {moderation.dialog}
    </div>
  );
}
