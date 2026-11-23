import { Link } from 'react-router';
import {
  ArrowRight,
  Armchair,
  Building2,
  CalendarCheck,
  CheckCircle2,
  Gauge,
  GraduationCap,
  History,
  Library,
  RefreshCw,
  Users,
  XCircle,
} from 'lucide-react';
import { useDashboard } from './api';
import { DonutChart, HorizontalBars, Legend, RadialGauge, type Slice } from './charts';
import { useVendors } from '@/features/vendors/api';
import { useHalls } from '@/features/studyhalls/api';
import { useAuditLogs } from '@/features/audit/api';
import { useHallModeration, useVendorModeration } from '@/features/approvals/moderation';
import { useAdminDisplayName } from '@/layouts/UserMenu';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/primitives';
import { Avatar } from '@/components/ui/primitives';
import { KpiCard } from '@/components/shared/KpiCard';
import { EmptyState, ErrorState, PartialDataBanner } from '@/components/shared/states';
import { RelativeTime, Timeline } from '@/components/shared/layout-bits';
import { AuditActionBadge } from '@/components/shared/StatusBadge';
import { CoverImage } from '@/components/shared/hall-bits';
import { auditTone } from '@/lib/status';
import { formatNumber, formatPercent, greeting } from '@/lib/format';
import type { AuditLog, DashboardResponse } from '@/lib/api/types';

const SERVICE_LABEL: Record<string, string> = {
  'auth-service': 'Accounts',
  'studyhall-service': 'Vendors, halls & bookings',
  'user-service': 'Student profiles',
};

function unavailableFor(d: DashboardResponse | undefined, group: keyof Pick<DashboardResponse, 'users' | 'vendors' | 'studyHalls' | 'bookings'>) {
  if (!d) return false;
  if (d[group] !== null && d[group] !== undefined) return false;
  const svc = (d.unavailableServices ?? []).join(', ') || 'the responsible service';
  return `Not available: ${svc} did not respond.`;
}

function auditEntityPath(log: AuditLog): string | null {
  if (log.entityId === null) return null;
  switch (log.entityType) {
    case 'VENDOR':
      return `/vendors/${log.entityId}`;
    case 'STUDY_HALL':
      return `/studyhalls/${log.entityId}`;
    case 'USER_ACCOUNT':
      return `/users/${log.entityId}`;
    case 'PROGRAM':
      return '/catalog/programs';
    case 'AMENITY':
      return '/catalog/amenities';
    default:
      return null;
  }
}

function ApprovalQueue() {
  const vendors = useVendors({ status: 'PENDING', size: 5, sort: 'createdAt,asc' });
  const halls = useHalls({ status: 'PENDING_APPROVAL', size: 5, sort: 'submittedAt,asc' });
  const vendorMod = useVendorModeration();
  const hallMod = useHallModeration();
  const loading = vendors.isLoading || halls.isLoading;
  const totalPending = (vendors.data?.totalElements ?? 0) + (halls.data?.totalElements ?? 0);

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div>
          <CardTitle>Needs your attention</CardTitle>
          <CardDescription>Oldest submissions first</CardDescription>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/approvals">
            Open queue <ArrowRight />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="flex-1 space-y-5">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="size-10 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))
        ) : vendors.error && halls.error ? (
          <ErrorState compact error={vendors.error} onRetry={() => (void vendors.refetch(), void halls.refetch())} />
        ) : totalPending === 0 ? (
          <EmptyState
            className="py-8"
            icon={<CheckCircle2 className="size-6" />}
            title="You’re all caught up"
            description="No vendors or study halls are waiting for review."
          />
        ) : (
          <>
            {(vendors.data?.content.length ?? 0) > 0 && (
              <section aria-label="Pending vendors">
                <div className="mb-2 flex items-center justify-between text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                  <span>Vendors</span>
                  <span className="tabular">{vendors.data!.totalElements} pending</span>
                </div>
                <ul className="divide-y">
                  {vendors.data!.content.map((v) => {
                    const p = v.profile;
                    const name = p.businessName ?? p.contactName ?? `Vendor #${p.vendorId}`;
                    return (
                      <li key={p.vendorId} className="flex flex-wrap items-center gap-3 py-2.5 first:pt-0">
                        <Avatar name={name} src={p.logoUrl} square className="size-10" />
                        <div className="min-w-0 flex-1">
                          <Link to={`/approvals?tab=vendors&selected=${p.vendorId}`} className="block truncate text-sm font-medium hover:text-primary">
                            {name}
                          </Link>
                          <div className="truncate text-xs text-muted-foreground">
                            {[p.city, p.state].filter(Boolean).join(', ') || 'Location not set'} · submitted <RelativeTime value={p.submittedAt ?? p.createdAt} />
                          </div>
                        </div>
                        <div className="flex gap-1.5">
                          <Button size="xs" variant="outline" onClick={() => vendorMod.start({ vendorId: p.vendorId, name, status: p.status }, 'approve')}>
                            <CheckCircle2 className="text-success" /> Approve
                          </Button>
                          <Button
                            size="xs"
                            variant="destructive-outline"
                            onClick={() => vendorMod.start({ vendorId: p.vendorId, name, status: p.status }, 'reject')}
                          >
                            <XCircle /> Reject
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}
            {(halls.data?.content.length ?? 0) > 0 && (
              <section aria-label="Pending study halls">
                <div className="mb-2 flex items-center justify-between text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                  <span>Study halls</span>
                  <span className="tabular">{halls.data!.totalElements} pending</span>
                </div>
                <ul className="divide-y">
                  {halls.data!.content.map((h) => (
                    <li key={h.id} className="flex flex-wrap items-center gap-3 py-2.5 first:pt-0">
                      <CoverImage src={h.coverImageUrl} alt="" className="size-10 shrink-0 rounded-xl" />
                      <div className="min-w-0 flex-1">
                        <Link to={`/approvals?tab=halls&selected=${h.id}`} className="block truncate text-sm font-medium hover:text-primary">
                          {h.name}
                        </Link>
                        <div className="truncate text-xs text-muted-foreground">
                          {[h.city, h.vendorBusinessName].filter(Boolean).join(' · ')} · {formatNumber(h.seatCount)} seats
                        </div>
                      </div>
                      <div className="flex gap-1.5">
                        <Button size="xs" variant="outline" onClick={() => hallMod.start({ id: h.id, name: h.name, status: h.status }, 'approve')}>
                          <CheckCircle2 className="text-success" /> Approve
                        </Button>
                        <Button size="xs" variant="destructive-outline" onClick={() => hallMod.start({ id: h.id, name: h.name, status: h.status }, 'reject')}>
                          <XCircle /> Reject
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </CardContent>
      {vendorMod.dialog}
      {hallMod.dialog}
    </Card>
  );
}

function RecentActivity() {
  const { data, isLoading, error, refetch } = useAuditLogs({ size: 8 }, { refetchInterval: 60_000 });
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Recent platform activity</CardTitle>
          <CardDescription>Admin actions and platform events</CardDescription>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/audit-logs">
            Audit log <ArrowRight />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="size-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <ErrorState compact error={error} onRetry={() => void refetch()} />
        ) : !data?.content.length ? (
          <EmptyState className="py-8" icon={<History className="size-6" />} title="No activity yet" />
        ) : (
          <Timeline
            items={data.content.map((log) => {
              const path = auditEntityPath(log);
              const tone = auditTone(log.action);
              return {
                id: log.id,
                tone: tone === 'orange' ? 'warning' : tone,
                title: <AuditActionBadge action={log.action} />,
                description: path ? (
                  <Link to={path} className="hover:text-foreground hover:underline">
                    {log.description ?? `${log.entityType} #${log.entityId}`}
                  </Link>
                ) : (
                  log.description
                ),
                meta: log.actorEmail ? `by ${log.actorEmail}` : log.actorRole === 'SYSTEM' || !log.actorRole ? 'System' : `by ${log.actorRole.toLowerCase()}`,
                time: log.timestamp,
              };
            })}
          />
        )}
      </CardContent>
    </Card>
  );
}

function UnavailableChart({ text }: { text: string }) {
  return <div className="flex h-[200px] items-center justify-center rounded-xl border border-dashed text-center text-sm text-muted-foreground">{text}</div>;
}

export default function DashboardPage() {
  const { data: d, isLoading, error, refetch, isFetching, dataUpdatedAt } = useDashboard();
  const name = useAdminDisplayName();

  if (error && !d) {
    return (
      <>
        <Header name={name} onRefresh={() => void refetch()} refreshing={isFetching} />
        <Card>
          <ErrorState error={error} onRetry={() => void refetch()} title="Dashboard unavailable" />
        </Card>
      </>
    );
  }

  const u = d?.users;
  const v = d?.vendors;
  const h = d?.studyHalls;
  const b = d?.bookings;
  const down = d?.unavailableServices ?? [];

  const occupancy = b && h ? formatPercent(b.occupiedSeatsToday, h.totalSeats) : null;
  const vendorSlices: Slice[] = v
    ? [
        { key: 'approved', label: 'Approved', value: v.approvedVendors, color: 'var(--chart-2)' },
        { key: 'pending', label: 'Pending', value: v.pendingVendors, color: 'var(--chart-3)' },
        { key: 'draft', label: 'Draft', value: v.draftVendors, color: 'var(--chart-6)' },
        { key: 'rejected', label: 'Rejected', value: v.rejectedVendors, color: 'var(--chart-4)' },
        { key: 'suspended', label: 'Suspended', value: v.suspendedVendors, color: 'oklch(0.45 0.15 17)' },
      ]
    : [];
  if (v) {
    const other = v.totalVendors - vendorSlices.reduce((s, x) => s + x.value, 0);
    if (other > 0) vendorSlices.push({ key: 'other', label: 'Other (active/inactive)', value: other, color: 'var(--chart-5)' });
  }
  const hallSlices: Slice[] = h
    ? [
        { key: 'active', label: 'Live', value: h.activeStudyHalls, color: 'var(--chart-2)' },
        { key: 'pending', label: 'Pending', value: h.pendingApproval, color: 'var(--chart-3)' },
        { key: 'suspended', label: 'Suspended', value: h.suspendedStudyHalls, color: 'var(--chart-4)' },
        {
          key: 'other',
          label: 'Other',
          value: Math.max(0, h.totalStudyHalls - h.activeStudyHalls - h.pendingApproval - h.suspendedStudyHalls),
          color: 'var(--chart-6)',
        },
      ]
    : [];
  const bookingSlices: Slice[] = b
    ? [
        { key: 'pending', label: 'Pending', value: b.pendingBookings, color: 'var(--chart-3)' },
        { key: 'confirmed', label: 'Confirmed', value: b.confirmedBookings, color: 'var(--chart-1)' },
      ]
    : [];

  return (
    <div className="space-y-6">
      <Header
        name={name}
        onRefresh={() => void refetch()}
        refreshing={isFetching}
        updatedAt={d?.generatedAt ?? (dataUpdatedAt ? new Date(dataUpdatedAt).toISOString() : undefined)}
      />

      {down.length > 0 && (
        <PartialDataBanner
          title="Some metrics are unavailable"
          items={down.map((s) => `${SERVICE_LABEL[s] ?? s} (${s}) is not responding`)}
          onRetry={() => void refetch()}
          retrying={isFetching}
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard
          icon={<Users />}
          label="Students & users"
          value={u?.totalUsers}
          loading={isLoading}
          unavailable={unavailableFor(d, 'users')}
          to="/users"
          sub={u ? [
            { label: 'active', value: formatNumber(u.activeUsers), tone: 'success' },
            { label: 'suspended', value: formatNumber(u.suspendedUsers), tone: u.suspendedUsers ? 'danger' : 'muted' },
          ] : undefined}
        />
        <KpiCard
          icon={<Building2 />}
          label="Vendors & partners"
          accent="info"
          value={v?.totalVendors}
          loading={isLoading}
          unavailable={unavailableFor(d, 'vendors')}
          to={v?.pendingVendors ? '/approvals?tab=vendors' : '/vendors'}
          sub={v ? [
            { label: 'pending', value: formatNumber(v.pendingVendors), tone: v.pendingVendors ? 'warning' : 'muted' },
            { label: 'approved', value: formatNumber(v.approvedVendors), tone: 'success' },
          ] : undefined}
        />
        <KpiCard
          icon={<Library />}
          label="Live study halls"
          accent="success"
          value={h?.activeStudyHalls}
          suffix={h ? `/ ${formatNumber(h.totalStudyHalls)}` : undefined}
          loading={isLoading}
          unavailable={unavailableFor(d, 'studyHalls')}
          to={h?.pendingApproval ? '/approvals?tab=halls' : '/studyhalls'}
          sub={h ? [{ label: 'pending approval', value: formatNumber(h.pendingApproval), tone: h.pendingApproval ? 'warning' : 'muted' }] : undefined}
        />
        <KpiCard
          icon={<Armchair />}
          label="Seat capacity"
          accent="violet"
          value={h?.totalSeats}
          loading={isLoading}
          unavailable={unavailableFor(d, 'studyHalls')}
          to="/studyhalls"
          sub={h ? [{ label: 'active exams in catalog', value: formatNumber(h.activePrograms) }] : undefined}
        />
        <KpiCard
          icon={<CalendarCheck />}
          label="Bookings today"
          accent="warning"
          value={b?.todaysBookings}
          loading={isLoading}
          unavailable={unavailableFor(d, 'bookings')}
          to="/bookings?preset=today"
          sub={b ? [
            { label: 'pending', value: formatNumber(b.pendingBookings), tone: b.pendingBookings ? 'warning' : 'muted' },
            { label: 'confirmed', value: formatNumber(b.confirmedBookings) },
            { label: 'all-time', value: formatNumber(b.totalBookings) },
          ] : undefined}
        />
        <KpiCard
          icon={<Gauge />}
          label="Seats occupied today"
          accent="rose"
          value={b?.occupiedSeatsToday}
          loading={isLoading}
          unavailable={unavailableFor(d, 'bookings')}
          sub={b ? [
            { label: 'of seats', value: occupancy ?? 'n/a' },
            { label: 'active enrollments', value: formatNumber(b.activeEnrollments) },
          ] : undefined}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-4">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Vendor pipeline</CardTitle>
              <CardDescription>Current status of every vendor</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[200px] rounded-xl" />
            ) : !v ? (
              <UnavailableChart text="Vendor data unavailable" />
            ) : (
              <div className="flex flex-col items-center gap-5 sm:flex-row 2xl:flex-col">
                <DonutChart data={vendorSlices} centerValue={v.totalVendors} centerLabel="vendors" />
                <Legend data={vendorSlices} total={v.totalVendors} className="w-full" />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Study hall status</CardTitle>
              <CardDescription>{h ? `${formatNumber(h.totalStudyHalls)} halls in total` : 'Current distribution'}</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-[200px] rounded-xl" /> : !h ? <UnavailableChart text="Study hall data unavailable" /> : <HorizontalBars data={hallSlices} height={200} />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Today’s occupancy</CardTitle>
              <CardDescription>Seats with an active booking today</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[200px] rounded-xl" />
            ) : !b || !h ? (
              <UnavailableChart text="Occupancy needs booking and hall data" />
            ) : occupancy === null ? (
              <UnavailableChart text="No seats configured yet, so occupancy can’t be calculated." />
            ) : (
              <div className="space-y-3">
                <RadialGauge percent={(b.occupiedSeatsToday / h.totalSeats) * 100} label={occupancy} sub="occupied" />
                <p className="text-center text-xs text-muted-foreground tabular">
                  {formatNumber(b.occupiedSeatsToday)} of {formatNumber(h.totalSeats)} seats
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Bookings by status</CardTitle>
              <CardDescription>Open pipeline right now</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[200px] rounded-xl" />
            ) : !b ? (
              <UnavailableChart text="Booking data unavailable" />
            ) : (
              <div className="space-y-4">
                <HorizontalBars data={bookingSlices} height={110} />
                <div className="grid grid-cols-2 gap-2">
                  <Link to="/bookings" className="rounded-xl border p-3 transition-colors hover:border-primary/40">
                    <div className="text-xs text-muted-foreground">All-time bookings</div>
                    <div className="text-lg font-semibold tabular">{formatNumber(b.totalBookings)}</div>
                  </Link>
                  <div className="rounded-xl border p-3">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <GraduationCap className="size-3.5" aria-hidden /> Active enrollments
                    </div>
                    <div className="text-lg font-semibold tabular">{formatNumber(b.activeEnrollments)}</div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-5">
        <div className="xl:col-span-3">
          <ApprovalQueue />
        </div>
        <div className="xl:col-span-2">
          <RecentActivity />
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Metrics show the current state reported by the backend. Historical trends aren’t available yet.
      </p>
    </div>
  );
}

function Header({ name, onRefresh, refreshing, updatedAt }: { name: string; onRefresh: () => void; refreshing: boolean; updatedAt?: string }) {
  const first = name.includes('@') ? name : name.split(' ')[0];
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-[28px]">
          {greeting()}, {first}
        </h1>
        <p className="text-sm text-muted-foreground">
          Here’s your SPACZ platform overview.
          {updatedAt && (
            <>
              {' '}
              Updated <RelativeTime value={updatedAt} />.
            </>
          )}
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={onRefresh} loading={refreshing} aria-label="Refresh dashboard">
          {!refreshing && <RefreshCw />} Refresh
        </Button>
        <Button asChild>
          <Link to="/approvals">
            Review queue <ArrowRight />
          </Link>
        </Button>
      </div>
    </div>
  );
}
