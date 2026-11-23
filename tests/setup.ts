import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { server } from './msw/server';
import { useSession } from '@/lib/auth/session';
import { cancelProactiveRefresh } from '@/lib/api/client';

// ---- jsdom gaps used by Radix, Recharts and our hooks ----
if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: /min-width:\s*1024px/.test(query), // behave like a desktop viewport
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}
class RO {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= RO as unknown as typeof ResizeObserver;
Element.prototype.scrollIntoView ??= vi.fn();
Element.prototype.hasPointerCapture ??= () => false;
Element.prototype.releasePointerCapture ??= () => {};

/**
 * jsdom's AbortSignal is not accepted by Node's fetch/Request (undici). Bridge it on top of MSW's
 * fetch wrapper: strip the foreign signal and reject with an AbortError when it fires, as browsers do.
 */
function bridgeAbortSignals() {
  const mswFetch = globalThis.fetch;
  globalThis.fetch = ((input: RequestInfo | URL, init: RequestInit = {}) => {
    const { signal, ...rest } = init;
    if (!signal) return mswFetch(input, init);
    return new Promise<Response>((resolve, reject) => {
      const abort = () => reject(new DOMException('The operation was aborted.', 'AbortError'));
      if (signal.aborted) return abort();
      signal.addEventListener('abort', abort, { once: true });
      mswFetch(input, rest).then(resolve, reject);
    });
  }) as typeof fetch;
}

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
  bridgeAbortSignals();
});
afterEach(() => {
  cleanup();
  server.resetHandlers();
  cancelProactiveRefresh();
  useSession.getState().clear();
  localStorage.clear();
});
afterAll(() => server.close());
