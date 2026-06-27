// ============================================================
// Workflow Engine — Types
// All shared TypeScript types for the workflow layer.
// Sits above the AI Runtime; agents build WorkflowRequests
// instead of AIRequestConfigs directly.
// ============================================================

import type { Task, Goal, DailyPlan, User, DailyReflection } from '@/types';
import type { AIModel, AIResponseFormat, AIGenerationConfig, AIMessage } from '../types';

// ─── Agent Identifiers ────────────────────────────────────────

export type AgentId =
  | 'planner'
  | 'coach'
  | 'reflection'
  | 'task-extractor'
  | 'memory';

// ─── User Context ─────────────────────────────────────────────

/**
 * Rich user context assembled by the ContextBuilder.
 * Every workflow receives this object; agents pick only what they need.
 */
export interface WorkflowUserContext {
  /** Authenticated user profile. */
  user: Pick<User, 'id' | 'displayName' | 'email' | 'timezone' | 'preferences'>;
  /** Current ISO YYYY-MM-DD date in the user's timezone. */
  currentDate: string;
  /** Current local time string (HH:MM). */
  currentTime: string;
  /** Day of week label, e.g. "Monday". */
  dayOfWeek: string;
  /** Tasks due or scheduled today. */
  todayTasks: WorkflowTask[];
  /** All active (non-archived, non-completed) tasks. */
  activeTasks: WorkflowTask[];
  /** Active goals. */
  activeGoals: WorkflowGoal[];
  /** Today's plan, if one exists. */
  todayPlan: DailyPlan | null;
  /** Last 7 days of reflections for memory context. */
  recentReflections: DailyReflection[];
  /** Productivity summary derived by the MemoryBuilder. */
  productivityProfile: ProductivityProfile;
}

/** Lightweight task representation for prompts — avoids large payloads. */
export interface WorkflowTask {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  dueDate: string | null;
  estimatedDurationMinutes: number | null;
  tags: string[];
  goalId: string | null;
  isBlocked: boolean;
}

/** Lightweight goal representation for prompts. */
export interface WorkflowGoal {
  id: string;
  title: string;
  description: string;
  status: string;
  category: string;
  timeframe: string;
  targetDate: string;
  progressPercentage: number;
  keyResults: Array<{
    title: string;
    targetValue: number;
    currentValue: number;
    unit: string;
    isCompleted: boolean;
  }>;
}

// ─── Productivity Memory ──────────────────────────────────────

/**
 * Derived productivity profile assembled by the MemoryBuilder.
 * Used to give AI agents behavioural context about the user.
 */
export interface ProductivityProfile {
  /** Average tasks completed per day (last 14 days). */
  avgTasksCompletedPerDay: number;
  /** Average focus minutes per day (last 14 days). */
  avgFocusMinutesPerDay: number;
  /** User's preferred focus work period (morning/afternoon/evening). */
  preferredWorkPeriod: 'morning' | 'afternoon' | 'evening' | 'unknown';
  /** Completion rate across all tasks (0-100). */
  overallCompletionRate: number;
  /** Number of tasks currently overdue. */
  overdueTaskCount: number;
  /** Most common task tags — signals focus areas. */
  topTags: string[];
  /** ISO YYYY-MM-DD of most recent completed task. */
  lastActiveDate: string | null;
}

// ─── Prompt Parts ─────────────────────────────────────────────

/**
 * Structured prompt assembled by the PromptBuilder.
 * Contains distinct sections that the WorkflowEngine merges
 * into the final prompt string.
 */
export interface WorkflowPrompt {
  /** Persona and behavioural constraints for the AI. */
  systemInstruction: string;
  /** Optional developer-level instructions (e.g. output format hints). */
  developerInstruction: string | null;
  /** The actual user-facing prompt text. */
  userInstruction: string;
  /** Serialized context data injected into the prompt. */
  contextSection: string;
  /** The final merged prompt sent to Gemini. */
  finalPrompt: string;
}

// ─── Schema Reference ─────────────────────────────────────────

export type SchemaId =
  | 'planner'
  | 'reflection'
  | 'coach'
  | 'task'
  | 'task-list';

// ─── Tool Reference ───────────────────────────────────────────

export type ToolId =
  | 'calendar'
  | 'task'
  | 'notification'
  | 'memory';

// ─── Workflow Request ─────────────────────────────────────────

/**
 * The input to the WorkflowEngine.
 * Agents build a WorkflowRequest; the engine assembles
 * the full AIRequestConfig from it.
 */
export interface WorkflowRequest {
  /** Identifies which agent is executing this workflow. */
  agentId: AgentId;
  /** The specific action the agent wants to perform. */
  action: string;
  /** Pre-populated user context (from ContextBuilder). */
  context: WorkflowUserContext;
  /** The user's raw instruction or task description. */
  userInstruction: string;
  /** Optional conversation history for multi-turn agents. */
  history?: AIMessage[];
  /** Schema to use for structured output. Omit for text responses. */
  schemaId?: SchemaId;
  /** Tools to make available to this request. */
  toolIds?: ToolId[];
  /** Model override. */
  model?: AIModel;
  /** Generation config override. */
  generationConfig?: AIGenerationConfig;
  /** Expected response format. Defaults to 'structured' when schemaId is set. */
  responseFormat?: AIResponseFormat;
  /** Arbitrary key-value pairs forwarded to runtime metadata. */
  metadata?: Record<string, string | number | boolean>;
}

// ─── Workflow Response ────────────────────────────────────────

/**
 * The output of the WorkflowEngine.
 * Wraps the AI runtime response with workflow-level metadata.
 */
export interface WorkflowResponse<T = unknown> {
  success: boolean;
  data: T | null;
  error: WorkflowError | null;
  meta: WorkflowMeta;
}

export interface WorkflowMeta {
  agentId: AgentId;
  action: string;
  executionTimeMs: number;
  model: string;
  retries: number;
  timestamp: string;
  schemaId: SchemaId | null;
}

export interface WorkflowError {
  code: string;
  message: string;
  source: 'workflow' | 'runtime' | 'parsing' | 'validation';
}
