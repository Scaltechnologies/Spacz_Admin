import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { ChevronLeft, ChevronRight, Download, LayoutGrid, Library, List, X } from 'lucide-react';
import { toast } from 'sonner';
import { HALL_SORTABLE, hallsApi, useHalls } from './api';
import { HallCard } from './HallCard';
import { useVendor, useVendors } from '@/features/vendors/api';
import { vendorName } from '@/features/vendors/components';
import { useDashboard } from '@/features/dashboard/api';
import { DataTable, parseSort, serializeSort } from '@/components/data-table/DataTable';
import { SearchInput, Segmented } from '@/components/data-table/toolbar';
import { PageHeader } from '@/components/shared/layout-bits';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { CoverImage } from '@/components/shared/hall-bits';
import { EmptyState, ErrorState } from '@/components/shared/states';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect, Skeleton } from '@/components/ui/primitives';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/menus';
import { useDebounce, usePagingState, useUrlSearch } from '@/hooks';
import { qk } from '@/lib/api/query-keys';
import { HALL_STATUSES, statusMeta } from '@/lib/status';
import { formatMoney, formatNumber } from '@/lib/format';
import { cn, downloadFile, timestampForFile, toCsv } from '@/lib/utils';
import type { StudyHallStatus, StudyHallSummary } from '@/lib/api/types';

/** Async vendor picker over /api/admin/vendors?search=. */
function VendorFilter({ vendorId, onChange }: { vendorId?: number; onChange: (id: number | undefined) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const term = useDebounce(q.trim(), 250);
  const current = useVendor(vendorId);
  const results = useVendors({ search: term || undefined, size: 8 }, { enabled: open });
  const label = vendorId ? (current.data ? vendorName(current.data.vendor.profile) : `Vendor #${vendorId}`) : 'All vendors';
  return (
    <div className="flex items-center gap-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className={cn('max-w-56 justify-start font-normal', vendorId && 'border-primary/40')}>
            <span className="truncate">Vendor: {label}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-2">
          <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search vendors…" aria-label="Search vendors" />
          <ul className="mt-2 max-h-64 overflow-y-auto" role="listbox" aria-label="Vendors">
            {results.isLoading && <li className="px-2 py-3 text-sm text-muted-foreground">Searching…</li>}
            {results.data?.content.map((v) => (
              <li key={v.profile.vendorId}>
                <button
                  type="button"
                  role="option"
                  aria-selected={v.profile.vendorId === vendorId}
                  onClick={() => {
                    onChange(v.profile.vendorId);
                    setOpen(false);
                  }}
                  className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                >
                  <span className="truncate">{vendorName(v.profile)}</span>
                  <span className="text-xs text-muted-foreground">{v.profile.city}</span>
                </button>
              </li>
            ))}
            {results.data && !results.data.content.length && <li className="px-2 py-3 text-sm text-muted-foreground">No vendors found</li>}
          </ul>
        </PopoverContent>
      </Popover>
      {vendorId && (
        <Button variant="ghost" size="icon-sm" onClick={() => onChange(undefined)} aria-label="Clear vendor filter">
          <X />
        </Button>
      )}
    </div>
  );
}

export default function StudyHallsListPage() {
  const navigate = useNavigate();
  const client = useQueryClient();
  const url = usePagingState(24);
  const search = useUrlSearch();
  const status = url.getEnum<StudyHallStatus>('status', HALL_STATUSES);
  const city = url.get('city');
  const [cityDraft, setCityDraft] = useState(city);
  const vendorId = url.getInt('vendorId', 0, { min: 1 }) || undefined;
  const view = url.getEnum<'grid' | 'table'>('view', ['grid', 'table'], 'grid')!;
  const sort = parseSort(url.get('sort'), HALL_SORTABLE);
  const size = url.getInt('size', view === 'grid' ? 24 : 20, { allowed: [10, 20, 24, 48, 50, 100] });
  const { data: dash } = useDashboard();

  const { data, isLoading, isFetching, error, refetch } = useHalls({
    search: search.applied || undefined,
    status,
    city: city || undefined,
    vendorId,
    page: url.page,
    size,
    sort: serializeSort(sort),
  });

  const columns = useMemo<ColumnDef<StudyHallSummary, unknown>[]>(
    () => [
      {
        id: 'name',
        header: 'Study hall',
        enableHiding: false,
        meta: { sortField: 'name' },
        cell: ({ row }) => (
          <div className="flex min-w-0 items-center gap-3">
            <CoverImage src={row.original.coverImageUrl} alt="" className="size-10 shrink-0 rounded-lg" />
            <div className="min-w-0">
              <div className="max-w-60 truncate font-medium">{row.original.name}</div>
              <div className="max-w-60 truncate text-xs text-muted-foreground">{row.original.addressLine}</div>
            </div>
          </div>
        ),
      },
      {
        id: 'city',
        header: 'City',
        meta: { label: 'City', sortField: 'city' },
        cell: ({ row }) => [row.original.city, row.original.state].filter(Boolean).join(', ') || '—',
      },
      {
        id: 'vendor',
        header: 'Vendor',
        meta: { label: 'Vendor' },
        cell: ({ row }) => (
          <Link to={`/vendors/${row.original.vendorId}`} onClick={(e) => e.stopPropagation()} className="max-w-48 truncate hover:text-primary hover:underline">
            {row.original.vendorBusinessName ?? `#${row.original.vendorId}`}
          </Link>
        ),
      },
      {
        id: 'pricePerDay',
        header: 'Per day',
        meta: { label: 'Price per day', sortField: 'pricePerDay', headerClassName: 'text-right', cellClassName: 'text-right tabular' },
        cell: ({ row }) => formatMoney(row.original.pricePerDay),
      },
      {
        id: 'pricePerMonth',
        header: 'Per month',
        meta: { label: 'Price per month', headerClassName: 'text-right', cellClassName: 'text-right tabular text-muted-foreground' },
        cell: ({ row }) => (row.original.pricePerMonth !== null ? formatMoney(row.original.pricePerMonth) : 'Not offered'),
      },
      {
        id: 'seats',
        header: 'Seats',
        meta: { label: 'Seats', headerClassName: 'text-right', cellClassName: 'text-right tabular' },
        cell: ({ row }) => formatNumber(row.original.seatCount),
      },
      {
        id: 'status',
        header: 'Status',
        meta: { label: 'Status', sortField: 'status' },
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
    ],
    [],
  );

  const exportCsv = () => {
    const rows = data?.content ?? [];
    const csv = toCsv(rows, [
      { header: 'ID', value: (r) => r.id },
      { header: 'Name', value: (r) => r.name },
      { header: 'Vendor ID', value: (r) => r.vendorId },
      { header: 'Vendor', value: (r) => r.vendorBusinessName },
      { header: 'Address', value: (r) => r.addressLine },
      { header: 'City', value: (r) => r.city },
      { header: 'State', value: (r) => r.state },
      { header: 'Price per day (INR)', value: (r) => r.pricePerDay },
      { header: 'Price per month (INR)', value: (r) => r.pricePerMonth },
      { header: 'Seats', value: (r) => r.seatCount },
      { header: 'Status', value: (r) => r.status },
    ]);
    downloadFile(`spacz-studyhalls-page${url.page + 1}-${timestampForFile()}.csv`, csv);
    toast.success(`Exported ${rows.length} study halls`, { description: 'Current page with the active filters.' });
  };

  const sh = dash?.studyHalls;
  const counts: Partial<Record<string, number | null>> = sh
    ? { ALL: sh.totalStudyHalls, PENDING_APPROVAL: sh.pendingApproval, ACTIVE: sh.activeStudyHalls, SUSPENDED: sh.suspendedStudyHalls }
    : {};
  const anyFilter = !!(search.applied || status || city || vendorId);
  const clearAll = () => {
    setCityDraft('');
    url.set({ search: undefined, status: undefined, city: undefined, vendorId: undefined });
  };

  const statusLabel = (s: StudyHallStatus) => (s === 'ACTIVE' ? 'Live' : s === 'APPROVED' ? 'Approved (awaiting vendor)' : s === 'PENDING_APPROVAL' ? 'Pending' : statusMeta(s).label);

  const toolbar = (
    <>
      <SearchInput value={search.value} onChange={search.setValue} placeholder="Search hall name…" />
      <NativeSelect aria-label="Status" value={status ?? ''} onChange={(e) => url.set({ status: e.target.value })} className="w-full sm:w-auto sm:min-w-44">
        <option value="">Status: All{counts.ALL !== undefined ? ` (${counts.ALL})` : ''}</option>
        {HALL_STATUSES.map((s) => (
          <option key={s} value={s}>
            {statusLabel(s)}
            {counts[s] !== undefined && counts[s] !== null ? ` (${counts[s]})` : ''}
          </option>
        ))}
      </NativeSelect>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          url.set({ city: cityDraft.trim() });
        }}
      >
        <Input
          value={cityDraft}
          onChange={(e) => setCityDraft(e.target.value)}
          onBlur={() => cityDraft.trim() !== city && url.set({ city: cityDraft.trim() })}
          placeholder="City"
          aria-label="Filter by city"
          className="w-36"
        />
      </form>
      <VendorFilter vendorId={vendorId} onChange={(id) => url.set({ vendorId: id })} />
      {anyFilter && (
        <Button variant="ghost" size="sm" onClick={clearAll}>
          <X /> Clear
        </Button>
      )}
    </>
  );

  return (
    <div>
      <PageHeader
        title="Study Halls"
        description="Every hall listed on SPACZ, in any status."
        actions={
          <>
            <Segmented
              label="View"
              value={view}
              onChange={(v) => url.set({ view: v === 'grid' ? undefined : v, size: undefined, page: undefined })}
              options={[
                { value: 'grid', label: <><LayoutGrid className="size-4" /> Grid</> },
                { value: 'table', label: <><List className="size-4" /> Table</> },
              ]}
            />
            <Button variant="outline" onClick={exportCsv} disabled={!data?.content.length}>
              <Download /> Export page
            </Button>
          </>
        }
      />

      {view === 'table' ? (
        <DataTable
          caption="Study halls"
          columns={columns}
          data={data?.content}
          loading={isLoading}
          fetching={isFetching}
          error={error}
          onRetry={() => void refetch()}
          getRowId={(r) => String(r.id)}
          onRowClick={(r) => navigate(`/studyhalls/${r.id}`)}
          onRowHover={(r) => void client.prefetchQuery({ queryKey: qk.halls.detail(r.id), queryFn: ({ signal }) => hallsApi.get(r.id, signal), staleTime: 30_000 })}
          sort={sort}
          onSortChange={(s) => url.set({ sort: serializeSort(s) })}
          page={url.page}
          size={size}
          totalElements={data?.totalElements}
          totalPages={data?.totalPages}
          onPageChange={(p) => url.set({ page: p })}
          onSizeChange={(s) => url.set({ size: s, page: undefined })}
          toolbar={toolbar}
          empty={<EmptyState icon={<Library className="size-6" />} title={anyFilter ? 'No halls match these filters' : 'No study halls yet'} />}
          renderCard={(h) => (
            <div className="flex items-center gap-3">
              <CoverImage src={h.coverImageUrl} alt="" className="size-12 shrink-0 rounded-xl" />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{h.name}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {h.city} · {formatMoney(h.pricePerDay)}/day · {h.seatCount} seats
                </div>
              </div>
              <StatusBadge status={h.status} />
            </div>
          )}
        />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border bg-card p-3 shadow-card">{toolbar}</div>
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="overflow-hidden rounded-2xl border bg-card">
                  <Skeleton className="aspect-[16/9] rounded-none" />
                  <div className="space-y-2 p-4">
                    <Skeleton className="h-5 w-2/3" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-6 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="rounded-2xl border bg-card">
              <ErrorState error={error} onRetry={() => void refetch()} />
            </div>
          ) : !data?.content.length ? (
            <div className="rounded-2xl border bg-card">
              <EmptyState
                icon={<Library className="size-6" />}
                title={anyFilter ? 'No halls match these filters' : 'No study halls yet'}
                action={anyFilter && <Button variant="outline" size="sm" onClick={clearAll}>Clear filters</Button>}
              />
            </div>
          ) : (
            <>
              <div className={cn('grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4', isFetching && 'opacity-70')}>
                {data.content.map((h) => (
                  <HallCard key={h.id} hall={h} />
                ))}
              </div>
              <div className="flex items-center justify-between text-[13px] text-muted-foreground">
                <span className="tabular">
                  {formatNumber(url.page * size + 1)}–{formatNumber(url.page * size + data.content.length)} of {formatNumber(data.totalElements)}
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={data.first} onClick={() => url.set({ page: url.page - 1 })}>
                    <ChevronLeft /> Previous
                  </Button>
                  <Button variant="outline" size="sm" disabled={data.last} onClick={() => url.set({ page: url.page + 1 })}>
                    Next <ChevronRight />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
