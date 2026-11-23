import { useEffect, useMemo, useRef } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router';
import { ArrowLeft, Building2, CheckCircle2, ExternalLink, Info, Library, ShieldAlert, XCircle } from 'lucide-react';
import { useVendor, useVendors } from '@/features/vendors/api';
import { useHall, useHalls } from '@/features/studyhalls/api';
import { useHallModeration, useVendorModeration } from './moderation';
import { AccountCard, VendorChecklist, VendorProfileGrid, vendorName } from '@/features/vendors/components';
import {
  AmenityChips,
  BlockSummaryCards,
  ContactBlock,
  PricingCards,
  ProgramChips,
  QualityHints,
  SeatingSection,
  hallAddress,
} from '@/features/studyhalls/components';
import { EntityAuditTimeline } from '@/features/audit/components';
import { useDashboard } from '@/features/dashboard/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, Skeleton } from '@/components/ui/primitives';
import { Segmented, SearchInput } from '@/components/data-table/toolbar';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Callout, EmptyState, ErrorState } from '@/components/shared/states';
import { RelativeTime, SectionTitle } from '@/components/shared/layout-bits';
import { CoverImage, HoursTable, ImageGallery } from '@/components/shared/hall-bits';
import { PageHeader } from '@/components/shared/layout-bits';
import { useHotkeys, useMediaQuery, useUrlSearch, useUrlState } from '@/hooks';
import { hallActions, vendorActions } from '@/lib/status';
import { formatDateTime, formatNumber, formatMoney } from '@/lib/format';
import { cn } from '@/lib/utils';

type Tab = 'vendors' | 'halls';
const SLA_MS = 48 * 3600 * 1000;

function overdue(ts: string | null | undefined) {
  return !!ts && Date.now() - new Date(ts).getTime() > SLA_MS;
}

// ---------------------------------------------------------------------------
// Queue list (left)
// ---------------------------------------------------------------------------
interface QueueItem {
  id: number;
  title: string;
  subtitle: string;
  submittedAt: string | null;
  avatar: React.ReactNode;
}

function QueueList({
  items,
  selected,
  onSelect,
  loading,
  error,
  onRetry,
  page,
  totalPages,
  onPage,
  emptyTitle,
}: {
  items: QueueItem[];
  selected: number | null;
  onSelect: (id: number) => void;
  loading: boolean;
  error: unknown;
  onRetry: () => void;
  page: number;
  totalPages: number;
  onPage: (p: number) => void;
  emptyTitle: string;
}) {
  if (loading) {
    return (
      <div className="space-y-1 p-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex gap-3 p-3">
            <Skeleton className="size-10 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }
  if (error) return <ErrorState compact error={error} onRetry={onRetry} />;
  if (!items.length) {
    return <EmptyState icon={<CheckCircle2 className="size-6" />} title={emptyTitle} description="New submissions will appear here automatically." />;
  }
  return (
    <>
      <ul role="listbox" aria-label="Review queue" className="space-y-1 p-2">
        {items.map((it) => {
          const active = it.id === selected;
          const late = overdue(it.submittedAt);
          return (
            <li key={it.id} role="option" aria-selected={active}>
              <button
                type="button"
                onClick={() => onSelect(it.id)}
                className={cn(
                  'flex w-full cursor-pointer items-center gap-3 rounded-xl p-3 text-left transition-colors focus-visible:ring-[3px] focus-visible:ring-primary/30 focus-visible:outline-none',
                  active ? 'bg-primary-soft ring-1 ring-primary/30' : 'hover:bg-muted',
                )}
              >
                {it.avatar}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{it.title}</span>
                    {late && (
                      <span className="size-2 shrink-0 rounded-full bg-destructive" title="Waiting more than 48 hours" aria-label="Overdue" />
                    )}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">{it.subtitle}</div>
                  {it.submittedAt && (
                    <div className="mt-0.5 text-[11px] text-muted-foreground">
                      Submitted <RelativeTime value={it.submittedAt} />
                    </div>
                  )}
                </div>
              </button>
            </li>
          );
        })}
      </ul>
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t px-3 py-2 text-xs text-muted-foreground">
          <Button variant="ghost" size="xs" disabled={page <= 0} onClick={() => onPage(page - 1)}>
            Previous
          </Button>
          <span className="tabular">
            Page {page + 1} / {totalPages}
          </span>
          <Button variant="ghost" size="xs" disabled={page >= totalPages - 1} onClick={() => onPage(page + 1)}>
            Next
          </Button>
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Review panels (right)
// ---------------------------------------------------------------------------
function ActionBar({ children, note }: { children: React.ReactNode; note?: React.ReactNode }) {
  return (
    <div className="sticky bottom-0 z-10 -mx-5 mt-6 flex flex-col gap-2 border-t bg-card/95 px-5 py-3 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
      <div className="text-xs text-muted-foreground">{note}</div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function VendorReview({ vendorId, onAct }: { vendorId: number; onAct: (a: 'approve' | 'reject') => void }) {
  const { data, isLoading, error, refetch } = useVendor(vendorId);
  if (isLoading) return <PanelSkeleton />;
  if (error || !data) return <ErrorState error={error} onRetry={() => void refetch()} />;
  const { vendor, account } = data;
  const p = vendor.profile;
  const actions = vendorActions[p.status] ?? [];
  const name = vendorName(p);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start gap-4">
        <Avatar name={name} src={p.logoUrl} square className="size-14 text-lg" />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold tracking-tight">{name}</h2>
            <StatusBadge status={p.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {p.contactName && <>{p.contactName} · </>}
            {[p.city, p.state].filter(Boolean).join(', ') || 'Location not set'} · submitted {formatDateTime(p.submittedAt)}
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link to={`/vendors/${p.vendorId}`}>
            Full profile <ExternalLink />
          </Link>
        </Button>
      </div>

      {p.statusReason && (
        <Callout tone="info" icon={<Info className="text-info" />} title="Last status note">
          {p.statusReason}
        </Callout>
      )}
      {p.status !== 'PENDING' && (
        <Callout tone="warning" icon={<ShieldAlert className="text-amber-600" />} title="No longer pending">
          This vendor is now {p.status.toLowerCase()}. The queue has been refreshed.
        </Callout>
      )}

      <section>
        <SectionTitle>Submission checklist</SectionTitle>
        <VendorChecklist profile={p} />
      </section>
      <section>
        <SectionTitle>Business details</SectionTitle>
        <VendorProfileGrid profile={p} />
      </section>
      <section>
        <SectionTitle>Login account</SectionTitle>
        <AccountCard account={account} unavailable={!account} />
      </section>
      <section>
        <SectionTitle
          action={
            <Button variant="link" size="sm" asChild>
              <Link to={`/studyhalls?vendorId=${p.vendorId}`}>View halls</Link>
            </Button>
          }
        >
          Study halls
        </SectionTitle>
        <p className="text-sm">
          <span className="font-semibold tabular">{formatNumber(vendor.activeStudyHallCount)}</span> live of{' '}
          <span className="font-semibold tabular">{formatNumber(vendor.studyHallCount)}</span> total
        </p>
      </section>
      <section>
        <SectionTitle>History</SectionTitle>
        <EntityAuditTimeline entityType="VENDOR" entityId={p.vendorId} pageSize={6} />
      </section>

      {actions.length > 0 && (
        <ActionBar note={<>Shortcuts: <kbd className="font-mono">A</kbd> approve · <kbd className="font-mono">R</kbd> reject</>}>
          {actions.includes('reject') && (
            <Button variant="destructive-outline" onClick={() => onAct('reject')}>
              <XCircle /> Reject
            </Button>
          )}
          {actions.includes('approve') && (
            <Button variant="success" onClick={() => onAct('approve')}>
              <CheckCircle2 /> Approve vendor
            </Button>
          )}
        </ActionBar>
      )}
    </div>
  );
}

function HallReview({ id, onAct }: { id: number; onAct: (a: 'approve' | 'reject' | 'suspend', vendorApproved: boolean | null) => void }) {
  const { data: h, isLoading, error, refetch } = useHall(id);
  const vendor = useVendor(h?.vendorId);
  if (isLoading) return <PanelSkeleton />;
  if (error || !h) return <ErrorState error={error} onRetry={() => void refetch()} />;
  const actions = hallActions[h.status] ?? [];
  const vStatus = vendor.data?.vendor.profile.status;
  const vendorApproved = vStatus ? ['APPROVED', 'ACTIVE'].includes(vStatus) : null;
  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl border">
        <CoverImage src={h.images?.find((i) => i.cover)?.url ?? h.images?.[0]?.url} alt={h.name} className="h-44 w-full sm:h-56" />
      </div>
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold tracking-tight">{h.name}</h2>
            <StatusBadge status={h.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {hallAddress(h) || 'Address not set'} · submitted {formatDateTime(h.submittedAt)}
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link to={`/studyhalls/${h.id}`}>
            Full details <ExternalLink />
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-muted/30 p-3 text-sm">
        <Building2 className="size-4 text-muted-foreground" aria-hidden />
        <Link to={`/vendors/${h.vendorId}`} className="font-medium hover:text-primary hover:underline">
          {h.vendorBusinessName ?? `Vendor #${h.vendorId}`}
        </Link>
        {vStatus ? <StatusBadge status={vStatus} /> : vendor.isLoading ? <Skeleton className="h-5 w-16 rounded-full" /> : null}
      </div>
      {vendorApproved === false && actions.includes('approve') && (
        <Callout tone="info" icon={<Info className="text-info" />} title="Vendor not approved yet">
          Approving now sets this hall to <strong>Approved</strong>. It goes live automatically once the vendor is approved.
        </Callout>
      )}
      {h.status !== 'PENDING_APPROVAL' && (
        <Callout tone="warning" icon={<ShieldAlert className="text-amber-600" />} title="No longer pending">
          This hall is now {h.status.toLowerCase().replace('_', ' ')}.
        </Callout>
      )}

      <QualityHints hall={h} />

      <section>
        <SectionTitle>Photos</SectionTitle>
        <ImageGallery images={h.images} name={h.name} />
      </section>
      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <SectionTitle>Pricing</SectionTitle>
          <PricingCards hall={h} />
        </section>
        <section>
          <SectionTitle>Contact</SectionTitle>
          <ContactBlock hall={h} />
        </section>
      </div>
      {h.description && (
        <section>
          <SectionTitle>Description</SectionTitle>
          <p className="text-sm whitespace-pre-line text-muted-foreground">{h.description}</p>
        </section>
      )}
      <section>
        <SectionTitle>Amenities</SectionTitle>
        <AmenityChips hall={h} />
      </section>
      <section>
        <SectionTitle>Exams</SectionTitle>
        <ProgramChips hall={h} />
      </section>
      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <SectionTitle>Operating hours</SectionTitle>
          <HoursTable hours={h.operatingHours} />
        </section>
        {h.rules && (
          <section>
            <SectionTitle>Rules</SectionTitle>
            <p className="text-sm whitespace-pre-line text-muted-foreground">{h.rules}</p>
          </section>
        )}
      </div>
      <section>
        <SectionTitle>
          Seating · {formatNumber(h.totalSeats)} seats from {formatMoney(h.pricePerDay)}/day
        </SectionTitle>
        <BlockSummaryCards hall={h} />
        <div className="mt-5">
          <SeatingSection hall={h} compact />
        </div>
      </section>
      <section>
        <SectionTitle>History</SectionTitle>
        <EntityAuditTimeline entityType="STUDY_HALL" entityId={h.id} pageSize={6} />
      </section>

      {actions.length > 0 && (
        <ActionBar note={<>Shortcuts: <kbd className="font-mono">A</kbd> approve · <kbd className="font-mono">R</kbd> reject</>}>
          {actions.includes('suspend') && (
            <Button variant="ghost" onClick={() => onAct('suspend', vendorApproved)}>
              Suspend
            </Button>
          )}
          {actions.includes('reject') && (
            <Button variant="destructive-outline" onClick={() => onAct('reject', vendorApproved)}>
              <XCircle /> Reject
            </Button>
          )}
          {actions.includes('approve') && (
            <Button variant="success" onClick={() => onAct('approve', vendorApproved)}>
              <CheckCircle2 /> Approve hall
            </Button>
          )}
        </ActionBar>
      )}
    </div>
  );
}

function PanelSkeleton() {
  return (
    <div className="space-y-5" aria-busy>
      <div className="flex gap-4">
        <Skeleton className="size-14 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
      <Skeleton className="h-32 rounded-xl" />
      <Skeleton className="h-48 rounded-xl" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function ApprovalsPage() {
  const url = useUrlState();
  const tab = url.getEnum<Tab>('tab', ['vendors', 'halls'], 'vendors')!;
  const page = url.getInt('page', 0, { min: 0 });
  const selectedParam = url.getInt('selected', 0, { min: 1 }) || null;
  const search = useUrlSearch();
  const wide = useMediaQuery('(min-width: 1024px)');
  const { data: dash } = useDashboard();

  const vendorsQ = useVendors(
    { status: 'PENDING', search: search.applied || undefined, page, size: 20, sort: 'createdAt,asc' },
    { enabled: tab === 'vendors' },
  );
  const hallsQ = useHalls(
    { status: 'PENDING_APPROVAL', search: search.applied || undefined, page, size: 20, sort: 'submittedAt,asc' },
    { enabled: tab === 'halls' },
  );
  const active = tab === 'vendors' ? vendorsQ : hallsQ;

  const items: QueueItem[] = useMemo(() => {
    if (tab === 'vendors') {
      return (vendorsQ.data?.content ?? []).map((v) => {
        const name = vendorName(v.profile);
        return {
          id: v.profile.vendorId,
          title: name,
          subtitle: [v.profile.contactName, v.profile.city].filter(Boolean).join(' · ') || 'No contact details',
          submittedAt: v.profile.submittedAt ?? v.profile.createdAt,
          avatar: <Avatar name={name} src={v.profile.logoUrl} square className="size-10" />,
        };
      });
    }
    return (hallsQ.data?.content ?? []).map((h) => ({
      id: h.id,
      title: h.name,
      subtitle: [h.city, h.vendorBusinessName].filter(Boolean).join(' · '),
      submittedAt: null as string | null,
      avatar: <CoverImage src={h.coverImageUrl} alt="" className="size-10 shrink-0 rounded-xl" />,
    }));
  }, [tab, vendorsQ.data, hallsQ.data]);

  // Hall summaries don't carry submittedAt; fall back to list order (oldest first).
  const selected = selectedParam ?? (wide ? (items[0]?.id ?? null) : null);
  const select = (id: number | null) => url.set({ selected: id ?? undefined }, { replace: !!selectedParam });

  // Keep the last-acted position so the next item gets selected after a moderation.
  const lastIndex = useRef(0);
  useEffect(() => {
    const i = items.findIndex((x) => x.id === selected);
    if (i >= 0) lastIndex.current = i;
  }, [items, selected]);

  const advance = (actedId: number) => {
    const remaining = items.filter((x) => x.id !== actedId);
    const next = remaining[Math.min(lastIndex.current, remaining.length - 1)];
    url.set({ selected: next?.id ?? undefined }, { replace: true });
  };

  const vendorMod = useVendorModeration((_, id) => advance(id));
  const hallMod = useHallModeration((_, id) => advance(id));

  const actOnSelected = (action: 'approve' | 'reject') => {
    if (!selected) return;
    const item = items.find((i) => i.id === selected);
    if (!item) return;
    if (tab === 'vendors') vendorMod.start({ vendorId: selected, name: item.title, status: 'PENDING' }, action);
    else hallMod.start({ id: selected, name: item.title, status: 'PENDING_APPROVAL' }, action);
  };

  useHotkeys({
    j: () => {
      const i = items.findIndex((x) => x.id === selected);
      const n = items[Math.min(items.length - 1, i + 1)];
      if (n) select(n.id);
    },
    k: () => {
      const i = items.findIndex((x) => x.id === selected);
      const n = items[Math.max(0, i - 1)];
      if (n) select(n.id);
    },
    a: () => actOnSelected('approve'),
    r: () => actOnSelected('reject'),
  });

  const vendorCount = dash?.vendors?.pendingVendors ?? (tab === 'vendors' ? vendorsQ.data?.totalElements : undefined);
  const hallCount = dash?.studyHalls?.pendingApproval ?? (tab === 'halls' ? hallsQ.data?.totalElements : undefined);
  const showDetailOnly = !wide && selected !== null;

  return (
    <div>
      <PageHeader
        title="Approvals"
        description="Review vendor applications and study hall listings. Oldest submissions are shown first."
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Segmented
          label="Queue"
          value={tab}
          onChange={(t) => url.set({ tab: t, selected: undefined, page: undefined, search: undefined })}
          options={[
            { value: 'vendors', label: <><Building2 className="size-4" /> Vendors</>, count: vendorCount ?? null },
            { value: 'halls', label: <><Library className="size-4" /> Study halls</>, count: hallCount ?? null },
          ]}
        />
        {!showDetailOnly && (
          <SearchInput
            value={search.value}
            onChange={search.setValue}
            placeholder={tab === 'vendors' ? 'Search name, email, phone…' : 'Search hall name…'}
          />
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[380px_minmax(0,1fr)]">
        {!showDetailOnly && (
          <Card className="h-fit overflow-hidden lg:sticky lg:top-20 lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto">
            <QueueList
              items={items}
              selected={selected}
              onSelect={(id) => select(id)}
              loading={active.isLoading}
              error={active.error}
              onRetry={() => void active.refetch()}
              page={page}
              totalPages={active.data?.totalPages ?? 1}
              onPage={(p) => url.set({ page: p, selected: undefined })}
              emptyTitle={search.applied ? 'No matches' : tab === 'vendors' ? 'No vendors waiting' : 'No study halls waiting'}
            />
          </Card>
        )}

        {(wide || showDetailOnly) && (
          <Card className="min-w-0 px-5 pt-5">
            {showDetailOnly && (
              <Button variant="ghost" size="sm" className="-ml-2 mb-3" onClick={() => select(null)}>
                <ArrowLeft /> Back to queue
              </Button>
            )}
            {selected ? (
              <motion.div
                key={`${tab}-${selected}`}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              >
                {tab === 'vendors' ? (
                  <VendorReview
                    vendorId={selected}
                    onAct={(a) => {
                      const item = items.find((i) => i.id === selected);
                      vendorMod.start({ vendorId: selected, name: item?.title ?? `Vendor #${selected}`, status: 'PENDING' }, a);
                    }}
                  />
                ) : (
                  <HallReview
                    id={selected}
                    onAct={(a, vendorApproved) => {
                      const item = items.find((i) => i.id === selected);
                      hallMod.start({ id: selected, name: item?.title ?? `Study hall #${selected}`, vendorApproved, status: 'PENDING_APPROVAL' }, a);
                    }}
                  />
                )}
              </motion.div>
            ) : (
              <EmptyState
                className="pb-10"
                icon={<CheckCircle2 className="size-6" />}
                title={items.length ? 'Select an item to review' : 'Nothing to review'}
                description={items.length ? 'Pick a submission from the queue.' : 'You’re all caught up.'}
              />
            )}
          </Card>
        )}
      </div>
      {vendorMod.dialog}
      {hallMod.dialog}
    </div>
  );
}
