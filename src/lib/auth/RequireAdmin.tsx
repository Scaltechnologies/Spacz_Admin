import { useEffect, useState, type ReactNode } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { WifiOff } from 'lucide-react';
import { onSessionExpired, cancelProactiveRefresh } from '@/lib/api/client';
import { bootstrapSession, type BootResult } from './auth-service';
import { onRemoteLogout, useSession } from './session';
import { SplashScreen } from '@/components/shared/SplashScreen';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/shared/Logo';

/** Guards every console route: restores the session, enforces role ADMIN, wires expiry redirects. */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const status = useSession((s) => s.status);
  const user = useSession((s) => s.user);
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [boot, setBoot] = useState<BootResult | 'running'>(status === 'authenticated' ? 'authenticated' : 'running');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (status === 'authenticated') {
      setBoot(user?.role === 'ADMIN' ? 'authenticated' : 'forbidden');
      return;
    }
    let cancelled = false;
    setBoot('running');
    bootstrapSession().then((r) => {
      if (!cancelled) setBoot(r);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  useEffect(() => {
    const redirect = () => {
      cancelProactiveRefresh();
      useSession.getState().clear();
      queryClient.clear();
      const here = window.location.pathname + window.location.search;
      navigate(`/login?redirect=${encodeURIComponent(here)}&reason=expired`, { replace: true });
    };
    const offExpired = onSessionExpired(redirect);
    const offRemote = onRemoteLogout(() => {
      useSession.getState().clear();
      queryClient.clear();
      navigate('/login', { replace: true });
    });
    return () => {
      offExpired();
      offRemote();
    };
  }, [navigate, queryClient]);

  if (boot === 'running') return <SplashScreen />;
  if (boot === 'offline') {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-background p-6 text-center">
        <Logo className="h-9" />
        <div className="flex size-12 items-center justify-center rounded-full bg-muted">
          <WifiOff className="size-5 text-muted-foreground" aria-hidden />
        </div>
        <div className="space-y-1">
          <h1 className="text-lg font-semibold">Can’t reach the SPACZ gateway</h1>
          <p className="max-w-sm text-sm text-muted-foreground">
            Your session is saved. Check that the backend is running and your connection is up, then try again.
          </p>
        </div>
        <Button onClick={() => setAttempt((a) => a + 1)}>Try again</Button>
      </div>
    );
  }
  if (boot === 'forbidden') return <Navigate to="/403" replace />;
  if (boot === 'anonymous' || status === 'anonymous') {
    const redirect = location.pathname + location.search;
    return <Navigate to={redirect && redirect !== '/' ? `/login?redirect=${encodeURIComponent(redirect)}` : '/login'} replace />;
  }
  return <>{children}</>;
}
