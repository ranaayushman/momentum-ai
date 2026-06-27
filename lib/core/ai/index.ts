// ============================================================
// AI Runtime — Public Barrel Export
// The single import point for every consumer of the AI runtime.
// Agents, API routes, and services import from this file only.
// ============================================================

// ─── Runtime (primary API) ────────────────────────────────────
export { aiRuntime } from './runtime';

// ─── Types ────────────────────────────────────────────────────
export type {
  AIModel,
  AIGenerationConfig,
  AIResponseFormat,
  AIMessage,
  AIRequestConfig,
  AIResponse,
  AIResponseMeta,
  AIExecutionContext,
  AISafetySetting,
  AIRuntimeError,
} from './types';

// ─── Errors ───────────────────────────────────────────────────
export {
  AIError,
  GeminiError,
  AuthenticationError,
  RateLimitError,
  ParsingError,
  ValidationError,
  RetryLimitExceededError,
  TimeoutError,
  mapGeminiError,
} from './errors';

// ─── Config ───────────────────────────────────────────────────
export {
  AI_RUNTIME_CONFIG,
  DEFAULT_SAFETY_SETTINGS,
  BALANCED_GENERATION,
  CREATIVE_GENERATION,
  PRECISE_GENERATION,
  EXTENDED_GENERATION,
} from './config';
export type { AIRuntimeConfig } from './config';

// ─── Constants ────────────────────────────────────────────────
export {
  DEFAULT_MODEL,
  FAST_MODEL,
  PRO_MODEL,
  DEFAULT_TEMPERATURE,
  DEFAULT_TOP_P,
  DEFAULT_MAX_OUTPUT_TOKENS,
  EXTENDED_MAX_OUTPUT_TOKENS,
  DEFAULT_RETRY_LIMIT,
  REQUEST_TIMEOUT_MS,
  DEFAULT_RATE_LIMIT_RPM,
  DEFAULT_RATE_LIMIT_RPD,
} from './constants';

// ─── Parser ───────────────────────────────────────────────────
export {
  parseText,
  parseJson,
  parseStructured,
  parseAuto,
  safeParseJson,
} from './parser';
export type { ParseResult } from './parser';

// ─── Validator ────────────────────────────────────────────────
export {
  validateResponse,
  validateResponseArray,
  validateTextResponse,
} from './validator';
export type { FieldSchema, FieldType, ResponseSchema } from './validator';

// ─── Rate Limiter (for advanced usage) ───────────────────────
export { checkAndRecord, getUsageStats } from './rate-limiter';
export type { RateLimiterConfig } from './rate-limiter';

// ─── Response Builders (for runtime extensions) ───────────────
export { successResponse, failureResponse } from './response';
export type { BuildResponseParams } from './response';

// ─── Logger (for agent-level logging) ────────────────────────
export { aiLogger } from './logger';
export type { LogLevel } from './logger';
