import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Archive, ArchiveRestore, Pencil, Plus, Search, Sparkles } from 'lucide-react';
import { useAmenities, useSaveAmenity, useSetAmenityActive } from './api';
import { ALL_ICON_NAMES, AmenityIcon, SUGGESTED_AMENITY_ICONS } from '@/components/shared/AmenityIcon';
import { PageHeader } from '@/components/shared/layout-bits';
import { SearchInput, Segmented } from '@/components/data-table/toolbar';
import { EmptyState, ErrorState } from '@/components/shared/states';
import { ConfirmDialog } from '@/components/shared/ModerationDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input, Textarea } from '@/components/ui/input';
import { Label, Skeleton, Switch } from '@/components/ui/primitives';
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/dialog';
import { useDebounce, useUrlState } from '@/hooks';
import { isApiError } from '@/lib/api/errors';
import { toastError } from '@/lib/api/mutations';
import { amenitySchema, type AmenityValues } from '@/lib/schemas';
import { cn } from '@/lib/utils';
import type { Amenity } from '@/lib/api/types';

function IconPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [q, setQ] = useState('');
  const term = useDebounce(q.trim().toLowerCase(), 150);
  const list = useMemo(() => {
    if (!term) return SUGGESTED_AMENITY_ICONS;
    return ALL_ICON_NAMES.filter((n) => n.includes(term)).slice(0, 60);
  }, [term]);
  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search all icons (e.g. wifi, locker, coffee)" className="pl-9" aria-label="Search icons" />
      </div>
      <div role="radiogroup" aria-label="Icon" className="scrollbar-thin grid max-h-52 grid-cols-6 gap-1.5 overflow-y-auto rounded-xl border p-2 sm:grid-cols-8">
        {list.map((name) => {
          const active = value === name;
          return (
            <button
              key={name}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={name}
              title={name}
              onClick={() => onChange(name)}
              className={cn(
                'flex aspect-square cursor-pointer items-center justify-center rounded-lg transition-colors focus-visible:ring-[3px] focus-visible:ring-primary/30 focus-visible:outline-none',
                active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <AmenityIcon icon={name} className="size-5" />
            </button>
          );
        })}
        {!list.length && <p className="col-span-full py-4 text-center text-sm text-muted-foreground">No icons match “{q}”.</p>}
      </div>
      <p className="text-xs text-muted-foreground">
        Stored as the icon name: <code className="font-mono">{value || 'none'}</code>
      </p>
    </div>
  );
}

function AmenityPreview({ v }: { v: Partial<AmenityValues> }) {
  return (
    <div className="rounded-2xl border bg-gradient-to-br from-primary/6 to-transparent p-4">
      <div className="mb-2 text-xs text-muted-foreground">Preview</div>
      <div className="flex items-start gap-3">
        <div className="flex size-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
          <AmenityIcon icon={v.icon} className="size-5" />
        </div>
        <div className="min-w-0">
          <div className="font-semibold">{v.name || 'Amenity name'}</div>
          <code className="font-mono text-xs text-muted-foreground">{(v.code || 'CODE').toUpperCase()}</code>
          {v.description && <p className="mt-1 text-[13px] text-muted-foreground">{v.description}</p>}
        </div>
        <Badge tone={v.active === false ? 'neutral' : 'success'} className="ml-auto">
          {v.active === false ? 'Retired' : 'Active'}
        </Badge>
      </div>
    </div>
  );
}

function AmenityForm({ amenity, open, onOpenChange }: { amenity: Amenity | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const save = useSaveAmenity();
  const form = useForm<AmenityValues>({
    resolver: zodResolver(amenitySchema),
    defaultValues: { code: '', name: '', icon: '', description: '', active: true },
  });
  useEffect(() => {
    if (open) {
      form.reset(
        amenity
          ? { code: amenity.code, name: amenity.name, icon: amenity.icon ?? '', description: amenity.description ?? '', active: amenity.active }
          : { code: '', name: '', icon: 'sparkles', description: '', active: true },
      );
    }
  }, [open, amenity, form]);
  const values = form.watch();
  const { errors } = form.formState;

  const submit = form.handleSubmit((v) =>
    save.mutate(
      {
        id: amenity?.id,
        body: { code: v.code.trim().toUpperCase(), name: v.name.trim(), icon: v.icon || null, description: v.description?.trim() || null, active: v.active },
      },
      {
        onSuccess: () => onOpenChange(false),
        onError: (e) => {
          if (isApiError(e) && e.code === 'DUPLICATE_RESOURCE') {
            form.setError('code', { message: e.message || 'This code is already used.' });
            return;
          }
          if (isApiError(e) && e.fieldErrors.length) {
            for (const fe of e.fieldErrors) form.setError(fe.field as keyof AmenityValues, { message: fe.message });
            return;
          }
          toastError(e, 'Could not save the amenity');
        },
      },
    ),
  );

  return (
    <Sheet open={open} onOpenChange={(o) => !save.isPending && onOpenChange(o)}>
      <SheetContent>
        <form onSubmit={submit} noValidate className="flex h-full flex-col">
          <SheetHeader>
            <SheetTitle>{amenity ? `Edit ${amenity.name}` : 'New amenity'}</SheetTitle>
            <SheetDescription>Amenities are shown on study hall pages and used as search filters.</SheetDescription>
          </SheetHeader>
          <SheetBody className="space-y-5">
            <AmenityPreview v={values} />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="a-code">
                  Code <span className="text-destructive">*</span>
                </Label>
                <Input id="a-code" className="font-mono uppercase" placeholder="WIFI" aria-invalid={!!errors.code} {...form.register('code', { setValueAs: (v: string) => v.toUpperCase() })} />
                {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="a-name">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input id="a-name" placeholder="Wi-Fi" aria-invalid={!!errors.name} {...form.register('name')} />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="a-desc">Description</Label>
              <Textarea id="a-desc" rows={2} maxLength={300} aria-invalid={!!errors.description} {...form.register('description')} />
              {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
            </div>
            <div className="grid gap-2">
              <span className="text-[13px] font-medium">Icon</span>
              <IconPicker value={values.icon ?? ''} onChange={(v) => form.setValue('icon', v, { shouldDirty: true })} />
            </div>
            <label className="flex items-center justify-between gap-4 rounded-xl border p-4">
              <span>
                <span className="block text-sm font-medium">Active</span>
                <span className="block text-xs text-muted-foreground">Retired amenities stay on halls that use them but can’t be newly added.</span>
              </span>
              <Switch checked={values.active} onCheckedChange={(v) => form.setValue('active', v, { shouldDirty: true })} />
            </label>
          </SheetBody>
          <SheetFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={save.isPending}>
              Cancel
            </Button>
            <Button type="submit" loading={save.isPending}>
              {amenity ? 'Save changes' : 'Create amenity'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

export default function AmenitiesPage() {
  const url = useUrlState();
  const [q, setQ] = useState(url.get('search'));
  const term = useDebounce(q.trim().toLowerCase(), 200);
  const filter = url.getEnum<'active' | 'retired'>('active', ['active', 'retired']);
  const { data, isLoading, error, refetch } = useAmenities();
  const setActive = useSetAmenityActive();
  const [editing, setEditing] = useState<Amenity | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [retire, setRetire] = useState<Amenity | null>(null);

  useEffect(() => {
    if (term !== url.get('search')) url.set({ search: term }, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term]);
  useEffect(() => {
    if (url.get('new') === '1') {
      setEditing(null);
      setFormOpen(true);
      url.set({ new: undefined }, { replace: true });
    }
  }, [url]);

  const list = useMemo(() => {
    let rows = data ?? [];
    if (filter) rows = rows.filter((a) => (filter === 'active' ? a.active : !a.active));
    if (term) rows = rows.filter((a) => [a.name, a.code, a.description ?? ''].some((s) => s.toLowerCase().includes(term)));
    return [...rows].sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name));
  }, [data, filter, term]);

  const counts = { all: data?.length ?? 0, active: data?.filter((a) => a.active).length ?? 0 };

  return (
    <div>
      <PageHeader
        title="Amenities"
        description="Facilities halls can advertise. Amenities can be retired but not deleted, so history stays intact."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus /> New amenity
          </Button>
        }
      />
      <Card className="mb-4 flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
        <SearchInput value={q} onChange={setQ} placeholder="Search amenities…" />
        <Segmented
          label="Status"
          value={filter ?? 'all'}
          onChange={(v) => url.set({ active: v === 'all' ? undefined : v })}
          options={[
            { value: 'all', label: 'All', count: data ? counts.all : null },
            { value: 'active', label: 'Active', count: data ? counts.active : null },
            { value: 'retired', label: 'Retired', count: data ? counts.all - counts.active : null },
          ]}
        />
      </Card>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-2xl" />
          ))}
        </div>
      ) : error ? (
        <Card>
          <ErrorState error={error} onRetry={() => void refetch()} />
        </Card>
      ) : !list.length ? (
        <Card>
          <EmptyState icon={<Sparkles className="size-6" />} title={term || filter ? 'No amenities match' : 'No amenities yet'} />
        </Card>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {list.map((a) => (
            <li key={a.id}>
              <Card className={cn('group relative flex h-full flex-col gap-3 p-5 transition-colors hover:border-primary/30', !a.active && 'bg-muted/30')}>
                <div className="flex items-start justify-between gap-3">
                  <div className={cn('flex size-12 items-center justify-center rounded-2xl', a.active ? 'bg-primary-soft text-primary' : 'bg-muted text-muted-foreground')}>
                    <AmenityIcon icon={a.icon} className="size-6" />
                  </div>
                  <Badge tone={a.active ? 'success' : 'neutral'}>{a.active ? 'Active' : 'Retired'}</Badge>
                </div>
                <div className="min-w-0 flex-1">
                  <div className={cn('font-semibold', !a.active && 'text-muted-foreground')}>{a.name}</div>
                  <code className="font-mono text-xs text-muted-foreground">{a.code}</code>
                  {a.description && <p className="mt-1.5 line-clamp-2 text-[13px] text-muted-foreground">{a.description}</p>}
                </div>
                <div className="flex gap-2 border-t pt-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditing(a);
                      setFormOpen(true);
                    }}
                  >
                    <Pencil /> Edit
                  </Button>
                  {a.active ? (
                    <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setRetire(a)}>
                      <Archive /> Retire
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      loading={setActive.isPending && setActive.variables?.id === a.id}
                      onClick={() => setActive.mutate({ ...a, nextActive: true })}
                    >
                      <ArchiveRestore /> Restore
                    </Button>
                  )}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <AmenityForm amenity={editing} open={formOpen} onOpenChange={setFormOpen} />
      <ConfirmDialog
        open={!!retire}
        onOpenChange={(o) => !o && setRetire(null)}
        title={`Retire ${retire?.name}?`}
        description="Halls that already list it keep it, but vendors can’t add it to new halls. You can restore it any time."
        confirmLabel="Retire"
        destructive
        pending={setActive.isPending}
        onConfirm={() => retire && setActive.mutate({ ...retire, nextActive: false }, { onSettled: () => setRetire(null) })}
      />
    </div>
  );
}
