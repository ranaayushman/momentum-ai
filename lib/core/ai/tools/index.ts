// ============================================================
// AI Runtime — Tools
// Gemini function-calling tool definitions.
// Agents compose tools from these building blocks.
// ============================================================

/**
 * A typed Gemini tool function declaration.
 * Mirrors the FunctionDeclaration shape expected by the SDK.
 */
export interface AIToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, { type: string; description: string }>;
    required?: string[];
  };
}

/**
 * Placeholder for future tool implementations.
 * Tool files will be added here as the agent layer grows:
 *
 * - search_tasks.ts
 * - get_goal_status.ts
 * - create_notification.ts
 * - etc.
 */

export {};
