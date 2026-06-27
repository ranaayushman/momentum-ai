// ============================================================
// AI Runtime — Gemini Client
// Singleton wrapper around the @google/genai GoogleGenAI SDK.
// The rest of the runtime uses this client exclusively.
// No other file should instantiate GoogleGenAI directly.
// ============================================================

import { GoogleGenAI } from '@google/genai';
import { AuthenticationError } from './errors';

/** Internal singleton instance. */
let _client: GoogleGenAI | null = null;

/**
 * Returns the singleton GoogleGenAI client.
 * Reads GEMINI_API_KEY from environment variables.
 * Throws AuthenticationError if the key is absent.
 *
 * Calling this function multiple times returns the same instance.
 */
export function getGeminiClient(): GoogleGenAI {
  if (_client) return _client;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    throw new AuthenticationError();
  }

  _client = new GoogleGenAI({ apiKey });
  return _client;
}

/**
 * Resets the singleton. Used in tests only.
 * @internal
 */
export function _resetGeminiClientForTesting(): void {
  _client = null;
}
