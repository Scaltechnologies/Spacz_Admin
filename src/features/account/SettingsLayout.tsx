import { NavLink, Outlet } from 'react-router';
import { KeyRound, Palette, UserRound } from 'lucide-react';
import { PageHeader } from '@/components/shared/layout-bits';
import { cn } from '@/lib/utils';

const ITEMS = [
  { to: '/settings/profile', label: 'Profile', icon: UserRound, hint: 'Your admin details' },
  { to: '/settings/security', label: 'Security', icon: KeyRound, hint: 'Password & sessions' },
  { to: '/settings/appearance', label: 'Appearance', icon: Palette, hint: 'Theme & density' },
];

export default function SettingsLayout() {
  return (
    <div>
      <PageHeader title="Settings" description="Manage your administrator profile, security and console preferences." />
      <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <nav aria-label="Settings" className="scrollbar-thin flex gap-1 overflow-x-auto lg:flex-col">
          {ITEMS.map((i) => (
            <NavLink
              key={i.to}
              to={i.to}
              className={({ isActive }) =>
                cn(
                  'flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-primary/30',
                  isActive ? 'bg-card font-medium text-foreground shadow-card ring-1 ring-border' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )
              }
            >
              <i.icon className="size-4" aria-hidden />
              <span>
                {i.label}
                <span className="hidden text-xs font-normal text-muted-foreground lg:block">{i.hint}</span>
              </span>
            </NavLink>
          ))}
        </nav>
        <div className="min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
