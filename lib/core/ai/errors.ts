// ============================================================
// AI Runtime — Errors
// Typed error classes for every failure mode in the runtime.
// Raw Gemini SDK errors are never surfaced beyond this module.
// ============================================================

import type { AIRuntimeError } from './types';

/**
 * Base class for all AI runtime errors.
 * Implements the AIRuntimeError interface so it is usable
 * both as a thrown Error and as a plain typed object.
 */
export class AIError extends Error implements AIRuntimeError {
  public readonly code: string;
  public readonly retryable: boolean;
  public readonly cause?: unknown;

  constructor(
    message: string,
    code: string,
    retryable: boolean,
    cause?: unknown,
  ) {
    super(message);
    this.name = 'AIError';
    this.code = code;
    this.retryable = retryable;
    this.cause = cause;
  }

  toPlain(): AIRuntimeError {
    return {
      code: this.code,
      message: this.message,
      retryable: this.retryable,
      cause: this.cause,
    };
  }
}

/**
 * Gemini API returned a non-OK status or an unexpected API-level error.
 */
export class GeminiError extends AIError {
  public readonly statusCode?: number;

  constructor(message: string, statusCode?: number, cause?: unknown) {
    super(message, 'GEMINI_ERROR', isRetryableStatus(statusCode), cause);
    this.name = 'GeminiError';
    this.statusCode = statusCode;
  }
}

/**
 * Thrown when the API key is missing or invalid.
 */
export class AuthenticationError extends AIError {
  constructor(cause?: unknown) {
    super(
      'Gemini API key is missing or invalid. Set GEMINI_API_KEY in your environment.',
      'AUTHENTICATION_ERROR',
      false,
      cause,
    );
    this.name = 'AuthenticationError';
  }
}

/**
 * Thrown when the rate limit (RPM or RPD) is exceeded.
 */
export class RateLimitError extends AIError {
  constructor(detail?: string, cause?: unknown) {
    super(
      `AI request rate limit exceeded${detail ? `: ${detail}` : '.'}`,
      'RATE_LIMIT_EXCEEDED',
      true, // retryable with backoff
      cause,
    );
    this.name = 'RateLimitError';
  }
}

/**
 * Thrown when parsing the model's response fails.
 */
export class ParsingError extends AIError {
  public readonly rawResponse: string;

  constructor(rawResponse: string, cause?: unknown) {
    super(
      'Failed to parse the AI response into the expected format.',
      'PARSING_ERROR',
      false, // malformed responses don't benefit from retrying the same prompt
      cause,
    );
    this.name = 'ParsingError';
    this.rawResponse = rawResponse;
  }
}

/**
 * Thrown when the parsed response fails schema validation.
 */
export class ValidationError extends AIError {
  public readonly field?: string;

  constructor(message: string, field?: string, cause?: unknown) {
    super(message, 'VALIDATION_ERROR', false, cause);
    this.name = 'ValidationError';
    this.field = field;
  }
}

/**
 * Thrown when all retry attempts are exhausted.
 */
export class RetryLimitExceededError extends AIError {
  public readonly attempts: number;

  constructor(attempts: number, lastCause?: unknown) {
    super(
      `AI request failed after ${attempts} attempt(s). All retries exhausted.`,
      'RETRY_LIMIT_EXCEEDED',
      false,
      lastCause,
    );
    this.name = 'RetryLimitExceededError';
    this.attempts = attempts;
  }
}

/**
 * Thrown when the request times out.
 */
export class TimeoutError extends AIError {
  constructor(timeoutMs: number, cause?: unknown) {
    super(
      `AI request timed out after ${timeoutMs}ms.`,
      'TIMEOUT',
      true,
      cause,
    );
    this.name = 'TimeoutError';
    this.name = 'TimeoutError';
  }
}

// ─── Helpers ──────────────────────────────────────────────────

/** Determines if an HTTP status code is safe to retry. */
function isRetryableStatus(status?: number): boolean {
  if (!status) return false;
  return [429, 500, 502, 503, 504].includes(status);
}

/**
 * Maps an unknown caught error from the Gemini SDK into a typed AIError.
 * Ensures raw SDK exceptions never propagate beyond the runtime boundary.
 */
export function mapGeminiError(err: unknown): AIError {
  if (err instanceof AIError) return err;

  const message = err instanceof Error ? err.message : String(err);
  const lower = message.toLowerCase();

  if (lower.includes('api_key') || lower.includes('api key') || lower.includes('unauthenticated')) {
    return new AuthenticationError(err);
  }
  if (lower.includes('quota') || lower.includes('rate') || lower.includes('resource_exhausted')) {
    return new RateLimitError(undefined, err);
  }
  if (lower.includes('timeout') || lower.includes('deadline')) {
    return new TimeoutError(0, err);
  }

  // Extract HTTP status if available on the error object
  const statusCode = (err as Record<string, unknown>)?.['status'] as number | undefined;
  return new GeminiError(message, statusCode, err);
}
