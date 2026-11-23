import { useState } from 'react';
import { Link } from 'react-router';
import { Armchair, CalendarDays, Info, Lightbulb, Mail, MapPin, Phone } from 'lucide-react';
import type { StudyHallDetail } from '@/lib/api/types';
import { useSeatMap } from './api';
import { SeatGrid, SeatLegend } from '@/components/shared/SeatGrid';
import { AmenityIcon } from '@/components/shared/AmenityIcon';
import { HallMap, HoursTable } from '@/components/shared/hall-bits';
import { Callout, EmptyState, ErrorState } from '@/components/shared/states';
import { SectionTitle } from '@/components/shared/layout-bits';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label, Skeleton } from '@/components/ui/primitives';
import { addDaysISO, formatMoney, formatNumber, formatPhone, todayIST } from '@/lib/format';
import { cn } from '@/lib/utils';

export function hallAddress(h: Pick<StudyHallDetail, 'addressLine' | 'city' | 'state' | 'pincode'>) {
  return [h.addressLine, h.city, h.state, h.pincode].filter(Boolean).join(', ');
}

/** Client-side review hints. Warnings only — they never block an action. */
export function qualityHints(h: StudyHallDetail): string[] {
  const hints: string[] = [];
  if (!h.images?.length) hints.push('No photos');
  else if (!h.images.some((i) => i.cover)) hints.push('No cover image selected');
  if (!h.operatingHours?.length) hints.push('No operating hours');
  if (!h.totalSeats) hints.push('No seats configured');
  if (!h.programs?.length) hints.push('No exams selected');
  if (!h.amenities?.length) hints.push('No amenities listed');
  if (h.latitude === null || h.longitude === null) hints.push('No map location');
  if (!h.contactPhone && !h.contactEmail) hints.push('No contact details');
  return hints;
}

export function QualityHints({ hall }: { hall: StudyHallDetail }) {
  const hints = qualityHints(hall);
  if (!hints.length) return null;
  return (
    <Callout tone="warning" icon={<Lightbulb className="text-amber-600" />} title="Review hints">
      <div className="mt-1 flex flex-wrap gap-1.5">
        {hints.map((h) => (
          <Badge key={h} tone="warning">
            {h}
          </Badge>
        ))}
      </div>
    </Callout>
  );
}

export function PricingCards({ hall }: { hall: StudyHallDetail }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="rounded-xl border bg-gradient-to-br from-primary/6 to-transparent p-4">
        <div className="text-xs text-muted-foreground">Per day</div>
        <div className="mt-1 text-xl font-semibold tabular">{formatMoney(hall.pricePerDay)}</div>
      </div>
      <div className="rounded-xl border bg-gradient-to-br from-accent/8 to-transparent p-4">
        <div className="text-xs text-muted-foreground">Per month</div>
        <div className="mt-1 text-xl font-semibold tabular">
          {hall.pricePerMonth !== null ? formatMoney(hall.pricePerMonth) : <span className="text-base font-medium text-muted-foreground">Not offered</span>}
        </div>
      </div>
    </div>
  );
}

export function AmenityChips({ hall }: { hall: StudyHallDetail }) {
  if (!hall.amenities?.length) return <p className="text-sm text-muted-foreground">No amenities listed.</p>;
  return (
    <ul className="flex flex-wrap gap-2">
      {hall.amenities.map((a) => (
        <li key={a.id} className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-2.5 py-1.5 text-[13px]">
          <AmenityIcon icon={a.icon} className="size-4 text-primary" />
          {a.name}
        </li>
      ))}
    </ul>
  );
}

export function ProgramChips({ hall }: { hall: StudyHallDetail }) {
  if (!hall.programs?.length) return <p className="text-sm text-muted-foreground">No exams selected.</p>;
  return (
    <ul className="flex flex-wrap gap-2">
      {hall.programs.map((p) => (
        <li key={p.programId}>
          <Badge tone="primary" className="py-1">
            <span className="font-mono">{p.code}</span>
            <span className="font-normal opacity-80">{p.name}</span>
          </Badge>
        </li>
      ))}
    </ul>
  );
}

export function ContactBlock({ hall }: { hall: StudyHallDetail }) {
  return (
    <ul className="space-y-2 text-sm">
      <li className="flex gap-2">
        <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
        <span>{hallAddress(hall) || 'Address not set'}</span>
      </li>
      <li className="flex gap-2">
        <Phone className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
        <span>{hall.contactPhone ? formatPhone(hall.contactPhone) : <span className="text-muted-foreground">No phone</span>}</span>
      </li>
      <li className="flex gap-2">
        <Mail className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
        <span className="break-all">
          {hall.contactEmail ? (
            <a href={`mailto:${hall.contactEmail}`} className="hover:underline">
              {hall.contactEmail}
            </a>
          ) : (
            <span className="text-muted-foreground">No email</span>
          )}
        </span>
      </li>
    </ul>
  );
}

export function BlockSummaryCards({ hall }: { hall: StudyHallDetail }) {
  if (!hall.blocks?.length) {
    return <EmptyState className="py-8" icon={<Armchair className="size-6" />} title="No seating blocks" description="The vendor hasn’t designed a seating layout yet." />;
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {hall.blocks.map((b) => (
        <div key={b.id} className="rounded-xl border p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="font-medium">{b.name}</div>
            <Badge tone="neutral">{formatNumber(b.seatCount)} seats</Badge>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {b.totalRows} rows × {b.totalColumns} columns
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[13px] tabular">
            <span>
              {b.dailyPrice !== null ? formatMoney(b.dailyPrice) : formatMoney(hall.pricePerDay)}
              <span className="text-muted-foreground">/day</span>
            </span>
            <span>
              {b.monthlyPrice !== null ? formatMoney(b.monthlyPrice) : hall.pricePerMonth !== null ? formatMoney(hall.pricePerMonth) : '—'}
              <span className="text-muted-foreground">/month</span>
            </span>
          </div>
          {(b.dailyPrice === null || b.monthlyPrice === null) && (
            <p className="mt-1 text-[11px] text-muted-foreground">Prices not set on the block fall back to the hall price.</p>
          )}
          {b.amenities && b.amenities.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {b.amenities.map((a) => (
                <Badge key={a} tone="neutral">
                  {a}
                </Badge>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/** Seat map for a date range, read-only, rendered from GET /api/studyhalls/{id}/seats. */
export function SeatingSection({ hall, compact }: { hall: StudyHallDetail; compact?: boolean }) {
  const [start, setStart] = useState(todayIST());
  const [end, setEnd] = useState(todayIST());
  const validRange = start && end && end >= start && end <= addDaysISO(start, 366);
  const hasBlocks = (hall.blocks?.length ?? 0) > 0;
  const { data, isLoading, error, refetch, isFetching } = useSeatMap(hall.id, start, end, hasBlocks && !!validRange);

  return (
    <div className="space-y-5">
      {!compact && (
        <div>
          <SectionTitle>Blocks</SectionTitle>
          <BlockSummaryCards hall={hall} />
        </div>
      )}
      {hasBlocks && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <SectionTitle className="mb-0">
              <span className="inline-flex items-center gap-2">
                Seat map <CalendarDays className="size-4 text-muted-foreground" aria-hidden />
              </span>
            </SectionTitle>
            <div className="flex flex-wrap items-end gap-2">
              <div className="space-y-1">
                <Label htmlFor={`seat-from-${hall.id}`} className="text-xs text-muted-foreground">
                  From
                </Label>
                <Input id={`seat-from-${hall.id}`} type="date" value={start} onChange={(e) => setStart(e.target.value)} className="w-40" />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`seat-to-${hall.id}`} className="text-xs text-muted-foreground">
                  To
                </Label>
                <Input id={`seat-to-${hall.id}`} type="date" value={end} min={start} onChange={(e) => setEnd(e.target.value)} className="w-40" />
              </div>
            </div>
          </div>
          {!validRange && <p className="text-sm text-destructive">Choose an end date on or after the start date (within a year).</p>}
          <SeatLegend />
          {isLoading ? (
            <Skeleton className="h-56 rounded-xl" />
          ) : error ? (
            <ErrorState compact error={error} onRetry={() => void refetch()} title="Seat map unavailable" />
          ) : data ? (
            <div className={cn('space-y-6', isFetching && 'opacity-70')}>
              {[...data.blocks]
                .sort((a, b) => a.displayOrder - b.displayOrder)
                .map((b) => (
                  <div key={b.id} className="space-y-2">
                    <div className="text-sm font-medium">{b.name}</div>
                    <SeatGrid block={b} />
                  </div>
                ))}
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Info className="size-3.5" aria-hidden /> Read-only. Seat edits are made by the vendor in the partner app.
              </p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

export function HallOverviewSections({ hall }: { hall: StudyHallDetail }) {
  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="space-y-6 lg:col-span-3">
        {hall.description && (
          <section>
            <SectionTitle>About</SectionTitle>
            <p className="text-sm whitespace-pre-line text-muted-foreground">{hall.description}</p>
          </section>
        )}
        <section>
          <SectionTitle>Pricing</SectionTitle>
          <PricingCards hall={hall} />
        </section>
        <section>
          <SectionTitle>Amenities</SectionTitle>
          <AmenityChips hall={hall} />
        </section>
        <section>
          <SectionTitle>Exams prepared for</SectionTitle>
          <ProgramChips hall={hall} />
        </section>
        {hall.rules && (
          <section>
            <SectionTitle>House rules</SectionTitle>
            <p className="rounded-xl border bg-muted/30 p-4 text-sm whitespace-pre-line">{hall.rules}</p>
          </section>
        )}
      </div>
      <div className="space-y-6 lg:col-span-2">
        <section>
          <SectionTitle>Contact & location</SectionTitle>
          <ContactBlock hall={hall} />
        </section>
        {hall.latitude !== null && hall.longitude !== null && <HallMap lat={hall.latitude} lng={hall.longitude} label={hall.name} />}
        <section>
          <SectionTitle>Operating hours</SectionTitle>
          <HoursTable hours={hall.operatingHours} />
        </section>
        <section>
          <SectionTitle>Vendor</SectionTitle>
          <Link to={`/vendors/${hall.vendorId}`} className="text-sm font-medium hover:text-primary hover:underline">
            {hall.vendorBusinessName ?? `Vendor #${hall.vendorId}`}
          </Link>
        </section>
      </div>
    </div>
  );
}
