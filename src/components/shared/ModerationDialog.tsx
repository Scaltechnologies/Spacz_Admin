import { useEffect, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Ban, CheckCircle2, RotateCcw, XCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/primitives';
import { optionalReasonSchema, reasonSchema } from '@/lib/schemas';
import { reasonRequired, type ModerationAction } from '@/lib/status';
import { cn } from '@/lib/utils';

const ACTION_COPY: Record<
  ModerationAction,
  { verb: string; icon: ReactNode; variant: 'success' | 'destructive' | 'default'; reasonLabel: string; reasonHint: string }
> = {
  approve: {
    verb: 'Approve',
    icon: <CheckCircle2 />,
    variant: 'success',
    reasonLabel: 'Internal note (optional)',
    reasonHint: 'Stored in the audit log.',
  },
  reject: {
    verb: 'Reject',
    icon: <XCircle />,
    variant: 'destructive',
    reasonLabel: 'Reason for rejection',
    reasonHint: 'Shown to the vendor and stored in the audit log.',
  },
  suspend: {
    verb: 'Suspend',
    icon: <Ban />,
    variant: 'destructive',
    reasonLabel: 'Reason for suspension',
    reasonHint: 'Shown to the account owner and stored in the audit log.',
  },
  activate: {
    verb: 'Activate',
    icon: <RotateCcw />,
    variant: 'default',
    reasonLabel: 'Note (optional)',
    reasonHint: 'Stored in the audit log.',
  },
};

const QUICK_REASONS: Partial<Record<ModerationAction, string[]>> = {
  reject: ['Incomplete KYC documents', 'Invalid GST number', 'Photos are unclear', 'Address could not be verified'],
  suspend: ['Policy violation', 'Repeated student complaints', 'Fraudulent activity suspected', 'Requested by the owner'],
};

export interface ModerationRequest {
  action: ModerationAction;
  entityLabel: string;
  /** What will happen, in plain words. */
  consequence: ReactNode;
}

export function ModerationDialog({
  request,
  onOpenChange,
  onConfirm,
  pending,
}: {
  request: ModerationRequest | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string | undefined) => void;
  pending?: boolean;
}) {
  const action = request?.action ?? 'approve';
  const copy = ACTION_COPY[action];
  const required = reasonRequired[action];
  const form = useForm<{ reason?: string }>({
    resolver: zodResolver(required ? reasonSchema : optionalReasonSchema),
    defaultValues: { reason: '' },
  });

  useEffect(() => {
    if (request) form.reset({ reason: '' });
  }, [request, form]);

  const reason = form.watch('reason') ?? '';
  const error = form.formState.errors.reason?.message;

  return (
    <Dialog open={!!request} onOpenChange={(o) => !pending && onOpenChange(o)}>
      <DialogContent className="max-w-md">
        <form
          className="grid gap-5"
          onSubmit={form.handleSubmit((v) => onConfirm(v.reason?.trim() ? v.reason.trim() : undefined))}
          noValidate
        >
          <DialogHeader>
            <div
              className={cn(
                'mb-2 flex size-10 items-center justify-center rounded-xl [&_svg]:size-5',
                copy.variant === 'success' && 'bg-success/12 text-success',
                copy.variant === 'destructive' && 'bg-destructive/10 text-destructive',
                copy.variant === 'default' && 'bg-primary-soft text-primary',
              )}
            >
              {copy.icon}
            </div>
            <DialogTitle>
              {copy.verb} {request?.entityLabel}?
            </DialogTitle>
            <DialogDescription asChild>
              <div>{request?.consequence}</div>
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <Label htmlFor="moderation-reason">
              {copy.reasonLabel}
              {required && <span className="text-destructive">*</span>}
            </Label>
            {QUICK_REASONS[action] && (
              <div className="flex flex-wrap gap-1.5" aria-label="Suggested reasons">
                {QUICK_REASONS[action]!.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => form.setValue('reason', r, { shouldValidate: true })}
                    className="cursor-pointer rounded-full border bg-card px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                  >
                    {r}
                  </button>
                ))}
              </div>
            )}
            <Textarea
              id="moderation-reason"
              rows={3}
              maxLength={500}
              aria-invalid={!!error}
              aria-describedby="moderation-reason-hint"
              placeholder={required ? 'Explain the decision…' : 'Optional'}
              {...form.register('reason')}
            />
            <div id="moderation-reason-hint" className="flex justify-between text-xs text-muted-foreground">
              <span className={cn(error && 'text-destructive')}>{error ?? copy.reasonHint}</span>
              <span className="tabular">{reason.length}/500</span>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" variant={copy.variant} loading={pending}>
              {!pending && copy.icon}
              {copy.verb}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  destructive,
  pending,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  confirmLabel?: string;
  destructive?: boolean;
  pending?: boolean;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !pending && onOpenChange(o)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && (
            <DialogDescription asChild>
              <div>{description}</div>
            </DialogDescription>
          )}
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button variant={destructive ? 'destructive' : 'default'} onClick={onConfirm} loading={pending}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
