import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { copyToClipboard, cn } from '@/lib/utils';

export function CopyButton({ value, label = 'Copy', className }: { value: string | number; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-primary/30 focus-visible:outline-none',
        className,
      )}
      onClick={async (e) => {
        e.stopPropagation();
        const ok = await copyToClipboard(String(value));
        if (ok) {
          setCopied(true);
          setTimeout(() => setCopied(false), 1400);
        } else {
          toast.error('Could not copy to the clipboard');
        }
      }}
    >
      {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
    </button>
  );
}

/** Monospace identifier with a copy affordance. */
export function MonoId({ value, prefix = '#', className }: { value: string | number | null | undefined; prefix?: string; className?: string }) {
  if (value === null || value === undefined || value === '') return <span className="text-muted-foreground">—</span>;
  return (
    <span className={cn('group/id inline-flex items-center gap-0.5 font-mono text-[12.5px] tabular', className)}>
      <span>
        {prefix}
        {value}
      </span>
      <CopyButton value={value} label="Copy ID" className="opacity-0 group-hover/id:opacity-100 focus-visible:opacity-100" />
    </span>
  );
}
