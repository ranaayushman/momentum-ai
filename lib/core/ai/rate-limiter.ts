// ============================================================
// AI Runtime — Rate Limiter
// Sliding-window rate limiter preventing excessive Gemini usage.
// Tracks requests per minute (RPM) and per day (RPD) per user.
// Uses in-memory storage suitable for Next.js Edge/Node runtimes.
// ============================================================

import { RateLimitError } from './errors';
import { DEFAULT_RATE_LIMIT_RPM, DEFAULT_RATE_LIMIT_RPD } from './constants';

// ─── Window Tracking ──────────────────────────────────────────

interface WindowRecord {
  /** Timestamps of requests in the current minute window. */
  minuteTimestamps: number[];
  /** Timestamps of requests in the current day window. */
  dayTimestamps: number[];
}

const ONE_MINUTE_MS = 60 * 1_000;
const ONE_DAY_MS = 24 * 60 * 60 * 1_000;

// In-memory store: userId → WindowRecord
// For multi-instance deployments, swap this with Redis or Firestore counters.
const _store = new Map<string, WindowRecord>();

// ─── Helpers ──────────────────────────────────────────────────

function getOrCreate(userId: string): WindowRecord {
  if (!_store.has(userId)) {
    _store.set(userId, { minuteTimestamps: [], dayTimestamps: [] });
  }
  return _store.get(userId)!;
}

function pruneWindow(timestamps: number[], windowMs: number, now: number): number[] {
  return timestamps.filter((t) => now - t < windowMs);
}

// ─── Rate Limiter ─────────────────────────────────────────────

export interface RateLimiterConfig {
  rpm?: number;
  rpd?: number;
}

/**
 * Checks and records a request for the given user.
 * Throws RateLimitError if either the per-minute or per-day limit is exceeded.
 *
 * Call `checkAndRecord()` BEFORE dispatching any Gemini request.
 *
 * @param userId  - Identifier for the user (or 'global' for system requests).
 * @param config  - Optional override of RPM/RPD limits.
 */
export function checkAndRecord(userId: string, config: RateLimiterConfig = {}): void {
  const rpm = config.rpm ?? DEFAULT_RATE_LIMIT_RPM;
  const rpd = config.rpd ?? DEFAULT_RATE_LIMIT_RPD;
  const now = Date.now();

  const record = getOrCreate(userId);

  // Prune stale timestamps
  record.minuteTimestamps = pruneWindow(record.minuteTimestamps, ONE_MINUTE_MS, now);
  record.dayTimestamps = pruneWindow(record.dayTimestamps, ONE_DAY_MS, now);

  if (record.minuteTimestamps.length >= rpm) {
    throw new RateLimitError(`Exceeded ${rpm} requests per minute.`);
  }
  if (record.dayTimestamps.length >= rpd) {
    throw new RateLimitError(`Exceeded ${rpd} requests per day.`);
  }

  // Record this request
  record.minuteTimestamps.push(now);
  record.dayTimestamps.push(now);
}

/**
 * Returns the current usage stats for a user without recording a request.
 */
export function getUsageStats(userId: string, config: RateLimiterConfig = {}): {
  requestsThisMinute: number;
  requestsToday: number;
  remainingThisMinute: number;
  remainingToday: number;
} {
  const rpm = config.rpm ?? DEFAULT_RATE_LIMIT_RPM;
  const rpd = config.rpd ?? DEFAULT_RATE_LIMIT_RPD;
  const now = Date.now();
  const record = getOrCreate(userId);

  const minuteCount = pruneWindow(record.minuteTimestamps, ONE_MINUTE_MS, now).length;
  const dayCount = pruneWindow(record.dayTimestamps, ONE_DAY_MS, now).length;

  return {
    requestsThisMinute: minuteCount,
    requestsToday: dayCount,
    remainingThisMinute: Math.max(0, rpm - minuteCount),
    remainingToday: Math.max(0, rpd - dayCount),
  };
}

/**
 * Resets all rate-limit records. Use in tests or admin tooling only.
 * @internal
 */
export function _resetRateLimiterForTesting(): void {
  _store.clear();
}
