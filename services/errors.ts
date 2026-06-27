// ============================================================
// Service Layer - Error Classes
// Custom service-level errors.
// Raw repository errors are wrapped here before surfacing to callers.
// ============================================================

/**
 * Base class for all service-level errors.
 */
export class ServiceError extends Error {
  public readonly code: string;
  public readonly cause?: unknown;

  constructor(message: string, code: string, cause?: unknown) {
    super(message);
    this.name = 'ServiceError';
    this.code = code;
    this.cause = cause;
  }
}

/**
 * Thrown when input validation fails before reaching the repository.
 */
export class ValidationError extends ServiceError {
  public readonly field?: string;

  constructor(message: string, field?: string) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
    this.field = field;
  }
}

/**
 * Thrown when a requested resource cannot be found via the repository.
 */
export class NotFoundError extends ServiceError {
  constructor(resource: string, id: string) {
    super(`${resource} with id "${id}" was not found.`, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

/**
 * Thrown when the caller is not permitted to perform an action.
 */
export class UnauthorizedError extends ServiceError {
  constructor(action: string) {
    super(`Not authorized to perform action: "${action}".`, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

/**
 * General operation failure that wraps a lower-level cause.
 */
export class OperationFailedError extends ServiceError {
  constructor(operation: string, cause?: unknown) {
    super(
      `Service operation "${operation}" failed.`,
      'OPERATION_FAILED',
      cause,
    );
    this.name = 'OperationFailedError';
  }
}

/**
 * Utility: wraps any unknown error as a ServiceError.
 */
export function toServiceError(err: unknown, operation: string): ServiceError {
  if (err instanceof ServiceError) return err;
  return new OperationFailedError(operation, err);
}
