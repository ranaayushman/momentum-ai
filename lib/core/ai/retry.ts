// ============================================================
// AI Runtime — Retry Strategy
// Exponential backoff with jitter and a configurable retry cap.
// Only retryable AIErrors trigger a retry.
// ============================================================

import { RETRY_BASE_DELAY_MS, RETRY_MAX_DELAY_MS } from './constants';
import type { AIError } from './errors';
import { RetryLimitExceededError } from './errors';
import { aiLogger } from './logger';
import type { AIExecutionContext } from './types';

// ─── Delay ────────────────────────────────────────────────────

/**
 * Computes the delay for attempt N using exponential backoff with ±20% jitter.
 */
function computeDelay(attempt: number): number {
  const exponential = RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
  const capped = Math.min(exponential, RETRY_MAX_DELAY_MS);
  // Add ±20% jitter to avoid thundering-herd retries
  const jitter = capped * 0.2 * (Math.random() * 2 - 1);
  return Math.max(0, Math.round(capped + jitter));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Retry Executor ───────────────────────────────────────────

export interface RetryOptions {
  maxAttempts: number;
  ctx: AIExecutionContext;
}

/**
 * Executes `fn` up to `maxAttempts` times, retrying on retryable AIErrors
 * with exponential backoff. Throws RetryLimitExceededError when exhausted.
 *
 * @param fn     - Async function to execute. Must throw an AIError on failure.
 * @param opts   - Retry configuration.
 * @returns      - The successful result of `fn`.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions,
): Promise<{ result: T; attempts: number }> {
  const { maxAttempts, ctx } = opts;
  let lastError: AIError | undefined;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const result = await fn();
      return { result, attempts: attempt + 1 };
    } catch (err) {
      lastError = err as AIError;

      // Non-retryable error — surface immediately
      if (!lastError.retryable) {
        throw lastError;
      }

      // Exhausted
      if (attempt === maxAttempts - 1) {
        break;
      }

      const delayMs = computeDelay(attempt);
      aiLogger.logRetry(ctx, attempt + 1, delayMs, lastError.message);
      await sleep(delayMs);
    }
  }

  throw new RetryLimitExceededError(maxAttempts, lastError);
}
