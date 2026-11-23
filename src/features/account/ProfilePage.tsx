import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAdminProfile, useAuthAccount, useUpdateAdminProfile } from './api';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, Label, Skeleton } from '@/components/ui/primitives';
import { ErrorState } from '@/components/shared/states';
import { InfoGrid, RelativeTime } from '@/components/shared/layout-bits';
import { RoleBadge, StatusBadge } from '@/components/shared/StatusBadge';
import { isApiError } from '@/lib/api/errors';
import { toastError } from '@/lib/api/mutations';
import { adminProfileSchema, type AdminProfileValues } from '@/lib/schemas';
import { formatDateTime, formatPhone } from '@/lib/format';

function Field({ id, label, error, hint, children }: { id: string; label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {(error || hint) && <p className={error ? 'text-xs text-destructive' : 'text-xs text-muted-foreground'}>{error ?? hint}</p>}
    </div>
  );
}

export default function ProfilePage() {
  const profile = useAdminProfile();
  const account = useAuthAccount();
  const update = useUpdateAdminProfile();
  const form = useForm<AdminProfileValues>({
    resolver: zodResolver(adminProfileSchema),
    defaultValues: { fullName: '', email: '', phone: '', title: '' },
  });

  useEffect(() => {
    if (profile.data) {
      form.reset({
        fullName: profile.data.fullName ?? '',
        email: profile.data.email ?? '',
        phone: profile.data.phone ?? '',
        title: profile.data.title ?? '',
      });
    }
  }, [profile.data, form]);

  const { errors, isDirty } = form.formState;
  const submit = form.handleSubmit((v) =>
    update.mutate(
      { fullName: v.fullName.trim(), email: v.email.trim() || null, phone: v.phone.trim() || null, title: v.title.trim() || null },
      {
        onError: (e) => {
          if (isApiError(e) && e.fieldErrors.length) {
            for (const fe of e.fieldErrors) form.setError(fe.field as keyof AdminProfileValues, { message: fe.message });
          } else toastError(e, 'Could not save your profile');
        },
      },
    ),
  );

  if (profile.isLoading) return <Skeleton className="h-96 rounded-2xl" />;
  if (profile.error) return <Card><ErrorState error={profile.error} onRetry={() => void profile.refetch()} /></Card>;

  const name = form.watch('fullName') || account.data?.email || 'Administrator';

  return (
    <div className="space-y-6">
      <Card>
        <form onSubmit={submit} noValidate>
          <CardHeader>
            <div>
              <CardTitle>Admin profile</CardTitle>
              <CardDescription>How you appear in the console. Shown in the sidebar and greeting.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar name={name} className="size-14 text-lg" />
              <div>
                <div className="font-medium">{name}</div>
                <div className="text-sm text-muted-foreground">{form.watch('title') || 'Administrator'}</div>
              </div>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="fullName" label="Full name *" error={errors.fullName?.message}>
                <Input id="fullName" autoComplete="name" aria-invalid={!!errors.fullName} {...form.register('fullName')} />
              </Field>
              <Field id="title" label="Title" error={errors.title?.message} hint="e.g. Operations Manager">
                <Input id="title" aria-invalid={!!errors.title} {...form.register('title')} />
              </Field>
              <Field id="email" label="Contact email" error={errors.email?.message} hint="Not your login email">
                <Input id="email" type="email" autoComplete="email" aria-invalid={!!errors.email} {...form.register('email')} />
              </Field>
              <Field id="phone" label="Contact phone" error={errors.phone?.message}>
                <Input id="phone" type="tel" autoComplete="tel" aria-invalid={!!errors.phone} {...form.register('phone')} />
              </Field>
            </div>
          </CardContent>
          <CardFooter className="justify-between gap-3">
            <span className="text-xs text-muted-foreground">
              {profile.data?.updatedAt && <>Last updated {formatDateTime(profile.data.updatedAt)}</>}
            </span>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" disabled={!isDirty || update.isPending} onClick={() => form.reset()}>
                Discard
              </Button>
              <Button type="submit" loading={update.isPending} disabled={!isDirty}>
                Save profile
              </Button>
            </div>
          </CardFooter>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Login account</CardTitle>
            <CardDescription>Managed by the authentication service. Read-only here.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {account.isLoading ? (
            <Skeleton className="h-24 rounded-xl" />
          ) : account.error ? (
            <ErrorState compact error={account.error} onRetry={() => void account.refetch()} />
          ) : account.data ? (
            <InfoGrid
              items={[
                { label: 'Account ID', value: `#${account.data.id}`, mono: true, copy: account.data.id },
                { label: 'Role', value: <RoleBadge role={account.data.role} /> },
                { label: 'Login email', value: account.data.email },
                { label: 'Login phone', value: account.data.phone && formatPhone(account.data.phone) },
                { label: 'Status', value: <StatusBadge status={account.data.status} /> },
                { label: 'Last login', value: <RelativeTime value={account.data.lastLoginAt} /> },
                { label: 'Last seen in console', value: <RelativeTime value={profile.data?.lastSeenAt} /> },
                { label: 'Account created', value: formatDateTime(account.data.createdAt) },
              ]}
            />
          ) : null}
        </CardContent>
      </Card>
      {isApiError(update.error) && update.error.correlationId && <p className="text-xs text-muted-foreground">Ref {update.error.correlationId}</p>}
    </div>
  );
}
