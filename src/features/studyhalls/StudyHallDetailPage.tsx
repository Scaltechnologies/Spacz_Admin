import { Link, useParams } from 'react-router';
import { Armchair, ArrowLeft, Ban, Building2, CheckCircle2, History, Images, Info, MapPin, RotateCcw, Ticket, XCircle } from 'lucide-react';
import { useHall } from './api';
import { HallOverviewSections, QualityHints, SeatingSection, hallAddress } from './components';
import { useHallModeration } from '@/features/approvals/moderation';
import { useVendor } from '@/features/vendors/api';
import { BookingsTable } from '@/features/bookings/BookingsTable';
import { EntityAuditTimeline } from '@/features/audit/components';
import { useBreadcrumbLabel } from '@/layouts/breadcrumbs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/primitives';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/menus';
import { Callout, ErrorState } from '@/components/shared/states';
import { InfoGrid, SectionTitle } from '@/components/shared/layout-bits';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { CopyButton } from '@/components/shared/CopyButton';
import { CoverImage, ImageGallery, sortImages } from '@/components/shared/hall-bits';
import { useUrlState } from '@/hooks';
import { hallActions } from '@/lib/status';
import { formatDateTime, formatMoney, formatNumber } from '@/lib/format';

export default function StudyHallDetailPage() {
  const params = useParams();
  const id = Number(params.id);
  const valid = Number.isInteger(id) && id > 0;
  const { data: h, isLoading, error, refetch } = useHall(valid ? id : null);
  const vendor = useVendor(h?.vendorId);
  const url = useUrlState();
  const moderation = useHallModeration();
  useBreadcrumbLabel(h?.name);

  if (!valid) return <ErrorState error={new Error('Invalid study hall ID in the address.')} />;
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-10 w-96" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }
  if (error || !h) {
    return (
      <Card>
        <ErrorState error={error} onRetry={() => void refetch()} />
        <div className="pb-8 text-center">
          <Button variant="link" asChild>
            <Link to="/studyhalls">
              <ArrowLeft /> Back to study halls
            </Link>
          </Button>
        </div>
      </Card>
    );
  }

  const acts = hallActions[h.status] ?? [];
  const vStatus = vendor.data?.vendor.profile.status;
  const vendorApproved = vStatus ? ['APPROVED', 'ACTIVE'].includes(vStatus) : null;
  const target = { id: h.id, name: h.name, vendorApproved, status: h.status };
  const tab = url.getEnum('tab', ['overview', 'photos', 'seating', 'bookings', 'audit'], 'overview')!;
  const cover = sortImages(h.images)[0]?.url;

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border shadow-card">
        <CoverImage src={cover} alt={h.name} className="h-56 w-full sm:h-72" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" aria-hidden />
        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-4 p-5 text-white lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{h.name}</h1>
              <StatusBadge status={h.status} className="bg-white/90 dark:bg-card/90" />
            </div>
            <p className="flex items-center gap-1.5 text-sm text-white/80">
              <MapPin className="size-4 shrink-0" aria-hidden /> {hallAddress(h) || 'Address not set'}
            </p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-white/80">
              <Link to={`/vendors/${h.vendorId}`} className="inline-flex items-center gap-1 font-medium text-white hover:underline">
                <Building2 className="size-3.5" aria-hidden /> {h.vendorBusinessName ?? `Vendor #${h.vendorId}`}
              </Link>
              {vStatus && <span>Vendor {vStatus.toLowerCase()}</span>}
              <span className="inline-flex items-center gap-1 tabular">
                <Armchair className="size-3.5" aria-hidden /> {formatNumber(h.totalSeats)} seats
              </span>
              <span className="tabular">{formatMoney(h.pricePerDay)}/day</span>
              <span className="inline-flex items-center gap-1 font-mono">
                #{h.id} <CopyButton value={h.id} label="Copy hall ID" className="text-white/70 hover:bg-white/15 hover:text-white" />
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {acts.includes('reject') && (
              <Button variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white" onClick={() => moderation.start(target, 'reject')}>
                <XCircle /> Reject
              </Button>
            )}
            {acts.includes('suspend') && (
              <Button variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white" onClick={() => moderation.start(target, 'suspend')}>
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
                <CheckCircle2 /> Approve
              </Button>
            )}
          </div>
        </div>
      </div>

      {h.statusReason && (
        <Callout tone={h.status === 'REJECTED' || h.status === 'SUSPENDED' ? 'danger' : 'info'} title="Status note">
          {h.statusReason}
        </Callout>
      )}
      {h.status === 'APPROVED' && (
        <Callout tone="info" icon={<Info className="text-info" />} title="Approved, waiting for the vendor">
          This hall goes live automatically when its vendor is approved.
        </Callout>
      )}
      {h.status === 'PENDING_APPROVAL' && <QualityHints hall={h} />}

      <Tabs value={tab} onValueChange={(t) => url.set({ tab: t === 'overview' ? undefined : t }, { replace: true })}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="photos">
            <Images className="size-4" /> Photos <Badge>{h.images?.length ?? 0}</Badge>
          </TabsTrigger>
          <TabsTrigger value="seating">
            <Armchair className="size-4" /> Seating
          </TabsTrigger>
          <TabsTrigger value="bookings">
            <Ticket className="size-4" /> Bookings
          </TabsTrigger>
          <TabsTrigger value="audit">
            <History className="size-4" /> Audit history
          </TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-6 space-y-6">
          <Card className="p-5">
            <HallOverviewSections hall={h} />
          </Card>
          <Card className="p-5">
            <SectionTitle>Timeline</SectionTitle>
            <InfoGrid
              columns={3}
              items={[
                { label: 'Created', value: formatDateTime(h.createdAt) },
                { label: 'Submitted for review', value: h.submittedAt ? formatDateTime(h.submittedAt) : 'Not submitted' },
                { label: 'Approved', value: h.approvedAt ? formatDateTime(h.approvedAt) : '—' },
                { label: 'Last updated', value: formatDateTime(h.updatedAt) },
              ]}
            />
          </Card>
        </TabsContent>
        <TabsContent value="photos" className="mt-6">
          <Card className="p-5">
            <ImageGallery images={h.images} name={h.name} />
          </Card>
        </TabsContent>
        <TabsContent value="seating" className="mt-6">
          <Card className="p-5">
            <SeatingSection hall={h} />
          </Card>
        </TabsContent>
        <TabsContent value="bookings" className="mt-6">
          <BookingsTable fixed={{ studyHallId: h.id }} hideHall urlPrefix="b" />
        </TabsContent>
        <TabsContent value="audit" className="mt-6">
          <Card className="p-5">
            <EntityAuditTimeline entityType="STUDY_HALL" entityId={h.id} />
          </Card>
        </TabsContent>
      </Tabs>
      {moderation.dialog}
    </div>
  );
}
