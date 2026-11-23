import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, ArrowLeft, Building2, ClipboardCheck, Eye, EyeOff, KeyRound, Library, Mail, ShieldCheck, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/primitives';
import { LogoMark } from '@/components/shared/Logo';
import { authApi } from '@/features/auth/api';
import { completeSignIn, NotAdminError } from '@/lib/auth/auth-service';
import { useSession } from '@/lib/auth/session';
import { isApiError } from '@/lib/api/errors';
import { loginSchema, otpCodeSchema, otpPhoneSchema, type LoginValues } from '@/lib/schemas';
import { cn } from '@/lib/utils';

function loginErrorMessage(e: unknown, mode: 'password' | 'otp'): string {
  if (e instanceof NotAdminError) return e.message;
  if (!isApiError(e)) return 'Something went wrong. Try again.';
  switch (e.code) {
    case 'INVALID_CREDENTIALS':
      return mode === 'password' ? 'Incorrect email or password.' : 'Wrong or expired code.';
    case 'ACCOUNT_LOCKED':
      return 'Too many attempts. This account is temporarily locked. Try again later.';
    case 'ACCOUNT_SUSPENDED':
    case 'ACCOUNT_DISABLED':
      return e.message || 'This account cannot sign in.';
    case 'REGISTRATION_REQUIRED':
      return 'No SPACZ account uses this number.';
    case 'OTP_RATE_LIMITED':
      return 'Too many codes requested. Try again later.';
    case 'NETWORK_ERROR':
    case 'TIMEOUT':
      return 'Can’t reach the SPACZ gateway. Check that the backend is running.';
    default:
      return e.message || 'Sign-in failed.';
  }
}

function safeRedirect(raw: string | null) {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/login')) return '/dashboard';
  return raw;
}

function BrandPanel() {
  const features = [
    { icon: ClipboardCheck, title: 'Approve partners & halls', text: 'A focused review queue with every detail you need.' },
    { icon: Building2, title: 'Moderate the platform', text: 'Suspend or restore users, vendors and study halls with a full audit trail.' },
    { icon: Library, title: 'Oversee bookings', text: 'Live occupancy, seat maps and booking history across every city.' },
  ];
  return (
    <div className="relative hidden overflow-hidden bg-[oklch(0.24_0.09_277)] text-white lg:flex lg:w-[55%] lg:flex-col lg:justify-between lg:p-12 xl:p-16">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -top-40 -left-32 size-[520px] rounded-full bg-[oklch(0.51_0.23_277)] opacity-60 blur-[120px]" />
        <div className="absolute right-[-120px] bottom-[-160px] size-[440px] rounded-full bg-[oklch(0.77_0.165_70)] opacity-25 blur-[120px]" />
        <svg className="absolute inset-0 size-full opacity-[0.12]" aria-hidden>
          <defs>
            <pattern id="seats" width="44" height="44" patternUnits="userSpaceOnUse">
              <rect x="8" y="8" width="28" height="28" rx="7" fill="none" stroke="white" strokeWidth="1.2" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#seats)" />
        </svg>
        <div className="absolute top-[38%] right-[18%] size-3 rounded-full bg-[oklch(0.8_0.15_75)] shadow-[0_0_40px_12px_oklch(0.8_0.15_75/0.45)]" />
      </div>

      <div className="relative flex items-center gap-3">
        <LogoMark className="size-10" />
        <div>
          <div className="text-lg font-semibold tracking-tight">SPACZ</div>
          <div className="text-xs text-white/60">Administration Console</div>
        </div>
      </div>

      <div className="relative max-w-lg space-y-8">
        <div className="space-y-4">
          <h1 className="text-4xl leading-[1.1] font-semibold tracking-tight text-balance xl:text-5xl">
            Your platform.
            <br />
            <span className="text-[oklch(0.86_0.12_80)]">One command center.</span>
          </h1>
          <p className="text-base text-white/70">
            Manage students, partners, study halls and bookings across SPACZ, with every decision recorded and traceable.
          </p>
        </div>
        <ul className="space-y-4">
          {features.map((f) => (
            <li key={f.title} className="flex gap-3.5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
                <f.icon className="size-4" aria-hidden />
              </span>
              <div>
                <div className="text-sm font-medium">{f.title}</div>
                <div className="text-sm text-white/60">{f.text}</div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="relative flex items-center gap-2 text-xs text-white/50">
        <ShieldCheck className="size-3.5" aria-hidden /> Access is restricted to SPACZ administrators. Every action is audited.
      </div>
    </div>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="text-xs text-destructive">
      {message}
    </p>
  );
}

function PasswordForm({ onDone }: { onDone: () => void }) {
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } });
  const { errors, isSubmitting } = form.formState;

  const submit = form.handleSubmit(async (v) => {
    setError(null);
    try {
      const res = await authApi.login(v.email.trim(), v.password);
      await completeSignIn(res);
      form.reset({ email: v.email, password: '' });
      onDone();
    } catch (e) {
      form.setValue('password', '');
      if (isApiError(e) && e.fieldErrors.length) {
        for (const fe of e.fieldErrors) {
          if (fe.field === 'email' || fe.field === 'password') form.setError(fe.field, { message: fe.message });
        }
      }
      setError(loginErrorMessage(e, 'password'));
    }
  });

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {error && (
        <div role="alert" className="flex gap-2 rounded-xl border border-destructive/30 bg-destructive/8 px-3 py-2.5 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {error}
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="email">Email or phone</Label>
        <div className="relative">
          <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            id="email"
            autoComplete="username"
            autoFocus
            placeholder="admin@spacz.in"
            className="h-11 pl-9"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'email-error' : undefined}
            {...form.register('email')}
          />
        </div>
        <FieldError id="email-error" message={errors.email?.message} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <KeyRound className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            id="password"
            type={show ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="Your password"
            className="h-11 pr-11 pl-9"
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? 'password-error' : undefined}
            {...form.register('password')}
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? 'Hide password' : 'Show password'}
            aria-pressed={show}
            className="absolute top-1/2 right-1.5 flex size-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        <FieldError id="password-error" message={errors.password?.message} />
      </div>
      <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
        {isSubmitting ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  );
}

function OtpForm({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('');
  const [maskedPhone, setMaskedPhone] = useState('');
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState<string | undefined>();
  const [resendIn, setResendIn] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (resendIn <= 0) return;
    const id = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [resendIn]);

  const request = async () => {
    setError(null);
    setFieldError(null);
    const parsed = otpPhoneSchema.safeParse({ phone });
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    try {
      const res = await authApi.requestOtp(parsed.data.phone);
      setMaskedPhone(res.phone);
      setResendIn(res.resendAfterSeconds);
      setDevCode(res.devCode);
      setStep('code');
      setCode('');
      setTimeout(() => codeRef.current?.focus(), 50);
    } catch (e) {
      if (isApiError(e) && e.code === 'OTP_TOO_SOON') {
        setStep('code');
        setError('A code was sent recently. Enter it below or wait before requesting another.');
      } else if (isApiError(e) && e.code === 'INVALID_PHONE') {
        setFieldError(e.message || 'Enter a valid phone number');
      } else {
        setError(loginErrorMessage(e, 'otp'));
      }
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    setError(null);
    const parsed = otpCodeSchema.safeParse({ code });
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0].message);
      return;
    }
    setFieldError(null);
    setBusy(true);
    try {
      const res = await authApi.verifyOtp(phone.trim(), parsed.data.code);
      await completeSignIn(res);
      onDone();
    } catch (e) {
      setCode('');
      setError(loginErrorMessage(e, 'otp'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      className="space-y-4"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void (step === 'phone' ? request() : verify());
      }}
    >
      {error && (
        <div role="alert" className="flex gap-2 rounded-xl border border-destructive/30 bg-destructive/8 px-3 py-2.5 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {error}
        </div>
      )}
      {step === 'phone' ? (
        <div className="space-y-2">
          <Label htmlFor="otp-phone">Phone number</Label>
          <div className="relative">
            <Smartphone className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              id="otp-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="98765 43210"
              className="h-11 pl-9"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              aria-invalid={!!fieldError}
              aria-describedby={fieldError ? 'otp-phone-error' : undefined}
            />
          </div>
          <FieldError id="otp-phone-error" message={fieldError ?? undefined} />
          <p className="text-xs text-muted-foreground">Only existing administrator accounts can sign in. Codes never create accounts here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="otp-code">6-digit code</Label>
            <button
              type="button"
              onClick={() => {
                setStep('phone');
                setError(null);
                setFieldError(null);
              }}
              className="inline-flex cursor-pointer items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-3" /> Change number
            </button>
          </div>
          <Input
            ref={codeRef}
            id="otp-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="••••••"
            className="h-12 text-center font-mono text-xl tracking-[0.6em]"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            aria-invalid={!!fieldError}
            aria-describedby="otp-code-hint"
          />
          <p id="otp-code-hint" className={cn('text-xs', fieldError ? 'text-destructive' : 'text-muted-foreground')}>
            {fieldError ?? (maskedPhone ? `Sent to ${maskedPhone}.` : 'Enter the code sent by SMS.')}
            {devCode && <span className="ml-1 font-mono text-amber-600 dark:text-amber-300">Dev code: {devCode}</span>}
          </p>
          <button
            type="button"
            disabled={resendIn > 0 || busy}
            onClick={() => void request()}
            className="cursor-pointer text-xs font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline"
          >
            {resendIn > 0 ? `Resend code in ${resendIn}s` : 'Resend code'}
          </button>
        </div>
      )}
      <Button type="submit" size="lg" className="w-full" loading={busy}>
        {step === 'phone' ? 'Send code' : 'Verify & sign in'}
      </Button>
    </form>
  );
}

export default function LoginPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const status = useSession((s) => s.status);
  const [mode, setMode] = useState<'password' | 'otp'>('password');
  const redirect = safeRedirect(params.get('redirect'));
  const expired = params.get('reason') === 'expired';

  if (status === 'authenticated') return <Navigate to={redirect} replace />;

  return (
    <div className="flex min-h-dvh bg-background">
      <BrandPanel />
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-[400px] space-y-8">
          <div className="flex items-center gap-3 lg:hidden">
            <LogoMark className="size-10" />
            <div>
              <div className="text-lg font-semibold tracking-tight">SPACZ Admin</div>
              <div className="text-xs text-muted-foreground">Your platform. One command center.</div>
            </div>
          </div>
          <div className="space-y-1.5">
            <h2 className="text-2xl font-semibold tracking-tight">Sign in to the console</h2>
            <p className="text-sm text-muted-foreground">Use your SPACZ administrator account.</p>
          </div>

          {expired && (
            <div role="status" className="rounded-xl border border-warning/40 bg-warning/10 px-3 py-2.5 text-sm">
              Your session expired. Sign in again to continue where you left off.
            </div>
          )}

          <div role="tablist" aria-label="Sign-in method" className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
            {(
              [
                ['password', 'Email & password', Mail],
                ['otp', 'Phone OTP', Smartphone],
              ] as const
            ).map(([m, label, Icon]) => (
              <button
                key={m}
                role="tab"
                type="button"
                aria-selected={mode === m}
                onClick={() => setMode(m)}
                className={cn(
                  'inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-colors',
                  mode === m ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="size-4" aria-hidden /> {label}
              </button>
            ))}
          </div>

          <div role="tabpanel">
            {mode === 'password' ? (
              <PasswordForm onDone={() => navigate(redirect, { replace: true })} />
            ) : (
              <OtpForm onDone={() => navigate(redirect, { replace: true })} />
            )}
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Protected by role-based access. Non-administrator accounts are signed out automatically.
          </p>
        </div>
      </div>
    </div>
  );
}
