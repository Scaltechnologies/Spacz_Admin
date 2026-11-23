import { Info } from 'lucide-react';
import { BookingsTable } from './BookingsTable';
import { PageHeader } from '@/components/shared/layout-bits';
import { Tooltip } from '@/components/ui/primitives';

export default function BookingsPage() {
  return (
    <div>
      <PageHeader
        title="Bookings"
        description={
          <span className="inline-flex items-center gap-1.5">
            Every seat booking across SPACZ. Amounts in INR, times in IST.
            <Tooltip content="Read-only: the backend exposes no admin confirm, cancel or refund endpoints.">
              <Info className="size-3.5 cursor-help" aria-label="About booking actions" />
            </Tooltip>
          </span>
        }
      />
      <BookingsTable showHallFilter showUserFilter exportable />
    </div>
  );
}
