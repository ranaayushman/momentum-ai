// ============================================================
// Task Service
// Orchestrates task business logic using the task repository.
// Never accesses Firestore directly.
// ============================================================

import { Task, TaskStatus, TaskPriority } from '@/types';
import {
  taskRepository,
  PaginatedResult,
  DocumentNotFoundError,
} from '@/repositories';
import { TaskQueryOptions } from '@/repositories/task.repository';
import { BaseService } from './base.service';
import { ValidationError, NotFoundError } from './errors';

// ─── Input DTOs ───────────────────────────────────────────────

export interface CreateTaskInput {
  userId: string;
  title: string;
  description?: string;
  priority?: TaskPriority;
  dueDate?: string | null;
  estimatedDurationMinutes?: number | null;
  tags?: string[];
  parentTaskId?: string | null;
  goalId?: string | null;
  dailyPlanId?: string | null;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  priority?: TaskPriority;
  dueDate?: string | null;
  estimatedDurationMinutes?: number | null;
  tags?: string[];
  goalId?: string | null;
  dailyPlanId?: string | null;
  isBlocked?: boolean;
  blockReason?: string | null;
}

export interface MoveTaskInput {
  dailyPlanId: string | null;
  dueDate: string | null;
}

// ─── Service ──────────────────────────────────────────────────

class TaskService extends BaseService {
  /**
   * Validates a CreateTaskInput before writing.
   */
  private validateCreateInput(input: CreateTaskInput): void {
    this.assertNonEmpty(input.userId, 'userId');
    this.assertNonEmpty(input.title, 'title');

    if (input.dueDate) {
      this.assertValidDate(input.dueDate, 'dueDate');
    }
    if (input.estimatedDurationMinutes !== undefined && input.estimatedDurationMinutes !== null) {
      if (input.estimatedDurationMinutes < 1) {
        throw new ValidationError('estimatedDurationMinutes must be at least 1.', 'estimatedDurationMinutes');
      }
    }
  }

  /**
   * Creates a new task for a user. Returns the new task ID.
   */
  async createTask(input: CreateTaskInput): Promise<string> {
    return this.run('createTask', async () => {
      this.validateCreateInput(input);
      const now = this.nowIso();
      const taskData: Omit<Task, 'id'> = {
        userId: input.userId,
        title: input.title.trim(),
        description: input.description?.trim() ?? '',
        status: TaskStatus.TODO,
        priority: input.priority ?? TaskPriority.MEDIUM,
        dueDate: input.dueDate ?? null,
        estimatedDurationMinutes: input.estimatedDurationMinutes ?? null,
        actualDurationMinutes: 0,
        tags: input.tags ?? [],
        parentTaskId: input.parentTaskId ?? null,
        goalId: input.goalId ?? null,
        dailyPlanId: input.dailyPlanId ?? null,
        isBlocked: false,
        blockReason: null,
        completedAt: null,
        createdAt: now,
        updatedAt: now,
      };
      return taskRepository.createTask(taskData);
    });
  }

  /**
   * Updates mutable fields of a task.
   */
  async updateTask(taskId: string, input: UpdateTaskInput): Promise<void> {
    return this.run('updateTask', async () => {
      this.assertNonEmpty(taskId, 'taskId');
      if (input.title !== undefined) this.assertNonEmpty(input.title, 'title');
      if (input.dueDate) this.assertValidDate(input.dueDate, 'dueDate');

      await taskRepository.updateTask(taskId, {
        ...input,
        title: input.title?.trim(),
        description: input.description?.trim(),
      });
    });
  }

  /**
   * Permanently deletes a task by ID.
   */
  async deleteTask(taskId: string): Promise<void> {
    return this.run('deleteTask', async () => {
      this.assertNonEmpty(taskId, 'taskId');
      await taskRepository.deleteTask(taskId);
    });
  }

  /**
   * Retrieves a single task. Throws NotFoundError if missing.
   */
  async getTask(taskId: string): Promise<Task> {
    return this.run('getTask', async () => {
      this.assertNonEmpty(taskId, 'taskId');
      try {
        return await taskRepository.getTask(taskId);
      } catch (err) {
        if (err instanceof DocumentNotFoundError) {
          throw new NotFoundError('Task', taskId);
        }
        throw err;
      }
    });
  }

  /**
   * Returns paginated tasks for a user.
   */
  async getTasksByUser(
    userId: string,
    options: TaskQueryOptions = {},
  ): Promise<PaginatedResult<Task>> {
    return this.run('getTasksByUser', async () => {
      this.assertNonEmpty(userId, 'userId');
      return taskRepository.getTasksByUser(userId, options);
    });
  }

  /**
   * Returns tasks scheduled for a specific date.
   */
  async getTasksByDate(
    userId: string,
    date: string,
    options: TaskQueryOptions = {},
  ): Promise<PaginatedResult<Task>> {
    return this.run('getTasksByDate', async () => {
      this.assertNonEmpty(userId, 'userId');
      this.assertValidDate(date, 'date');
      return taskRepository.getTasksByDate(userId, date, options);
    });
  }

  /**
   * Returns today's tasks for a user.
   */
  async getTodayTasks(userId: string): Promise<Task[]> {
    return this.run('getTodayTasks', async () => {
      const today = this.getTodayDateString();
      const result = await taskRepository.getTasksByDate(userId, today, { limitCount: 200 });
      return result.data;
    });
  }

  /**
   * Marks a task as COMPLETED and stamps completedAt.
   */
  async completeTask(taskId: string): Promise<void> {
    return this.run('completeTask', async () => {
      this.assertNonEmpty(taskId, 'taskId');
      await taskRepository.updateTask(taskId, {
        status: TaskStatus.COMPLETED,
        completedAt: this.nowIso(),
      });
    });
  }

  /**
   * Moves a task back to TODO status, clearing completedAt.
   */
  async restoreTask(taskId: string): Promise<void> {
    return this.run('restoreTask', async () => {
      this.assertNonEmpty(taskId, 'taskId');
      await taskRepository.updateTask(taskId, {
        status: TaskStatus.TODO,
        completedAt: null,
      });
    });
  }

  /**
   * Archives a task (status → ARCHIVED).
   */
  async archiveTask(taskId: string): Promise<void> {
    return this.run('archiveTask', async () => {
      this.assertNonEmpty(taskId, 'taskId');
      await taskRepository.updateTask(taskId, { status: TaskStatus.ARCHIVED });
    });
  }

  /**
   * Changes the priority of a task.
   */
  async changePriority(taskId: string, priority: TaskPriority): Promise<void> {
    return this.run('changePriority', async () => {
      this.assertNonEmpty(taskId, 'taskId');
      await taskRepository.updateTask(taskId, { priority });
    });
  }

  /**
   * Moves a task to a different daily plan and/or due date.
   */
  async moveTask(taskId: string, input: MoveTaskInput): Promise<void> {
    return this.run('moveTask', async () => {
      this.assertNonEmpty(taskId, 'taskId');
      if (input.dueDate) this.assertValidDate(input.dueDate, 'dueDate');
      await taskRepository.updateTask(taskId, {
        dailyPlanId: input.dailyPlanId,
        dueDate: input.dueDate,
      });
    });
  }

  /**
   * Duplicates an existing task for the same user.
   * Returns the ID of the newly created duplicate.
   */
  async duplicateTask(taskId: string): Promise<string> {
    return this.run('duplicateTask', async () => {
      const original = await this.getTask(taskId);
      const now = this.nowIso();
      const duplicate: Omit<Task, 'id'> = {
        ...original,
        title: `${original.title} (Copy)`,
        status: TaskStatus.TODO,
        completedAt: null,
        actualDurationMinutes: 0,
        createdAt: now,
        updatedAt: now,
      };
      const { id: _unusedId, ...duplicateWithoutId } = duplicate as Task;
      void _unusedId;
      return taskRepository.createTask(duplicateWithoutId);
    });
  }

  /**
   * Returns completed tasks for a user.
   */
  async getCompletedTasks(
    userId: string,
    options: TaskQueryOptions = {},
  ): Promise<PaginatedResult<Task>> {
    return this.run('getCompletedTasks', async () => {
      this.assertNonEmpty(userId, 'userId');
      return taskRepository.getCompletedTasks(userId, options);
    });
  }

  /**
   * Returns pending (TODO) tasks for a user.
   */
  async getPendingTasks(
    userId: string,
    options: TaskQueryOptions = {},
  ): Promise<PaginatedResult<Task>> {
    return this.run('getPendingTasks', async () => {
      this.assertNonEmpty(userId, 'userId');
      return taskRepository.getPendingTasks(userId, options);
    });
  }

  /**
   * Pure business rule: estimates task duration based on priority if not provided.
   * Returns minutes.
   */
  calculateEstimatedDuration(priority: TaskPriority, providedMinutes?: number | null): number {
    if (providedMinutes != null && providedMinutes > 0) return providedMinutes;
    const defaults: Record<TaskPriority, number> = {
      [TaskPriority.LOW]: 30,
      [TaskPriority.MEDIUM]: 60,
      [TaskPriority.HIGH]: 90,
      [TaskPriority.URGENT]: 120,
    };
    return defaults[priority];
  }
}

export const taskService = new TaskService();
