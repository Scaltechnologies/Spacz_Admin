import { useState, type ReactNode } from 'react';
import { ModerationDialog } from '@/components/shared/ModerationDialog';
import { useModerateVendor } from '@/features/vendors/api';
import { useModerateHall } from '@/features/studyhalls/api';
import { useModerateUser } from '@/features/users/api';
import type { ModerationAction } from '@/lib/status';
import type { StudyHallStatus, VendorStatus } from '@/lib/api/types';
import { pluralize } from '@/lib/format';

// ---------------------------------------------------------------------------
// Consequence copy — what each action does, per the backend state machines.
// ---------------------------------------------------------------------------
export function vendorConsequence(action: ModerationAction, v: { name: string; activeHalls?: number; status?: VendorStatus }): ReactNode {
  switch (action) {
    case 'approve':
      return (
        <>
          {v.name} becomes an approved SPACZ partner. Any of their study halls already approved will go live for students
          automatically.
        </>
      );
    case 'reject':
      return <>The vendor will see your reason and can update their profile and resubmit for review.</>;
    case 'suspend':
      return (
        <>
          {v.activeHalls ? (
            <>
              Its <strong className="text-foreground">{pluralize(v.activeHalls, 'live study hall')}</strong> will be hidden from students and
              no new bookings can be made.
            </>
          ) : (
            <>All of its study halls will be hidden from students and no new bookings can be made.</>
          )}{' '}
          Existing bookings are not cancelled.
        </>
      );
    case 'activate':
      return <>Restores {v.name} as an active partner. Their approved halls become visible to students again.</>;
  }
}

export function hallConsequence(action: ModerationAction, h: { name: string; vendorApproved?: boolean | null; status?: StudyHallStatus }): ReactNode {
  switch (action) {
    case 'approve':
      return h.vendorApproved === false ? (
        <>
          The hall moves to <strong className="text-foreground">Approved</strong>. Because its vendor is not approved yet, it goes live
          automatically once the vendor is approved.
        </>
      ) : (
        <>The hall goes live: students can find it and book seats immediately.</>
      );
    case 'reject':
      return <>The vendor will see your reason and can fix the listing and resubmit it.</>;
    case 'suspend':
      return <>The hall is hidden from students and no new bookings can be made. Existing bookings are not cancelled.</>;
    case 'activate':
      return <>The hall is restored. It goes live if its vendor is approved, otherwise it waits in Approved.</>;
  }
}

export function accountConsequence(action: 'suspend' | 'activate', role: string): ReactNode {
  if (action === 'suspend') {
    return (
      <>
        The account can no longer sign in or refresh its session. Access tokens already issued expire within 15 minutes.
        {role === 'VENDOR' && ' This does not change the vendor profile status; suspend the vendor separately to hide their halls.'}
      </>
    );
  }
  return <>The account can sign in again.</>;
}

// ---------------------------------------------------------------------------
// Hooks bundling mutation + dialog
// ---------------------------------------------------------------------------
interface Pending<T> {
  target: T;
  action: ModerationAction;
}

export function useVendorModeration(onDone?: (action: ModerationAction, vendorId: number) => void) {
  const mutation = useModerateVendor();
  const [pending, setPending] = useState<Pending<{ vendorId: number; name: string; activeHalls?: number; status?: VendorStatus }> | null>(null);
  const dialog = (
    <ModerationDialog
      request={
        pending
          ? { action: pending.action, entityLabel: pending.target.name, consequence: vendorConsequence(pending.action, pending.target) }
          : null
      }
      pending={mutation.isPending}
      onOpenChange={(o) => !o && setPending(null)}
      onConfirm={(reason) => {
        if (!pending) return;
        const { target, action } = pending;
        mutation.mutate(
          { vendorId: target.vendorId, action, reason, label: target.name },
          {
            onSuccess: () => {
              setPending(null);
              onDone?.(action, target.vendorId);
            },
            onError: () => setPending(null),
          },
        );
      }}
    />
  );
  return {
    start: (target: { vendorId: number; name: string; activeHalls?: number; status?: VendorStatus }, action: ModerationAction) =>
      setPending({ target, action }),
    dialog,
    mutation,
  };
}

export function useHallModeration(onDone?: (action: ModerationAction, id: number) => void) {
  const mutation = useModerateHall();
  const [pending, setPending] = useState<Pending<{ id: number; name: string; vendorApproved?: boolean | null; status?: StudyHallStatus }> | null>(null);
  const dialog = (
    <ModerationDialog
      request={
        pending ? { action: pending.action, entityLabel: pending.target.name, consequence: hallConsequence(pending.action, pending.target) } : null
      }
      pending={mutation.isPending}
      onOpenChange={(o) => !o && setPending(null)}
      onConfirm={(reason) => {
        if (!pending) return;
        const { target, action } = pending;
        mutation.mutate(
          { id: target.id, action, reason, label: target.name },
          {
            onSuccess: () => {
              setPending(null);
              onDone?.(action, target.id);
            },
            onError: () => setPending(null),
          },
        );
      }}
    />
  );
  return {
    start: (target: { id: number; name: string; vendorApproved?: boolean | null; status?: StudyHallStatus }, action: ModerationAction) =>
      setPending({ target, action }),
    dialog,
    mutation,
  };
}

export function useAccountModeration() {
  const mutation = useModerateUser();
  const [pending, setPending] = useState<{ id: number; name: string; role: string; action: 'suspend' | 'activate' } | null>(null);
  const dialog = (
    <ModerationDialog
      request={
        pending ? { action: pending.action, entityLabel: pending.name, consequence: accountConsequence(pending.action, pending.role) } : null
      }
      pending={mutation.isPending}
      onOpenChange={(o) => !o && setPending(null)}
      onConfirm={(reason) => {
        if (!pending) return;
        mutation.mutate(
          { id: pending.id, action: pending.action, reason, label: pending.name },
          { onSettled: () => setPending(null) },
        );
      }}
    />
  );
  return {
    start: (target: { id: number; name: string; role: string }, action: 'suspend' | 'activate') => setPending({ ...target, action }),
    dialog,
    mutation,
  };
}
