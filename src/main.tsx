import { StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { MotionConfig } from 'motion/react';
import '@/styles/globals.css';
import { createQueryClient } from '@/app/query-client';
import { createRouter } from '@/app/router';
import { TooltipProvider } from '@/components/ui/primitives';
import { SplashScreen } from '@/components/shared/SplashScreen';
import { bindPrefsToDocument, usePrefs, useIsDark } from '@/lib/prefs';

bindPrefsToDocument();

const queryClient = createQueryClient();
const router = createRouter();

function ThemedToaster() {
  const dark = useIsDark();
  return <Toaster position="bottom-right" theme={dark ? 'dark' : 'light'} richColors closeButton toastOptions={{ className: 'font-sans' }} />;
}

function App() {
  const reduced = usePrefs((s) => s.reducedMotion);
  return (
    <MotionConfig reducedMotion={reduced ? 'always' : 'user'}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delayDuration={250}>
          <Suspense fallback={<SplashScreen label="Loading…" />}>
            <RouterProvider router={router} />
          </Suspense>
          <ThemedToaster />
        </TooltipProvider>
      </QueryClientProvider>
    </MotionConfig>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
