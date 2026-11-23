import * as React from 'react';
import { cn } from '@/lib/utils';
import type { Tone } from '@/lib/status';

export const toneClasses: Record<Tone, string> = {
  success: 'bg-success/10 text-success ring-success/25',
  warning: 'bg-warning/15 text-amber-700 ring-warning/35 dark:text-amber-300',
  danger: 'bg-destructive/10 text-destructive ring-destructive/25',
  neutral: 'bg-muted text-muted-foreground ring-border',
  info: 'bg-info/10 text-info ring-info/25',
  primary: 'bg-primary/10 text-primary ring-primary/25',
  violet: 'bg-violet-500/10 text-violet-700 ring-violet-500/25 dark:text-violet-300',
  orange: 'bg-orange-500/10 text-orange-700 ring-orange-500/25 dark:text-orange-300',
};

export const toneDot: Record<Tone, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-destructive',
  neutral: 'bg-muted-foreground/60',
  info: 'bg-info',
  primary: 'bg-primary',
  violet: 'bg-violet-500',
  orange: 'bg-orange-500',
};

export interface BadgeProps extends React.ComponentProps<'span'> {
  tone?: Tone;
}

export function Badge({ className, tone = 'neutral', ...props }: BadgeProps) {
  return (
    <span
      data-slot="badge"
      className={cn(
        'inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset [&_svg]:size-3',
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  );
}
