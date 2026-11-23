import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/** Local-only appearance preferences. Never sent to the server. */
export type ThemePref = 'light' | 'dark' | 'system';
export type AccentPref = 'indigo' | 'violet' | 'teal' | 'rose';
export type DensityPref = 'comfortable' | 'compact';

interface PrefsState {
  theme: ThemePref;
  accent: AccentPref;
  density: DensityPref;
  sidebarCollapsed: boolean;
  reducedMotion: boolean;
  setTheme: (t: ThemePref) => void;
  setAccent: (a: AccentPref) => void;
  setDensity: (d: DensityPref) => void;
  setSidebarCollapsed: (v: boolean) => void;
  setReducedMotion: (v: boolean) => void;
}

const safeStorage = createJSONStorage(() => {
  try {
    localStorage.setItem('__spacz_probe', '1');
    localStorage.removeItem('__spacz_probe');
    return localStorage;
  } catch {
    const mem = new Map<string, string>();
    return {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, v),
      removeItem: (k: string) => void mem.delete(k),
    };
  }
});

export const usePrefs = create<PrefsState>()(
  persist(
    (set) => ({
      theme: 'system',
      accent: 'indigo',
      density: 'comfortable',
      sidebarCollapsed: false,
      reducedMotion: false,
      setTheme: (theme) => set({ theme }),
      setAccent: (accent) => set({ accent }),
      setDensity: (density) => set({ density }),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      setReducedMotion: (reducedMotion) => set({ reducedMotion }),
    }),
    { name: 'spacz.admin.prefs', storage: safeStorage, version: 1 },
  ),
);

/** Applies preferences to <html>. Call once at startup; it re-applies on change. */
export function bindPrefsToDocument() {
  const root = document.documentElement;
  const media = window.matchMedia('(prefers-color-scheme: dark)');

  const apply = () => {
    const p = usePrefs.getState();
    const dark = p.theme === 'dark' || (p.theme === 'system' && media.matches);
    root.classList.toggle('dark', dark);
    if (p.accent === 'indigo') delete root.dataset.accent;
    else root.dataset.accent = p.accent;
    root.dataset.density = p.density;
    root.dataset.reducedMotion = String(p.reducedMotion);
  };
  apply();
  const unsub = usePrefs.subscribe(apply);
  media.addEventListener('change', apply);
  return () => {
    unsub();
    media.removeEventListener('change', apply);
  };
}

export function useIsDark() {
  const theme = usePrefs((s) => s.theme);
  if (theme === 'system') return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
  return theme === 'dark';
}
