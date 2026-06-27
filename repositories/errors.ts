// ============================================================
// Repository-specific error classes.
// All Firestore / Firebase exceptions are wrapped here.
// Raw Firebase errors must NEVER propagate beyond the repository.
// ============================================================

/**
 * Base class for all repository errors.
 */
export class RepositoryError extends Error {
  public readonly code: string;
  public readonly cause?: unknown;

  constructor(message: string, code: string, cause?: unknown) {
    super(message);
    this.name = 'RepositoryError';
    this.code = code;
    this.cause = cause;
  }
}

/**
 * Thrown when a requested document is not found.
 */
export class DocumentNotFoundError extends RepositoryError {
  constructor(collection: string, id: string, cause?: unknown) {
    super(
      `Document not found in collection "${collection}" with id "${id}".`,
      'DOCUMENT_NOT_FOUND',
      cause,
    );
    this.name = 'DocumentNotFoundError';
  }
}

/**
 * Thrown when a Firestore write operation fails.
 */
export class WriteFailedError extends RepositoryError {
  constructor(collection: string, operation: string, cause?: unknown) {
    super(
      `Failed to perform "${operation}" in collection "${collection}".`,
      'WRITE_FAILED',
      cause,
    );
    this.name = 'WriteFailedError';
  }
}

/**
 * Thrown when a Firestore read operation fails.
 */
export class ReadFailedError extends RepositoryError {
  constructor(collection: string, operation: string, cause?: unknown) {
    super(
      `Failed to perform "${operation}" in collection "${collection}".`,
      'READ_FAILED',
      cause,
    );
    this.name = 'ReadFailedError';
  }
}

/**
 * Thrown when a Firestore delete operation fails.
 */
export class DeleteFailedError extends RepositoryError {
  constructor(collection: string, id: string, cause?: unknown) {
    super(
      `Failed to delete document "${id}" in collection "${collection}".`,
      'DELETE_FAILED',
      cause,
    );
    this.name = 'DeleteFailedError';
  }
}

/**
 * Utility: wraps an unknown error into a RepositoryError if it isn't one already.
 */
export function toRepositoryError(err: unknown, fallbackMessage: string): RepositoryError {
  if (err instanceof RepositoryError) return err;
  return new RepositoryError(
    fallbackMessage,
    'UNKNOWN_REPOSITORY_ERROR',
    err,
  );
}
