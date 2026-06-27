// ============================================================
// Planner Service
// Orchestrates daily planning business logic.
// Uses task and daily plan repositories only.
// No AI. No Gemini. Pure business rules.
// ============================================================

import { Task, TaskPriority, TaskStatus, DailyPlan, TimeBlock } from '@/types';
import {
  taskRepository,
  dailyPlanRepository,
  DocumentNotFoundError,
} from '@/repositories';
import { BaseService } from './base.service';
import { NotFoundError } from './errors';

// ─── Output Types ─────────────────────────────────────────────

/** Priority bucket grouping tasks by their priority level. */
export interface PriorityGroup {
  priority: TaskPriority;
  tasks: Task[];
  totalEstimatedMinutes: number;
}

/** Deadline group containing tasks due on the same date. */
export interface DeadlineGroup {
  date: string;
  isOverdue: boolean;
  tasks: Task[];
}

/** Aggregated view of the user's workload for a single day. */
export interface DailyWorkload {
  date: string;
  tasks: Task[];
  totalTasks: number;
  completedCount: number;
  pendingCount: number;
  overdueCount: number;
  /** Sum of estimatedDurationMinutes for all pending tasks. */
  totalEstimatedMinutes: number;
  /** Estimated minutes of work remaining (pending tasks only). */
  remainingMinutes: number;
  completionRate: number; // 0–100
}

/** Full planner view prepared for the UI layer. */
export interface PlannerData {
  date: string;
  plan: DailyPlan | null;
  workload: DailyWorkload;
  byPriority: PriorityGroup[];
  byDeadline: DeadlineGroup[];
  overdueTasks: Task[];
}

// ─── Service ──────────────────────────────────────────────────

class PlannerService extends BaseService {
  // ─── Private Helpers ────────────────────────────────────────

  /** Groups an array of tasks by their priority level. */
  private groupByPriority(tasks: Task[]): PriorityGroup[] {
    const order: TaskPriority[] = [
      TaskPriority.URGENT,
      TaskPriority.HIGH,
      TaskPriority.MEDIUM,
      TaskPriority.LOW,
    ];
    return order.map((priority) => {
      const bucket = tasks.filter((t) => t.priority === priority);
      return {
        priority,
        tasks: bucket,
        totalEstimatedMinutes: bucket.reduce(
          (sum, t) => sum + (t.estimatedDurationMinutes ?? 0),
          0,
        ),
      };
    });
  }

  /** Groups tasks by their dueDate, marking overdue buckets. */
  private groupByDeadline(tasks: Task[]): DeadlineGroup[] {
    const today = this.getTodayDateString();
    const map = new Map<string, Task[]>();

    for (const task of tasks) {
      if (!task.dueDate) continue;
      if (!map.has(task.dueDate)) map.set(task.dueDate, []);
      map.get(task.dueDate)!.push(task);
    }

    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, dateTasks]) => ({
        date,
        isOverdue: date < today,
        tasks: dateTasks,
      }));
  }

  /** Calculates the workload summary for a set of tasks on a given date. */
  private calculateWorkload(tasks: Task[], date: string): DailyWorkload {
    const today = this.getTodayDateString();

    const completed = tasks.filter((t) => t.status === TaskStatus.COMPLETED);
    const pending = tasks.filter(
      (t) =>
        t.status !== TaskStatus.COMPLETED &&
        t.status !== TaskStatus.ARCHIVED,
    );
    const overdue = pending.filter(
      (t) => t.dueDate && t.dueDate < today,
    );

    const totalEstimated = pending.reduce(
      (sum, t) => sum + (t.estimatedDurationMinutes ?? 0),
      0,
    );

    const completionRate =
      tasks.length > 0
        ? Math.round((completed.length / tasks.length) * 100)
        : 0;

    return {
      date,
      tasks,
      totalTasks: tasks.length,
      completedCount: completed.length,
      pendingCount: pending.length,
      overdueCount: overdue.length,
      totalEstimatedMinutes: totalEstimated,
      remainingMinutes: totalEstimated,
      completionRate,
    };
  }

  // ─── Public Methods ──────────────────────────────────────────

  /**
   * Returns the full PlannerData view for a user on a given date.
   * Fetches both the DailyPlan (if it exists) and today's tasks.
   */
  async preparePlannerData(userId: string, date?: string): Promise<PlannerData> {
    return this.run('preparePlannerData', async () => {
      this.assertNonEmpty(userId, 'userId');
      const targetDate = date ?? this.getTodayDateString();

      // Load the daily plan (optional — may not exist yet)
      let plan: DailyPlan | null = null;
      try {
        plan = await dailyPlanRepository.getPlanByDate(userId, targetDate);
      } catch (err) {
        if (!(err instanceof DocumentNotFoundError)) throw err;
        // No plan yet — that's acceptable
      }

      // Load all tasks for this date
      const taskResult = await taskRepository.getTasksByDate(userId, targetDate, {
        limitCount: 200,
      });
      const tasks = taskResult.data;

      const workload = this.calculateWorkload(tasks, targetDate);
      const byPriority = this.groupByPriority(tasks);
      const byDeadline = this.groupByDeadline(tasks);
      const overdueTasks = tasks.filter(
        (t) => t.dueDate && t.dueDate < targetDate && t.status !== TaskStatus.COMPLETED,
      );

      return {
        date: targetDate,
        plan,
        workload,
        byPriority,
        byDeadline,
        overdueTasks,
      };
    });
  }

  /**
   * Returns today's DailyWorkload for a user.
   */
  async calculateTodayWorkload(userId: string): Promise<DailyWorkload> {
    return this.run('calculateTodayWorkload', async () => {
      this.assertNonEmpty(userId, 'userId');
      const today = this.getTodayDateString();
      const result = await taskRepository.getTasksByDate(userId, today, { limitCount: 200 });
      return this.calculateWorkload(result.data, today);
    });
  }

  /**
   * Returns tasks for a user that are past their due date and not completed.
   */
  async getOverdueTasks(userId: string): Promise<Task[]> {
    return this.run('getOverdueTasks', async () => {
      this.assertNonEmpty(userId, 'userId');
      const today = this.getTodayDateString();

      // Fetch all non-completed user tasks and filter client-side for overdue
      // (Firestore requires a composite index for range + equality across fields)
      const result = await taskRepository.getTasksByUser(userId, {
        limitCount: 500,
        sortBy: 'dueDate',
        sortDirection: 'asc',
      });

      return result.data.filter(
        (t) =>
          t.dueDate &&
          t.dueDate < today &&
          t.status !== TaskStatus.COMPLETED &&
          t.status !== TaskStatus.ARCHIVED,
      );
    });
  }

  /**
   * Returns remaining estimated work minutes for today.
   */
  async calculateRemainingTime(userId: string): Promise<number> {
    return this.run('calculateRemainingTime', async () => {
      const workload = await this.calculateTodayWorkload(userId);
      return workload.remainingMinutes;
    });
  }

  /**
   * Groups all of a user's tasks by their priority.
   */
  async getTasksGroupedByPriority(userId: string): Promise<PriorityGroup[]> {
    return this.run('getTasksGroupedByPriority', async () => {
      this.assertNonEmpty(userId, 'userId');
      const result = await taskRepository.getTasksByUser(userId, { limitCount: 500 });
      const activeTasks = result.data.filter(
        (t) => t.status !== TaskStatus.ARCHIVED && t.status !== TaskStatus.COMPLETED,
      );
      return this.groupByPriority(activeTasks);
    });
  }

  /**
   * Groups all of a user's tasks by their deadline.
   */
  async getTasksGroupedByDeadline(userId: string): Promise<DeadlineGroup[]> {
    return this.run('getTasksGroupedByDeadline', async () => {
      this.assertNonEmpty(userId, 'userId');
      const result = await taskRepository.getTasksByUser(userId, {
        limitCount: 500,
        sortBy: 'dueDate',
        sortDirection: 'asc',
      });
      const activeTasks = result.data.filter(
        (t) =>
          t.status !== TaskStatus.ARCHIVED &&
          t.status !== TaskStatus.COMPLETED &&
          t.dueDate !== null,
      );
      return this.groupByDeadline(activeTasks);
    });
  }
}

export const plannerService = new PlannerService();
