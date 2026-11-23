import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronDown, GraduationCap, Pencil, Plus, PowerOff } from 'lucide-react';
import { usePrograms, useSaveProgram, useSetProgramActive } from './api';
import { PageHeader } from '@/components/shared/layout-bits';
import { SearchInput, Segmented } from '@/components/data-table/toolbar';
import { EmptyState, ErrorState } from '@/components/shared/states';
import { ConfirmDialog } from '@/components/shared/ModerationDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input, Textarea } from '@/components/ui/input';
import { Label, NativeSelect, Skeleton, Switch, Tooltip } from '@/components/ui/primitives';
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/dialog';
import { useUrlSearch, useUrlState } from '@/hooks';
import { isApiError } from '@/lib/api/errors';
import { toastError } from '@/lib/api/mutations';
import { programSchema, type ProgramValues } from '@/lib/schemas';
import { cn } from '@/lib/utils';
import type { Program } from '@/lib/api/types';

function ProgramForm({ program, categories, open, onOpenChange }: { program: Program | null; categories: string[]; open: boolean; onOpenChange: (o: boolean) => void }) {
  const save = useSaveProgram();
  const form = useForm<ProgramValues>({
    resolver: zodResolver(programSchema),
    defaultValues: { code: '', name: '', description: '', category: '', active: true },
  });
  useEffect(() => {
    if (open) {
      form.reset(
        program
          ? { code: program.code, name: program.name, description: program.description ?? '', category: program.category, active: program.active }
          : { code: '', name: '', description: '', category: '', active: true },
      );
    }
  }, [open, program, form]);
  const { errors } = form.formState;

  const submit = form.handleSubmit((v) => {
    save.mutate(
      {
        id: program?.id,
        body: { code: v.code.trim().toUpperCase(), name: v.name.trim(), description: v.description?.trim() || null, category: v.category.trim(), active: v.active },
      },
      {
        onSuccess: () => onOpenChange(false),
        onError: (e) => {
          if (isApiError(e) && e.code === 'DUPLICATE_RESOURCE') {
            form.setError('code', { message: e.message || 'This code is already used by another program.' });
            return;
          }
          if (isApiError(e) && e.fieldErrors.length) {
            for (const fe of e.fieldErrors) form.setError(fe.field as keyof ProgramValues, { message: fe.message });
            return;
          }
          toastError(e, 'Could not save the program');
        },
      },
    );
  });

  return (
    <Sheet open={open} onOpenChange={(o) => !save.isPending && onOpenChange(o)}>
      <SheetContent>
        <form onSubmit={submit} noValidate className="flex h-full flex-col">
          <SheetHeader>
            <SheetTitle>{program ? `Edit ${program.name}` : 'New exam / program'}</SheetTitle>
            <SheetDescription>Programs are the exams and courses students prepare for and halls cater to.</SheetDescription>
          </SheetHeader>
          <SheetBody className="space-y-5">
            <div className="grid gap-2">
              <Label htmlFor="p-code">
                Code <span className="text-destructive">*</span>
              </Label>
              <Input
                id="p-code"
                className="font-mono uppercase"
                placeholder="EAMCET"
                aria-invalid={!!errors.code}
                aria-describedby="p-code-msg"
                {...form.register('code', { setValueAs: (v: string) => v.toUpperCase() })}
              />
              <p id="p-code-msg" className={cn('text-xs', errors.code ? 'text-destructive' : 'text-muted-foreground')}>
                {errors.code?.message ?? "Unique. Letters, digits, '_' and '-'; stored in upper case."}
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="p-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input id="p-name" placeholder="TS / AP EAMCET" aria-invalid={!!errors.name} {...form.register('name')} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="p-category">
                Category <span className="text-destructive">*</span>
              </Label>
              <Input id="p-category" list="program-categories" placeholder="Engineering" aria-invalid={!!errors.category} {...form.register('category')} />
              <datalist id="program-categories">
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
              {errors.category && <p className="text-xs text-destructive">{errors.category.message}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="p-desc">Description</Label>
              <Textarea id="p-desc" rows={4} maxLength={1000} aria-invalid={!!errors.description} {...form.register('description')} />
              {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
            </div>
            <label className="flex items-center justify-between gap-4 rounded-xl border p-4">
              <span>
                <span className="block text-sm font-medium">Active</span>
                <span className="block text-xs text-muted-foreground">Inactive programs stay on existing records but can’t be chosen for new ones.</span>
              </span>
              <Switch checked={form.watch('active')} onCheckedChange={(v) => form.setValue('active', v, { shouldDirty: true })} />
            </label>
          </SheetBody>
          <SheetFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={save.isPending}>
              Cancel
            </Button>
            <Button type="submit" loading={save.isPending}>
              {program ? 'Save changes' : 'Create program'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

export default function ProgramsPage() {
  const url = useUrlState();
  const search = useUrlSearch();
  const category = url.get('category');
  const activeFilter = url.getEnum<'active' | 'inactive'>('active', ['active', 'inactive']);
  const page = url.getInt('page', 0, { min: 0 });
  const { data, isLoading, error, refetch, isFetching } = usePrograms({
    search: search.applied || undefined,
    category: category || undefined,
    active: activeFilter === undefined ? undefined : activeFilter === 'active',
    page,
    size: 100,
    sort: 'name,asc',
  });
  const allCats = usePrograms({ size: 100, sort: 'name,asc' });
  const setActive = useSetProgramActive();
  const [editing, setEditing] = useState<Program | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [confirm, setConfirm] = useState<Program | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (url.get('new') === '1') {
      setEditing(null);
      setFormOpen(true);
      url.set({ new: undefined }, { replace: true });
    }
  }, [url]);

  const categories = useMemo(
    () => [...new Set((allCats.data?.content ?? []).map((p) => p.category))].sort((a, b) => a.localeCompare(b)),
    [allCats.data],
  );
  const groups = useMemo(() => {
    const m = new Map<string, Program[]>();
    for (const p of data?.content ?? []) {
      if (!m.has(p.category)) m.set(p.category, []);
      m.get(p.category)!.push(p);
    }
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [data]);

  const toggleActive = (p: Program) => {
    if (p.active) setConfirm(p);
    else setActive.mutate({ ...p, nextActive: true });
  };

  return (
    <div>
      <PageHeader
        title="Exams & Programs"
        description="The catalog students pick their exams from and study halls cater to."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus /> New program
          </Button>
        }
      />

      <Card className="mb-4 flex flex-col gap-3 p-3 lg:flex-row lg:items-center">
        <SearchInput value={search.value} onChange={search.setValue} placeholder="Search code or name…" />
        <NativeSelect aria-label="Category" value={category} onChange={(e) => url.set({ category: e.target.value })} className="w-full sm:w-56">
          <option value="">Category: All</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </NativeSelect>
        <Segmented
          label="Active filter"
          value={activeFilter ?? 'all'}
          onChange={(v) => url.set({ active: v === 'all' ? undefined : v })}
          options={[
            { value: 'all', label: 'All' },
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' },
          ]}
        />
        {data && <span className="text-xs text-muted-foreground lg:ml-auto">{data.totalElements} programs</span>}
      </Card>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      ) : error ? (
        <Card>
          <ErrorState error={error} onRetry={() => void refetch()} />
        </Card>
      ) : !groups.length ? (
        <Card>
          <EmptyState
            icon={<GraduationCap className="size-6" />}
            title={search.applied || category || activeFilter ? 'No programs match' : 'The catalog is empty'}
            action={
              <Button
                size="sm"
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                <Plus /> Add the first program
              </Button>
            }
          />
        </Card>
      ) : (
        <div className={cn('space-y-4', isFetching && 'opacity-80')}>
          {groups.map(([cat, items]) => {
            const isCollapsed = collapsed.has(cat);
            return (
              <Card key={cat} className="overflow-hidden">
                <button
                  type="button"
                  aria-expanded={!isCollapsed}
                  onClick={() =>
                    setCollapsed((s) => {
                      const n = new Set(s);
                      if (n.has(cat)) n.delete(cat);
                      else n.add(cat);
                      return n;
                    })
                  }
                  className="flex w-full cursor-pointer items-center gap-2 bg-muted/40 px-4 py-3 text-left"
                >
                  <ChevronDown className={cn('size-4 text-muted-foreground transition-transform', isCollapsed && '-rotate-90')} aria-hidden />
                  <span className="font-semibold">{cat}</span>
                  <Badge>{items.length}</Badge>
                  <span className="ml-auto text-xs text-muted-foreground">{items.filter((i) => i.active).length} active</span>
                </button>
                {!isCollapsed && (
                  <ul className="divide-y">
                    {items.map((p) => (
                      <li key={p.id} className={cn('flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center', !p.active && 'bg-muted/20')}>
                        <code className="w-32 shrink-0 font-mono text-[12.5px] font-medium">{p.code}</code>
                        <div className="min-w-0 flex-1">
                          <div className={cn('font-medium', !p.active && 'text-muted-foreground')}>{p.name}</div>
                          {p.description && <div className="line-clamp-1 text-[13px] text-muted-foreground">{p.description}</div>}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge tone={p.active ? 'success' : 'neutral'}>{p.active ? 'Active' : 'Inactive'}</Badge>
                          <Tooltip content={p.active ? 'Deactivate' : 'Reactivate'}>
                            <span>
                              <Switch
                                checked={p.active}
                                disabled={setActive.isPending && setActive.variables?.id === p.id}
                                onCheckedChange={() => toggleActive(p)}
                                aria-label={`${p.active ? 'Deactivate' : 'Reactivate'} ${p.name}`}
                              />
                            </span>
                          </Tooltip>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Edit ${p.name}`}
                            onClick={() => {
                              setEditing(p);
                              setFormOpen(true);
                            }}
                          >
                            <Pencil />
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            );
          })}
          {data && data.totalPages > 1 && (
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" disabled={data.first} onClick={() => url.set({ page: page - 1 })}>
                Previous
              </Button>
              <Button variant="outline" size="sm" disabled={data.last} onClick={() => url.set({ page: page + 1 })}>
                Next
              </Button>
            </div>
          )}
        </div>
      )}

      <ProgramForm program={editing} categories={categories} open={formOpen} onOpenChange={setFormOpen} />
      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={
          <span className="inline-flex items-center gap-2">
            <PowerOff className="size-5 text-destructive" /> Deactivate {confirm?.name}?
          </span>
        }
        description="Students and halls that already reference it keep it, but it won’t be offered for new choices. You can reactivate it any time."
        confirmLabel="Deactivate"
        destructive
        pending={setActive.isPending}
        onConfirm={() => confirm && setActive.mutate({ ...confirm, nextActive: false }, { onSettled: () => setConfirm(null) })}
      />
    </div>
  );
}
