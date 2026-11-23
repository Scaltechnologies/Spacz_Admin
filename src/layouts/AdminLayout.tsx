import { Suspense, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import { Menu, Monitor, Moon, Search, Sun } from 'lucide-react';
import { Sidebar, SidebarNav } from './Sidebar';
import { Breadcrumbs } from './breadcrumbs';
import { CommandMenu } from './CommandMenu';
import { UserMenu } from './UserMenu';
import { Logo } from '@/components/shared/Logo';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/menus';
import { Skeleton } from '@/components/ui/primitives';
import { useHotkeys } from '@/hooks';
import { usePrefs, useIsDark, type ThemePref } from '@/lib/prefs';
import { ShortcutsDialog } from './ShortcutsDialog';

function ThemeSwitcher() {
  const theme = usePrefs((s) => s.theme);
  const setTheme = usePrefs((s) => s.setTheme);
  const isDark = useIsDark();
  const options: { value: ThemePref; label: string; icon: typeof Sun }[] = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Change theme">
          {isDark ? <Moon /> : <Sun />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-36">
        {options.map((o) => (
          <DropdownMenuItem key={o.value} onSelect={() => setTheme(o.value)} className={theme === o.value ? 'font-semibold' : undefined}>
            <o.icon /> {o.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function PageFallback() {
  return (
    <div className="space-y-6" aria-busy>
      <Skeleton className="h-8 w-64" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-36 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-80 rounded-2xl" />
    </div>
  );
}

export function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const toggleSidebar = () => {
    const s = usePrefs.getState();
    s.setSidebarCollapsed(!s.sidebarCollapsed);
  };

  useHotkeys({
    'mod+k': () => setCmdOpen((o) => !o),
    'mod+b': toggleSidebar,
    '/': () => {
      const el = document.querySelector<HTMLInputElement>('[data-table-search]');
      if (el) el.focus();
      else setCmdOpen(true);
    },
    '?': () => setHelpOpen(true),
    'g d': () => navigate('/dashboard'),
    'g a': () => navigate('/approvals'),
    'g u': () => navigate('/users'),
    'g v': () => navigate('/vendors'),
    'g h': () => navigate('/studyhalls'),
    'g b': () => navigate('/bookings'),
    'g l': () => navigate('/audit-logs'),
    'g s': () => navigate('/settings/profile'),
  });

  return (
    <div className="flex min-h-dvh bg-background">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <Sidebar />

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[280px] bg-sidebar p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SheetDescription className="sr-only">Main navigation</SheetDescription>
          <div className="flex h-16 items-center border-b px-4">
            <Logo subtitle="Administration Console" />
          </div>
          <SidebarNav collapsed={false} onNavigate={() => setMobileOpen(false)} />
          <div className="border-t p-3">
            <UserMenu />
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur-md sm:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation">
            <Menu />
          </Button>
          <div className="min-w-0 flex-1">
            <Breadcrumbs />
          </div>
          <button
            type="button"
            onClick={() => setCmdOpen(true)}
            className="hidden h-9 w-64 cursor-pointer items-center gap-2 rounded-lg border bg-card px-3 text-sm text-muted-foreground shadow-xs transition-colors hover:border-primary/40 md:flex"
            aria-label="Open command palette"
          >
            <Search className="size-4" aria-hidden />
            <span className="flex-1 text-left">Search or jump to…</span>
            <kbd className="rounded border bg-muted px-1.5 font-mono text-[10px]">Ctrl K</kbd>
          </button>
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setCmdOpen(true)} aria-label="Search">
            <Search />
          </Button>
          <ThemeSwitcher />
          <div className="lg:hidden">
            <UserMenu compact align="end" />
          </div>
        </header>

        <main id="main" tabIndex={-1} className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 outline-none sm:px-6 lg:px-8 lg:py-8">
          <Suspense fallback={<PageFallback />}>
            <div key={location.pathname} className="animate-rise">
              <Outlet />
            </div>
          </Suspense>
        </main>
      </div>

      <CommandMenu open={cmdOpen} onOpenChange={setCmdOpen} />
      <ShortcutsDialog open={helpOpen} onOpenChange={setHelpOpen} />
    </div>
  );
}
