import { useMemo } from 'react';
import { Link } from 'react-router';
import type { ColumnDef } from '@tanstack/react-table';
import { Download, Ticket, X } from 'lucide-react';
import { toast } from 'sonner';
import { BOOKING_SORTABLE, useBookings, type BookingListParams } from './api';
import { BookingDrawer, HoldCountdown } from './BookingDrawer';
import { DataTable, parseSort, serializeSort } from '@/components/data-table/DataTable';
import { Segmented } from '@/components/data-table/toolbar';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { CopyButton } from '@/components/shared/CopyButton';
import { EmptyState } from '@/components/shared/states';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip } from '@/components/ui/primitives';
import { useUrlState, type UrlPatch } from '@/hooks';
import { BOOKING_STATUSES, statusMeta } from '@/lib/status';
import { datePreset, formatDate, formatDateTime, formatMoney, formatNumber } from '@/lib/format';
import { downloadFile, timestampForFile, toCsv } from '@/lib/utils';
import type { Booking, BookingStatus } from '@/lib/api/types';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
type Preset = 'today' | 'week' | 'month';

/**
 * Server-paginated bookings table with URL-backed filters.
 * `urlPrefix` namespaces query keys so the table can be embedded in detail tabs.
 */
export function BookingsTable({
  fixed,
  hideUser,
  hideHall,
  urlPrefix = '',
  showHallFilter,
  showUserFilter,
  exportable,
}: {
  fixed?: Pick<BookingListParams, 'userId' | 'studyHallId'>;
  hideUser?: boolean;
  hideHall?: boolean;
  urlPrefix?: string;
  showHallFilter?: boolean;
  showUserFilter?: boolean;
  exportable?: boolean;
}) {
  const url = useUrlState();
  const k = (key: string) => (urlPrefix ? `${urlPrefix}${key.charAt(0).toUpperCase()}${key.slice(1)}` : key);
  const setUrl = (patch: UrlPatch, opts?: { replace?: boolean }) => url.set(patch, { ...opts, pageKey: k('page') });

  const page = url.getInt(k('page'), 0, { min: 0 });
  const size = url.getInt(k('size'), 20, { allowed: [10, 20, 50, 100] });
  const status = url.getEnum<BookingStatus>(k('status'), BOOKING_STATUSES);
  const preset = url.getEnum<Preset>(k('preset'), ['today', 'week', 'month']);
  const presetRange = preset ? datePreset(preset) : undefined;
  const fromRaw = url.get(k('from'));
  const toRaw = url.get(k('to'));
  const from = presetRange?.from ?? (ISO_DATE.test(fromRaw) ? fromRaw : undefined);
  const to = presetRange?.to ?? (ISO_DATE.test(toRaw) ? toRaw : undefined);
  const hallFilter = url.getInt(k('studyHallId'), 0, { min: 1 }) || undefined;
  const userFilter = url.getInt(k('userId'), 0, { min: 1 }) || undefined;
  const sort = parseSort(url.get(k('sort')), BOOKING_SORTABLE);
  const openId = url.getInt(k('open'), 0, { min: 1 }) || null;

  const params: BookingListParams = {
    status,
    from,
    to,
    studyHallId: fixed?.studyHallId ?? hallFilter,
    userId: fixed?.userId ?? userFilter,
    page,
    size,
    sort: serializeSort(sort),
  };
  const { data, isLoading, isFetching, error, refetch } = useBookings(params);
  const rows = data?.content;
  const openRow = rows?.find((r) => r.id === openId);

  const columns = useMemo<ColumnDef<Booking, unknown>[]>(() => {
    const cols: ColumnDef<Booking, unknown>[] = [
      {
        id: 'ref',
        header: 'Reference',
        enableHiding: false,
        cell: ({ row }) => (
          <span className="group/ref inline-flex items-center gap-0.5 font-mono text-[12.5px]">
            {row.original.bookingReference}
            <CopyButton value={row.original.bookingReference} label="Copy reference" className="opacity-0 group-hover/ref:opacity-100" />
          </span>
        ),
      },
    ];
    if (!hideUser)
      cols.push({
        id: 'user',
        header: 'Student',
        meta: { label: 'Student' },
        cell: ({ row }) => (
          <Link to={`/users/${row.original.userId}`} onClick={(e) => e.stopPropagation()} className="font-mono text-[12.5px] hover:text-primary hover:underline">
            #{row.original.userId}
          </Link>
        ),
      });
    if (!hideHall)
      cols.push({
        id: 'hall',
        header: 'Study hall',
        meta: { label: 'Study hall' },
        cell: ({ row }) => (
          <div className="min-w-0">
            <Link
              to={`/studyhalls/${row.original.studyHallId}`}
              onClick={(e) => e.stopPropagation()}
              className="block max-w-48 truncate font-medium hover:text-primary hover:underline"
            >
              {row.original.studyHallName ?? `#${row.original.studyHallId}`}
            </Link>
            <div className="text-xs text-muted-foreground">{row.original.studyHallCity}</div>
          </div>
        ),
      });
    cols.push(
      { id: 'seat', header: 'Seat', meta: { label: 'Seat' }, cell: ({ row }) => <span className="font-mono">{row.original.seatNumber ?? '—'}</span> },
      {
        id: 'program',
        header: 'Exam',
        meta: { label: 'Exam', hidden: true },
        cell: ({ row }) => <span className="text-muted-foreground">{row.original.programName ?? '—'}</span>,
      },
      {
        id: 'plan',
        header: 'Plan',
        meta: { label: 'Plan' },
        cell: ({ row }) => <Badge tone={row.original.plan === 'MONTHLY' ? 'violet' : 'neutral'}>{row.original.plan === 'MONTHLY' ? 'Monthly' : 'Daily'}</Badge>,
      },
      {
        id: 'startDate',
        header: 'Period',
        meta: { label: 'Period', sortField: 'startDate' },
        cell: ({ row }) => (
          <div className="whitespace-nowrap tabular">
            {formatDate(row.original.startDate)} → {formatDate(row.original.endDate)}
            <div className="text-xs text-muted-foreground">
              {row.original.units} {row.original.plan === 'MONTHLY' ? 'mo' : 'd'}
            </div>
          </div>
        ),
      },
      {
        id: 'totalPrice',
        header: 'Amount',
        meta: { label: 'Amount', sortField: 'totalPrice', headerClassName: 'text-right', cellClassName: 'text-right' },
        cell: ({ row }) => (
          <Tooltip content={`${row.original.units} × ${formatMoney(row.original.unitPrice)}`}>
            <span className="font-medium tabular">{formatMoney(row.original.totalPrice)}</span>
          </Tooltip>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        meta: { label: 'Status', sortField: 'status' },
        cell: ({ row }) => (
          <div className="space-y-0.5">
            <StatusBadge status={row.original.status} />
            {row.original.status === 'PENDING' && row.original.holdExpiresAt && (
              <div>
                <HoldCountdown until={row.original.holdExpiresAt} />
              </div>
            )}
          </div>
        ),
      },
      {
        id: 'createdAt',
        header: 'Created',
        meta: { label: 'Created', sortField: 'createdAt' },
        cell: ({ row }) => <span className="whitespace-nowrap text-muted-foreground tabular">{formatDateTime(row.original.createdAt)}</span>,
      },
    );
    return cols;
  }, [hideUser, hideHall]);

  const pageSummary = useMemo(() => {
    if (!rows?.length) return null;
    const byStatus = new Map<string, number>();
    let revenue = 0;
    for (const r of rows) {
      byStatus.set(r.status, (byStatus.get(r.status) ?? 0) + 1);
      if (r.status === 'CONFIRMED' || r.status === 'COMPLETED') revenue += Number(r.totalPrice) || 0;
    }
    return { byStatus, revenue };
  }, [rows]);

  const exportCsv = () => {
    const csv = toCsv(rows ?? [], [
      { header: 'Reference', value: (r) => r.bookingReference },
      { header: 'Booking ID', value: (r) => r.id },
      { header: 'User ID', value: (r) => r.userId },
      { header: 'Study hall', value: (r) => r.studyHallName },
      { header: 'City', value: (r) => r.studyHallCity },
      { header: 'Seat', value: (r) => r.seatNumber },
      { header: 'Exam', value: (r) => r.programName },
      { header: 'Plan', value: (r) => r.plan },
      { header: 'Start', value: (r) => r.startDate },
      { header: 'End', value: (r) => r.endDate },
      { header: 'Units', value: (r) => r.units },
      { header: 'Unit price (INR)', value: (r) => r.unitPrice },
      { header: 'Total (INR)', value: (r) => r.totalPrice },
      { header: 'Status', value: (r) => r.status },
      { header: 'Created (IST)', value: (r) => formatDateTime(r.createdAt) },
    ]);
    downloadFile(`spacz-bookings-page${page + 1}-${timestampForFile()}.csv`, csv);
    toast.success(`Exported ${rows?.length ?? 0} bookings`, { description: 'Current page with the active filters.' });
  };

  const anyFilter = !!(status || from || to || hallFilter || userFilter);
  const clearFilters = () =>
    setUrl({ [k('status')]: undefined, [k('preset')]: undefined, [k('from')]: undefined, [k('to')]: undefined, [k('studyHallId')]: undefined, [k('userId')]: undefined });

  return (
    <>
      <DataTable
        caption="Bookings"
        columns={columns}
        data={rows}
        loading={isLoading}
        fetching={isFetching}
        error={error}
        onRetry={() => void refetch()}
        getRowId={(r) => String(r.id)}
        activeRowId={openId ? String(openId) : null}
        onRowClick={(r) => setUrl({ [k('open')]: r.id })}
        sort={sort}
        onSortChange={(s) => setUrl({ [k('sort')]: serializeSort(s) })}
        page={page}
        size={size}
        totalElements={data?.totalElements}
        totalPages={data?.totalPages}
        onPageChange={(p) => setUrl({ [k('page')]: p || undefined })}
        onSizeChange={(s) => setUrl({ [k('size')]: s === 20 ? undefined : s, [k('page')]: undefined })}
        toolbar={
          <>
            <Segmented
              label="Booking status"
              value={status ?? 'ALL'}
              onChange={(v) => setUrl({ [k('status')]: v === 'ALL' ? undefined : v })}
              options={[{ value: 'ALL', label: 'All' }, ...BOOKING_STATUSES.map((s) => ({ value: s, label: statusMeta(s).label }))]}
            />
            <div className="flex flex-wrap items-center gap-2">
              <Segmented
                label="Date preset"
                value={preset ?? 'custom'}
                onChange={(v) =>
                  setUrl({ [k('preset')]: v === 'custom' ? undefined : v, [k('from')]: undefined, [k('to')]: undefined })
                }
                options={[
                  { value: 'custom', label: 'Any date' },
                  { value: 'today', label: 'Today' },
                  { value: 'week', label: 'This week' },
                  { value: 'month', label: 'This month' },
                ]}
              />
              <Input
                type="date"
                aria-label="From date"
                value={from ?? ''}
                onChange={(e) => setUrl({ [k('from')]: e.target.value, [k('preset')]: undefined, ...(presetRange ? { [k('to')]: presetRange.to } : {}) })}
                className="w-[9.5rem]"
              />
              <span className="text-muted-foreground">–</span>
              <Input
                type="date"
                aria-label="To date"
                value={to ?? ''}
                min={from}
                onChange={(e) => setUrl({ [k('to')]: e.target.value, [k('preset')]: undefined, ...(presetRange ? { [k('from')]: presetRange.from } : {}) })}
                className="w-[9.5rem]"
              />
            </div>
            {showHallFilter && (
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                placeholder="Hall ID"
                aria-label="Filter by study hall ID"
                defaultValue={hallFilter ?? ''}
                key={`hall-${hallFilter ?? ''}`}
                onBlur={(e) => setUrl({ [k('studyHallId')]: e.target.value || undefined })}
                onKeyDown={(e) => e.key === 'Enter' && setUrl({ [k('studyHallId')]: (e.target as HTMLInputElement).value || undefined })}
                className="w-28"
              />
            )}
            {showUserFilter && (
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                placeholder="User ID"
                aria-label="Filter by user ID"
                defaultValue={userFilter ?? ''}
                key={`user-${userFilter ?? ''}`}
                onBlur={(e) => setUrl({ [k('userId')]: e.target.value || undefined })}
                onKeyDown={(e) => e.key === 'Enter' && setUrl({ [k('userId')]: (e.target as HTMLInputElement).value || undefined })}
                className="w-28"
              />
            )}
            {anyFilter && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X /> Clear
              </Button>
            )}
            {exportable && (
              <Button variant="outline" size="sm" onClick={exportCsv} disabled={!rows?.length}>
                <Download /> Export page
              </Button>
            )}
          </>
        }
        footer={
          pageSummary && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">This page:</span>
              {[...pageSummary.byStatus.entries()].map(([s, n]) => (
                <span key={s}>
                  {formatNumber(n)} {statusMeta(s).label.toLowerCase()}
                </span>
              ))}
              <span className="ml-auto">
                Confirmed + completed value on this page:{' '}
                <span className="font-semibold text-foreground tabular">{formatMoney(pageSummary.revenue)}</span>
              </span>
            </div>
          )
        }
        empty={
          <EmptyState
            icon={<Ticket className="size-6" />}
            title={anyFilter ? 'No bookings match these filters' : 'No bookings yet'}
            description={from || to ? 'Date filters match bookings whose period overlaps the range.' : undefined}
            action={
              anyFilter && (
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              )
            }
          />
        }
        renderCard={(b) => (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[13px]">{b.bookingReference}</span>
              <StatusBadge status={b.status} />
            </div>
            <div className="text-sm font-medium">{b.studyHallName}</div>
            <div className="flex justify-between text-xs text-muted-foreground tabular">
              <span>
                {formatDate(b.startDate)} → {formatDate(b.endDate)} · Seat {b.seatNumber}
              </span>
              <span className="font-semibold text-foreground">{formatMoney(b.totalPrice)}</span>
            </div>
          </div>
        )}
      />
      <BookingDrawer bookingId={openId} initial={openRow} onClose={() => setUrl({ [k('open')]: undefined }, { replace: true })} />
    </>
  );
}
