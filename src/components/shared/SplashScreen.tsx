import { LogoMark } from './Logo';

export function SplashScreen({ label = 'Restoring your session…' }: { label?: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background" role="status" aria-live="polite">
      <div className="relative">
        <LogoMark className="size-12" />
        <span className="absolute -inset-2 animate-ping rounded-2xl border-2 border-primary/20" aria-hidden />
      </div>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
