import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { Ban, Building2, CheckCircle2, Download, Eye, MoreHorizontal, RotateCcw, UserRound, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useVendors, vendorsApi, VENDOR_SORTABLE } from './api';
import { vendorName } from './components';
import { useVendorModeration } from '@/features/approvals/moderation';
import { useDashboard } from '@/features/dashboard/api';
import { DataTable, parseSort, serializeSort } from '@/components/data-table/DataTable';
import { SearchInput, Segmented } from '@/components/data-table/toolbar';
import { PageHeader, RelativeTime } from '@/components/shared/layout-bits';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/states';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, Tooltip } from '@/components/ui/primitives';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/menus';
import { usePagingState, useUrlSearch } from '@/hooks';
import { qk } from '@/lib/api/query-keys';
import { VENDOR_STATUSES, statusMeta, vendorActions } from '@/lib/status';
import { formatDate, formatDateTime, formatNumber, formatPhone } from '@/lib/format';
import { downloadFile, timestampForFile, toCsv } from '@/lib/utils';
import type { AdminVendor, VendorStatus } from '@/lib/api/types';

export default function VendorsListPage() {
  const navigate = useNavigate();
  const client = useQueryClient();
  const url = usePagingState();
  const search = useUrlSearch();
  const status = url.getEnum<VendorStatus>('status', VENDOR_STATUSES);
  const city = url.get('city');
  const [cityDraft, setCityDraft] = useState(city);
  const sort = parseSort(url.get('sort'), VENDOR_SORTABLE);
  const { data: dash } = useDashboard();
  const moderation = useVendorModeration();

  const { data, isLoading, isFetching, error, refetch } = useVendors({
    search: search.applied || undefined,
    status,
    city: city || undefined,
    page: url.page,
    size: url.size,
    sort: serializeSort(sort),
  });

  const columns = useMemo<ColumnDef<AdminVendor, unknown>[]>(
    () => [
      {
        id: 'business',
        header: 'Business',
        enableHiding: false,
        cell: ({ row }) => {
          const p = row.original.profile;
          return (
            <div className="flex min-w-0 items-center gap-3">
              <Avatar name={vendorName(p)} src={p.logoUrl} square className="size-9 text-xs" />
              <div className="min-w-0">
                <div className="max-w-56 truncate font-medium">{vendorName(p)}</div>
                <div className="truncate text-xs text-muted-foreground">{p.contactName ?? '—'}</div>
              </div>
            </div>
          );
        },
      },
      {
        id: 'contact',
        header: 'Contact',
        meta: { label: 'Contact' },
        cell: ({ row }) => (
          <div className="min-w-0 text-[13px]">
            <div className="max-w-52 truncate">{row.original.profile.email ?? '—'}</div>
            <div className="text-xs text-muted-foreground">{formatPhone(row.original.profile.phone)}</div>
          </div>
        ),
      },
      {
        id: 'city',
        header: 'Location',
        meta: { label: 'Location' },
        cell: ({ row }) => <span>{[row.original.profile.city, row.original.profile.state].filter(Boolean).join(', ') || '—'}</span>,
      },
      {
        id: 'halls',
        header: 'Halls',
        meta: { label: 'Study halls', headerClassName: 'text-right', cellClassName: 'text-right' },
        cell: ({ row }) => (
          <Tooltip content={`${row.original.activeStudyHallCount} live of ${row.original.studyHallCount}`}>
            <span className="tabular">
              <span className="font-medium">{formatNumber(row.original.activeStudyHallCount)}</span>
              <span className="text-muted-foreground"> / {formatNumber(row.original.studyHallCount)}</span>
            </span>
          </Tooltip>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        meta: { label: 'Status' },
        cell: ({ row }) => (
          <Tooltip content={row.original.profile.statusReason}>
            <span>
              <StatusBadge status={row.original.profile.status} />
            </span>
          </Tooltip>
        ),
      },
      {
        id: 'submitted',
        header: 'Submitted',
        meta: { label: 'Submitted' },
        cell: ({ row }) => <RelativeTime value={row.original.profile.submittedAt} className="text-muted-foreground" />,
      },
      {
        id: 'createdAt',
        header: 'Joined',
        meta: { label: 'Joined', sortField: 'createdAt' },
        cell: ({ row }) => <span className="text-muted-foreground tabular">{formatDate(row.original.profile.createdAt)}</span>,
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        enableHiding: false,
        meta: { cellClassName: 'w-12 text-right' },
        cell: ({ row }) => {
          const v = row.original;
          const p = v.profile;
          const acts = vendorActions[p.status] ?? [];
          const target = { vendorId: p.vendorId, name: vendorName(p), activeHalls: v.activeStudyHallCount, status: p.status };
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-xs" aria-label={`Actions for ${target.name}`} onClick={(e) => e.stopPropagation()}>
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem onSelect={() => navigate(`/vendors/${p.vendorId}`)}>
                  <Eye /> View profile
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => navigate(`/users/${p.vendorId}`)}>
                  <UserRound /> Login account
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => navigate(`/studyhalls?vendorId=${p.vendorId}`)}>
                  <Building2 /> Study halls
                </DropdownMenuItem>
                {acts.length > 0 && <DropdownMenuSeparator />}
                {acts.includes('approve') && (
                  <DropdownMenuItem onSelect={() => moderation.start(target, 'approve')}>
                    <CheckCircle2 /> Approve
                  </DropdownMenuItem>
                )}
                {acts.includes('reject') && (
                  <DropdownMenuItem destructive onSelect={() => moderation.start(target, 'reject')}>
                    <XCircle /> Reject
                  </DropdownMenuItem>
                )}
                {acts.includes('activate') && (
                  <DropdownMenuItem onSelect={() => moderation.start(target, 'activate')}>
                    <RotateCcw /> Activate
                  </DropdownMenuItem>
                )}
                {acts.includes('suspend') && (
                  <DropdownMenuItem destructive onSelect={() => moderation.start(target, 'suspend')}>
                    <Ban /> Suspend
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [moderation, navigate],
  );

  const exportCsv = () => {
    const rows = data?.content ?? [];
    const csv = toCsv(rows, [
      { header: 'Vendor ID', value: (r) => r.profile.vendorId },
      { header: 'Business name', value: (r) => r.profile.businessName },
      { header: 'Contact', value: (r) => r.profile.contactName },
      { header: 'Email', value: (r) => r.profile.email },
      { header: 'Phone', value: (r) => r.profile.phone },
      { header: 'City', value: (r) => r.profile.city },
      { header: 'State', value: (r) => r.profile.state },
      { header: 'GST', value: (r) => r.profile.gstNumber },
      { header: 'Status', value: (r) => r.profile.status },
      { header: 'Status reason', value: (r) => r.profile.statusReason },
      { header: 'Study halls', value: (r) => r.studyHallCount },
      { header: 'Live halls', value: (r) => r.activeStudyHallCount },
      { header: 'Submitted (IST)', value: (r) => (r.profile.submittedAt ? formatDateTime(r.profile.submittedAt) : '') },
      { header: 'Joined (IST)', value: (r) => formatDateTime(r.profile.createdAt) },
    ]);
    downloadFile(`spacz-vendors-page${url.page + 1}-${timestampForFile()}.csv`, csv);
    toast.success(`Exported ${rows.length} vendors`, { description: 'Current page with the active filters.' });
  };

  const v = dash?.vendors;
  const countFor: Partial<Record<VendorStatus | 'ALL', number | null>> = v
    ? { ALL: v.totalVendors, PENDING: v.pendingVendors, APPROVED: v.approvedVendors, DRAFT: v.draftVendors, REJECTED: v.rejectedVendors, SUSPENDED: v.suspendedVendors }
    : {};
  const anyFilter = !!(search.applied || status || city);

  return (
    <div>
      <PageHeader
        title="Vendors & Partners"
        description="Study hall businesses on SPACZ. A vendor’s ID is also their login account ID."
        actions={
          <Button variant="outline" onClick={exportCsv} disabled={!data?.content.length}>
            <Download /> Export page
          </Button>
        }
      />
      <DataTable
        caption="Vendors"
        columns={columns}
        data={data?.content}
        loading={isLoading}
        fetching={isFetching}
        error={error}
        onRetry={() => void refetch()}
        getRowId={(r) => String(r.profile.vendorId)}
        onRowClick={(r) => navigate(`/vendors/${r.profile.vendorId}`)}
        onRowHover={(r) =>
          void client.prefetchQuery({
            queryKey: qk.vendors.detail(r.profile.vendorId),
            queryFn: ({ signal }) => vendorsApi.get(r.profile.vendorId, signal),
            staleTime: 30_000,
          })
        }
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
              label="Vendor status"
              value={status ?? 'ALL'}
              onChange={(s) => url.set({ status: s === 'ALL' ? undefined : s })}
              options={[
                { value: 'ALL', label: 'All', count: countFor.ALL ?? null },
                ...(['PENDING', 'APPROVED', 'ACTIVE', 'DRAFT', 'REJECTED', 'SUSPENDED', 'INACTIVE'] as VendorStatus[]).map((s) => ({
                  value: s,
                  label: statusMeta(s).label,
                  count: countFor[s] ?? null,
                })),
              ]}
            />
            <SearchInput value={search.value} onChange={search.setValue} placeholder="Business, contact, email, phone…" />
            <form
              onSubmit={(e) => {
                e.preventDefault();
                url.set({ city: cityDraft.trim() });
              }}
            >
              <Input
                list="vendor-cities"
                value={cityDraft}
                onChange={(e) => setCityDraft(e.target.value)}
                onBlur={() => cityDraft.trim() !== city && url.set({ city: cityDraft.trim() })}
                placeholder="City"
                aria-label="Filter by city"
                className="w-36"
              />
              <datalist id="vendor-cities">
                {[...new Set((data?.content ?? []).map((r) => r.profile.city).filter(Boolean))].map((c) => (
                  <option key={c} value={c!} />
                ))}
              </datalist>
            </form>
          </>
        }
        empty={
          <EmptyState
            icon={<Building2 className="size-6" />}
            title={anyFilter ? 'No vendors match these filters' : 'No vendors yet'}
            action={
              anyFilter && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCityDraft('');
                    url.set({ search: undefined, status: undefined, city: undefined });
                  }}
                >
                  Clear filters
                </Button>
              )
            }
          />
        }
        renderCard={(r) => (
          <div className="flex items-center gap-3">
            <Avatar name={vendorName(r.profile)} src={r.profile.logoUrl} square className="size-10 text-xs" />
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{vendorName(r.profile)}</div>
              <div className="truncate text-xs text-muted-foreground">
                {[r.profile.city, r.profile.contactName].filter(Boolean).join(' · ')} · {r.activeStudyHallCount}/{r.studyHallCount} halls
              </div>
            </div>
            <StatusBadge status={r.profile.status} />
          </div>
        )}
      />
      {moderation.dialog}
    </div>
  );
}
