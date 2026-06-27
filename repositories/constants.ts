// ============================================================
// Centralized Firestore collection name constants.
// Do NOT use raw string literals for collection names anywhere
// outside of this file.
// ============================================================

export const COLLECTIONS = {
  USERS: 'users',
  TASKS: 'tasks',
  DAILY_PLANS: 'daily_plans',
  GOALS: 'goals',
  REFLECTIONS: 'reflections',
  NOTIFICATIONS: 'notifications',
  FOCUS_SESSIONS: 'focus_sessions',
  AI_SESSIONS: 'ai_sessions',
  AI_RECOMMENDATIONS: 'ai_recommendations',
} as const;

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];
