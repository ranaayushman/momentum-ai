// ============================================================
// AI Runtime — Response Builder
// Constructs typed AIResponse<T> objects for all runtime outcomes.
// Every runtime execution path returns one of these wrappers.
// ============================================================

import type { AIResponse, AIResponseMeta, AIModel } from './types';
import type { AIError } from './errors';

// ─── Builder ──────────────────────────────────────────────────

export interface BuildResponseParams {
  model: AIModel;
  startedAt: number;      // performance.now() or Date.now() at request start
  retries: number;
  inputTokens?: number;
  outputTokens?: number;
  requestMetadata?: Record<string, string | number | boolean>;
}

function buildMeta(params: BuildResponseParams): AIResponseMeta {
  return {
    model: params.model,
    executionTimeMs: Date.now() - params.startedAt,
    retries: params.retries,
    timestamp: new Date().toISOString(),
    inputTokens: params.inputTokens,
    outputTokens: params.outputTokens,
    requestMetadata: params.requestMetadata,
  };
}

/**
 * Creates a successful AIResponse<T>.
 */
export function successResponse<T>(
  data: T,
  params: BuildResponseParams,
): AIResponse<T> {
  return {
    success: true,
    data,
    error: null,
    meta: buildMeta(params),
  };
}

/**
 * Creates a failed AIResponse<T>.
 */
export function failureResponse<T = never>(
  error: AIError,
  params: BuildResponseParams,
): AIResponse<T> {
  return {
    success: false,
    data: null,
    error: error.toPlain(),
    meta: buildMeta(params),
  };
}
