// ============================================================
// AI Runtime — Logger
// Structured logging for AI request lifecycle events.
// NEVER logs raw user prompt content in production.
// ============================================================

import type { AIExecutionContext, AIResponseMeta } from './types';
import type { AIError } from './errors';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const IS_DEV = process.env.NODE_ENV === 'development';

/** Conditionally enables verbose debug logging in development only. */
const DEBUG_ENABLED = IS_DEV || process.env.AI_RUNTIME_DEBUG === 'true';

// ─── Log Entries ──────────────────────────────────────────────

interface BaseLog {
  level: LogLevel;
  timestamp: string;
  requestId: string;
  agentName?: string;
  userId?: string;  // anonymized reference — never log PII
}

interface RequestStartLog extends BaseLog {
  event: 'REQUEST_START';
  model: string;
  hasHistory: boolean;
  responseFormat: string;
}

interface RequestSuccessLog extends BaseLog {
  event: 'REQUEST_SUCCESS';
  model: string;
  executionTimeMs: number;
  retries: number;
  inputTokens?: number;
  outputTokens?: number;
}

interface RequestFailureLog extends BaseLog {
  event: 'REQUEST_FAILURE';
  errorCode: string;
  errorMessage: string;
  retries: number;
  executionTimeMs: number;
}

interface RetryLog extends BaseLog {
  event: 'RETRY';
  attempt: number;
  delayMs: number;
  reason: string;
}

type AuditLog =
  | RequestStartLog
  | RequestSuccessLog
  | RequestFailureLog
  | RetryLog;

// ─── Output ───────────────────────────────────────────────────

function emit(log: AuditLog): void {
  if (log.level === 'debug' && !DEBUG_ENABLED) return;

  const line = JSON.stringify(log);
  switch (log.level) {
    case 'debug': console.debug(line); break;
    case 'info':  console.info(line);  break;
    case 'warn':  console.warn(line);  break;
    case 'error': console.error(line); break;
  }
}

// ─── Public API ───────────────────────────────────────────────

export const aiLogger = {
  /**
   * Called before the Gemini request is dispatched.
   * Logs model, format, and correlation ID. Never logs prompt content.
   */
  logRequestStart(
    ctx: AIExecutionContext,
    model: string,
    responseFormat: string,
    hasHistory: boolean,
  ): void {
    emit({
      level: 'info',
      event: 'REQUEST_START',
      timestamp: new Date().toISOString(),
      requestId: ctx.requestId,
      agentName: ctx.agentName,
      userId: ctx.userId,
      model,
      responseFormat,
      hasHistory,
    });
  },

  /**
   * Called after a successful Gemini response.
   */
  logRequestSuccess(ctx: AIExecutionContext, meta: AIResponseMeta): void {
    emit({
      level: 'info',
      event: 'REQUEST_SUCCESS',
      timestamp: new Date().toISOString(),
      requestId: ctx.requestId,
      agentName: ctx.agentName,
      userId: ctx.userId,
      model: String(meta.model),
      executionTimeMs: meta.executionTimeMs,
      retries: meta.retries,
      inputTokens: meta.inputTokens,
      outputTokens: meta.outputTokens,
    });
  },

  /**
   * Called after all retries are exhausted or a non-retryable error occurs.
   */
  logRequestFailure(
    ctx: AIExecutionContext,
    error: AIError,
    retries: number,
    executionTimeMs: number,
  ): void {
    emit({
      level: 'error',
      event: 'REQUEST_FAILURE',
      timestamp: new Date().toISOString(),
      requestId: ctx.requestId,
      agentName: ctx.agentName,
      userId: ctx.userId,
      errorCode: error.code,
      errorMessage: error.message,
      retries,
      executionTimeMs,
    });
  },

  /**
   * Called before each retry attempt.
   */
  logRetry(
    ctx: AIExecutionContext,
    attempt: number,
    delayMs: number,
    reason: string,
  ): void {
    emit({
      level: 'warn',
      event: 'RETRY',
      timestamp: new Date().toISOString(),
      requestId: ctx.requestId,
      agentName: ctx.agentName,
      userId: ctx.userId,
      attempt,
      delayMs,
      reason,
    });
  },

  /**
   * Generic debug line — only emitted in development.
   */
  debug(requestId: string, message: string): void {
    if (!DEBUG_ENABLED) return;
    emit({
      level: 'debug',
      event: 'REQUEST_START', // reuse a valid union type — debug is informal
      timestamp: new Date().toISOString(),
      requestId,
      model: '',
      responseFormat: 'debug',
      hasHistory: false,
    } as RequestStartLog);
    // Print the actual message separately
    console.debug(JSON.stringify({ level: 'debug', requestId, message }));
  },
};
