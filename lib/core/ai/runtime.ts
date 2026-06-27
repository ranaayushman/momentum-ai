// ============================================================
// AI Runtime — Core Runtime
// The single entry point for all Gemini interactions.
// Every agent calls aiRuntime.generate() — nothing else.
//
// Pipeline per request:
//   1. Validate inputs
//   2. Check rate limits
//   3. Build Gemini request (system instruction, history, schema)
//   4. Execute with retry + timeout
//   5. Parse response
//   6. Validate output
//   7. Return typed AIResponse<T>
// ============================================================

import { getGeminiClient } from './client';
import { AI_RUNTIME_CONFIG } from './config';
import { aiLogger } from './logger';
import { withRetry } from './retry';
import { checkAndRecord } from './rate-limiter';
import { parseText, parseJson, parseStructured } from './parser';
import { validateTextResponse } from './validator';
import { mapGeminiError, AIError, TimeoutError } from './errors';
import { successResponse, failureResponse } from './response';
import type {
  AIRequestConfig,
  AIResponse,
  AIExecutionContext,
} from './types';
import { REQUEST_TIMEOUT_MS } from './constants';

// ─── Helpers ──────────────────────────────────────────────────

let _requestCounter = 0;

function generateRequestId(): string {
  _requestCounter += 1;
  return `ai-req-${Date.now()}-${_requestCounter}`;
}

/**
 * Wraps a promise with a hard timeout.
 */
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new TimeoutError(timeoutMs)),
      timeoutMs,
    );
  });

  try {
    const result = await Promise.race([promise, timeout]);
    clearTimeout(timer!);
    return result;
  } catch (err) {
    clearTimeout(timer!);
    throw err;
  }
}

// ─── Runtime Class ────────────────────────────────────────────

class AIRuntime {
  /**
   * Executes a Gemini request and returns a typed AIResponse<T>.
   *
   * This is the ONLY method agents should call. It handles everything:
   * rate limiting, retries, parsing, validation, logging, and error wrapping.
   *
   * @param config   - The request configuration built by the agent.
   * @param userId   - Optional user ID for rate limiting and logging.
   * @param agentName - Optional agent name for structured logging.
   */
  async generate<T = string>(
    config: AIRequestConfig,
    userId?: string,
    agentName?: string,
  ): Promise<AIResponse<T>> {
    const requestId = generateRequestId();
    const startedAt = Date.now();
    const ctx: AIExecutionContext = {
      requestId,
      userId,
      agentName,
      startedAt,
    };

    const model = config.model ?? AI_RUNTIME_CONFIG.defaultModel;
    const responseFormat = config.responseFormat ?? 'text';
    const maxRetries = config.maxRetries ?? AI_RUNTIME_CONFIG.defaultMaxRetries;
    const timeoutMs = config.timeoutMs ?? REQUEST_TIMEOUT_MS;
    const generationConfig = {
      ...AI_RUNTIME_CONFIG.defaultGenerationConfig,
      ...config.generationConfig,
    };

    const baseParams = {
      model,
      startedAt,
      retries: 0,
      requestMetadata: config.metadata,
    };

    // ── 1. Rate Limit Check ──────────────────────────────────
    try {
      checkAndRecord(userId ?? 'global');
    } catch (err) {
      const aiErr = err as AIError;
      aiLogger.logRequestFailure(ctx, aiErr, 0, Date.now() - startedAt);
      return failureResponse<T>(aiErr, baseParams);
    }

    // ── 2. Log Start ─────────────────────────────────────────
    aiLogger.logRequestStart(ctx, String(model), responseFormat, !!config.history?.length);

    // ── 3. Execute with Retry ────────────────────────────────
    let retryCount = 0;

    try {
      const { result: rawText, attempts } = await withRetry(
        async () => {
          try {
            const geminiResult = await withTimeout(
              this._callGemini(config, model, generationConfig),
              timeoutMs,
            );
            return geminiResult;
          } catch (err) {
            throw mapGeminiError(err);
          }
        },
        { maxAttempts: maxRetries, ctx },
      );

      retryCount = attempts - 1;

      // ── 4. Parse ─────────────────────────────────────────
      let parsed: T;
      switch (responseFormat) {
        case 'json':
          parsed = parseJson<T>(rawText);
          break;
        case 'structured':
          parsed = parseStructured<T>(rawText);
          break;
        default:
          validateTextResponse(rawText);
          parsed = parseText(rawText) as T;
      }

      // ── 5. Success ───────────────────────────────────────
      const responseParams = { ...baseParams, retries: retryCount };
      const response = successResponse<T>(parsed, responseParams);
      aiLogger.logRequestSuccess(ctx, response.meta);
      return response;

    } catch (err) {
      const aiErr = err instanceof AIError ? err : mapGeminiError(err);
      aiLogger.logRequestFailure(ctx, aiErr, retryCount, Date.now() - startedAt);
      return failureResponse<T>(aiErr, { ...baseParams, retries: retryCount });
    }
  }

  /**
   * Internal: builds and dispatches the raw Gemini API call.
   * Returns the extracted text from the model response.
   * @private
   */
  private async _callGemini(
    config: AIRequestConfig,
    model: string,
    generationConfig: Record<string, unknown>,
  ): Promise<string> {
    const client = getGeminiClient();

    // Build contents array
    const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

    // Append conversation history
    if (config.history?.length) {
      for (const msg of config.history) {
        contents.push({
          role: msg.role,
          parts: [{ text: msg.content }],
        });
      }
    }

    // Append the current user prompt
    contents.push({
      role: 'user',
      parts: [{ text: config.prompt }],
    });

    // Build request parameters
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const requestParams: Record<string, any> = {
      model,
      contents,
      config: {
        ...generationConfig,
        safetySettings: AI_RUNTIME_CONFIG.defaultSafetySettings,
        ...(config.systemInstruction
          ? { systemInstruction: config.systemInstruction }
          : {}),
        ...(config.responseFormat === 'structured' && config.responseSchema
          ? {
              responseMimeType: 'application/json',
              responseSchema: config.responseSchema,
            }
          : {}),
        ...(config.responseFormat === 'json'
          ? { responseMimeType: 'application/json' }
          : {}),
      },
    };

    const response = await client.models.generateContent(requestParams as any);

    const text = response.text;
    if (text === undefined || text === null) {
      throw new Error('Gemini returned an empty response.');
    }

    return text;
  }
}

// ─── Singleton Export ─────────────────────────────────────────

/**
 * The global AI runtime singleton.
 * Import and use `aiRuntime.generate(...)` everywhere.
 */
export const aiRuntime = new AIRuntime();
