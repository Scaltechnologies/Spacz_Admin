import { useState, type ReactNode } from 'react';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type VisibilityState,
} from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Columns3, Rows3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NativeSelect, Skeleton } from '@/components/ui/primitives';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/menus';
import { EmptyState, ErrorState } from '@/components/shared/states';
import { usePrefs } from '@/lib/prefs';
import { formatNumber } from '@/lib/format';
import { cn } from '@/lib/utils';

export interface ColumnMeta {
  /** Server sort field; enables a sortable header. Only whitelisted backend fields. */
  sortField?: string;
  headerClassName?: string;
  cellClassName?: string;
  /** Label for the column-visibility menu. */
  label?: string;
  /** Hide by default. */
  hidden?: boolean;
}

declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData, TValue> {
    sortField?: string;
    headerClassName?: string;
    cellClassName?: string;
    label?: string;
    hidden?: boolean;
  }
}

export interface SortState {
  field: string;
  dir: 'asc' | 'desc';
}

export function parseSort(raw: string | null | undefined, allowed: string[], fallback?: SortState): SortState | undefined {
  if (!raw) return fallback;
  const [field, dir] = raw.split(',');
  if (!allowed.includes(field)) return fallback;
  return { field, dir: dir === 'asc' ? 'asc' : 'desc' };
}

export function serializeSort(s: SortState | undefined) {
  return s ? `${s.field},${s.dir}` : undefined;
}

export interface DataTableProps<T> {
  columns: ColumnDef<T, unknown>[];
  data: T[] | undefined;
  loading?: boolean;
  fetching?: boolean;
  error?: unknown;
  onRetry?: () => void;
  getRowId?: (row: T) => string;
  onRowClick?: (row: T) => void;
  onRowHover?: (row: T) => void;
  activeRowId?: string | null;
  sort?: SortState;
  onSortChange?: (s: SortState | undefined) => void;
  page?: number;
  size?: number;
  totalElements?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  onSizeChange?: (size: number) => void;
  toolbar?: ReactNode;
  empty?: ReactNode;
  /** Card renderer for narrow screens. */
  renderCard?: (row: T) => ReactNode;
  footer?: ReactNode;
  caption: string;
  columnToggle?: boolean;
}

export function DataTable<T>({
  columns,
  data,
  loading,
  fetching,
  error,
  onRetry,
  getRowId,
  onRowClick,
  onRowHover,
  activeRowId,
  sort,
  onSortChange,
  page = 0,
  size = 20,
  totalElements,
  totalPages,
  onPageChange,
  onSizeChange,
  toolbar,
  empty,
  renderCard,
  footer,
  caption,
  columnToggle = true,
}: DataTableProps<T>) {
  const density = usePrefs((s) => s.density);
  const setDensity = usePrefs((s) => s.setDensity);
  const [visibility, setVisibility] = useState<VisibilityState>(() =>
    Object.fromEntries(columns.filter((c) => c.meta?.hidden && c.id).map((c) => [c.id!, false])),
  );

  const table = useReactTable({
    data: data ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    state: { columnVisibility: visibility },
    onColumnVisibilityChange: setVisibility,
    getRowId: getRowId ? (r) => getRowId(r) : undefined,
  });

  const rows = table.getRowModel().rows;
  const visibleCols = table.getVisibleLeafColumns().length;
  const showEmpty = !loading && !error && rows.length === 0;
  const from = totalElements ? page * size + 1 : 0;
  const to = totalElements ? Math.min(totalElements, page * size + rows.length) : 0;

  const toggleSort = (field: string) => {
    if (!onSortChange) return;
    if (!sort || sort.field !== field) onSortChange({ field, dir: 'desc' });
    else if (sort.dir === 'desc') onSortChange({ field, dir: 'asc' });
    else onSortChange(undefined);
  };

  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-card">
      {(toolbar || columnToggle) && (
        <div className="flex flex-col gap-3 border-b p-3 lg:flex-row lg:items-center">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">{toolbar}</div>
          {columnToggle && (
            <div className="hidden items-center gap-1.5 md:flex">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" aria-label="Choose columns">
                    <Columns3 /> Columns
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Visible columns</DropdownMenuLabel>
                  {table
                    .getAllLeafColumns()
                    .filter((c) => c.getCanHide() && c.columnDef.meta?.label)
                    .map((c) => (
                      <DropdownMenuCheckboxItem
                        key={c.id}
                        checked={c.getIsVisible()}
                        onCheckedChange={(v) => c.toggleVisibility(!!v)}
                        onSelect={(e) => e.preventDefault()}
                      >
                        {c.columnDef.meta?.label}
                      </DropdownMenuCheckboxItem>
                    ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="outline"
                size="icon-sm"
                aria-label={density === 'compact' ? 'Comfortable rows' : 'Compact rows'}
                title={density === 'compact' ? 'Comfortable rows' : 'Compact rows'}
                onClick={() => setDensity(density === 'compact' ? 'comfortable' : 'compact')}
              >
                <Rows3 />
              </Button>
            </div>
          )}
        </div>
      )}

      <div className={cn('relative', fetching && !loading && 'opacity-70 transition-opacity')}>
        {fetching && !loading && (
          <div className="absolute inset-x-0 top-0 z-10 h-0.5 overflow-hidden bg-primary/10" aria-hidden>
            <div className="h-full w-1/3 animate-[slide-in-right_1s_linear_infinite] bg-primary" />
          </div>
        )}

        {/* Table (md and up, or always when no card renderer) */}
        <div className={cn('scrollbar-thin overflow-x-auto', renderCard && 'hidden md:block')}>
          <table className="w-full caption-bottom border-collapse text-[13px]">
            <caption className="sr-only">{caption}</caption>
            <thead className="sticky top-0 z-[1] bg-muted/40">
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id} className="border-b">
                  {hg.headers.map((h) => {
                    const sf = h.column.columnDef.meta?.sortField;
                    const active = sf && sort?.field === sf;
                    return (
                      <th
                        key={h.id}
                        scope="col"
                        aria-sort={active ? (sort!.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                        className={cn(
                          'h-10 px-4 text-left text-xs font-medium whitespace-nowrap text-muted-foreground',
                          h.column.columnDef.meta?.headerClassName,
                        )}
                      >
                        {h.isPlaceholder ? null : sf && onSortChange ? (
                          <button
                            type="button"
                            onClick={() => toggleSort(sf)}
                            className="-mx-1.5 inline-flex cursor-pointer items-center gap-1 rounded px-1.5 py-1 hover:bg-muted hover:text-foreground"
                          >
                            {flexRender(h.column.columnDef.header, h.getContext())}
                            {active ? (
                              sort!.dir === 'asc' ? (
                                <ArrowUp className="size-3.5 text-foreground" />
                              ) : (
                                <ArrowDown className="size-3.5 text-foreground" />
                              )
                            ) : (
                              <ArrowUpDown className="size-3.5 opacity-50" />
                            )}
                          </button>
                        ) : (
                          flexRender(h.column.columnDef.header, h.getContext())
                        )}
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody>
              {loading &&
                Array.from({ length: Math.min(size, 8) }).map((_, i) => (
                  <tr key={i} className="border-b last:border-0" style={{ height: 'var(--row-h)' }}>
                    {Array.from({ length: visibleCols }).map((__, j) => (
                      <td key={j} className="px-4">
                        <Skeleton className={cn('h-4', j === 0 ? 'w-40' : 'w-20')} />
                      </td>
                    ))}
                  </tr>
                ))}
              {!loading &&
                !error &&
                rows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                    onMouseEnter={onRowHover ? () => onRowHover(row.original) : undefined}
                    onKeyDown={
                      onRowClick
                        ? (e) => {
                            if (e.key === 'Enter' && e.target === e.currentTarget) onRowClick(row.original);
                          }
                        : undefined
                    }
                    tabIndex={onRowClick ? 0 : undefined}
                    data-active={activeRowId === row.id || undefined}
                    className={cn(
                      'border-b transition-colors last:border-0 data-[active]:bg-primary-soft',
                      onRowClick && 'cursor-pointer hover:bg-muted/50 focus-visible:bg-muted/60 focus-visible:outline-none',
                    )}
                    style={{ height: 'var(--row-h)' }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className={cn('px-4 py-1.5 align-middle', cell.column.columnDef.meta?.cellClassName)}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Card list (small screens) */}
        {renderCard && (
          <div className="divide-y md:hidden">
            {loading &&
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2 p-4">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            {!loading &&
              !error &&
              rows.map((row) => (
                <div
                  key={row.id}
                  role={onRowClick ? 'button' : undefined}
                  tabIndex={onRowClick ? 0 : undefined}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                  onKeyDown={onRowClick ? (e) => e.key === 'Enter' && onRowClick(row.original) : undefined}
                  className={cn('p-4', onRowClick && 'cursor-pointer active:bg-muted/60')}
                >
                  {renderCard(row.original)}
                </div>
              ))}
          </div>
        )}

        {error !== undefined && error !== null && !loading ? <ErrorState error={error} onRetry={onRetry} /> : null}
        {showEmpty && (empty ?? <EmptyState title="Nothing to show" description="No records match the current filters." />)}
      </div>

      {footer}

      {onPageChange && totalElements !== undefined && totalElements > 0 && (
        <div className="flex flex-col gap-3 border-t px-4 py-3 text-[13px] sm:flex-row sm:items-center sm:justify-between">
          <div className="text-muted-foreground tabular" aria-live="polite">
            {formatNumber(from)}–{formatNumber(to)} of {formatNumber(totalElements)}
          </div>
          <div className="flex items-center gap-2">
            {onSizeChange && (
              <label className="flex items-center gap-2 text-muted-foreground">
                <span className="hidden sm:inline">Rows</span>
                <NativeSelect value={size} onChange={(e) => onSizeChange(Number(e.target.value))} className="w-20" aria-label="Rows per page">
                  {[10, 20, 50, 100].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </NativeSelect>
              </label>
            )}
            <span className="px-1 text-muted-foreground tabular">
              Page {page + 1} of {Math.max(1, totalPages ?? 1)}
            </span>
            <Button variant="outline" size="icon-sm" onClick={() => onPageChange(0)} disabled={page <= 0} aria-label="First page">
              <ChevronsLeft />
            </Button>
            <Button variant="outline" size="icon-sm" onClick={() => onPageChange(page - 1)} disabled={page <= 0} aria-label="Previous page">
              <ChevronLeft />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => onPageChange(page + 1)}
              disabled={totalPages === undefined || page >= totalPages - 1}
              aria-label="Next page"
            >
              <ChevronRight />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => onPageChange(Math.max(0, (totalPages ?? 1) - 1))}
              disabled={totalPages === undefined || page >= totalPages - 1}
              aria-label="Last page"
            >
              <ChevronsRight />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
