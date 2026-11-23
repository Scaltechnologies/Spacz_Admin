import { Link } from 'react-router';
import { Armchair, MapPin } from 'lucide-react';
import type { StudyHallSummary } from '@/lib/api/types';
import { CoverImage } from '@/components/shared/hall-bits';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatMoney, formatNumber } from '@/lib/format';

export function HallCard({ hall }: { hall: StudyHallSummary }) {
  return (
    <Link
      to={`/studyhalls/${hall.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border bg-card shadow-card transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-pop focus-visible:ring-[3px] focus-visible:ring-primary/30 focus-visible:outline-none"
    >
      <div className="relative">
        <CoverImage src={hall.coverImageUrl} alt="" className="aspect-[16/9] w-full transition-transform duration-500 group-hover:scale-[1.03]" />
        <div className="absolute top-3 left-3">
          <StatusBadge status={hall.status} className="bg-card/90 backdrop-blur" />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="min-w-0">
          <h3 className="truncate font-semibold tracking-tight">{hall.name}</h3>
          <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
            <MapPin className="size-3 shrink-0" aria-hidden />
            {[hall.addressLine, hall.city].filter(Boolean).join(', ') || 'Address not set'}
          </p>
        </div>
        <p className="truncate text-xs text-muted-foreground">by {hall.vendorBusinessName ?? `Vendor #${hall.vendorId}`}</p>
        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <div className="tabular">
            <span className="text-base font-semibold">{formatMoney(hall.pricePerDay)}</span>
            <span className="text-xs text-muted-foreground">/day</span>
            {hall.pricePerMonth !== null && (
              <div className="text-xs text-muted-foreground">{formatMoney(hall.pricePerMonth)}/month</div>
            )}
          </div>
          <span className="inline-flex items-center gap-1 rounded-lg bg-muted px-2 py-1 text-xs font-medium tabular">
            <Armchair className="size-3.5" aria-hidden /> {formatNumber(hall.seatCount)}
          </span>
        </div>
      </div>
    </Link>
  );
}
