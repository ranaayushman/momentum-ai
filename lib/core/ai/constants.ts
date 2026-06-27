// ============================================================
// AI Runtime — Constants
// All magic values for the AI runtime centralized here.
// Agents and runtime code must never hardcode these values.
// ============================================================

/** Default Gemini model used across the runtime. Override per-agent via AIRequestConfig. */
export const DEFAULT_MODEL = 'gemini-2.0-flash' as const;

/** Flash-lite model for fast, low-cost non-critical requests. */
export const FAST_MODEL = 'gemini-2.0-flash-lite' as const;

/** Pro model for complex, long-context tasks. */
export const PRO_MODEL = 'gemini-2.5-pro' as const;

/** Default generation temperature (balanced between creativity and precision). */
export const DEFAULT_TEMPERATURE = 0.4;

/** Default topP nucleus sampling value. */
export const DEFAULT_TOP_P = 0.9;

/** Default maximum output tokens for standard requests. */
export const DEFAULT_MAX_OUTPUT_TOKENS = 4096;

/** Maximum output tokens for extended / long-form responses. */
export const EXTENDED_MAX_OUTPUT_TOKENS = 8192;

/** Default retry limit for transient failures. */
export const DEFAULT_RETRY_LIMIT = 3;

/** Base delay in milliseconds for the first retry (exponential backoff). */
export const RETRY_BASE_DELAY_MS = 500;

/** Maximum delay cap in milliseconds for exponential backoff. */
export const RETRY_MAX_DELAY_MS = 10_000;

/** Request timeout in milliseconds before aborting. */
export const REQUEST_TIMEOUT_MS = 30_000;

/** Default rate limit: max requests per minute per user. */
export const DEFAULT_RATE_LIMIT_RPM = 30;

/** Default rate limit: max requests per day per user. */
export const DEFAULT_RATE_LIMIT_RPD = 500;

/** HTTP status codes that are safe to retry. */
export const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

/** Gemini API error codes that should trigger a retry. */
export const RETRYABLE_ERROR_CODES = new Set([
  'RESOURCE_EXHAUSTED',
  'INTERNAL',
  'UNAVAILABLE',
  'DEADLINE_EXCEEDED',
]);
