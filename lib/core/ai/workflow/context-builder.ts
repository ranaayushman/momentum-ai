// ============================================================
// Workflow Engine — Context Builder
// Assembles a strongly-typed WorkflowUserContext from raw data.
// Accepts pre-fetched domain objects — never touches Firestore.
// ============================================================

import type {
  User,
  Task,
  Goal,
  DailyPlan,
  DailyReflection,
  TaskStatus,
} from '@/types';
import type {
  WorkflowUserContext,
  WorkflowTask,
  WorkflowGoal,
  ProductivityProfile,
} from './workflow-types';
import { ContextBuildError } from './workflow-errors';

// ─── Date Helpers ─────────────────────────────────────────────

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function getTodayIso(timezone: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

function getCurrentTime(timezone: string): string {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date());
  } catch {
    return new Date().toTimeString().slice(0, 5);
  }
}

function getDayOfWeek(timezone: string): string {
  try {
    const dayIndex = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'long',
    }).formatToParts(new Date()).find((p) => p.type === 'weekday')?.value;
    return dayIndex ?? DAY_NAMES[new Date().getDay()];
  } catch {
    return DAY_NAMES[new Date().getDay()];
  }
}

// ─── Task Mapping ─────────────────────────────────────────────

function toWorkflowTask(task: Task): WorkflowTask {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate,
    estimatedDurationMinutes: task.estimatedDurationMinutes,
    tags: task.tags,
    goalId: task.goalId,
    isBlocked: task.isBlocked,
  };
}

function toWorkflowGoal(goal: Goal): WorkflowGoal {
  return {
    id: goal.id,
    title: goal.title,
    description: goal.description,
    status: goal.status,
    category: goal.category,
    timeframe: goal.timeframe,
    targetDate: goal.targetDate,
    progressPercentage: goal.progressPercentage,
    keyResults: goal.keyResults.map((kr) => ({
      title: kr.title,
      targetValue: kr.targetValue,
      currentValue: kr.currentValue,
      unit: kr.unit,
      isCompleted: kr.isCompleted,
    })),
  };
}

// ─── Productivity Profile Derivation ─────────────────────────

function deriveProductivityProfile(
  allTasks: Task[],
  recentPlans: DailyPlan[],
): ProductivityProfile {
  const today = new Date().toISOString().slice(0, 10);

  // Completion rate
  const completed = allTasks.filter((t) => t.status === 'completed' as TaskStatus);
  const overallCompletionRate =
    allTasks.length > 0 ? Math.round((completed.length / allTasks.length) * 100) : 0;

  // Overdue count
  const overdueTaskCount = allTasks.filter(
    (t) =>
      t.dueDate &&
      t.dueDate < today &&
      t.status !== 'completed' &&
      t.status !== 'archived',
  ).length;

  // Averages from recent plans (last 14 days)
  const planCount = recentPlans.length || 1;
  const avgTasksCompletedPerDay = Math.round(
    recentPlans.reduce((s, p) => s + p.tasksCompletedCount, 0) / planCount,
  );
  const avgFocusMinutesPerDay = Math.round(
    recentPlans.reduce((s, p) => s + p.focusMinutesCompleted, 0) / planCount,
  );

  // Last active date
  const sortedCompleted = completed
    .filter((t) => t.completedAt)
    .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''));
  const lastActiveDate = sortedCompleted[0]?.completedAt?.slice(0, 10) ?? null;

  // Top tags
  const tagFreq = new Map<string, number>();
  for (const task of allTasks) {
    for (const tag of task.tags) {
      tagFreq.set(tag, (tagFreq.get(tag) ?? 0) + 1);
    }
  }
  const topTags = Array.from(tagFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag]) => tag);

  // Preferred work period heuristic: derive from most common task completion hour
  const completionHours = completed
    .filter((t) => t.completedAt)
    .map((t) => new Date(t.completedAt!).getHours());

  let preferredWorkPeriod: ProductivityProfile['preferredWorkPeriod'] = 'unknown';
  if (completionHours.length > 0) {
    const avg = completionHours.reduce((s, h) => s + h, 0) / completionHours.length;
    if (avg < 12) preferredWorkPeriod = 'morning';
    else if (avg < 17) preferredWorkPeriod = 'afternoon';
    else preferredWorkPeriod = 'evening';
  }

  return {
    avgTasksCompletedPerDay,
    avgFocusMinutesPerDay,
    preferredWorkPeriod,
    overallCompletionRate,
    overdueTaskCount,
    topTags,
    lastActiveDate,
  };
}

// ─── ContextBuilder ───────────────────────────────────────────

export interface ContextBuilderInput {
  user: User;
  allTasks: Task[];
  activeGoals: Goal[];
  todayPlan: DailyPlan | null;
  recentReflections: DailyReflection[];
  recentPlans: DailyPlan[];
}

/**
 * Assembles a fully typed WorkflowUserContext from pre-fetched domain data.
 * This function is pure — it never touches Firestore or any external service.
 *
 * @throws ContextBuildError if required fields are missing.
 */
export function buildContext(input: ContextBuilderInput): WorkflowUserContext {
  try {
    const { user, allTasks, activeGoals, todayPlan, recentReflections, recentPlans } = input;

    const timezone = user.timezone ?? 'UTC';
    const currentDate = getTodayIso(timezone);
    const currentTime = getCurrentTime(timezone);
    const dayOfWeek = getDayOfWeek(timezone);

    // Today's tasks: due today or linked to today's plan
    const todayTasks = allTasks
      .filter(
        (t) =>
          (t.dueDate === currentDate || t.dailyPlanId != null) &&
          t.status !== 'archived',
      )
      .map(toWorkflowTask);

    const activeTasks = allTasks
      .filter((t) => t.status !== 'archived' && t.status !== 'completed')
      .map(toWorkflowTask);

    const productivityProfile = deriveProductivityProfile(allTasks, recentPlans);

    return {
      user: {
        id: user.id,
        displayName: user.displayName,
        email: user.email,
        timezone: user.timezone,
        preferences: user.preferences,
      },
      currentDate,
      currentTime,
      dayOfWeek,
      todayTasks,
      activeTasks,
      activeGoals: activeGoals.map(toWorkflowGoal),
      todayPlan,
      recentReflections,
      productivityProfile,
    };
  } catch (err) {
    throw new ContextBuildError('Failed to assemble workflow context.', err);
  }
}
