import { useMemo } from 'react';
import type { Block, Seat } from '@/lib/api/types';
import { Tooltip } from '@/components/ui/primitives';
import { formatMoney, humanize } from '@/lib/format';
import { cn } from '@/lib/utils';

type SeatState = 'available' | 'booked' | 'reserved' | 'maintenance' | 'inactive';

/** Derived only from returned data: seat.status, then `available` for the requested dates. */
export function seatState(seat: Seat): SeatState {
  if (seat.status === 'INACTIVE') return 'inactive';
  if (seat.status === 'MAINTENANCE') return 'maintenance';
  if (seat.status === 'RESERVED') return 'reserved';
  if (seat.available === false) return 'booked';
  return 'available';
}

const STATE_STYLE: Record<SeatState, string> = {
  available: 'bg-success/15 text-success ring-success/40',
  booked: 'bg-primary/80 text-primary-foreground ring-primary',
  reserved: 'bg-violet-500/15 text-violet-700 ring-violet-500/40 dark:text-violet-300',
  maintenance: 'bg-orange-500/15 text-orange-700 ring-orange-500/40 dark:text-orange-300',
  inactive: 'bg-muted text-muted-foreground/70 ring-border line-through',
};

export const SEAT_LEGEND: { state: SeatState; label: string }[] = [
  { state: 'available', label: 'Available' },
  { state: 'booked', label: 'Booked for dates' },
  { state: 'reserved', label: 'Reserved (offline)' },
  { state: 'maintenance', label: 'Maintenance' },
  { state: 'inactive', label: 'Inactive' },
];

export function SeatLegend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
      {SEAT_LEGEND.map((l) => (
        <span key={l.state} className="inline-flex items-center gap-1.5">
          <span className={cn('size-3.5 rounded-[4px] ring-1 ring-inset', STATE_STYLE[l.state])} aria-hidden />
          {l.label}
        </span>
      ))}
    </div>
  );
}

/** Read-only seat map: a CSS grid of totalRows × totalColumns with seats at (row, column), 1-based. */
export function SeatGrid({ block }: { block: Block }) {
  const byCell = useMemo(() => {
    const m = new Map<string, Seat>();
    for (const s of block.seats) m.set(`${s.row}:${s.column}`, s);
    return m;
  }, [block.seats]);

  const counts = useMemo(() => {
    const c: Record<SeatState, number> = { available: 0, booked: 0, reserved: 0, maintenance: 0, inactive: 0 };
    for (const s of block.seats) c[seatState(s)]++;
    return c;
  }, [block.seats]);

  const cells = [];
  for (let r = 1; r <= block.totalRows; r++) {
    for (let c = 1; c <= block.totalColumns; c++) {
      const seat = byCell.get(`${r}:${c}`);
      if (!seat) {
        cells.push(<div key={`${r}:${c}`} aria-hidden className="size-9" />);
        continue;
      }
      const state = seatState(seat);
      cells.push(
        <Tooltip
          key={seat.id}
          content={
            <div className="space-y-0.5">
              <div className="font-semibold">Seat {seat.seatNumber}</div>
              <div>
                {humanize(seat.seatType)} · {SEAT_LEGEND.find((l) => l.state === state)?.label}
              </div>
              <div>
                {formatMoney(seat.pricePerDay)}/day
                {seat.pricePerMonth !== null ? ` · ${formatMoney(seat.pricePerMonth)}/month` : ' · monthly not offered'}
              </div>
            </div>
          }
        >
          <div
            tabIndex={0}
            role="img"
            aria-label={`Seat ${seat.seatNumber}, ${state}`}
            className={cn(
              'flex size-9 items-center justify-center rounded-lg text-[10px] font-semibold ring-1 ring-inset outline-none focus-visible:ring-2 focus-visible:ring-primary',
              STATE_STYLE[state],
            )}
          >
            {seat.seatNumber}
          </div>
        </Tooltip>,
      );
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{block.seats.length} seats</span>
        <span>
          {block.totalRows} × {block.totalColumns} grid
        </span>
        <span className="text-success">{counts.available} available</span>
        {counts.booked > 0 && <span>{counts.booked} booked</span>}
        {counts.reserved > 0 && <span>{counts.reserved} reserved</span>}
        {counts.maintenance > 0 && <span>{counts.maintenance} maintenance</span>}
        {counts.inactive > 0 && <span>{counts.inactive} inactive</span>}
      </div>
      <div className="scrollbar-thin overflow-x-auto rounded-xl border bg-muted/30 p-4">
        <div className="mx-auto mb-3 h-1.5 w-1/2 rounded-full bg-border" title="Front" aria-hidden />
        <div className="inline-grid gap-1.5" style={{ gridTemplateColumns: `repeat(${block.totalColumns}, 2.25rem)` }}>
          {cells}
        </div>
      </div>
    </div>
  );
}
