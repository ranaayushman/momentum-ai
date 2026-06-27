// ============================================================
// Analytics Service
// Generates productivity analytics from task, goal, and plan data.
// Never accesses Firestore directly.
// Returns data structures suitable for chart rendering.
// ============================================================

import { TaskStatus, GoalStatus } from '@/types';
import {
  taskRepository,
  goalRepository,
  dailyPlanRepository,
} from '@/repositories';
import { BaseService } from './base.service';

// ─── Output Types ─────────────────────────────────────────────

/** A single data point keyed by date label. */
export interface TimeSeriesPoint {
  date: string;       // ISO YYYY-MM-DD
  label: string;      // e.g. "Mon", "Week 1", "Jan"
  value: number;
}

/** Weekly productivity trend — one point per day. */
export interface WeeklyProductivity {
  weekStart: string;
  days: TimeSeriesPoint[];
  totalTasksCompleted: number;
  totalFocusMinutes: number;
  averageCompletionRate: number;
}

/** Monthly productivity — one point per day in the month. */
export interface MonthlyProductivity {
  month: string;        // "YYYY-MM"
  days: TimeSeriesPoint[];
  totalTasksCompleted: number;
  totalFocusMinutes: number;
}

/** Focus trend across the past N days. */
export interface FocusTrend {
  days: TimeSeriesPoint[];
  averageMinutesPerDay: number;
  peakDay: string | null;
  peakMinutes: number;
}

/** Task completion trend across the past N days. */
export interface CompletionTrend {
  days: TimeSeriesPoint[];
  averageCompletedPerDay: number;
}

/** Distribution of tasks by status. */
export interface TaskDistribution {
  status: TaskStatus;
  count: number;
  percentage: number;
}

/** Time allocation in estimated minutes across priority buckets. */
export interface TimeAllocation {
  category: string;
  estimatedMinutes: number;
  percentage: number;
}

/** Progress of all active goals, chart-ready. */
export interface GoalProgressPoint {
  goalId: string;
  title: string;
  status: GoalStatus;
  progressPercentage: number;
  category: string;
}

// ─── Helpers ──────────────────────────────────────────────────

/** Returns an array of ISO date strings for the past N days (inclusive of today). */
function pastNDays(n: number): string[] {
  const dates: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

/** Short weekday label from an ISO date string. */
function weekdayLabel(iso: string): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[new Date(iso).getDay()];
}

// ─── Service ──────────────────────────────────────────────────

class AnalyticsService extends BaseService {
  /**
   * Returns weekly productivity data for the current week.
   * Covers the 7 most recent days.
   */
  async getWeeklyProductivity(userId: string): Promise<WeeklyProductivity> {
    return this.run('getWeeklyProductivity', async () => {
      this.assertNonEmpty(userId, 'userId');

      const dates = pastNDays(7);
      const weekStart = dates[0];

      // Fetch all tasks completed in the window
      const allTasksResult = await taskRepository.getTasksByUser(userId, { limitCount: 500 });
      const plans = await dailyPlanRepository.getPlanHistory(userId, 7);

      const planMap = new Map(plans.map((p) => [p.date, p]));

      const days: TimeSeriesPoint[] = [];
      let totalCompleted = 0;
      let totalFocus = 0;
      let totalRate = 0;

      for (const date of dates) {
        const plan = planMap.get(date);
        const focusMinutes = plan?.focusMinutesCompleted ?? 0;
        const completedCount = plan?.tasksCompletedCount ?? 0;
        const totalCount = plan?.tasksTotalCount ?? 0;
        const rate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

        days.push({ date, label: weekdayLabel(date), value: completedCount });
        totalCompleted += completedCount;
        totalFocus += focusMinutes;
        totalRate += rate;
      }

      return {
        weekStart,
        days,
        totalTasksCompleted: totalCompleted,
        totalFocusMinutes: totalFocus,
        averageCompletionRate: Math.round(totalRate / 7),
      };
    });
  }

  /**
   * Returns monthly productivity data for the current calendar month.
   */
  async getMonthlyProductivity(userId: string): Promise<MonthlyProductivity> {
    return this.run('getMonthlyProductivity', async () => {
      this.assertNonEmpty(userId, 'userId');

      const now = new Date();
      const month = now.toISOString().slice(0, 7); // "YYYY-MM"
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const plans = await dailyPlanRepository.getPlanHistory(userId, daysInMonth);
      const planMap = new Map(plans.map((p) => [p.date, p]));

      let totalCompleted = 0;
      let totalFocus = 0;
      const days: TimeSeriesPoint[] = [];

      for (let day = 1; day <= daysInMonth; day++) {
        const date = `${month}-${String(day).padStart(2, '0')}`;
        const plan = planMap.get(date);
        const completed = plan?.tasksCompletedCount ?? 0;
        totalCompleted += completed;
        totalFocus += plan?.focusMinutesCompleted ?? 0;
        days.push({ date, label: String(day), value: completed });
      }

      return { month, days, totalTasksCompleted: totalCompleted, totalFocusMinutes: totalFocus };
    });
  }

  /**
   * Returns a focus time trend across the past 14 days.
   */
  async getFocusTrend(userId: string, days: number = 14): Promise<FocusTrend> {
    return this.run('getFocusTrend', async () => {
      this.assertNonEmpty(userId, 'userId');
      const dates = pastNDays(days);
      const plans = await dailyPlanRepository.getPlanHistory(userId, days);
      const planMap = new Map(plans.map((p) => [p.date, p]));

      const points: TimeSeriesPoint[] = dates.map((date) => ({
        date,
        label: weekdayLabel(date),
        value: planMap.get(date)?.focusMinutesCompleted ?? 0,
      }));

      const total = points.reduce((s, p) => s + p.value, 0);
      const average = Math.round(total / days);

      let peakDay: string | null = null;
      let peakMinutes = 0;
      for (const p of points) {
        if (p.value > peakMinutes) {
          peakMinutes = p.value;
          peakDay = p.date;
        }
      }

      return { days: points, averageMinutesPerDay: average, peakDay, peakMinutes };
    });
  }

  /**
   * Returns a task completion trend across the past 14 days.
   */
  async getCompletionTrend(userId: string, days: number = 14): Promise<CompletionTrend> {
    return this.run('getCompletionTrend', async () => {
      this.assertNonEmpty(userId, 'userId');
      const dates = pastNDays(days);
      const plans = await dailyPlanRepository.getPlanHistory(userId, days);
      const planMap = new Map(plans.map((p) => [p.date, p]));

      const points: TimeSeriesPoint[] = dates.map((date) => ({
        date,
        label: weekdayLabel(date),
        value: planMap.get(date)?.tasksCompletedCount ?? 0,
      }));

      const total = points.reduce((s, p) => s + p.value, 0);
      return {
        days: points,
        averageCompletedPerDay: Math.round(total / days),
      };
    });
  }

  /**
   * Returns the distribution of a user's tasks across all statuses.
   */
  async getTaskDistribution(userId: string): Promise<TaskDistribution[]> {
    return this.run('getTaskDistribution', async () => {
      this.assertNonEmpty(userId, 'userId');
      const result = await taskRepository.getTasksByUser(userId, { limitCount: 500 });
      const tasks = result.data;
      const total = tasks.length;

      const statusOrder: TaskStatus[] = [
        TaskStatus.TODO,
        TaskStatus.IN_PROGRESS,
        TaskStatus.COMPLETED,
        TaskStatus.BACKLOG,
        TaskStatus.ARCHIVED,
      ];

      return statusOrder.map((status) => {
        const count = tasks.filter((t) => t.status === status).length;
        return {
          status,
          count,
          percentage: total > 0 ? Math.round((count / total) * 100) : 0,
        };
      });
    });
  }

  /**
   * Returns a time allocation breakdown by task priority in estimated minutes.
   */
  async getTimeAllocation(userId: string): Promise<TimeAllocation[]> {
    return this.run('getTimeAllocation', async () => {
      this.assertNonEmpty(userId, 'userId');
      const result = await taskRepository.getTasksByUser(userId, { limitCount: 500 });
      const pending = result.data.filter(
        (t) => t.status !== TaskStatus.COMPLETED && t.status !== TaskStatus.ARCHIVED,
      );

      const buckets: Record<string, number> = {
        Urgent: 0,
        High: 0,
        Medium: 0,
        Low: 0,
      };

      for (const task of pending) {
        const mins = task.estimatedDurationMinutes ?? 0;
        switch (task.priority) {
          case 'urgent': buckets['Urgent'] += mins; break;
          case 'high': buckets['High'] += mins; break;
          case 'medium': buckets['Medium'] += mins; break;
          case 'low': buckets['Low'] += mins; break;
        }
      }

      const totalMinutes = Object.values(buckets).reduce((s, v) => s + v, 0);
      return Object.entries(buckets).map(([category, estimatedMinutes]) => ({
        category,
        estimatedMinutes,
        percentage: totalMinutes > 0 ? Math.round((estimatedMinutes / totalMinutes) * 100) : 0,
      }));
    });
  }

  /**
   * Returns progress of all active goals, formatted for chart consumption.
   */
  async getGoalProgress(userId: string): Promise<GoalProgressPoint[]> {
    return this.run('getGoalProgress', async () => {
      this.assertNonEmpty(userId, 'userId');
      const result = await goalRepository.getGoals(userId, { limitCount: 100 });
      return result.data
        .filter((g) => g.status !== GoalStatus.ABANDONED)
        .map((g) => ({
          goalId: g.id,
          title: g.title,
          status: g.status,
          progressPercentage: g.progressPercentage,
          category: g.category,
        }));
    });
  }
}

export const analyticsService = new AnalyticsService();
