// ============================================================
// AI Runtime — Agent Base Class
// All future agents extend this abstract class.
// Agents must never call getGeminiClient() or use the SDK directly.
// ============================================================

import { aiRuntime } from '../runtime';
import type { AIRequestConfig, AIResponse } from '../types';
import type { AIGenerationConfig } from '../types';

/**
 * Configuration provided to an agent at instantiation time.
 * Enables dependency-injection and testability.
 */
export interface AgentConfig {
  /** Human-readable name used in logs. */
  agentName: string;
  /** Default system instruction for this agent. */
  systemInstruction: string;
  /** Override generation parameters for this agent. */
  generationConfig?: AIGenerationConfig;
}

/**
 * Abstract base class for all Momentum AI agents.
 *
 * Each agent:
 * 1. Receives context from the service layer.
 * 2. Builds an AIRequestConfig.
 * 3. Calls this.run() — which delegates to aiRuntime.generate().
 * 4. Returns a typed domain result to the service layer.
 *
 * Agents must not:
 * - Access Firestore
 * - Call repositories
 * - Contain routing logic
 * - Use the Gemini SDK directly
 */
export abstract class BaseAgent {
  protected readonly agentName: string;
  protected readonly systemInstruction: string;
  protected readonly generationConfig?: AIGenerationConfig;

  constructor(config: AgentConfig) {
    this.agentName = config.agentName;
    this.systemInstruction = config.systemInstruction;
    this.generationConfig = config.generationConfig;
  }

  /**
   * Dispatches a request through the AI runtime.
   * Attaches the agent's system instruction unless overridden.
   *
   * @param config  - Request-specific overrides (prompt, schema, etc.).
   * @param userId  - User ID for rate limiting and correlation.
   */
  protected async run<T = string>(
    config: Omit<AIRequestConfig, 'systemInstruction'> & { systemInstruction?: string },
    userId?: string,
  ): Promise<AIResponse<T>> {
    const fullConfig: AIRequestConfig = {
      systemInstruction: this.systemInstruction,
      generationConfig: this.generationConfig,
      ...config,
    };

    return aiRuntime.generate<T>(fullConfig, userId, this.agentName);
  }
}
