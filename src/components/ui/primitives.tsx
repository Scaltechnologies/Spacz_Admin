import * as React from 'react';
import {
  Label as LabelPrimitive,
  Separator as SeparatorPrimitive,
  Switch as SwitchPrimitive,
  Checkbox as CheckboxPrimitive,
  Tooltip as TooltipPrimitive,
  Avatar as AvatarPrimitive,
} from 'radix-ui';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { initials } from '@/lib/format';

export function Label({ className, ...props }: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn('flex items-center gap-2 text-[13px] leading-none font-medium select-none peer-disabled:opacity-60', className)}
      {...props}
    />
  );
}

/** Styled native <select>: accessible, keyboard- and mobile-friendly. */
export function NativeSelect({ className, children, ...props }: React.ComponentProps<'select'>) {
  return (
    <div className={cn('relative inline-flex', className)}>
      <select
        data-slot="select"
        className="h-9 w-full cursor-pointer appearance-none rounded-lg border border-input bg-card pr-8 pl-3 text-sm shadow-xs outline-none focus-visible:border-primary/60 focus-visible:ring-[3px] focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-destructive"
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
    </div>
  );
}

export function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="skeleton" aria-hidden className={cn('animate-pulse rounded-md bg-muted', className)} {...props} />;
}

export function Separator({
  className,
  orientation = 'horizontal',
  decorative = true,
  ...props
}: React.ComponentProps<typeof SeparatorPrimitive.Root>) {
  return (
    <SeparatorPrimitive.Root
      decorative={decorative}
      orientation={orientation}
      className={cn(
        'shrink-0 bg-border data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px',
        className,
      )}
      {...props}
    />
  );
}

export function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        'peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-transparent shadow-xs outline-none transition-colors',
        'focus-visible:ring-[3px] focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50',
        'data-[state=checked]:bg-primary data-[state=unchecked]:bg-input',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="pointer-events-none block size-4 rounded-full bg-white shadow-sm transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0.5" />
    </SwitchPrimitive.Root>
  );
}

export function Checkbox({ className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        'peer size-4 shrink-0 cursor-pointer rounded-[5px] border border-input bg-card shadow-xs outline-none transition-colors',
        'focus-visible:ring-[3px] focus-visible:ring-primary/30 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
        <Check className="size-3" strokeWidth={3} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export const TooltipProvider = TooltipPrimitive.Provider;

export function Tooltip({
  children,
  content,
  side = 'top',
  ...props
}: {
  children: React.ReactNode;
  content: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
} & Omit<React.ComponentProps<typeof TooltipPrimitive.Root>, 'children'>) {
  if (content === null || content === undefined || content === '' || content === false) return <>{children}</>;
  return (
    <TooltipPrimitive.Root {...props}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={6}
          className="z-50 max-w-xs rounded-md bg-foreground px-2.5 py-1.5 text-xs text-background shadow-pop"
        >
          {content}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

const AVATAR_PALETTE = [
  'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300',
  'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  'bg-sky-500/15 text-sky-700 dark:text-sky-300',
  'bg-rose-500/15 text-rose-700 dark:text-rose-300',
  'bg-violet-500/15 text-violet-700 dark:text-violet-300',
  'bg-teal-500/15 text-teal-700 dark:text-teal-300',
];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function Avatar({
  name,
  src,
  className,
  square,
}: {
  name: string | null | undefined;
  src?: string | null;
  className?: string;
  square?: boolean;
}) {
  const label = name || '?';
  return (
    <AvatarPrimitive.Root className={cn('relative flex size-9 shrink-0 overflow-hidden', square ? 'rounded-xl' : 'rounded-full', className)}>
      {src ? <AvatarPrimitive.Image src={src} alt="" loading="lazy" className="aspect-square size-full object-cover" /> : null}
      <AvatarPrimitive.Fallback
        delayMs={src ? 400 : 0}
        className={cn('flex size-full items-center justify-center text-[0.8em] font-semibold', AVATAR_PALETTE[hash(label) % AVATAR_PALETTE.length])}
      >
        {initials(label)}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );
}
