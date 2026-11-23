import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { TooltipProvider } from '@/components/ui/primitives';
import { applyAuthResponse } from '@/lib/api/client';
import { adminAccount, authResponse } from './fixtures';

export function testQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } } });
}

/** Signs in as the fixture admin without touching the network. */
export function signInAsAdmin() {
  applyAuthResponse(authResponse(adminAccount));
}

/** Live view of the router location for assertions. */
export const location = { pathname: '', search: '' };
function LocationProbe() {
  const loc = useLocation();
  location.pathname = loc.pathname;
  location.search = loc.search;
  return null;
}

/**
 * Renders `element` at `path` inside all app providers.
 * Uses MemoryRouter (component mode): the data router builds fetch Requests that jsdom's
 * AbortSignal can't satisfy under Node.
 */
export function renderRoute(element: ReactElement, opts: { path?: string; route?: string; extra?: { path: string; element: ReactElement }[] } = {}) {
  const client = testQueryClient();
  const utils = render(
    <QueryClientProvider client={client}>
      <TooltipProvider>
        <MemoryRouter initialEntries={[opts.route ?? opts.path ?? '/']}>
          <LocationProbe />
          <Routes>
            <Route path={opts.path ?? '/'} element={element} />
            <Route path="/login" element={<div>LOGIN PAGE</div>} />
            <Route path="/403" element={<div>FORBIDDEN PAGE</div>} />
            {(opts.extra ?? []).map((r) => (
              <Route key={r.path} path={r.path} element={r.element} />
            ))}
            <Route path="*" element={<div>OTHER PAGE</div>} />
          </Routes>
        </MemoryRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>,
  );
  return { ...utils, client, router: { state: { location } } };
}
