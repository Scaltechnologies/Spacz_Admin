import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const SHORTCUTS: { group: string; items: [string, string][] }[] = [
  {
    group: 'General',
    items: [
      ['Ctrl / ⌘ K', 'Command palette'],
      ['Ctrl / ⌘ B', 'Collapse sidebar'],
      ['/', 'Focus table search'],
      ['?', 'Show shortcuts'],
    ],
  },
  {
    group: 'Navigation',
    items: [
      ['G D', 'Dashboard'],
      ['G A', 'Approvals'],
      ['G U', 'Users'],
      ['G V', 'Vendors'],
      ['G H', 'Study halls'],
      ['G B', 'Bookings'],
      ['G L', 'Audit logs'],
      ['G S', 'Settings'],
    ],
  },
  {
    group: 'Approvals',
    items: [
      ['J / K', 'Next / previous item'],
      ['A', 'Approve selected'],
      ['R', 'Reject selected'],
    ],
  },
];

export function ShortcutsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>Shortcuts are ignored while typing in a field.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-5 sm:grid-cols-2">
          {SHORTCUTS.map((g) => (
            <div key={g.group}>
              <h3 className="mb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">{g.group}</h3>
              <ul className="space-y-1.5">
                {g.items.map(([k, label]) => (
                  <li key={k} className="flex items-center justify-between gap-3 text-sm">
                    <span>{label}</span>
                    <kbd className="rounded-md border bg-muted px-1.5 py-0.5 font-mono text-[11px] whitespace-nowrap">{k}</kbd>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
