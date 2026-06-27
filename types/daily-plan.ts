/**
 * Classification of schedules / time-slots.
 */
export enum TimeBlockType {
  FOCUS = 'focus',
  MEETING = 'meeting',
  BREAK = 'break',
  ROUTINE = 'routine',
  BUFFER = 'buffer',
}

/**
 * Scheduled event block inside a daily timeline.
 */
export interface TimeBlock {
  /** Unique identifier for the block */
  id: string;
  /** Label/title of the time block */
  title: string;
  /** Detailed description of activities planned */
  description: string | null;
  /** Type of time block classification */
  type: TimeBlockType;
  /** Start time of day in 24h format (e.g. "09:00") */
  startTime: string;
  /** End time of day in 24h format (e.g. "10:30") */
  endTime: string;
  /** Optional task associated with this time block */
  associatedTaskId: string | null;
  /** Optional calendar event reference associated with this block */
  associatedEventId: string | null;
  /** Flag showing if the scheduled block has been completed */
  isCompleted: boolean;
}

/**
 * User reflections captured at the end of the day.
 */
export interface DailyReflection {
  /** Qualitative energy level evaluation */
  energyLevel: 'low' | 'medium' | 'high';
  /** General productivity metric scale of 1 to 10 */
  productivityRating: number;
  /** Bullet points of accomplishments / good moments */
  whatWentWell: string[];
  /** Bullet points of delays or friction issues */
  challengesFaced: string[];
  /** Focus areas identified for the next day */
  tomorrowFocus: string[];
  /** Optional AI coach feedback text generated for the day */
  aiFeedback: string | null;
}

/**
 * Core Daily Plan document, binding tasks and schedule into a cohesive day structure.
 */
export interface DailyPlan {
  /** Unique daily plan document identifier (often structured as "userId_YYYY-MM-DD") */
  id: string;
  /** ID of the user who owns this plan */
  userId: string;
  /** Target date of the plan (ISO date string formatted YYYY-MM-DD, e.g. "2026-06-27") */
  date: string;
  /** Ordered array of task IDs to display in list sequence */
  tasksOrdered: string[];
  /** Time blocks mapping the user's daily agenda */
  timeBlocks: TimeBlock[];
  /** Optional daily reflection survey metrics */
  reflection: DailyReflection | null;
  /** Total calculated focus session minutes recorded on this date */
  focusMinutesCompleted: number;
  /** Count of active tasks completed on this date */
  tasksCompletedCount: number;
  /** Total count of tasks planned for this date */
  tasksTotalCount: number;
  /** ISO Date string when the daily plan was created */
  createdAt: string;
  /** ISO Date string when the daily plan was last updated */
  updatedAt: string;
}
