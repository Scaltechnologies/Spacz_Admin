import { Fragment, useEffect } from 'react';
import { Link, useLocation } from 'react-router';
import { ChevronRight } from 'lucide-react';
import { create } from 'zustand';
import { ROUTE_LABELS } from './nav';

/** Detail pages register a human label (e.g. a vendor's business name) for their path segment. */
const useCrumbStore = create<{ labels: Record<string, string>; set: (path: string, label: string) => void }>()((set) => ({
  labels: {},
  set: (path, label) => set((s) => ({ labels: { ...s.labels, [path]: label } })),
}));

export function useBreadcrumbLabel(label: string | null | undefined) {
  const { pathname } = useLocation();
  const setLabel = useCrumbStore((s) => s.set);
  useEffect(() => {
    if (label) setLabel(pathname, label);
  }, [label, pathname, setLabel]);
}

export function Breadcrumbs() {
  const { pathname } = useLocation();
  const labels = useCrumbStore((s) => s.labels);
  const segments = pathname.split('/').filter(Boolean);
  const crumbs = segments.map((seg, i) => {
    const path = '/' + segments.slice(0, i + 1).join('/');
    const label = labels[path] ?? ROUTE_LABELS[seg] ?? (/^\d+$/.test(seg) ? `#${seg}` : seg);
    // "catalog" and "settings" have no index page of their own
    const linkable = !['catalog', 'settings'].includes(seg);
    return { path, label, linkable };
  });

  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex min-w-0 items-center gap-1.5 text-sm">
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <Fragment key={c.path}>
              {i > 0 && <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/60" aria-hidden />}
              <li className={last ? 'min-w-0 truncate font-medium' : 'hidden shrink-0 text-muted-foreground sm:block'}>
                {last || !c.linkable ? (
                  <span aria-current={last ? 'page' : undefined}>{c.label}</span>
                ) : (
                  <Link to={c.path} className="hover:text-foreground">
                    {c.label}
                  </Link>
                )}
              </li>
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
