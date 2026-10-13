export interface ApiSuccess<T> {
  data: T;
  meta: {
    requestId: string;
  };
}

export interface FieldErrors {
  [fieldName: string]: string;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    fields?: FieldErrors;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// Standard API error codes.
// Use these constants to ensure consistent error codes across all route handlers.
export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_AUTHENTICATED: 'NOT_AUTHENTICATED',
  INSUFFICIENT_ROLE: 'INSUFFICIENT_ROLE',
  BRANCH_SCOPE_VIOLATION: 'BRANCH_SCOPE_VIOLATION',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  ROOM_OVERLAP: 'ROOM_OVERLAP',
  OUTSTANDING_BALANCE: 'OUTSTANDING_BALANCE',
  INVALID_STATUS_TRANSITION: 'INVALID_STATUS_TRANSITION',
  DUPLICATE_PAYMENT: 'DUPLICATE_PAYMENT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

// Helper: check if a PostgreSQL error has a specific SQLSTATE code.
// Used in route handler catch blocks to map DB errors to HTTP responses.
export function isSqlState(err: unknown, sqlstate: string): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: string }).code === sqlstate
  );
}
