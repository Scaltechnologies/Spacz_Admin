import { Link } from 'react-router';
import { ArrowRight, CircleSlash, CreditCard, FileCode2, Receipt } from 'lucide-react';
import { PageHeader } from '@/components/shared/layout-bits';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

/**
 * Backend inspection (spacz-platform, all services + gateway routes): there is no payment service,
 * no payment/transaction entity, and no admin transaction, refund or settlement endpoint.
 * Booking prices exist (unitPrice/totalPrice), but no payment records do. Nothing is simulated here.
 */
const REQUIRED: { method: string; path: string; purpose: string }[] = [
  { method: 'GET', path: '/api/admin/payments?status=&from=&to=&bookingId=&userId=&page=&size=&sort=', purpose: 'Paginated transaction list with filters' },
  { method: 'GET', path: '/api/admin/payments/{paymentId}', purpose: 'Transaction detail (gateway IDs, attempts, failure reason)' },
  { method: 'GET', path: '/api/admin/payments/stats?from=&to=', purpose: 'Counts and amount totals by status for the dashboard' },
  { method: 'POST', path: '/api/admin/payments/{paymentId}/refund {amount?, reason}', purpose: 'Audited refund, returns the refund record' },
  { method: 'GET', path: '/api/admin/settlements?vendorId=&from=&to=', purpose: 'Vendor payouts / reconciliation (optional)' },
];

const DTO = `PaymentDto {
  id: number; paymentReference: string;
  bookingId: number; bookingReference: string; userId: number; studyHallId: number;
  amount: number; currency: "INR";
  status: "CREATED" | "AUTHORIZED" | "CAPTURED" | "FAILED" | "REFUNDED" | "PARTIALLY_REFUNDED";
  method: "UPI" | "CARD" | "NETBANKING" | "WALLET" | null;
  gateway: string; gatewayOrderId: string | null; gatewayPaymentId: string | null;
  failureCode: string | null; failureReason: string | null;
  refundedAmount: number; createdAt: string; capturedAt: string | null; updatedAt: string;
}`;

export default function TransactionsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Transactions" description="Payments, refunds and settlements." />

      <Card className="overflow-hidden">
        <div className="flex flex-col items-start gap-5 p-6 sm:flex-row">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <CircleSlash className="size-6" aria-hidden />
          </div>
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold">The SPACZ backend has no payment service yet</h2>
              <Badge tone="warning">Backend gap</Badge>
            </div>
            <p className="max-w-3xl text-sm text-muted-foreground">
              We inspected every service behind the gateway (auth, user, studyhall, admin). None stores payment records or exposes
              transaction, refund or settlement endpoints. Bookings are confirmed by the student app after it takes payment, and only the
              booking price is stored. This section will stay empty rather than show invented totals.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button asChild>
                <Link to="/bookings?status=CONFIRMED">
                  <Receipt /> View confirmed bookings <ArrowRight />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="size-4 text-muted-foreground" aria-hidden /> Endpoints this page needs
              </CardTitle>
              <CardDescription>All ADMIN-only via the gateway and written to the audit log.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {REQUIRED.map((r) => (
                <li key={r.path} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
                  <code className="font-mono text-[12.5px] break-all">
                    <span className={r.method === 'GET' ? 'text-info' : 'text-amber-600 dark:text-amber-300'}>{r.method}</span> {r.path}
                  </code>
                  <span className="text-[13px] text-muted-foreground">{r.purpose}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileCode2 className="size-4 text-muted-foreground" aria-hidden /> Expected DTO
              </CardTitle>
              <CardDescription>The UI will plug into this shape once it exists.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <pre className="scrollbar-thin overflow-x-auto rounded-xl border bg-muted/50 p-4 font-mono text-xs leading-relaxed">{DTO}</pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
