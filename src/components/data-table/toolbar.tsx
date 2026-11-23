import { forwardRef, type ReactNode } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/primitives';
import { cn } from '@/lib/utils';

export const SearchInput = forwardRef<
  HTMLInputElement,
  { value: string; onChange: (v: string) => void; placeholder?: string; className?: string; label?: string }
>(function SearchInput({ value, onChange, placeholder = 'Search…', className, label }, ref) {
  return (
    <div className={cn('relative w-full sm:w-72', className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <Input
        ref={ref}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label ?? placeholder}
        data-table-search
        className="pr-8 pl-9 [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute top-1/2 right-2 flex size-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
});

export function FilterSelect<V extends string>({
  label,
  value,
  onChange,
  options,
  allLabel = 'All',
  className,
}: {
  label: string;
  value: V | '' | undefined;
  onChange: (v: V | '') => void;
  options: { value: V; label: string }[];
  allLabel?: string;
  className?: string;
}) {
  return (
    <NativeSelect
      aria-label={label}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value as V | '')}
      className={cn('w-full sm:w-auto sm:min-w-36', className)}
    >
      <option value="">
        {label}: {allLabel}
      </option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </NativeSelect>
  );
}

/** Segmented control used for status quick-filters (radio semantics). */
export function Segmented<V extends string>({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: V;
  onChange: (v: V) => void;
  options: { value: V; label: ReactNode; count?: number | null }[];
  label: string;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn('scrollbar-thin flex max-w-full gap-1 overflow-x-auto rounded-xl bg-muted p-1', className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium whitespace-nowrap transition-colors focus-visible:ring-[3px] focus-visible:ring-primary/30 focus-visible:outline-none',
              active ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {o.label}
            {o.count !== undefined && o.count !== null && (
              <span
                className={cn(
                  'rounded-full px-1.5 text-[11px] tabular',
                  active ? 'bg-primary-soft text-primary' : 'bg-background/70 text-muted-foreground',
                )}
              >
                {o.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
