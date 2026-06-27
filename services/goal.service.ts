// ============================================================
// Goal Service
// Orchestrates goal business logic using the goal repository.
// Never accesses Firestore directly.
// ============================================================

import { Goal, GoalStatus, GoalCategory, GoalTimeframe, KeyResult } from '@/types';
import { goalRepository, taskRepository, DocumentNotFoundError } from '@/repositories';
import { GoalQueryOptions } from '@/repositories/goal.repository';
import { BaseService } from './base.service';
import { NotFoundError, ValidationError } from './errors';

// ─── Input DTOs ───────────────────────────────────────────────

export interface CreateGoalInput {
  userId: string;
  title: string;
  description?: string;
  category: GoalCategory;
  timeframe: GoalTimeframe;
  startDate: string;
  targetDate: string;
  keyResults?: Omit<KeyResult, 'id'>[];
  parentGoalId?: string | null;
}

export interface UpdateGoalInput {
  title?: string;
  description?: string;
  status?: GoalStatus;
  category?: GoalCategory;
  timeframe?: GoalTimeframe;
  targetDate?: string;
  keyResults?: KeyResult[];
  progressPercentage?: number;
}

// ─── Output Types ─────────────────────────────────────────────

export interface GoalProgressSummary {
  goalId: string;
  title: string;
  status: GoalStatus;
  progressPercentage: number;
  completedKeyResults: number;
  totalKeyResults: number;
  linkedTasksCount: number;
  completedTasksCount: number;
  daysRemaining: number | null;
}

// ─── Service ──────────────────────────────────────────────────

class GoalService extends BaseService {
  /**
   * Generates a simple unique key-result ID.
   */
  private generateKeyResultId(): string {
    return `kr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  }

  /**
   * Calculates completion percentage from key results.
   * If no key results exist, returns 0.
   */
  private computeProgress(keyResults: KeyResult[]): number {
    if (keyResults.length === 0) return 0;
    const completed = keyResults.filter((kr) => kr.isCompleted).length;
    return Math.round((completed / keyResults.length) * 100);
  }

  /**
   * Creates a new goal. Returns the generated goal ID.
   */
  async createGoal(input: CreateGoalInput): Promise<string> {
    return this.run('createGoal', async () => {
      this.assertNonEmpty(input.userId, 'userId');
      this.assertNonEmpty(input.title, 'title');
      this.assertValidDate(input.startDate, 'startDate');
      this.assertValidDate(input.targetDate, 'targetDate');

      if (input.targetDate < input.startDate) {
        throw new ValidationError(
          'targetDate must be on or after startDate.',
          'targetDate',
        );
      }

      const now = this.nowIso();
      const keyResults: KeyResult[] = (input.keyResults ?? []).map((kr) => ({
        ...kr,
        id: this.generateKeyResultId(),
        currentValue: 0,
        isCompleted: false,
      }));

      const goalData: Omit<Goal, 'id'> = {
        userId: input.userId,
        title: input.title.trim(),
        description: input.description?.trim() ?? '',
        status: GoalStatus.NOT_STARTED,
        category: input.category,
        timeframe: input.timeframe,
        startDate: input.startDate,
        targetDate: input.targetDate,
        progressPercentage: 0,
        keyResults,
        parentGoalId: input.parentGoalId ?? null,
        createdAt: now,
        updatedAt: now,
      };

      return goalRepository.createGoal(goalData);
    });
  }

  /**
   * Updates mutable fields of a goal. Recomputes progress when keyResults change.
   */
  async updateGoal(goalId: string, input: UpdateGoalInput): Promise<void> {
    return this.run('updateGoal', async () => {
      this.assertNonEmpty(goalId, 'goalId');

      if (input.title !== undefined) this.assertNonEmpty(input.title, 'title');
      if (input.targetDate !== undefined) this.assertValidDate(input.targetDate, 'targetDate');
      if (input.progressPercentage !== undefined) {
        this.assertInRange(input.progressPercentage, 0, 100, 'progressPercentage');
      }

      let progressPercentage = input.progressPercentage;
      if (input.keyResults !== undefined) {
        progressPercentage = this.computeProgress(input.keyResults);
      }

      await goalRepository.updateGoal(goalId, {
        ...input,
        title: input.title?.trim(),
        progressPercentage,
      });
    });
  }

  /**
   * Permanently deletes a goal.
   */
  async deleteGoal(goalId: string): Promise<void> {
    return this.run('deleteGoal', async () => {
      this.assertNonEmpty(goalId, 'goalId');
      await goalRepository.deleteGoal(goalId);
    });
  }

  /**
   * Returns a list of goals for a user with optional filters.
   */
  async getGoals(userId: string, options: GoalQueryOptions = {}): Promise<Goal[]> {
    return this.run('getGoals', async () => {
      this.assertNonEmpty(userId, 'userId');
      const result = await goalRepository.getGoals(userId, options);
      return result.data;
    });
  }

  /**
   * Returns a single goal. Throws NotFoundError if missing.
   */
  async getGoal(goalId: string): Promise<Goal> {
    return this.run('getGoal', async () => {
      this.assertNonEmpty(goalId, 'goalId');
      try {
        return await goalRepository.findById(goalId);
      } catch (err) {
        if (err instanceof DocumentNotFoundError) throw new NotFoundError('Goal', goalId);
        throw err;
      }
    });
  }

  /**
   * Links a task to a goal by setting the task's goalId field.
   * The task update is handled via the task repository directly
   * (GoalService may only use goalRepository for goal data, but task linking
   * requires updating the task document — accessed via taskRepository here).
   */
  async linkTask(goalId: string, taskId: string): Promise<void> {
    return this.run('linkTask', async () => {
      this.assertNonEmpty(goalId, 'goalId');
      this.assertNonEmpty(taskId, 'taskId');
      await taskRepository.updateTask(taskId, { goalId });
    });
  }

  /**
   * Unlinks a task from its goal.
   */
  async unlinkTask(taskId: string): Promise<void> {
    return this.run('unlinkTask', async () => {
      this.assertNonEmpty(taskId, 'taskId');
      await taskRepository.updateTask(taskId, { goalId: null });
    });
  }

  /**
   * Returns a progress summary for a single goal, including linked task stats.
   */
  async getGoalProgress(goalId: string): Promise<GoalProgressSummary> {
    return this.run('getGoalProgress', async () => {
      const goal = await this.getGoal(goalId);

      // Fetch tasks linked to this goal
      const allUserTasks = await taskRepository.getTasksByUser(goal.userId, { limitCount: 500 });
      const linkedTasks = allUserTasks.data.filter((t) => t.goalId === goalId);
      const completedLinkedTasks = linkedTasks.filter(
        (t) => t.status === 'completed',
      );

      const daysRemaining =
        goal.targetDate
          ? this.daysBetween(this.getTodayDateString(), goal.targetDate)
          : null;

      return {
        goalId: goal.id,
        title: goal.title,
        status: goal.status,
        progressPercentage: goal.progressPercentage,
        completedKeyResults: goal.keyResults.filter((kr) => kr.isCompleted).length,
        totalKeyResults: goal.keyResults.length,
        linkedTasksCount: linkedTasks.length,
        completedTasksCount: completedLinkedTasks.length,
        daysRemaining,
      };
    });
  }

  /**
   * Updates a key result's current value, recomputing and persisting the goal's
   * overall progress percentage.
   */
  async updateKeyResult(
    goalId: string,
    keyResultId: string,
    currentValue: number,
  ): Promise<void> {
    return this.run('updateKeyResult', async () => {
      this.assertNonEmpty(goalId, 'goalId');
      this.assertNonEmpty(keyResultId, 'keyResultId');

      const goal = await this.getGoal(goalId);
      const updatedKeyResults = goal.keyResults.map((kr) => {
        if (kr.id !== keyResultId) return kr;
        return {
          ...kr,
          currentValue,
          isCompleted: currentValue >= kr.targetValue,
        };
      });

      const progressPercentage = this.computeProgress(updatedKeyResults);
      await goalRepository.updateGoal(goalId, { keyResults: updatedKeyResults, progressPercentage });
    });
  }
}

export const goalService = new GoalService();
