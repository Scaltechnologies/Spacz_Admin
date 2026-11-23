import { NavLink } from 'react-router';
import { CloudOff, PanelLeftClose, PanelLeft } from 'lucide-react';
import { NAV } from './nav';
import { useDashboard } from '@/features/dashboard/api';
import { Logo, LogoMark } from '@/components/shared/Logo';
import { Tooltip } from '@/components/ui/primitives';
import { usePrefs } from '@/lib/prefs';
import { cn } from '@/lib/utils';
import { UserMenu } from './UserMenu';

export function SidebarNav({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const { data } = useDashboard();
  return (
    <nav aria-label="Main" className="scrollbar-thin flex-1 space-y-5 overflow-y-auto px-3 py-4">
      {NAV.map((group) => (
        <div key={group.label}>
          {collapsed ? (
            <div className="mx-auto mb-2 h-px w-6 bg-sidebar-border" aria-hidden />
          ) : (
            <div className="mb-1.5 px-2.5 text-[11px] font-semibold tracking-[0.08em] text-muted-foreground/80 uppercase">{group.label}</div>
          )}
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const count = item.badge?.(data);
              const link = (
                <NavLink
                  to={item.to}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      'group relative flex h-9 items-center gap-3 rounded-lg px-2.5 text-[13.5px] font-medium text-sidebar-foreground transition-colors outline-none',
                      'hover:bg-muted hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-primary/30',
                      isActive && 'bg-sidebar-active text-primary hover:bg-sidebar-active hover:text-primary',
                      collapsed && 'justify-center px-0',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && <span className="absolute top-1.5 bottom-1.5 -left-3 w-[3px] rounded-r-full bg-primary" aria-hidden />}
                      <item.icon className="size-[18px] shrink-0" aria-hidden />
                      {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                      {count !== null && count !== undefined && count > 0 && (
                        <span
                          className={cn(
                            'rounded-full bg-accent px-1.5 text-[11px] leading-[18px] font-semibold text-accent-foreground tabular',
                            collapsed && 'absolute -top-0.5 right-0.5 min-w-4 px-1 text-center text-[10px] leading-4',
                          )}
                          aria-label={`${count} pending`}
                        >
                          {count > 99 ? '99+' : count}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              );
              return (
                <li key={item.to}>
                  {collapsed ? (
                    <Tooltip content={count ? `${item.label} · ${count} pending` : item.label} side="right">
                      {link}
                    </Tooltip>
                  ) : (
                    link
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function HealthPill({ collapsed }: { collapsed: boolean }) {
  const { data } = useDashboard();
  const down = data?.unavailableServices ?? [];
  if (!down.length) return null;
  const text = `${down.length} service${down.length > 1 ? 's' : ''} unavailable`;
  const pill = (
    <div
      role="status"
      className={cn(
        'mx-3 mb-2 flex items-center gap-2 rounded-lg border border-warning/40 bg-warning/10 px-2.5 py-2 text-xs font-medium',
        collapsed && 'justify-center px-0',
      )}
    >
      <CloudOff className="size-4 shrink-0 text-amber-600 dark:text-amber-300" aria-hidden />
      {!collapsed && <span className="truncate">{text}</span>}
    </div>
  );
  return collapsed ? (
    <Tooltip content={`${text}: ${down.join(', ')}`} side="right">
      {pill}
    </Tooltip>
  ) : (
    <Tooltip content={down.join(', ')}>{pill}</Tooltip>
  );
}

export function Sidebar() {
  const collapsed = usePrefs((s) => s.sidebarCollapsed);
  const setCollapsed = usePrefs((s) => s.setSidebarCollapsed);
  return (
    <aside
      className={cn(
        'sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 lg:flex',
        collapsed ? 'w-[72px]' : 'w-[260px]',
      )}
    >
      <div className={cn('flex h-16 items-center border-b border-sidebar-border px-4', collapsed ? 'justify-center' : 'justify-between')}>
        {collapsed ? <LogoMark /> : <Logo subtitle="Administration Console" />}
      </div>
      <SidebarNav collapsed={collapsed} />
      <HealthPill collapsed={collapsed} />
      <div className={cn('flex items-center gap-1 border-t border-sidebar-border p-3', collapsed && 'flex-col')}>
        <UserMenu compact={collapsed} />
        <Tooltip content={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} side="right">
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-primary/30 focus-visible:outline-none"
          >
            {collapsed ? <PanelLeft className="size-4" /> : <PanelLeftClose className="size-4" />}
          </button>
        </Tooltip>
      </div>
    </aside>
  );
}
