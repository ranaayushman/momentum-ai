// ============================================================
// Base Service
// Reusable helpers for pagination, sorting, validation,
// error handling, and common patterns shared across services.
// ============================================================

import { ServiceError, ValidationError, toServiceError } from './errors';

// ─── Pagination ───────────────────────────────────────────────

/** Standard paginated response returned by service methods. */
export interface ServicePage<T> {
  items: T[];
  /** True if there are more records beyond this page. */
  hasMore: boolean;
  /** Opaque cursor token to fetch the next page. */
  nextCursor: string | null;
}

// ─── Sorting ──────────────────────────────────────────────────

export type SortOrder = 'asc' | 'desc';

export interface SortConfig<TField extends string> {
  field: TField;
  order: SortOrder;
}

// ─── Date Helpers ─────────────────────────────────────────────

/**
 * Returns today's date as an ISO YYYY-MM-DD string in local time.
 */
export function getTodayDateString(): string {
  const now = new Date();
  return now.toISOString().slice(0, 10);
}

/**
 * Returns the current ISO timestamp string.
 */
export function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Parses an ISO date string and checks if it is in the past.
 */
export function isOverdue(dueDateIso: string | null): boolean {
  if (!dueDateIso) return false;
  return new Date(dueDateIso) < new Date();
}

/**
 * Computes the number of days between two ISO date strings.
 * Positive → second date is in the future relative to the first.
 */
export function daysBetween(fromIso: string, toIso: string): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((new Date(toIso).getTime() - new Date(fromIso).getTime()) / msPerDay);
}

// ─── Validation Helpers ───────────────────────────────────────

/**
 * Asserts that a string is non-empty, throwing ValidationError otherwise.
 */
export function assertNonEmpty(value: string, fieldName: string): void {
  if (!value || value.trim().length === 0) {
    throw new ValidationError(`"${fieldName}" must not be empty.`, fieldName);
  }
}

/**
 * Asserts that a string is a valid ISO YYYY-MM-DD date.
 */
export function assertValidDate(value: string, fieldName: string): void {
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  if (!iso.test(value) || isNaN(new Date(value).getTime())) {
    throw new ValidationError(`"${fieldName}" must be a valid ISO date (YYYY-MM-DD).`, fieldName);
  }
}

/**
 * Asserts that a number is within an inclusive range.
 */
export function assertInRange(
  value: number,
  min: number,
  max: number,
  fieldName: string,
): void {
  if (value < min || value > max) {
    throw new ValidationError(
      `"${fieldName}" must be between ${min} and ${max}. Got ${value}.`,
      fieldName,
    );
  }
}

// ─── Error Wrapping ───────────────────────────────────────────

/**
 * Wraps any thrown error as a ServiceError, re-throwing it.
 * Use inside try/catch blocks in service methods.
 */
export function wrapServiceError(err: unknown, operation: string): never {
  throw toServiceError(err, operation);
}

// ─── Base Service Abstract Class ─────────────────────────────

/**
 * Abstract base providing shared helpers to all concrete services.
 * Services do NOT extend a base that touches Firestore — they only
 * inherit utility methods here.
 */
export abstract class BaseService {
  protected getTodayDateString = getTodayDateString;
  protected nowIso = nowIso;
  protected isOverdue = isOverdue;
  protected daysBetween = daysBetween;
  protected assertNonEmpty = assertNonEmpty;
  protected assertValidDate = assertValidDate;
  protected assertInRange = assertInRange;
  protected wrapServiceError = wrapServiceError;

  /**
   * Guards a service method: if it throws a ServiceError, re-throws it;
   * otherwise wraps it in an OperationFailedError.
   */
  protected async run<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      if (err instanceof ServiceError) throw err;
      throw toServiceError(err, operation);
    }
  }
}
