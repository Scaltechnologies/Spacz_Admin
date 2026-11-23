import { toast } from 'sonner';
import type { QueryClient, QueryKey } from '@tanstack/react-query';
import { errorMessage, isApiError, isStaleStateError } from './errors';
import { qk } from './query-keys';

/** Shows a server-confirmed success toast. */
export function toastSuccess(message: string, description?: string) {
  toast.success(message, { description });
}

/** Error toast with the correlation ID (copyable) when the server provided one. */
export function toastError(error: unknown, fallbackTitle = 'Action failed') {
  const corr = isApiError(error) ? error.correlationId : undefined;
  toast.error(isStaleStateError(error) ? 'Status changed' : fallbackTitle, {
    description: errorMessage(error) + (corr ? ` (ref ${corr.slice(0, 8)})` : ''),
    action: corr
      ? {
          label: 'Copy ref',
          onClick: () => void navigator.clipboard?.writeText(corr).catch(() => undefined),
        }
      : undefined,
  });
}

/** Invalidate several query families at once. */
export function invalidateAll(client: QueryClient, keys: QueryKey[]) {
  return Promise.all(keys.map((queryKey) => client.invalidateQueries({ queryKey })));
}

export const moderationInvalidation = {
  vendor: [qk.vendors.all, qk.halls.all, qk.dashboard, qk.audit.all, qk.users.all],
  hall: [qk.halls.all, qk.vendors.all, qk.dashboard, qk.audit.all],
  user: [qk.users.all, qk.dashboard, qk.audit.all, qk.vendors.all],
} as const;
