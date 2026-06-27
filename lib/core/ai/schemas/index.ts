// ============================================================
// AI Runtime — Response Schemas
// Reusable Gemini structured-output schema definitions.
// Agents compose their schemas from these primitives.
// ============================================================

import { Type } from '@google/genai';

// ─── Primitives ───────────────────────────────────────────────

export const StringField = { type: Type.STRING };
export const NumberField = { type: Type.NUMBER };
export const BooleanField = { type: Type.BOOLEAN };
export const IntegerField = { type: Type.INTEGER };

export const StringArrayField = {
  type: Type.ARRAY,
  items: { type: Type.STRING },
};

// ─── Shared Object Schemas ────────────────────────────────────

/**
 * Schema for a single extracted task suggestion from AI output.
 * Used by the Task Extractor agent.
 */
export const TaskSuggestionSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    description: { type: Type.STRING },
    priority: { type: Type.STRING },
    estimatedMinutes: { type: Type.NUMBER },
    dueDate: { type: Type.STRING },
    tags: StringArrayField,
  },
  required: ['title', 'priority'],
};

/**
 * Schema for an array of task suggestions.
 */
export const TaskSuggestionsSchema = {
  type: Type.ARRAY,
  items: TaskSuggestionSchema,
};

/**
 * Schema for a coaching / reflection response.
 */
export const CoachingResponseSchema = {
  type: Type.OBJECT,
  properties: {
    message: { type: Type.STRING },
    suggestions: StringArrayField,
    followUpQuestions: StringArrayField,
  },
  required: ['message'],
};

/**
 * Schema for a daily plan output.
 */
export const DailyPlanSchema = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING },
    prioritizedTaskIds: StringArrayField,
    focusBlocks: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          startTime: { type: Type.STRING },
          endTime: { type: Type.STRING },
          taskId: { type: Type.STRING },
          label: { type: Type.STRING },
        },
        required: ['startTime', 'endTime', 'label'],
      },
    },
  },
  required: ['summary', 'prioritizedTaskIds'],
};
