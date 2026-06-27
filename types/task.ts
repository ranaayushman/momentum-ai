/**
 * Status states for tasks.
 */
export enum TaskStatus {
  BACKLOG = 'backlog',
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  ARCHIVED = 'archived',
}

/**
 * Task priority scale.
 */
export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

/**
 * Task model representation in Firestore.
 */
export interface Task {
  /** Unique identifier of the task */
  id: string;
  /** ID of the user who owns this task */
  userId: string;
  /** Short summary of what needs to be done */
  title: string;
  /** Detailed description or subtasks list */
  description: string;
  /** Current completion status of the task */
  status: TaskStatus;
  /** Importance level of the task */
  priority: TaskPriority;
  /** Optional target completion date (ISO Date string, e.g. "2026-06-30") */
  dueDate: string | null;
  /** Estimated work time in minutes */
  estimatedDurationMinutes: number | null;
  /** Actual recorded work time in minutes (aggregated from focus sessions) */
  actualDurationMinutes: number;
  /** User-defined classification tags */
  tags: string[];
  /** Parent task ID for nested subtasks */
  parentTaskId: string | null;
  /** Associated goal ID if this task contributes to a specific objective */
  goalId: string | null;
  /** ID of the Daily Plan this task is scheduled for (ISO YYYY-MM-DD or specific ID) */
  dailyPlanId: string | null;
  /** Flag representing if the task is blocked */
  isBlocked: boolean;
  /** Optional reason explaining the block status */
  blockReason: string | null;
  /** ISO Date string when the task was completed */
  completedAt: string | null;
  /** ISO Date string when the task was created */
  createdAt: string;
  /** ISO Date string when the task was last updated */
  updatedAt: string;
}

/**
 * Type of focus timer used in a focus session.
 */
export enum FocusSessionType {
  POMODORO = 'pomodoro',
  STOPWATCH = 'stopwatch',
  CUSTOM = 'custom',
}

/**
 * A tracked focus interval, capturing concentration metrics.
 */
export interface FocusSession {
  /** Unique focus session identifier */
  id: string;
  /** ID of the user who performed the focus session */
  userId: string;
  /** Optional task associated with this focus session */
  taskId: string | null;
  /** Session timing style */
  sessionType: FocusSessionType;
  /** ISO Date string when the session started */
  startTime: string;
  /** ISO Date string when the session ended (null if active/interrupted) */
  endTime: string | null;
  /** Total calculated duration of focus in minutes */
  durationMinutes: number;
  /** Did the session reach its scheduled target time without cancellation? */
  completed: boolean;
  /** Self-reported distraction occurrences count */
  distractionsCount: number;
  /** User rating of focus quality, scale of 1 (poor) to 5 (excellent) */
  focusRating: number | null;
  /** Post-session reflections or notes */
  notes: string | null;
  /** ISO Date string when the record was created */
  createdAt: string;
}
