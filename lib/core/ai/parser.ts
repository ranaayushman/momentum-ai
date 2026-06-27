// ============================================================
// AI Runtime — Parser
// Transforms raw Gemini text output into structured data.
// Handles: plain text, JSON, and structured output modes.
// Gracefully recovers from common JSON formatting errors.
// ============================================================

import { ParsingError } from './errors';

// ─── Text ─────────────────────────────────────────────────────

/**
 * Returns raw text as-is. Used for conversational responses.
 */
export function parseText(raw: string): string {
  if (typeof raw !== 'string') {
    throw new ParsingError(String(raw));
  }
  return raw.trim();
}

// ─── JSON ─────────────────────────────────────────────────────

/**
 * Extracts a JSON block from a raw string, even if the model wrapped it
 * in a markdown code fence (```json ... ```).
 */
function extractJsonBlock(raw: string): string {
  // Strip markdown code fences if present
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch?.[1]) return fenceMatch[1].trim();

  // Strip leading/trailing whitespace and return as-is
  return raw.trim();
}

/**
 * Parses raw output as JSON, with graceful extraction from code fences.
 * Throws ParsingError on failure.
 */
export function parseJson<T = unknown>(raw: string): T {
  const cleaned = extractJsonBlock(raw);
  try {
    return JSON.parse(cleaned) as T;
  } catch (err) {
    throw new ParsingError(raw, err);
  }
}

// ─── Structured Output ────────────────────────────────────────

/**
 * Parses a structured output response.
 * Gemini structured output responses are already JSON — this is
 * essentially parseJson with an explicit generic for type safety.
 */
export function parseStructured<T = unknown>(raw: string): T {
  return parseJson<T>(raw);
}

// ─── Auto-detect ──────────────────────────────────────────────

/**
 * Attempts JSON parsing first; if it fails returns the raw text.
 * Useful when the response format is uncertain.
 */
export function parseAuto(raw: string): string | Record<string, unknown> {
  try {
    return parseJson<Record<string, unknown>>(raw);
  } catch {
    return parseText(raw);
  }
}

// ─── Safe Wrappers ────────────────────────────────────────────

/** Result type for safe-parse operations. */
export type ParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ParsingError };

/**
 * parseJson wrapped in a Result — never throws.
 */
export function safeParseJson<T = unknown>(raw: string): ParseResult<T> {
  try {
    return { ok: true, data: parseJson<T>(raw) };
  } catch (err) {
    return { ok: false, error: err as ParsingError };
  }
}
