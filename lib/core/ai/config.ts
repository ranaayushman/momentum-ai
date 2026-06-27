// ============================================================
// AI Runtime — Configuration
// Centralizes all Gemini generation and safety settings.
// Agents never hardcode these values.
// ============================================================

import { HarmBlockThreshold, HarmCategory } from '@google/genai';
import {
  DEFAULT_MODEL,
  DEFAULT_TEMPERATURE,
  DEFAULT_TOP_P,
  DEFAULT_MAX_OUTPUT_TOKENS,
  EXTENDED_MAX_OUTPUT_TOKENS,
  DEFAULT_RETRY_LIMIT,
  REQUEST_TIMEOUT_MS,
  DEFAULT_RATE_LIMIT_RPM,
  DEFAULT_RATE_LIMIT_RPD,
} from './constants';
import type { AIGenerationConfig, AIModel, AISafetySetting } from './types';

// ─── Safety Settings ──────────────────────────────────────────

/**
 * Conservative safety thresholds for production use.
 * Applied globally unless overridden per-request.
 */
export const DEFAULT_SAFETY_SETTINGS: AISafetySetting[] = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
];

// ─── Generation Profiles ──────────────────────────────────────

/** Balanced generation config — default for most agents. */
export const BALANCED_GENERATION: AIGenerationConfig = {
  temperature: DEFAULT_TEMPERATURE,
  topP: DEFAULT_TOP_P,
  maxOutputTokens: DEFAULT_MAX_OUTPUT_TOKENS,
};

/** Creative generation config — for coaching and narrative responses. */
export const CREATIVE_GENERATION: AIGenerationConfig = {
  temperature: 0.8,
  topP: 0.95,
  maxOutputTokens: DEFAULT_MAX_OUTPUT_TOKENS,
};

/** Precise generation config — for structured JSON / task extraction. */
export const PRECISE_GENERATION: AIGenerationConfig = {
  temperature: 0.1,
  topP: 0.8,
  maxOutputTokens: DEFAULT_MAX_OUTPUT_TOKENS,
};

/** Extended generation config — for long-form reflections or analysis. */
export const EXTENDED_GENERATION: AIGenerationConfig = {
  temperature: DEFAULT_TEMPERATURE,
  topP: DEFAULT_TOP_P,
  maxOutputTokens: EXTENDED_MAX_OUTPUT_TOKENS,
};

// ─── Runtime Config ───────────────────────────────────────────

export interface AIRuntimeConfig {
  defaultModel: AIModel;
  defaultGenerationConfig: AIGenerationConfig;
  defaultSafetySettings: AISafetySetting[];
  defaultMaxRetries: number;
  defaultTimeoutMs: number;
  rateLimitRpm: number;
  rateLimitRpd: number;
}

/**
 * The single runtime configuration instance.
 * Every AI request falls back to these defaults when no override is given.
 */
export const AI_RUNTIME_CONFIG: AIRuntimeConfig = {
  defaultModel: DEFAULT_MODEL,
  defaultGenerationConfig: BALANCED_GENERATION,
  defaultSafetySettings: DEFAULT_SAFETY_SETTINGS,
  defaultMaxRetries: DEFAULT_RETRY_LIMIT,
  defaultTimeoutMs: REQUEST_TIMEOUT_MS,
  rateLimitRpm: DEFAULT_RATE_LIMIT_RPM,
  rateLimitRpd: DEFAULT_RATE_LIMIT_RPD,
};
