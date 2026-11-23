import * as React from 'react';
import { cn } from '@/lib/utils';

const field =
  'w-full min-w-0 rounded-lg border border-input bg-card text-sm shadow-xs outline-none transition-[color,box-shadow,border-color] placeholder:text-muted-foreground/80 focus-visible:border-primary/60 focus-visible:ring-[3px] focus-visible:ring-primary/20 aria-invalid:border-destructive aria-invalid:ring-destructive/20 disabled:cursor-not-allowed disabled:opacity-60';

export function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return <input type={type} data-slot="input" className={cn(field, 'flex h-9 px-3 py-1', className)} {...props} />;
}

export function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return <textarea data-slot="textarea" className={cn(field, 'flex min-h-20 px-3 py-2', className)} {...props} />;
}
