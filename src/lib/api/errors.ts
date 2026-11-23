/** Error envelope returned by every SPACZ service and the gateway. */
export interface ApiErrorBody {
  timestamp?: string;
  status: number;
  error: string;
  message: string;
  path?: string;
  correlationId?: string;
  fieldErrors?: { field: string; message: string }[];
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly path?: string;
  readonly correlationId?: string;
  readonly fieldErrors: { field: string; message: string }[];

  constructor(body: ApiErrorBody) {
    super(body.message || body.error || 'Request failed');
    this.name = 'ApiError';
    this.status = body.status;
    this.code = body.error;
    this.path = body.path;
    this.correlationId = body.correlationId;
    this.fieldErrors = body.fieldErrors ?? [];
  }

  /** Client-side failures that never reached the server. */
  static network(message = 'Could not reach the SPACZ gateway. Check your connection and that the backend is running.') {
    return new ApiError({ status: 0, error: 'NETWORK_ERROR', message });
  }

  static timeout() {
    return new ApiError({ status: 0, error: 'TIMEOUT', message: 'The server took too long to respond.' });
  }

  get isNetwork() {
    return this.status === 0;
  }
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError;
}

const FRIENDLY: Record<string, string> = {
  NETWORK_ERROR: 'Could not reach the SPACZ gateway. Check your connection and that the backend is running.',
  TIMEOUT: 'The server took too long to respond. Try again.',
  SERVICE_UNAVAILABLE: 'A SPACZ service is temporarily unavailable. Try again shortly.',
  INVALID_SORT: 'That sort order is not supported.',
  INVALID_STATUS_TRANSITION: 'This record changed status in the meantime. It has been refreshed.',
  CONCURRENT_MODIFICATION: 'Someone else changed this record. It has been refreshed.',
  FORBIDDEN: 'You do not have permission to do that.',
  NOT_FOUND: 'This record does not exist or was removed.',
};

/** Human message for a toast or error state. Prefers the server's own message. */
export function errorMessage(e: unknown): string {
  if (isApiError(e)) {
    if (e.code in FRIENDLY && (e.isNetwork || e.code === 'SERVICE_UNAVAILABLE')) return FRIENDLY[e.code];
    return e.message || FRIENDLY[e.code] || 'Something went wrong.';
  }
  if (e instanceof Error) return e.message;
  return 'Something went wrong.';
}

/** Codes meaning the entity's status moved under us; callers should refetch. */
export function isStaleStateError(e: unknown) {
  return (
    isApiError(e) &&
    ['INVALID_STATUS_TRANSITION', 'CONFLICT', 'CONCURRENT_MODIFICATION'].includes(e.code)
  );
}
