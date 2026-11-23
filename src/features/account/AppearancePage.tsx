import { Check, Monitor, Moon, Sun } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/primitives';
import { usePrefs, type AccentPref, type DensityPref, type ThemePref } from '@/lib/prefs';
import { cn } from '@/lib/utils';

const THEMES: { value: ThemePref; label: string; icon: typeof Sun; preview: string }[] = [
  { value: 'light', label: 'Light', icon: Sun, preview: 'bg-[oklch(0.985_0.004_265)]' },
  { value: 'dark', label: 'Dark', icon: Moon, preview: 'bg-[oklch(0.165_0.025_268)]' },
  { value: 'system', label: 'System', icon: Monitor, preview: 'bg-gradient-to-r from-[oklch(0.985_0.004_265)] from-50% to-[oklch(0.165_0.025_268)] to-50%' },
];

const ACCENTS: { value: AccentPref; label: string; swatch: string }[] = [
  { value: 'indigo', label: 'SPACZ Indigo', swatch: 'oklch(0.511 0.23 277)' },
  { value: 'violet', label: 'Violet', swatch: 'oklch(0.541 0.247 293)' },
  { value: 'teal', label: 'Teal', swatch: 'oklch(0.55 0.11 190)' },
  { value: 'rose', label: 'Rose', swatch: 'oklch(0.586 0.22 10)' },
];

function Row({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="text-sm font-medium">{title}</div>
        <div className="text-[13px] text-muted-foreground">{description}</div>
      </div>
      {children}
    </div>
  );
}

export default function AppearancePage() {
  const p = usePrefs();
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Theme</CardTitle>
            <CardDescription>Saved in this browser only.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div role="radiogroup" aria-label="Theme" className="grid gap-3 sm:grid-cols-3">
            {THEMES.map((t) => {
              const active = p.theme === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => p.setTheme(t.value)}
                  className={cn(
                    'cursor-pointer overflow-hidden rounded-xl border text-left transition-colors focus-visible:ring-[3px] focus-visible:ring-primary/30 focus-visible:outline-none',
                    active ? 'border-primary ring-1 ring-primary' : 'hover:border-primary/40',
                  )}
                >
                  <div className={cn('flex h-20 items-end gap-1.5 p-3', t.preview)} aria-hidden>
                    <div className="h-full w-6 rounded-md bg-gray-500/20" />
                    <div className="flex h-full flex-1 flex-col gap-1.5">
                      <div className="h-2 w-1/2 rounded bg-gray-500/30" />
                      <div className="flex-1 rounded-md bg-gray-500/15" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 border-t px-3 py-2.5 text-sm font-medium">
                    <t.icon className="size-4" aria-hidden /> {t.label}
                    {active && <Check className="ml-auto size-4 text-primary" aria-hidden />}
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Accent colour</CardTitle>
            <CardDescription>Used for buttons, links and highlights.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div role="radiogroup" aria-label="Accent colour" className="flex flex-wrap gap-3">
            {ACCENTS.map((a) => {
              const active = p.accent === a.value;
              return (
                <button
                  key={a.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => p.setAccent(a.value)}
                  className={cn(
                    'flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors focus-visible:ring-[3px] focus-visible:ring-primary/30 focus-visible:outline-none',
                    active ? 'border-primary ring-1 ring-primary' : 'hover:border-primary/40',
                  )}
                >
                  <span className="flex size-5 items-center justify-center rounded-full" style={{ background: a.swatch }}>
                    {active && <Check className="size-3 text-white" strokeWidth={3} aria-hidden />}
                  </span>
                  {a.label}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Layout & motion</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="divide-y">
          <Row title="Table density" description="Compact rows fit more data on screen.">
            <div role="radiogroup" aria-label="Table density" className="flex gap-1 rounded-xl bg-muted p-1">
              {(['comfortable', 'compact'] as DensityPref[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  role="radio"
                  aria-checked={p.density === d}
                  onClick={() => p.setDensity(d)}
                  className={cn(
                    'cursor-pointer rounded-lg px-3 py-1.5 text-[13px] font-medium capitalize',
                    p.density === d ? 'bg-card shadow-sm' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {d}
                </button>
              ))}
            </div>
          </Row>
          <Row title="Collapse sidebar" description="Show only icons in the sidebar on desktop. Shortcut: Ctrl/⌘ B.">
            <Switch checked={p.sidebarCollapsed} onCheckedChange={p.setSidebarCollapsed} aria-label="Collapse sidebar" />
          </Row>
          <Row title="Reduce motion" description="Turn off animations and transitions. Your system setting is always respected.">
            <Switch checked={p.reducedMotion} onCheckedChange={p.setReducedMotion} aria-label="Reduce motion" />
          </Row>
        </CardContent>
      </Card>
    </div>
  );
}
