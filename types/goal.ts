/**
 * Progress states for strategic goals.
 */
export enum GoalStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  ACHIEVED = 'achieved',
  PAUSED = 'paused',
  ABANDONED = 'abandoned',
}

/**
 * High-level goal classification category.
 */
export enum GoalCategory {
  CAREER = 'career',
  HEALTH = 'health',
  PERSONAL = 'personal',
  FINANCE = 'finance',
  EDUCATION = 'education',
  LIFESTYLE = 'lifestyle',
  OTHER = 'other',
}

/**
 * Timeline scope of a goal.
 */
export enum GoalTimeframe {
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly',
  LIFETIME = 'lifetime',
}

/**
 * Quantitative metric definition tracking milestone progress.
 */
export interface KeyResult {
  /** Unique key result identifier */
  id: string;
  /** Summary description of the key result target */
  title: string;
  /** Numerical target milestone value */
  targetValue: number;
  /** Current completed value */
  currentValue: number;
  /** Unit of measurement (e.g. "books", "hours", "%", "USD") */
  unit: string;
  /** Has the target been met? */
  isCompleted: boolean;
}

/**
 * Objective Goal document stored in Firestore.
 */
export interface Goal {
  /** Unique goal identifier */
  id: string;
  /** ID of the user who owns this goal */
  userId: string;
  /** Clear title statement of the objective */
  title: string;
  /** Thorough description explaining motivation or details */
  description: string;
  /** Current execution status */
  status: GoalStatus;
  /** Life area category */
  category: GoalCategory;
  /** General target duration timeframe */
  timeframe: GoalTimeframe;
  /** Target start date (ISO date string, e.g. "2026-06-01") */
  startDate: string;
  /** Target completion deadline (ISO date string, e.g. "2026-06-30") */
  targetDate: string;
  /** Aggregated execution progress representation (from 0 to 100) */
  progressPercentage: number;
  /** Metrics used to track goal achievements */
  keyResults: KeyResult[];
  /** Parent Goal ID if this is a sub-goal contributing to a larger target */
  parentGoalId: string | null;
  /** ISO Date string when the goal was created */
  createdAt: string;
  /** ISO Date string when the goal was last updated */
  updatedAt: string;
}
