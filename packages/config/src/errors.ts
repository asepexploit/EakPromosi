export type ErrorCode =
  // generic
  | 'INTERNAL'
  | 'VALIDATION_FAILED'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'IDEMPOTENT_REPLAY'
  // domain
  | 'TENANT_SUSPENDED'
  | 'ACCOUNT_FLOOD_WAIT'
  | 'ACCOUNT_BANNED'
  | 'TELEGRAM_ERROR'
  // billing enforcement (402)
  | 'PLAN_LIMIT_ACCOUNTS'
  | 'PLAN_LIMIT_CAMPAIGNS'
  | 'PLAN_LIMIT_BROADCASTS_PER_DAY'
  | 'PLAN_LIMIT_DISCOVERY_SOURCES'
  | 'PLAN_FEATURE_DISABLED'
  // webhook
  | 'WEBHOOK_SIGNATURE_INVALID'
  | 'WEBHOOK_REPLAY'
  | 'WEBHOOK_UNKNOWN_EVENT';

export interface AppErrorOptions {
  httpStatus?: number;
  cause?: unknown;
  context?: Record<string, unknown>;
}

/**
 * One concrete Error class across the codebase. Carries a stable `code`
 * (consumed by the UI and other services) and a matching HTTP status.
 */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly httpStatus: number;
  override readonly cause?: unknown;
  readonly context?: Record<string, unknown>;

  constructor(code: ErrorCode, message: string, opts: AppErrorOptions = {}) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.httpStatus = opts.httpStatus ?? defaultHttpStatus(code);
    if (opts.cause !== undefined) this.cause = opts.cause;
    if (opts.context !== undefined) this.context = opts.context;
  }

  toJSON(): { code: ErrorCode; message: string; context?: Record<string, unknown> } {
    const base: { code: ErrorCode; message: string; context?: Record<string, unknown> } = {
      code: this.code,
      message: this.message,
    };
    if (this.context) base.context = this.context;
    return base;
  }
}

function defaultHttpStatus(code: ErrorCode): number {
  switch (code) {
    case 'VALIDATION_FAILED':
      return 422;
    case 'UNAUTHORIZED':
      return 401;
    case 'FORBIDDEN':
    case 'TENANT_SUSPENDED':
      return 403;
    case 'NOT_FOUND':
      return 404;
    case 'CONFLICT':
    case 'IDEMPOTENT_REPLAY':
      return 409;
    case 'RATE_LIMITED':
    case 'ACCOUNT_FLOOD_WAIT':
      return 429;
    case 'PLAN_LIMIT_ACCOUNTS':
    case 'PLAN_LIMIT_CAMPAIGNS':
    case 'PLAN_LIMIT_BROADCASTS_PER_DAY':
    case 'PLAN_LIMIT_DISCOVERY_SOURCES':
    case 'PLAN_FEATURE_DISABLED':
      return 402;
    case 'WEBHOOK_SIGNATURE_INVALID':
      return 401;
    case 'WEBHOOK_REPLAY':
      return 409;
    case 'WEBHOOK_UNKNOWN_EVENT':
      return 400;
    case 'ACCOUNT_BANNED':
    case 'TELEGRAM_ERROR':
    case 'INTERNAL':
    default:
      return 500;
  }
}

export function isAppError(e: unknown): e is AppError {
  return e instanceof AppError;
}
