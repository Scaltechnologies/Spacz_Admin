import { Link } from 'react-router';
import { CalendarCheck, CircleDollarSign, Clock, Info, Library, UserRound, XCircle } from 'lucide-react';
import { useBooking } from './api';
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/primitives';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { CopyButton } from '@/components/shared/CopyButton';
import { Callout, ErrorState } from '@/components/shared/states';
import { InfoGrid, SectionTitle, Timeline, type TimelineEntry } from '@/components/shared/layout-bits';
import { useNow } from '@/hooks';
import { formatDate, formatDateTime, formatMoney, humanize } from '@/lib/format';
import type { Booking } from '@/lib/api/types';

export function HoldCountdown({ until }: { until: string }) {
  const now = useNow(1000);
  const ms = new Date(until).getTime() - now;
  if (ms <= 0) return <span className="text-xs text-muted-foreground">Hold expired</span>;
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return (
    <span className="inline-flex items-center gap-1 text-xs text-amber-700 tabular dark:text-amber-300">
      <Clock className="size-3" aria-hidden />
      {m}:{String(s).padStart(2, '0')} left
    </span>
  );
}

function timeline(b: Booking): TimelineEntry[] {
  const items: TimelineEntry[] = [
    { id: 'created', tone: 'warning', icon: <CalendarCheck />, title: 'Seat held', description: b.holdExpiresAt ? `Hold until ${formatDateTime(b.holdExpiresAt)}` : undefined, time: b.createdAt },
  ];
  if (b.confirmedAt) items.push({ id: 'confirmed', tone: 'success', icon: <CircleDollarSign />, title: 'Confirmed', time: b.confirmedAt });
  if (b.cancelledAt)
    items.push({ id: 'cancelled', tone: 'danger', icon: <XCircle />, title: 'Cancelled', description: b.cancellationReason ?? undefined, time: b.cancelledAt });
  if (b.status === 'EXPIRED') items.push({ id: 'expired', tone: 'neutral', icon: <Clock />, title: 'Hold expired without confirmation', time: b.holdExpiresAt });
  if (b.status === 'COMPLETED') items.push({ id: 'completed', tone: 'info', icon: <CalendarCheck />, title: `Completed (period ended ${formatDate(b.endDate)})` });
  return items;
}

export function BookingDrawer({ bookingId, initial, onClose }: { bookingId: number | null; initial?: Booking; onClose: () => void }) {
  const { data: b, isLoading, error, refetch } = useBooking(bookingId, initial);
  return (
    <Sheet open={bookingId !== null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            Booking
            {b && (
              <span className="inline-flex items-center gap-1 font-mono text-base font-medium text-muted-foreground">
                {b.bookingReference} <CopyButton value={b.bookingReference} label="Copy reference" />
              </span>
            )}
          </SheetTitle>
          <SheetDescription>{b ? <StatusBadge status={b.status} /> : 'Loading booking…'}</SheetDescription>
        </SheetHeader>
        <SheetBody className="space-y-6">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-40 rounded-xl" />
            </div>
          ) : error || !b ? (
            <ErrorState error={error} onRetry={() => void refetch()} />
          ) : (
            <>
              <div className="rounded-2xl border bg-gradient-to-br from-primary/6 to-transparent p-5">
                <div className="text-xs text-muted-foreground">Total</div>
                <div className="text-3xl font-semibold tracking-tight tabular">{formatMoney(b.totalPrice)}</div>
                <div className="mt-1 text-[13px] text-muted-foreground tabular">
                  {b.units} {b.plan === 'MONTHLY' ? (b.units === 1 ? 'month' : 'months') : b.units === 1 ? 'day' : 'days'} × {formatMoney(b.unitPrice)}
                </div>
                {b.status === 'PENDING' && b.holdExpiresAt && (
                  <div className="mt-2">
                    <HoldCountdown until={b.holdExpiresAt} />
                  </div>
                )}
              </div>

              <section>
                <SectionTitle>Details</SectionTitle>
                <InfoGrid
                  items={[
                    {
                      label: 'Student',
                      value: (
                        <Link to={`/users/${b.userId}`} className="inline-flex items-center gap-1 hover:text-primary hover:underline">
                          <UserRound className="size-3.5" aria-hidden /> Account #{b.userId}
                        </Link>
                      ),
                    },
                    {
                      label: 'Study hall',
                      value: (
                        <Link to={`/studyhalls/${b.studyHallId}`} className="inline-flex items-center gap-1 hover:text-primary hover:underline">
                          <Library className="size-3.5" aria-hidden /> {b.studyHallName ?? `#${b.studyHallId}`}
                          {b.studyHallCity && <span className="text-muted-foreground">· {b.studyHallCity}</span>}
                        </Link>
                      ),
                    },
                    { label: 'Seat', value: b.seatNumber, mono: true },
                    { label: 'Exam', value: b.programName },
                    { label: 'Plan', value: humanize(b.plan) },
                    { label: 'Period', value: `${formatDate(b.startDate)} → ${formatDate(b.endDate)}` },
                    { label: 'Booking ID', value: `#${b.id}`, copy: b.id, mono: true },
                    { label: 'Created', value: formatDateTime(b.createdAt) },
                  ]}
                />
              </section>

              {b.cancellationReason && (
                <Callout tone="danger" icon={<XCircle className="text-destructive" />} title="Cancellation reason">
                  {b.cancellationReason}
                </Callout>
              )}

              <section>
                <SectionTitle>Status timeline</SectionTitle>
                <Timeline items={timeline(b)} />
              </section>

              <Callout tone="info" icon={<Info className="text-info" />}>
                Bookings are read-only for administrators. The backend has no admin cancel, refund or payment endpoint yet.
              </Callout>
            </>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
