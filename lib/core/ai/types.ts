// ============================================================
// AI Runtime — Types
// Shared TypeScript types for the entire AI runtime.
// No Gemini SDK types are re-exported from here intentionally —
// the runtime abstracts them away from callers.
// ============================================================

import type {
  DEFAULT_MODEL,
  FAST_MODEL,
  PRO_MODEL,
} from './constants';

// ─── Model ────────────────────────────────────────────────────

export type AIModel =
  | typeof DEFAULT_MODEL
  | typeof FAST_MODEL
  | typeof PRO_MODEL
  | (string & {}); // Allow string literals for future models without losing type safety

// ─── Generation Config ────────────────────────────────────────

export interface AIGenerationConfig {
  temperature?: number;
  topP?: number;
  maxOutputTokens?: number;
  stopSequences?: string[];
}

// ─── Request ──────────────────────────────────────────────────

export type AIResponseFormat = 'text' | 'json' | 'structured';

export interface AIMessage {
  role: 'user' | 'model';
  content: string;
}

/**
 * The canonical input to aiRuntime.generate().
 * Every agent builds an AIRequestConfig and passes it to the runtime.
 */
export interface AIRequestConfig {
  /** The user prompt or task description. */
  prompt: string;
  /** Optional system instructions (persona, constraints). */
  systemInstruction?: string;
  /** Prior conversation turns for multi-turn contexts. */
  history?: AIMessage[];
  /** Override the default model. */
  model?: AIModel;
  /** Override generation parameters. */
  generationConfig?: AIGenerationConfig;
  /** Expected response format. Defaults to 'text'. */
  responseFormat?: AIResponseFormat;
  /** JSON schema for structured output (used when responseFormat is 'structured'). */
  responseSchema?: Record<string, unknown>;
  /** Number of retry attempts. Falls back to DEFAULT_RETRY_LIMIT. */
  maxRetries?: number;
  /** Request timeout override in ms. Falls back to REQUEST_TIMEOUT_MS. */
  timeoutMs?: number;
  /** Arbitrary metadata passed through to logs and response metadata. */
  metadata?: Record<string, string | number | boolean>;
}

// ─── Response ─────────────────────────────────────────────────

export interface AIResponseMeta {
  /** Gemini model that served the request. */
  model: AIModel;
  /** Wall-clock execution time in milliseconds. */
  executionTimeMs: number;
  /** Number of retries consumed (0 = first attempt succeeded). */
  retries: number;
  /** ISO timestamp of when the response was received. */
  timestamp: string;
  /** Input token count (if available from the response). */
  inputTokens?: number;
  /** Output token count (if available from the response). */
  outputTokens?: number;
  /** Any arbitrary metadata echoed from the request. */
  requestMetadata?: Record<string, string | number | boolean>;
}

export interface AIResponse<T = string> {
  success: boolean;
  data: T | null;
  error: AIRuntimeError | null;
  meta: AIResponseMeta;
}

// ─── Execution Context ────────────────────────────────────────

/**
 * Execution context threaded through the runtime pipeline.
 * Carries the correlation ID used for logging.
 */
export interface AIExecutionContext {
  requestId: string;
  userId?: string;
  agentName?: string;
  startedAt: number; // performance.now() epoch
}

// ─── Safety ───────────────────────────────────────────────────

export interface AISafetySetting {
  category: string;
  threshold: string;
}

// ─── Error base ───────────────────────────────────────────────

export interface AIRuntimeError {
  code: string;
  message: string;
  retryable: boolean;
  cause?: unknown;
}
