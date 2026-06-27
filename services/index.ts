// ============================================================
// Services - Public Barrel Export
// Import all services from this single entry point.
// ============================================================

// Service singletons
export { taskService } from './task.service';
export { plannerService } from './planner.service';
export { goalService } from './goal.service';
export { dashboardService } from './dashboard.service';
export { notificationService } from './notification.service';
export { analyticsService } from './analytics.service';

// Base abstractions
export { BaseService } from './base.service';
export type { ServicePage, SortOrder, SortConfig } from './base.service';
export {
  getTodayDateString,
  nowIso,
  isOverdue,
  daysBetween,
} from './base.service';

// Error classes
export {
  ServiceError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  OperationFailedError,
  toServiceError,
} from './errors';

// Domain input / output types

// Task
export type { CreateTaskInput, UpdateTaskInput, MoveTaskInput } from './task.service';

// Planner
export type {
  PriorityGroup,
  DeadlineGroup,
  DailyWorkload,
  PlannerData,
} from './planner.service';

// Goal
export type {
  CreateGoalInput,
  UpdateGoalInput,
  GoalProgressSummary,
} from './goal.service';

// Dashboard
export type { DashboardStats, UpcomingDeadline } from './dashboard.service';

// Notification
export type { CreateNotificationInput } from './notification.service';

// Analytics
export type {
  TimeSeriesPoint,
  WeeklyProductivity,
  MonthlyProductivity,
  FocusTrend,
  CompletionTrend,
  TaskDistribution,
  TimeAllocation,
  GoalProgressPoint,
} from './analytics.service';

// Auth service (pre-existing — do not regenerate)
export { authService } from './auth.service';
