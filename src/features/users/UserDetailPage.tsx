import { Link, useParams } from 'react-router';
import { Activity as ActivityIcon, ArrowLeft, Ban, Building2, CalendarClock, GraduationCap, History, Library, RotateCcw, Ticket } from 'lucide-react';
import { useUser, useUserActivity } from './api';
import { useAccountModeration } from '@/features/approvals/moderation';
import { BookingsTable } from '@/features/bookings/BookingsTable';
import { EntityAuditTimeline } from '@/features/audit/components';
import { AccountCard, VendorProfileGrid, vendorName } from '@/features/vendors/components';
import { useBreadcrumbLabel } from '@/layouts/breadcrumbs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, Skeleton } from '@/components/ui/primitives';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/menus';
import { EmptyState, ErrorState, PartialDataBanner, Callout } from '@/components/shared/states';
import { InfoGrid, RelativeTime, Timeline, type TimelineEntry } from '@/components/shared/layout-bits';
import { RoleBadge, StatusBadge } from '@/components/shared/StatusBadge';
import { CopyButton } from '@/components/shared/CopyButton';
import { useUrlState } from '@/hooks';
import { useSession } from '@/lib/auth/session';
import { accountActions } from '@/lib/status';
import { formatDate, formatDateTime, formatNumber, formatPhone, humanize } from '@/lib/format';
import { displayName } from '@/lib/utils';
import type { ActivityType, AdminUserDetail, Enrollment, UserProgram } from '@/lib/api/types';

const ACTIVITY_TONE: Partial<Record<ActivityType, TimelineEntry['tone']>> = {
  BOOKING_CONFIRMED: 'success',
  BOOKING_COMPLETED: 'info',
  BOOKING_CANCELLED: 'danger',
  BOOKING_EXPIRED: 'neutral',
  BOOKING_CREATED: 'warning',
  PROGRAM_ADDED: 'primary',
  PROGRAM_REMOVED: 'danger',
  PROFILE_CREATED: 'violet',
};

function ExamsTab({ programs }: { programs?: UserProgram[] }) {
  if (!programs) return <p className="text-sm text-muted-foreground">Exam choices were not returned for this account.</p>;
  if (!programs.length) return <EmptyState icon={<GraduationCap className="size-6" />} title="No exams chosen" description="This student hasn’t added any exams yet." />;
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {programs.map((p) => {
        let progress: number | null = null;
        if (p.startDate && p.targetDate) {
          const s = new Date(p.startDate).getTime();
          const t = new Date(p.targetDate).getTime();
          if (t > s) progress = Math.max(0, Math.min(100, ((Date.now() - s) / (t - s)) * 100));
        }
        return (
          <Card key={p.id} className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-medium">{p.programName}</div>
                <div className="font-mono text-xs text-muted-foreground">{p.programCode}</div>
              </div>
              <StatusBadge status={p.status} />
            </div>
            <div className="mt-3 flex justify-between text-xs text-muted-foreground tabular">
              <span>Start {formatDate(p.startDate)}</span>
              <span>Target {formatDate(p.targetDate)}</span>
            </div>
            {progress !== null && (
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100} aria-label="Time elapsed toward target date">
                <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
              </div>
            )}
            {p.notes && <p className="mt-3 text-[13px] text-muted-foreground">{p.notes}</p>}
          </Card>
        );
      })}
    </div>
  );
}

function MembershipsTab({ enrollments }: { enrollments?: Enrollment[] }) {
  if (!enrollments) return <p className="text-sm text-muted-foreground">Hall memberships were not returned for this account.</p>;
  if (!enrollments.length) return <EmptyState icon={<Library className="size-6" />} title="No hall memberships" description="Memberships appear when a booking is confirmed or a hall adds the student as a walk-in." />;
  return (
    <div className="scrollbar-thin overflow-x-auto rounded-xl border">
      <table className="w-full text-[13px]">
        <caption className="sr-only">Hall memberships</caption>
        <thead className="bg-muted/40 text-xs text-muted-foreground">
          <tr>
            {['Hall', 'Seat', 'Exam', 'Plan', 'Period', 'Status', 'Source'].map((h) => (
              <th key={h} scope="col" className="px-4 py-2.5 text-left font-medium whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {enrollments.map((e) => (
            <tr key={e.id} className="border-t">
              <td className="px-4 py-2.5">
                <Link to={`/studyhalls/${e.studyHallId}`} className="font-medium hover:text-primary hover:underline">
                  {e.studyHallName}
                </Link>
              </td>
              <td className="px-4 py-2.5 font-mono">{e.seatNumber ?? '—'}</td>
              <td className="px-4 py-2.5">{e.program?.name ?? '—'}</td>
              <td className="px-4 py-2.5">{e.plan ? humanize(e.plan) : '—'}</td>
              <td className="px-4 py-2.5 whitespace-nowrap tabular">
                {formatDate(e.startDate)} → {e.endDate ? formatDate(e.endDate) : 'open'}
              </td>
              <td className="px-4 py-2.5">
                <StatusBadge status={e.status} />
              </td>
              <td className="px-4 py-2.5">
                <Badge tone={e.source === 'WALK_IN' ? 'violet' : 'primary'}>{e.source === 'WALK_IN' ? 'Walk-in' : 'Booking'}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ActivityTab({ userId }: { userId: number }) {
  const url = useUrlState();
  const size = url.getInt('asize', 20, { min: 20, max: 100 });
  const { data, isLoading, error, refetch, isFetching } = useUserActivity(userId, { page: 0, size });
  if (isLoading) return <Skeleton className="h-48 rounded-xl" />;
  if (error) return <ErrorState compact error={error} onRetry={() => void refetch()} />;
  if (!data?.content.length) return <EmptyState icon={<ActivityIcon className="size-6" />} title="No activity yet" />;
  return (
    <div className="space-y-4">
      <Timeline
        items={data.content.map((a) => ({
          id: a.id,
          tone: ACTIVITY_TONE[a.type] ?? 'neutral',
          title: humanize(a.type),
          description: a.description,
          meta: a.referenceType && a.referenceId ? `${humanize(a.referenceType)} #${a.referenceId}` : undefined,
          time: a.createdAt,
        }))}
      />
      {!data.last && (
        <Button variant="outline" size="sm" loading={isFetching} onClick={() => url.set({ asize: Math.min(100, size + 20) }, { replace: true })}>
          Load more
        </Button>
      )}
    </div>
  );
}

function headerName(d: AdminUserDetail) {
  if (d.profile) return displayName(d.profile);
  if (d.vendor) return vendorName(d.vendor.profile);
  return d.account.email ?? d.account.phone ?? `Account #${d.account.id}`;
}

export default function UserDetailPage() {
  const params = useParams();
  const id = Number(params.id);
  const valid = Number.isInteger(id) && id > 0;
  const me = useSession((s) => s.user);
  const { data, isLoading, error, refetch, isFetching } = useUser(valid ? id : null);
  const url = useUrlState();
  const moderation = useAccountModeration();
  const name = data ? headerName(data) : null;
  useBreadcrumbLabel(name);

  if (!valid) return <ErrorState error={new Error('Invalid account ID in the address.')} />;
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-10 w-96" />
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
            <Link to="/users">
              <ArrowLeft /> Back to users
            </Link>
          </Button>
        </div>
      </Card>
    );
  }

  const { account, profile, vendor } = data;
  const isVendor = account.role === 'VENDOR';
  const isStudent = account.role === 'USER';
  const acts = accountActions(account.role, account.status, account.id === me?.id);
  const tabs = isStudent ? ['overview', 'exams', 'memberships', 'bookings', 'activity', 'audit'] : isVendor ? ['overview', 'vendor', 'audit'] : ['overview', 'audit'];
  const tab = url.getEnum('tab', tabs, 'overview')!;

  return (
    <div className="space-y-6">
      {data.warnings && data.warnings.length > 0 && (
        <PartialDataBanner title="Parts of this profile could not be loaded" items={data.warnings} onRetry={() => void refetch()} retrying={isFetching} />
      )}

      <Card className="overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-primary/15 via-primary/5 to-accent/10" aria-hidden />
        <div className="-mt-10 flex flex-col gap-4 px-5 pb-5 sm:flex-row sm:items-end">
          <Avatar name={name} src={profile?.profileImageUrl ?? vendor?.profile.logoUrl} square={isVendor} className="size-20 border-4 border-card text-2xl" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{name}</h1>
              <RoleBadge role={account.role} />
              <StatusBadge status={account.status} />
              {account.id === me?.id && <Badge tone="primary">You</Badge>}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
              <span className="inline-flex items-center gap-1 font-mono">
                #{account.id} <CopyButton value={account.id} label="Copy account ID" />
              </span>
              {account.email && (
                <span className="inline-flex items-center gap-1">
                  {account.email} <CopyButton value={account.email} label="Copy email" />
                </span>
              )}
              {account.phone && (
                <span className="inline-flex items-center gap-1">
                  {formatPhone(account.phone)} <CopyButton value={account.phone} label="Copy phone" />
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <CalendarClock className="size-3.5" aria-hidden /> Joined {formatDate(account.createdAt)}
              </span>
              <span>
                Last login <RelativeTime value={account.lastLoginAt} />
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {isVendor && (
              <Button variant="outline" asChild>
                <Link to={`/vendors/${account.id}`}>
                  <Building2 /> Vendor profile
                </Link>
              </Button>
            )}
            {acts.includes('suspend') && (
              <Button variant="destructive-outline" onClick={() => moderation.start({ id: account.id, name: name ?? '', role: account.role }, 'suspend')}>
                <Ban /> Suspend
              </Button>
            )}
            {acts.includes('activate') && (
              <Button onClick={() => moderation.start({ id: account.id, name: name ?? '', role: account.role }, 'activate')}>
                <RotateCcw /> Activate
              </Button>
            )}
          </div>
        </div>
      </Card>

      {account.role === 'ADMIN' && (
        <Callout tone="info" title="Administrator account">
          Administrator accounts are protected: their status can’t be changed from the console.
        </Callout>
      )}

      <Tabs value={tab} onValueChange={(t) => url.set({ tab: t === 'overview' ? undefined : t }, { replace: true })}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          {isStudent && (
            <>
              <TabsTrigger value="exams">
                <GraduationCap className="size-4" /> Exams {data.programs && <Badge>{data.programs.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="memberships">
                <Library className="size-4" /> Hall memberships {data.enrollments && <Badge>{data.enrollments.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="bookings">
                <Ticket className="size-4" /> Bookings
              </TabsTrigger>
              <TabsTrigger value="activity">
                <ActivityIcon className="size-4" /> Activity
              </TabsTrigger>
            </>
          )}
          {isVendor && (
            <TabsTrigger value="vendor">
              <Building2 className="size-4" /> Vendor
            </TabsTrigger>
          )}
          <TabsTrigger value="audit">
            <History className="size-4" /> Audit history
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Login account</CardTitle>
              </CardHeader>
              <CardContent>
                <AccountCard account={account} />
              </CardContent>
            </Card>
            {isStudent && (
              <Card>
                <CardHeader>
                  <CardTitle>Student profile</CardTitle>
                </CardHeader>
                <CardContent>
                  {profile ? (
                    <InfoGrid
                      items={[
                        { label: 'Name', value: displayName(profile) },
                        { label: 'Profile email', value: profile.email },
                        { label: 'Date of birth', value: formatDate(profile.dateOfBirth) },
                        { label: 'Education level', value: profile.educationLevel },
                        { label: 'City', value: [profile.city, profile.state].filter(Boolean).join(', ') },
                        { label: 'Preferred city', value: profile.preferredCity },
                        { label: 'Profile updated', value: formatDateTime(profile.updatedAt) },
                      ]}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">No student profile was returned.</p>
                  )}
                </CardContent>
              </Card>
            )}
            {isVendor && vendor && (
              <Card>
                <CardHeader>
                  <CardTitle>Vendor summary</CardTitle>
                  <StatusBadge status={vendor.profile.status} />
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="font-medium">{vendorName(vendor.profile)}</div>
                  <p className="text-muted-foreground">
                    {formatNumber(vendor.activeStudyHallCount)} live of {formatNumber(vendor.studyHallCount)} study halls
                  </p>
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/vendors/${account.id}`}>Open vendor profile</Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
        {isStudent && (
          <>
            <TabsContent value="exams" className="mt-6">
              <ExamsTab programs={data.programs} />
            </TabsContent>
            <TabsContent value="memberships" className="mt-6">
              <MembershipsTab enrollments={data.enrollments} />
            </TabsContent>
            <TabsContent value="bookings" className="mt-6">
              <BookingsTable fixed={{ userId: account.id }} hideUser urlPrefix="b" />
            </TabsContent>
            <TabsContent value="activity" className="mt-6">
              <Card className="p-5">
                <ActivityTab userId={account.id} />
              </Card>
            </TabsContent>
          </>
        )}
        {isVendor && (
          <TabsContent value="vendor" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Business profile</CardTitle>
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/vendors/${account.id}`}>Manage vendor</Link>
                </Button>
              </CardHeader>
              <CardContent>{vendor ? <VendorProfileGrid profile={vendor.profile} /> : <p className="text-sm text-muted-foreground">Vendor profile not available.</p>}</CardContent>
            </Card>
          </TabsContent>
        )}
        <TabsContent value="audit" className="mt-6">
          <Card className="p-5">
            <EntityAuditTimeline entityType="USER_ACCOUNT" entityId={account.id} />
          </Card>
        </TabsContent>
      </Tabs>
      {moderation.dialog}
    </div>
  );
}
