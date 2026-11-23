import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';

export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => (typeof window !== 'undefined' ? window.matchMedia(query).matches : false));
  useEffect(() => {
    const m = window.matchMedia(query);
    const on = () => setMatches(m.matches);
    on();
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, [query]);
  return matches;
}

/** Keys (optionally prefixed, e.g. "bOpen") that don't reset pagination when they change. */
const NON_FILTER_KEY = /(^|[a-z])(page|size|sort|tab|view|open|selected|asize)$/i;
function isNonFilterKey(k: string) {
  return NON_FILTER_KEY.test(k);
}

export type UrlPatch = Record<string, string | number | boolean | null | undefined>;

/**
 * Shareable, restorable list state stored in the query string.
 * - Empty values are removed from the URL.
 * - Changing any filter resets `page`.
 * - Readers validate values and fall back safely.
 */
export function useUrlState() {
  const [params, setParams] = useSearchParams();

  const get = useCallback((key: string, fallback = '') => params.get(key) ?? fallback, [params]);

  const getInt = useCallback(
    (key: string, fallback: number, opts?: { min?: number; max?: number; allowed?: number[] }) => {
      const raw = params.get(key);
      if (raw === null || raw === '') return fallback;
      const n = Number(raw);
      if (!Number.isInteger(n)) return fallback;
      if (opts?.min !== undefined && n < opts.min) return fallback;
      if (opts?.max !== undefined && n > opts.max) return fallback;
      if (opts?.allowed && !opts.allowed.includes(n)) return fallback;
      return n;
    },
    [params],
  );

  const getEnum = useCallback(
    <E extends string>(key: string, allowed: readonly E[], fallback?: E): E | undefined => {
      const raw = params.get(key);
      return raw !== null && (allowed as readonly string[]).includes(raw) ? (raw as E) : fallback;
    },
    [params],
  );

  const set = useCallback(
    (patch: UrlPatch, opts?: { replace?: boolean; pageKey?: string }) => {
      const pageKey = opts?.pageKey ?? 'page';
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          let filterChanged = false;
          for (const [k, v] of Object.entries(patch)) {
            const value = v === null || v === undefined || v === '' || v === false ? null : String(v);
            if ((prev.get(k) ?? null) !== value && !isNonFilterKey(k)) filterChanged = true;
            if (value === null) next.delete(k);
            else next.set(k, value);
          }
          if (filterChanged && !(pageKey in patch)) next.delete(pageKey);
          if (next.get(pageKey) === '0') next.delete(pageKey);
          return next;
        },
        { replace: opts?.replace ?? false },
      );
    },
    [setParams],
  );

  return { params, get, getInt, getEnum, set };
}

/** Standard page/size/sort readers for server-paginated lists. */
export function usePagingState(defaultSize = 20) {
  const url = useUrlState();
  const page = url.getInt('page', 0, { min: 0, max: 100_000 });
  const size = url.getInt('size', defaultSize, { allowed: [10, 20, 50, 100] });
  return { ...url, page, size };
}

/** Debounced text input bound to a URL key (replaces history entries while typing). */
export function useUrlSearch(key = 'search', delay = 300) {
  const url = useUrlState();
  const urlValue = url.get(key);
  const [value, setValue] = useState(urlValue);
  const debounced = useDebounce(value, delay);
  const lastPushed = useRef(urlValue);

  useEffect(() => {
    if (urlValue !== lastPushed.current) {
      lastPushed.current = urlValue;
      setValue(urlValue);
    }
  }, [urlValue]);

  useEffect(() => {
    const trimmed = debounced.trim();
    if (trimmed !== lastPushed.current) {
      lastPushed.current = trimmed;
      url.set({ [key]: trimmed }, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  return { value, setValue, applied: urlValue };
}

/** Global keyboard shortcuts. Ignored while typing in inputs. */
export function useHotkeys(map: Record<string, (e: KeyboardEvent) => void>, enabled = true) {
  const ref = useRef(map);
  ref.current = map;
  const chord = useRef<{ key: string; at: number } | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
      const mod = e.metaKey || e.ctrlKey;
      const key = `${mod ? 'mod+' : ''}${e.key.toLowerCase()}`;
      if (typing && !mod) return;
      if (e.altKey) return;

      // two-key chords like "g d"
      if (!mod && chord.current && Date.now() - chord.current.at < 900) {
        const combo = `${chord.current.key} ${key}`;
        chord.current = null;
        if (ref.current[combo]) {
          e.preventDefault();
          ref.current[combo](e);
          return;
        }
      }
      if (ref.current[key]) {
        e.preventDefault();
        ref.current[key](e);
        return;
      }
      if (!mod && Object.keys(ref.current).some((k) => k.startsWith(`${key} `))) {
        chord.current = { key, at: Date.now() };
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [enabled]);
}

/** Ticking "now" for countdowns. */
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function useStableObject<T extends object>(obj: T): T {
  const key = JSON.stringify(obj);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => obj, [key]);
}
