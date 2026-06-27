// ============================================================
// Dashboard Service
// Aggregates cross-domain statistics for the dashboard view.
// Never accesses Firestore directly.
// Uses: taskRepository, goalRepository, dailyPlanRepository.
// ============================================================

import { TaskStatus, TaskPriority, GoalStatus } from '@/types';
import {
  taskRepository,
  goalRepository,
  dailyPlanRepository,
  DocumentNotFoundError,
} from '@/repositories';
import { BaseService } from './base.service';

// ─── Output Types ─────────────────────────────────────────────

/** Upcoming task deadline item shown on the dashboard. */
export interface UpcomingDeadline {
  taskId: string;
  title: string;
  dueDate: string;
  priority: TaskPriority;
  daysUntilDue: number;
}

/** Fully aggregated dashboard statistics object. */
export interface DashboardStats {
  /** ISO date this stats snapshot was generated for. */
  date: string;

  // ─── Task Counts ──────────────────────────
  tasksCompletedToday: number;
  pendingTasksTotal: number;
  highPriorityCount: number;
  overdueCount: number;

  // ─── Rates & Scores ───────────────────────
  /** Percentage of today's tasks that are completed (0–100). */
  todayCompletionRate: number;
  /** Overall completion rate across all tasks (0–100). */
  overallCompletionRate: number;
  /** Heuristic productivity score (0–100). */
  productivityScore: number;

  // ─── Focus ────────────────────────────────
  /** Minutes of completed focus work logged today. */
  focusMinutesToday: number;

  // ─── Goals ────────────────────────────────
  activeGoalsCount: number;
  achievedGoalsCount: number;

  // ─── Upcoming ─────────────────────────────
  upcomingDeadlines: UpcomingDeadline[];
}

// ─── Service ──────────────────────────────────────────────────

class DashboardService extends BaseService {
  /**
   * Computes a heuristic productivity score from 0–100.
   * Factors: completion rate (60%), no overdue (20%), focus time (20%).
   */
  private computeProductivityScore(
    completionRate: number,
    overdueCount: number,
    focusMinutes: number,
  ): number {
    const completionScore = completionRate * 0.6;
    const overdueScore = Math.max(0, 20 - overdueCount * 4);
    const focusScore = Math.min(20, Math.floor(focusMinutes / 6));
    return Math.round(completionScore + overdueScore + focusScore);
  }

  /**
   * Builds the full DashboardStats aggregation for a user.
   * All data is sourced from repositories via a single call.
   */
  async getDashboardStats(userId: string): Promise<DashboardStats> {
    return this.run('getDashboardStats', async () => {
      this.assertNonEmpty(userId, 'userId');
      const today = this.getTodayDateString();

      // ─── Parallel Data Fetching ────────────────────────────────
      const [
        allTasksResult,
        todayTasksResult,
        goalsResult,
        todayPlan,
      ] = await Promise.all([
        taskRepository.getTasksByUser(userId, { limitCount: 500 }),
        taskRepository.getTasksByDate(userId, today, { limitCount: 200 }),
        goalRepository.getGoals(userId, { limitCount: 100 }),
        dailyPlanRepository.getPlanByDate(userId, today).catch((err) => {
          if (err instanceof DocumentNotFoundError) return null;
          throw err;
        }),
      ]);

      const allTasks = allTasksResult.data;
      const todayTasks = todayTasksResult.data;
      const goals = goalsResult.data;

      // ─── Today's Task Stats ───────────────────────────────────
      const completedToday = todayTasks.filter(
        (t) => t.status === TaskStatus.COMPLETED,
      );
      const todayCompletionRate =
        todayTasks.length > 0
          ? Math.round((completedToday.length / todayTasks.length) * 100)
          : 0;

      // ─── All-time Task Stats ──────────────────────────────────
      const completedAll = allTasks.filter((t) => t.status === TaskStatus.COMPLETED);
      const pendingAll = allTasks.filter(
        (t) =>
          t.status !== TaskStatus.COMPLETED &&
          t.status !== TaskStatus.ARCHIVED,
      );
      const overdue = pendingAll.filter((t) => t.dueDate && t.dueDate < today);
      const highPriority = pendingAll.filter(
        (t) =>
          t.priority === TaskPriority.HIGH || t.priority === TaskPriority.URGENT,
      );
      const overallCompletionRate =
        allTasks.length > 0
          ? Math.round((completedAll.length / allTasks.length) * 100)
          : 0;

      // ─── Goals ────────────────────────────────────────────────
      const activeGoals = goals.filter(
        (g) => g.status === GoalStatus.IN_PROGRESS || g.status === GoalStatus.NOT_STARTED,
      );
      const achievedGoals = goals.filter((g) => g.status === GoalStatus.ACHIEVED);

      // ─── Focus Minutes ────────────────────────────────────────
      const focusMinutesToday = todayPlan?.focusMinutesCompleted ?? 0;

      // ─── Productivity Score ───────────────────────────────────
      const productivityScore = this.computeProductivityScore(
        todayCompletionRate,
        overdue.length,
        focusMinutesToday,
      );

      // ─── Upcoming Deadlines (next 7 days) ────────────────────
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
      const sevenDaysStr = sevenDaysFromNow.toISOString().slice(0, 10);

      const upcomingDeadlines: UpcomingDeadline[] = pendingAll
        .filter((t) => t.dueDate && t.dueDate >= today && t.dueDate <= sevenDaysStr)
        .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''))
        .slice(0, 5)
        .map((t) => ({
          taskId: t.id,
          title: t.title,
          dueDate: t.dueDate!,
          priority: t.priority,
          daysUntilDue: this.daysBetween(today, t.dueDate!),
        }));

      return {
        date: today,
        tasksCompletedToday: completedToday.length,
        pendingTasksTotal: pendingAll.length,
        highPriorityCount: highPriority.length,
        overdueCount: overdue.length,
        todayCompletionRate,
        overallCompletionRate,
        productivityScore,
        focusMinutesToday,
        activeGoalsCount: activeGoals.length,
        achievedGoalsCount: achievedGoals.length,
        upcomingDeadlines,
      };
    });
  }
}

export const dashboardService = new DashboardService();
