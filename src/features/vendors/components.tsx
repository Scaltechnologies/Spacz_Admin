import { Link } from 'react-router';
import { Check, CircleAlert, X } from 'lucide-react';
import type { Account, AdminVendor, VendorProfile, VendorStatus } from '@/lib/api/types';
import { InfoGrid, RelativeTime } from '@/components/shared/layout-bits';
import { StatusBadge, RoleBadge } from '@/components/shared/StatusBadge';
import { Callout } from '@/components/shared/states';
import { formatDateTime, formatPhone, humanize } from '@/lib/format';
import { cn } from '@/lib/utils';

export function vendorName(p: Pick<VendorProfile, 'businessName' | 'contactName' | 'vendorId'>) {
  return p.businessName || p.contactName || `Vendor #${p.vendorId}`;
}

const CHECKS: { key: keyof VendorProfile | 'address'; label: string }[] = [
  { key: 'businessName', label: 'Business name' },
  { key: 'contactName', label: 'Contact person' },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email' },
  { key: 'address', label: 'Address, city, state & pincode' },
  { key: 'gstNumber', label: 'GST number' },
  { key: 'description', label: 'Business description' },
  { key: 'logoUrl', label: 'Logo' },
];

/** Completeness checklist to speed up review (informational; the backend decides submission rules). */
export function VendorChecklist({ profile }: { profile: VendorProfile }) {
  const has = (k: (typeof CHECKS)[number]['key']) =>
    k === 'address' ? !!(profile.addressLine && profile.city && profile.state && profile.pincode) : !!profile[k as keyof VendorProfile];
  const done = CHECKS.filter((c) => has(c.key)).length;
  const missing = profile.missingForSubmission ?? [];
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Profile completeness</span>
        <span className="font-medium text-foreground tabular">
          {done}/{CHECKS.length}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-success transition-[width]" style={{ width: `${(done / CHECKS.length) * 100}%` }} />
      </div>
      <ul className="grid gap-1.5 sm:grid-cols-2">
        {CHECKS.map((c) => {
          const ok = has(c.key);
          return (
            <li key={c.key} className="flex items-center gap-2 text-[13px]">
              <span
                className={cn(
                  'flex size-4.5 shrink-0 items-center justify-center rounded-full',
                  ok ? 'bg-success/15 text-success' : 'bg-destructive/10 text-destructive',
                )}
              >
                {ok ? <Check className="size-3" strokeWidth={3} /> : <X className="size-3" strokeWidth={3} />}
              </span>
              <span className={cn(!ok && 'text-muted-foreground')}>{c.label}</span>
            </li>
          );
        })}
      </ul>
      {missing.length > 0 && (
        <Callout tone="warning" icon={<CircleAlert className="text-amber-600" />} title="Missing for submission (reported by the backend)">
          {missing.map(humanize).join(', ')}
        </Callout>
      )}
    </div>
  );
}

export function VendorProfileGrid({ profile }: { profile: VendorProfile }) {
  return (
    <InfoGrid
      items={[
        { label: 'Business name', value: profile.businessName },
        { label: 'Contact person', value: profile.contactName },
        { label: 'Email', value: profile.email && <a className="hover:underline" href={`mailto:${profile.email}`}>{profile.email}</a>, copy: profile.email },
        { label: 'Phone', value: profile.phone && formatPhone(profile.phone), copy: profile.phone },
        {
          label: 'Address',
          value: [profile.addressLine, profile.city, profile.state, profile.pincode].filter(Boolean).join(', '),
          span: 2,
        },
        { label: 'GST number', value: profile.gstNumber, copy: profile.gstNumber, mono: true },
        { label: 'Vendor ID', value: `#${profile.vendorId}`, copy: profile.vendorId, mono: true },
        { label: 'Description', value: profile.description && <span className="whitespace-pre-line">{profile.description}</span>, span: 2 },
      ]}
    />
  );
}

export function VendorDates({ profile }: { profile: VendorProfile }) {
  return (
    <InfoGrid
      columns={3}
      items={[
        { label: 'Registered', value: formatDateTime(profile.createdAt) },
        { label: 'Submitted', value: profile.submittedAt ? formatDateTime(profile.submittedAt) : 'Not submitted' },
        { label: 'Approved', value: profile.approvedAt ? formatDateTime(profile.approvedAt) : '—' },
      ]}
    />
  );
}

export function AccountCard({ account, unavailable }: { account?: Account; unavailable?: boolean }) {
  if (!account) {
    return (
      <p className="text-sm text-muted-foreground">
        {unavailable ? 'Login account details could not be loaded (auth-service unavailable).' : 'No login account found.'}
      </p>
    );
  }
  return (
    <InfoGrid
      items={[
        {
          label: 'Account',
          value: (
            <Link to={`/users/${account.id}`} className="font-mono text-[13px] hover:text-primary hover:underline">
              #{account.id}
            </Link>
          ),
        },
        { label: 'Role', value: <RoleBadge role={account.role} /> },
        { label: 'Login email', value: account.email, copy: account.email },
        { label: 'Login phone', value: account.phone && formatPhone(account.phone), copy: account.phone },
        { label: 'Account status', value: <StatusBadge status={account.status} /> },
        { label: 'Sign-in method', value: account.passwordSet ? 'Password (and OTP)' : 'OTP only' },
        { label: 'Last login', value: <RelativeTime value={account.lastLoginAt} /> },
        { label: 'Created', value: formatDateTime(account.createdAt) },
      ]}
    />
  );
}

const STEPS: { key: string; label: string }[] = [
  { key: 'registered', label: 'Registered' },
  { key: 'complete', label: 'Profile complete' },
  { key: 'submitted', label: 'Submitted' },
  { key: 'approved', label: 'Approved' },
];

/** Lifecycle stepper: where this vendor is on the way to approval. */
export function VendorStepper({ vendor }: { vendor: AdminVendor }) {
  const p = vendor.profile;
  const status: VendorStatus = p.status;
  const complete = (p.missingForSubmission ?? []).length === 0;
  const reached = [
    true,
    complete,
    !!p.submittedAt || ['PENDING', 'APPROVED', 'ACTIVE', 'INACTIVE', 'REJECTED', 'SUSPENDED'].includes(status),
    ['APPROVED', 'ACTIVE', 'INACTIVE', 'SUSPENDED'].includes(status) || !!p.approvedAt,
  ];
  const blocked = status === 'REJECTED' || status === 'SUSPENDED';
  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-2" aria-label="Vendor lifecycle">
      {STEPS.map((s, i) => (
        <li key={s.key} className="flex items-center gap-2">
          <span
            className={cn(
              'flex size-6 items-center justify-center rounded-full text-[11px] font-semibold',
              reached[i] ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
            )}
          >
            {reached[i] ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
          </span>
          <span className={cn('text-[13px]', reached[i] ? 'font-medium' : 'text-muted-foreground')}>{s.label}</span>
          {i < STEPS.length - 1 && <span className={cn('h-px w-6 sm:w-10', reached[i + 1] ? 'bg-primary' : 'bg-border')} aria-hidden />}
        </li>
      ))}
      {blocked && (
        <li>
          <StatusBadge status={status} />
        </li>
      )}
    </ol>
  );
}
