import { Link, isRouteErrorResponse, useNavigate, useRouteError } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { Compass, ShieldX, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LogoMark } from '@/components/shared/Logo';
import { signOut } from '@/lib/auth/auth-service';

function Shell({ icon, code, title, text, actions }: { icon: React.ReactNode; code: string; title: string; text: string; actions: React.ReactNode }) {
  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center gap-5 px-4 text-center">
      <div className="relative">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-primary-soft text-primary [&_svg]:size-7">{icon}</div>
        <span className="absolute -right-3 -bottom-2 rounded-full border bg-card px-2 py-0.5 font-mono text-xs text-muted-foreground">{code}</span>
      </div>
      <div className="max-w-md space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">{text}</p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">{actions}</div>
    </div>
  );
}

export function NotFoundPage() {
  return (
    <Shell
      icon={<Compass />}
      code="404"
      title="This page doesn’t exist"
      text="The link may be outdated, or the page was moved. Use the sidebar or press Ctrl K to find what you need."
      actions={
        <Button asChild>
          <Link to="/dashboard">Back to dashboard</Link>
        </Button>
      }
    />
  );
}

/** Shown when a signed-in account is not ADMIN (its session has already been revoked). */
export function ForbiddenPage() {
  const navigate = useNavigate();
  const client = useQueryClient();
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <div className="p-6">
        <LogoMark />
      </div>
      <Shell
        icon={<ShieldX />}
        code="403"
        title="Administrators only"
        text="The account you used does not have the ADMIN role, so it can’t open the SPACZ Admin Console. You have been signed out."
        actions={
          <Button
            onClick={async () => {
              await signOut();
              client.clear();
              navigate('/login', { replace: true });
            }}
          >
            Sign in with another account
          </Button>
        }
      />
    </div>
  );
}

export function RouteErrorPage() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error) ? `${error.status} ${error.statusText}` : error instanceof Error ? error.message : 'Unknown error';
  const chunk = /dynamically imported module|Failed to fetch/i.test(message);
  return (
    <Shell
      icon={<TriangleAlert />}
      code="ERR"
      title={chunk ? 'A new version is available' : 'Something broke on this page'}
      text={chunk ? 'Reload to get the latest version of the console.' : message}
      actions={
        <>
          <Button onClick={() => window.location.reload()}>Reload</Button>
          <Button variant="outline" asChild>
            <Link to="/dashboard">Go to dashboard</Link>
          </Button>
        </>
      }
    />
  );
}
