import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Command } from 'cmdk';
import { useQuery } from '@tanstack/react-query';
import { Building2, CornerDownLeft, Hash, Library, Loader2, Moon, Search, Sun, UserRound } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { NAV } from './nav';
import { useDebounce } from '@/hooks';
import { usersApi } from '@/features/users/api';
import { vendorsApi } from '@/features/vendors/api';
import { hallsApi } from '@/features/studyhalls/api';
import { usePrefs, useIsDark } from '@/lib/prefs';
import { StatusBadge } from '@/components/shared/StatusBadge';

const itemCls =
  'flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm outline-none data-[selected=true]:bg-muted [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground';
const groupCls =
  '[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:uppercase';

export function CommandMenu({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const term = useDebounce(query.trim(), 250);
  const isDark = useIsDark();
  const setTheme = usePrefs((s) => s.setTheme);

  const idMatch = /^#?(\d{1,12})$/.exec(term);
  const searchable = term.length >= 2 && !idMatch;

  const users = useQuery({
    queryKey: ['cmdk', 'users', term],
    queryFn: ({ signal }) => usersApi.list({ search: term, size: 5 }, signal),
    enabled: open && searchable,
    staleTime: 30_000,
  });
  const vendors = useQuery({
    queryKey: ['cmdk', 'vendors', term],
    queryFn: ({ signal }) => vendorsApi.list({ search: term, size: 5 }, signal),
    enabled: open && searchable,
    staleTime: 30_000,
  });
  const halls = useQuery({
    queryKey: ['cmdk', 'halls', term],
    queryFn: ({ signal }) => hallsApi.list({ search: term, size: 5 }, signal),
    enabled: open && searchable,
    staleTime: 30_000,
  });

  const go = (to: string) => {
    onOpenChange(false);
    setQuery('');
    navigate(to);
  };

  const loading = searchable && (users.isFetching || vendors.isFetching || halls.isFetching);
  const navItems = useMemo(() => NAV.flatMap((g) => g.items.map((i) => ({ ...i, group: g.label }))), []);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) setQuery('');
      }}
    >
      <DialogContent hideClose className="top-[12vh] max-w-xl translate-y-0 gap-0 overflow-hidden p-0">
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <DialogDescription className="sr-only">Jump to a page or search users, vendors and study halls.</DialogDescription>
        <Command shouldFilter={!searchable} loop className="flex flex-col">
          <div className="flex items-center gap-2 border-b px-4">
            {loading ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : <Search className="size-4 text-muted-foreground" />}
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder="Search users, vendors, halls… or type #ID"
              className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <kbd className="hidden rounded border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground sm:block">ESC</kbd>
          </div>
          <Command.List className="scrollbar-thin max-h-[60vh] overflow-y-auto p-2">
            <Command.Empty className="py-10 text-center text-sm text-muted-foreground">
              {loading ? 'Searching…' : 'No results found.'}
            </Command.Empty>

            {idMatch && (
              <Command.Group heading={`Jump to #${idMatch[1]}`} className={groupCls}>
                <Command.Item value={`user-${idMatch[1]}`} onSelect={() => go(`/users/${idMatch[1]}`)} className={itemCls}>
                  <Hash /> User account #{idMatch[1]}
                </Command.Item>
                <Command.Item value={`vendor-${idMatch[1]}`} onSelect={() => go(`/vendors/${idMatch[1]}`)} className={itemCls}>
                  <Hash /> Vendor #{idMatch[1]}
                </Command.Item>
                <Command.Item value={`hall-${idMatch[1]}`} onSelect={() => go(`/studyhalls/${idMatch[1]}`)} className={itemCls}>
                  <Hash /> Study hall #{idMatch[1]}
                </Command.Item>
              </Command.Group>
            )}

            {searchable && (users.data?.content.length ?? 0) > 0 && (
              <Command.Group heading="Users" className={groupCls}>
                {users.data!.content.map((u) => (
                  <Command.Item key={`u${u.id}`} value={`u${u.id}`} onSelect={() => go(`/users/${u.id}`)} className={itemCls}>
                    <UserRound />
                    <span className="flex-1 truncate">{u.email ?? u.phone}</span>
                    <span className="font-mono text-xs text-muted-foreground">#{u.id}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}
            {searchable && (vendors.data?.content.length ?? 0) > 0 && (
              <Command.Group heading="Vendors" className={groupCls}>
                {vendors.data!.content.map((v) => (
                  <Command.Item
                    key={`v${v.profile.vendorId}`}
                    value={`v${v.profile.vendorId}`}
                    onSelect={() => go(`/vendors/${v.profile.vendorId}`)}
                    className={itemCls}
                  >
                    <Building2 />
                    <span className="flex-1 truncate">{v.profile.businessName ?? v.profile.contactName ?? `Vendor #${v.profile.vendorId}`}</span>
                    <StatusBadge status={v.profile.status} />
                  </Command.Item>
                ))}
              </Command.Group>
            )}
            {searchable && (halls.data?.content.length ?? 0) > 0 && (
              <Command.Group heading="Study halls" className={groupCls}>
                {halls.data!.content.map((h) => (
                  <Command.Item key={`h${h.id}`} value={`h${h.id}`} onSelect={() => go(`/studyhalls/${h.id}`)} className={itemCls}>
                    <Library />
                    <span className="flex-1 truncate">
                      {h.name}
                      {h.city && <span className="text-muted-foreground"> · {h.city}</span>}
                    </span>
                    <StatusBadge status={h.status} />
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {!searchable && (
              <>
                <Command.Group heading="Go to" className={groupCls}>
                  {navItems.map((i) => (
                    <Command.Item key={i.to} value={`go ${i.label} ${i.group}`} onSelect={() => go(i.to)} className={itemCls}>
                      <i.icon />
                      <span className="flex-1">{i.label}</span>
                      {i.shortcut && <kbd className="font-mono text-[10px] text-muted-foreground">{i.shortcut}</kbd>}
                    </Command.Item>
                  ))}
                </Command.Group>
                <Command.Group heading="Actions" className={groupCls}>
                  <Command.Item value="review pending vendors" onSelect={() => go('/approvals?tab=vendors')} className={itemCls}>
                    <Building2 /> Review pending vendors
                  </Command.Item>
                  <Command.Item value="review pending study halls" onSelect={() => go('/approvals?tab=halls')} className={itemCls}>
                    <Library /> Review pending study halls
                  </Command.Item>
                  <Command.Item value="new exam program" onSelect={() => go('/catalog/programs?new=1')} className={itemCls}>
                    <CornerDownLeft /> New exam / program
                  </Command.Item>
                  <Command.Item value="new amenity" onSelect={() => go('/catalog/amenities?new=1')} className={itemCls}>
                    <CornerDownLeft /> New amenity
                  </Command.Item>
                  <Command.Item
                    value="toggle theme dark light"
                    onSelect={() => {
                      setTheme(isDark ? 'light' : 'dark');
                      onOpenChange(false);
                    }}
                    className={itemCls}
                  >
                    {isDark ? <Sun /> : <Moon />} Switch to {isDark ? 'light' : 'dark'} theme
                  </Command.Item>
                </Command.Group>
              </>
            )}
          </Command.List>
          <div className="flex items-center gap-3 border-t px-4 py-2 text-[11px] text-muted-foreground">
            <span>↑↓ navigate</span>
            <span>↵ open</span>
            <span className="ml-auto">Search covers email/phone for users, name/contact for vendors, name for halls</span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
