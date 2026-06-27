/**
 * User roles inside Momentum AI.
 */
export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  COACH = 'coach',
}

/**
 * Visual themes supported by the application.
 */
export enum ThemePreference {
  LIGHT = 'light',
  DARK = 'dark',
  SYSTEM = 'system',
}

/**
 * Settings configuration for Focus/Pomodoro sessions.
 */
export interface FocusSettings {
  /** Duration of standard focus session in minutes. Default: 25 */
  pomodoroWorkMinutes: number;
  /** Duration of short break in minutes. Default: 5 */
  shortBreakMinutes: number;
  /** Duration of long break in minutes. Default: 15 */
  longBreakMinutes: number;
  /** Number of work cycles before a long break. Default: 4 */
  cyclesBeforeLongBreak: number;
  /** Auto start breaks after work session. */
  autoStartBreaks: boolean;
  /** Auto start work after break session. */
  autoStartWork: boolean;
}

/**
 * User notification delivery preferences.
 */
export interface NotificationPreferences {
  /** Toggle for push notifications in the browser/PWA */
  pushEnabled: boolean;
  /** Toggle for email digests and critical alerts */
  emailEnabled: boolean;
  /** Toggle for daily planning reminders */
  dailyPlanningReminder: boolean;
  /** Time of day for daily planning reminder (HH:MM format, e.g. "08:30") */
  dailyPlanningTime: string;
  /** Toggle for weekly progress digests */
  weeklyDigest: boolean;
}

/**
 * User preferences interface.
 */
export interface UserPreferences {
  /** UI theme mode selection */
  theme: ThemePreference;
  /** Standard Focus/Pomodoro configuration */
  focus: FocusSettings;
  /** Notification settings */
  notifications: NotificationPreferences;
  /** Configured daily focus target in minutes. Default: 120 */
  dailyFocusTargetMinutes: number;
}

/**
 * Tracking the progress of user onboarding.
 */
export interface UserOnboarding {
  /** Flag showing if the onboarding process is fully completed */
  completed: boolean;
  /** Current step the user is on (1-based index) */
  currentStep: number;
  /** Raw metadata answers collected during onboarding */
  answers: Record<string, any>;
  /** Timestamp when onboarding was completed (ISO Date string) */
  completedAt: string | null;
}

/**
 * Core User Profile representation in Firestore.
 */
export interface User {
  /** Unique user identifier (matching Firebase Auth UID) */
  id: string;
  /** User's primary email address */
  email: string;
  /** User's displayed name */
  displayName: string | null;
  /** URL to the user's avatar image stored in Firebase Storage or external provider */
  photoURL: string | null;
  /** Authorization role of the user */
  role: UserRole;
  /** User's primary timezone (IANA timezone code, e.g., "America/New_York") */
  timezone: string;
  /** Onboarding path details */
  onboarding: UserOnboarding;
  /** Customizeable settings and app configurations */
  preferences: UserPreferences;
  /** ISO Date string when the user profile was created */
  createdAt: string;
  /** ISO Date string when the user profile was last updated */
  updatedAt: string;
}

/**
 * Notification category type.
 */
export enum NotificationType {
  TASK_DUE = 'task_due',
  SYSTEM = 'system',
  AI_RECOMMENDATION = 'ai_recommendation',
  GOAL_REMINDER = 'goal_reminder',
  FOCUS_ACHIEVEMENT = 'focus_achievement',
}

/**
 * In-app Notification document stored in Firestore.
 */
export interface Notification {
  /** Unique notification identifier */
  id: string;
  /** Recipient User ID */
  userId: string;
  /** Primary alert title */
  title: string;
  /** Detailed content body */
  body: string;
  /** Category categorization of the notification */
  type: NotificationType;
  /** Delivery status flag */
  isRead: boolean;
  /** Optional URL / route path to redirect to when clicked */
  actionUrl: string | null;
  /** ISO Date string when the notification was created */
  createdAt: string;
}
