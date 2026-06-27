// ============================================================
// Repositories - Public Barrel Export
// Import all repositories from this single entry point.
// ============================================================

// Singletons
export { userRepository } from './user.repository';
export { taskRepository } from './task.repository';
export { dailyPlanRepository } from './daily-plan.repository';
export { goalRepository } from './goal.repository';
export { reflectionRepository } from './reflection.repository';
export { notificationRepository } from './notification.repository';

// Base abstractions (for extension / testing)
export { BaseRepository } from './base.repository';
export type { FindManyOptions, PaginatedResult } from './base.repository';

// Error types
export {
  RepositoryError,
  DocumentNotFoundError,
  WriteFailedError,
  ReadFailedError,
  DeleteFailedError,
  toRepositoryError,
} from './errors';

// Constants
export { COLLECTIONS } from './constants';
export type { CollectionName } from './constants';

// Domain-specific types
export type { TaskQueryOptions, TaskSortField, SortDirection } from './task.repository';
export type { GoalQueryOptions } from './goal.repository';
export type { ReflectionRecord } from './reflection.repository';
