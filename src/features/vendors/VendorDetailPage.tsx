import { Link, useParams } from 'react-router';
import { ArrowLeft, Ban, Building2, CheckCircle2, History, Info, Library, RotateCcw, Ticket, UserRound, XCircle } from 'lucide-react';
import { useVendor } from './api';
import { AccountCard, VendorChecklist, VendorDates, VendorProfileGrid, VendorStepper, vendorName } from './components';
import { useVendorModeration } from '@/features/approvals/moderation';
import { useHalls } from '@/features/studyhalls/api';
import { HallCard } from '@/features/studyhalls/HallCard';
import { BookingsTable } from '@/features/bookings/BookingsTable';
import { EntityAuditTimeline } from '@/features/audit/components';
import { useBreadcrumbLabel } from '@/layouts/breadcrumbs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, NativeSelect, Skeleton } from '@/components/ui/primitives';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/menus';
import { Callout, EmptyState, ErrorState } from '@/components/shared/states';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { CopyButton } from '@/components/shared/CopyButton';
import { useUrlState } from '@/hooks';
import { vendorActions } from '@/lib/status';
import { formatNumber } from '@/lib/format';

function VendorHalls({ vendorId }: { vendorId: number }) {
  const { data, isLoading, error, refetch } = useHalls({ vendorId, size: 50, sort: 'createdAt,desc' });
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-64 rounded-2xl" />
        ))}
      </div>
    );
  }
  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;
  if (!data?.content.length) return <EmptyState icon={<Library className="size-6" />} title="No study halls yet" description="Halls this vendor creates will appear here." />;
  return (
    <div className="space-y-3">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {data.content.map((h) => (
          <HallCard key={h.id} hall={h} />
        ))}
      </div>
      {data.totalElements > data.content.length && (
        <Button variant="link" asChild>
          <Link to={`/studyhalls?vendorId=${vendorId}`}>View all {data.totalElements} halls</Link>
        </Button>
      )}
    </div>
  );
}

/** No vendorId filter exists on /api/admin/bookings, so bookings are browsed hall by hall. */
function VendorBookings({ vendorId }: { vendorId: number }) {
  const { data, isLoading } = useHalls({ vendorId, size: 100, sort: 'name,asc' });
  const url = useUrlState();
  const halls = data?.content ?? [];
  const hallId = url.getInt('hall', 0, { min: 1 }) || halls[0]?.id;
  if (isLoading) return <Skeleton className="h-40 rounded-2xl" />;
  if (!halls.length) return <EmptyState icon={<Ticket className="size-6" />} title="No study halls" description="This vendor has no halls, so there are no bookings." />;
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Study hall</span>
          <NativeSelect
            value={hallId}
            onChange={(e) => {
              url.set({ hall: e.target.value, bPage: undefined, bOpen: undefined });
            }}
            className="min-w-60"
          >
            {halls.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name} {h.city ? `· ${h.city}` : ''}
              </option>
            ))}
          </NativeSelect>
        </label>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Info className="size-3.5" aria-hidden /> The bookings API filters by hall, not vendor, so pick one hall at a time.
        </p>
      </div>
      {hallId && <BookingsTable key={hallId} fixed={{ studyHallId: hallId }} hideHall urlPrefix="b" />}
    </div>
  );
}

export default function VendorDetailPage() {
  const params = useParams();
  const vendorId = Number(params.vendorId);
  const valid = Number.isInteger(vendorId) && vendorId > 0;
  const { data, isLoading, error, refetch } = useVendor(valid ? vendorId : null);
  const url = useUrlState();
  const moderation = useVendorModeration();
  const name = data ? vendorName(data.vendor.profile) : null;
  useBreadcrumbLabel(name);

  if (!valid) return <ErrorState error={new Error('Invalid vendor ID in the address.')} />;
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-36 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }
  if (error || !data) {
    return (
      <Card>
        <ErrorState error={error} onRetry={() => void refetch()} />
        <div className="pb-8 text-center">
          <Button variant="link" asChild>
            <Link to="/vendors">
              <ArrowLeft /> Back to vendors
            </Link>
          </Button>
        </div>
      </Card>
    );
  }

  const { vendor, account } = data;
  const p = vendor.profile;
  const acts = vendorActions[p.status] ?? [];
  const target = { vendorId: p.vendorId, name: name!, activeHalls: vendor.activeStudyHallCount, status: p.status };
  const tab = url.getEnum('tab', ['overview', 'halls', 'bookings', 'audit'], 'overview')!;
  const reasonTone = p.status === 'REJECTED' || p.status === 'SUSPENDED' ? 'danger' : 'info';

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-info/15 via-primary/8 to-accent/10" aria-hidden />
        <div className="-mt-10 flex flex-col gap-4 px-5 pb-5 lg:flex-row lg:items-end">
          <Avatar name={name} src={p.logoUrl} square className="size-20 border-4 border-card text-2xl" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{name}</h1>
              <StatusBadge status={p.status} />
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
              <span className="inline-flex items-center gap-1 font-mono">
                Vendor #{p.vendorId} <CopyButton value={p.vendorId} label="Copy vendor ID" />
              </span>
              {p.city && <span>{[p.city, p.state].filter(Boolean).join(', ')}</span>}
              <span>
                <span className="font-medium text-foreground">{formatNumber(vendor.activeStudyHallCount)}</span> live /{' '}
                {formatNumber(vendor.studyHallCount)} halls
              </span>
            </div>
            <VendorStepper vendor={vendor} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link to={`/users/${p.vendorId}`}>
                <UserRound /> Login account
              </Link>
            </Button>
            {acts.includes('reject') && (
              <Button variant="destructive-outline" onClick={() => moderation.start(target, 'reject')}>
                <XCircle /> Reject
              </Button>
            )}
            {acts.includes('suspend') && (
              <Button variant="destructive-outline" onClick={() => moderation.start(target, 'suspend')}>
                <Ban /> Suspend
              </Button>
            )}
            {acts.includes('activate') && (
              <Button onClick={() => moderation.start(target, 'activate')}>
                <RotateCcw /> Activate
              </Button>
            )}
            {acts.includes('approve') && (
              <Button variant="success" onClick={() => moderation.start(target, 'approve')}>
                <CheckCircle2 /> {p.status === 'REJECTED' ? 'Re-approve' : 'Approve'}
              </Button>
            )}
          </div>
        </div>
      </Card>

      {p.statusReason && (
        <Callout tone={reasonTone} title={p.status === 'REJECTED' ? 'Rejection reason' : p.status === 'SUSPENDED' ? 'Suspension reason' : 'Status note'}>
          {p.statusReason}
        </Callout>
      )}
      {!account && <Callout tone="warning" title="Login account unavailable">The auth service didn’t return this vendor’s account details.</Callout>}

      <Tabs value={tab} onValueChange={(t) => url.set({ tab: t === 'overview' ? undefined : t }, { replace: true })}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="halls">
            <Building2 className="size-4" /> Study halls <Badge>{vendor.studyHallCount}</Badge>
          </TabsTrigger>
          <TabsTrigger value="bookings">
            <Ticket className="size-4" /> Bookings
          </TabsTrigger>
          <TabsTrigger value="audit">
            <History className="size-4" /> Audit history
          </TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-6">
          <div className="grid gap-4 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader>
                <CardTitle>Business profile</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <VendorProfileGrid profile={p} />
                <div className="border-t pt-5">
                  <VendorDates profile={p} />
                </div>
              </CardContent>
            </Card>
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Completeness</CardTitle>
                </CardHeader>
                <CardContent>
                  <VendorChecklist profile={p} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Login account</CardTitle>
                </CardHeader>
                <CardContent>
                  <AccountCard account={account} unavailable={!account} />
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="halls" className="mt-6">
          <VendorHalls vendorId={p.vendorId} />
        </TabsContent>
        <TabsContent value="bookings" className="mt-6">
          <VendorBookings vendorId={p.vendorId} />
        </TabsContent>
        <TabsContent value="audit" className="mt-6">
          <Card className="p-5">
            <EntityAuditTimeline entityType="VENDOR" entityId={p.vendorId} />
          </Card>
        </TabsContent>
      </Tabs>
      {moderation.dialog}
    </div>
  );
}
