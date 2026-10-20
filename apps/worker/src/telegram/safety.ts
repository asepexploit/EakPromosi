import { AppError } from '@eak/config';

/**
 * Shared retry policies for Telegram errors. Imported by every userbot worker;
 * do not duplicate these constants per-queue.
 *
 * See .claude/rules/telegram.md + skill `telegram-safety`.
 */

export interface FloodWaitError extends Error {
  seconds: number;
}

const FLOOD_WAIT_NAMES = new Set(['FloodWaitError', 'FLOOD_WAIT', 'FloodError']);
const BAN_NAMES = new Set([
  'UserDeactivated',
  'UserDeactivatedError',
  'PhoneNumberBanned',
  'PhoneNumberBannedError',
  'AuthKeyUnregistered',
  'AuthKeyUnregisteredError',
  'SessionRevokedError',
]);
const PERMANENT_SEND_NAMES = new Set([
  'ChatWriteForbidden',
  'ChatWriteForbiddenError',
  'ChatAdminRequired',
  'UserBannedInChannel',
]);

export function isFloodWait(e: unknown): e is FloodWaitError {
  return isNamedError(e, FLOOD_WAIT_NAMES) && typeof (e as FloodWaitError).seconds === 'number';
}
export function isAccountKilled(e: unknown): boolean {
  return isNamedError(e, BAN_NAMES);
}
export function isPermanentSendFailure(e: unknown): boolean {
  return isNamedError(e, PERMANENT_SEND_NAMES);
}

function isNamedError(e: unknown, names: Set<string>): boolean {
  if (!e || typeof e !== 'object') return false;
  const name = (e as { name?: string }).name;
  const errorMessage = (e as { errorMessage?: string }).errorMessage;
  return (typeof name === 'string' && names.has(name)) || (typeof errorMessage === 'string' && names.has(errorMessage));
}

/** Random jitter in `[minSec, maxSec]` inclusive, returned as milliseconds. */
export function jitterMs(minSec: number, maxSec: number): number {
  const span = maxSec - minSec;
  return Math.floor((minSec + Math.random() * span) * 1000);
}

export class RetryableJobError extends Error {
  constructor(public readonly delayMs: number, cause?: unknown) {
    super(`retry in ${delayMs}ms`);
    this.name = 'RetryableJobError';
    if (cause) (this as { cause?: unknown }).cause = cause;
  }
}

export class NonRetryableJobError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super('TELEGRAM_ERROR', message, { context });
    this.name = 'NonRetryableJobError';
  }
}

/**
 * Standard try/catch wrapper for Telegram userbot calls. Caller is
 * responsible for throwing — we only translate the error shape.
 */
export async function runTelegramCall<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (isFloodWait(err)) {
      throw new RetryableJobError(err.seconds * 1000 + jitterMs(5, 30), err);
    }
    if (isAccountKilled(err)) {
      throw new NonRetryableJobError('Account killed by Telegram', { kind: 'account_killed' });
    }
    if (isPermanentSendFailure(err)) {
      throw new NonRetryableJobError('Chat refuses writes', { kind: 'permanent_send' });
    }
    throw err;
  }
}
