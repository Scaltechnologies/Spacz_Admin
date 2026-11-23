import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { Check, Eye, EyeOff, LogOut, ShieldCheck, X } from 'lucide-react';
import { useAuthAccount, useChangePassword } from './api';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label, Skeleton } from '@/components/ui/primitives';
import { Callout } from '@/components/shared/states';
import { isApiError } from '@/lib/api/errors';
import { toastError } from '@/lib/api/mutations';
import { signOut } from '@/lib/auth/auth-service';
import { passwordRules, passwordSchema, passwordStrength, type PasswordValues } from '@/lib/schemas';
import { cn } from '@/lib/utils';

function PasswordInput({ id, label, error, register, autoComplete }: { id: string; label: string; error?: string; register: ReturnType<ReturnType<typeof useForm<PasswordValues>>['register']>; autoComplete: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input id={id} type={show ? 'text' : 'password'} autoComplete={autoComplete} className="pr-10" aria-invalid={!!error} aria-describedby={error ? `${id}-err` : undefined} {...register} />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          aria-pressed={show}
          className="absolute top-1/2 right-1 flex size-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      {error && (
        <p id={`${id}-err`} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

const STRENGTH = [
  { label: 'Too short', cls: 'bg-destructive' },
  { label: 'Weak', cls: 'bg-destructive' },
  { label: 'Fair', cls: 'bg-warning' },
  { label: 'Good', cls: 'bg-success' },
  { label: 'Strong', cls: 'bg-success' },
];

export default function SecurityPage() {
  const account = useAuthAccount();
  const change = useChangePassword();
  const navigate = useNavigate();
  const client = useQueryClient();
  const requireCurrent = account.data?.passwordSet !== false;
  const schema = useMemo(() => passwordSchema(requireCurrent), [requireCurrent]);
  const form = useForm<PasswordValues>({ resolver: zodResolver(schema), defaultValues: { currentPassword: '', newPassword: '', confirm: '' } });
  const pw = form.watch('newPassword') ?? '';
  const strength = passwordStrength(pw);
  const { errors } = form.formState;

  const submit = form.handleSubmit((v) =>
    change.mutate(
      { currentPassword: requireCurrent ? v.currentPassword : undefined, newPassword: v.newPassword },
      {
        onSuccess: () => form.reset({ currentPassword: '', newPassword: '', confirm: '' }),
        onError: (e) => {
          form.setValue('currentPassword', '');
          if (isApiError(e) && e.code === 'INVALID_CREDENTIALS') {
            form.setError('currentPassword', { message: 'Current password is incorrect' });
            return;
          }
          if (isApiError(e) && e.fieldErrors.length) {
            for (const fe of e.fieldErrors) form.setError(fe.field as keyof PasswordValues, { message: fe.message });
            return;
          }
          toastError(e, 'Could not update your password');
        },
      },
    ),
  );

  const logout = async () => {
    await signOut();
    client.clear();
    navigate('/login', { replace: true });
  };

  return (
    <div className="space-y-6">
      <Card>
        <form onSubmit={submit} noValidate>
          <CardHeader>
            <div>
              <CardTitle>{requireCurrent ? 'Change password' : 'Set a password'}</CardTitle>
              <CardDescription>
                {requireCurrent ? 'Use a password you don’t use anywhere else.' : 'Your account signs in with OTP only. Set a password to also sign in with email.'}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {account.isLoading ? (
              <Skeleton className="h-40 rounded-xl" />
            ) : (
              <div className="grid max-w-md gap-5">
                {requireCurrent && (
                  <PasswordInput id="current" label="Current password" autoComplete="current-password" error={errors.currentPassword?.message} register={form.register('currentPassword')} />
                )}
                <div className="space-y-3">
                  <PasswordInput id="new" label="New password" autoComplete="new-password" error={errors.newPassword?.message} register={form.register('newPassword')} />
                  <div className="space-y-2" aria-live="polite">
                    <div className="flex gap-1" aria-hidden>
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className={cn('h-1.5 flex-1 rounded-full bg-muted transition-colors', strength >= i && STRENGTH[strength].cls)} />
                      ))}
                    </div>
                    {pw && <p className="text-xs text-muted-foreground">Strength: {STRENGTH[strength].label}</p>}
                    <ul className="space-y-1">
                      {passwordRules.map((r) => {
                        const ok = r.test(pw);
                        return (
                          <li key={r.id} className={cn('flex items-center gap-2 text-xs', ok ? 'text-success' : 'text-muted-foreground')}>
                            {ok ? <Check className="size-3.5" aria-hidden /> : <X className="size-3.5" aria-hidden />}
                            {r.label}
                            <span className="sr-only">{ok ? '(met)' : '(not met)'}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
                <PasswordInput id="confirm" label="Confirm new password" autoComplete="new-password" error={errors.confirm?.message} register={form.register('confirm')} />
              </div>
            )}
          </CardContent>
          <CardFooter className="justify-end">
            <Button type="submit" loading={change.isPending} disabled={account.isLoading}>
              {requireCurrent ? 'Update password' : 'Set password'}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Session</CardTitle>
            <CardDescription>Sign out of the console on this device. Other open tabs sign out too.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Callout tone="info" icon={<ShieldCheck className="text-info" />} title="How sessions work">
            Access tokens last 15 minutes and are kept in memory only. A rotating refresh token is stored in this browser so a reload keeps you
            signed in; signing out revokes it on the server.
          </Callout>
          <Button variant="destructive-outline" onClick={() => void logout()}>
            <LogOut /> Log out on this device
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
