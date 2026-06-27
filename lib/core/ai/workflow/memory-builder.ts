// ============================================================
// Workflow Engine — Memory Builder
// Extracts a productivity narrative from WorkflowUserContext.
// The memory is serialized into a string block injected
// into the prompt's context section.
// No long-term storage. In-memory, per-request only.
// ============================================================

import type { WorkflowUserContext, ProductivityProfile } from './workflow-types';

// ─── Memory Snapshot ──────────────────────────────────────────

export interface MemorySnapshot {
  /** Human-readable productivity narrative for prompt injection. */
  narrative: string;
  /** Structured data version for programmatic use by agents. */
  structured: StructuredMemory;
}

export interface StructuredMemory {
  productivityProfile: ProductivityProfile;
  pendingTaskCount: number;
  overdueTaskCount: number;
  highPriorityCount: number;
  goalsInProgress: number;
  focusDailyTarget: number;
  avgFocusMinutesPerDay: number;
  topWorkAreas: string[];
  lastActiveDate: string | null;
  currentStreak: number; // approximate consecutive active days
}

// ─── Helpers ──────────────────────────────────────────────────

function estimateStreak(lastActiveDate: string | null): number {
  if (!lastActiveDate) return 0;
  const today = new Date().toISOString().slice(0, 10);
  const diffMs = new Date(today).getTime() - new Date(lastActiveDate).getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  // Simplistic: if last active was today or yesterday, assume streak ≥ 1
  return diffDays <= 1 ? 1 : 0;
}

function workPeriodLabel(period: ProductivityProfile['preferredWorkPeriod']): string {
  const map: Record<typeof period, string> = {
    morning: 'mornings (before noon)',
    afternoon: 'afternoons (noon–5pm)',
    evening: 'evenings (after 5pm)',
    unknown: 'no specific time preference',
  };
  return map[period];
}

// ─── Narrative Builder ────────────────────────────────────────

function buildNarrative(ctx: WorkflowUserContext, structured: StructuredMemory): string {
  const p = structured;
  const lines: string[] = [
    `## User Productivity Memory`,
    ``,
    `**Name:** ${ctx.user.displayName}`,
    `**Today:** ${ctx.currentDate} (${ctx.dayOfWeek}), ${ctx.currentTime}`,
    ``,
    `### Workload`,
    `- Pending tasks: ${p.pendingTaskCount}`,
    `- High-priority tasks: ${p.highPriorityCount}`,
    `- Overdue tasks: ${p.overdueTaskCount}`,
    `- Active goals: ${p.goalsInProgress}`,
    ``,
    `### Productivity Patterns`,
    `- Average tasks completed/day (last 14 days): ${p.avgFocusMinutesPerDay > 0 ? p.productivityProfile.avgTasksCompletedPerDay : 'N/A'}`,
    `- Average focus time/day: ${p.avgFocusMinutesPerDay} min`,
    `- Daily focus target: ${p.focusDailyTarget} min`,
    `- Preferred work period: ${workPeriodLabel(p.productivityProfile.preferredWorkPeriod)}`,
    `- Overall task completion rate: ${p.productivityProfile.overallCompletionRate}%`,
    ``,
    `### Focus Areas`,
    p.topWorkAreas.length > 0
      ? `- Top tags: ${p.topWorkAreas.join(', ')}`
      : `- No recurring tags yet.`,
    ``,
    `### Recency`,
    `- Last active: ${p.lastActiveDate ?? 'unknown'}`,
    `- Active streak: ${p.currentStreak} day(s)`,
  ];

  return lines.join('\n');
}

// ─── Public API ───────────────────────────────────────────────

/**
 * Builds a MemorySnapshot from the WorkflowUserContext.
 * Pure function — no I/O, no storage.
 */
export function buildMemory(ctx: WorkflowUserContext): MemorySnapshot {
  const profile = ctx.productivityProfile;
  const focusDailyTarget = ctx.user.preferences.dailyFocusTargetMinutes;

  const pendingTaskCount = ctx.activeTasks.filter(
    (t) => t.status === 'todo' || t.status === 'in_progress',
  ).length;

  const highPriorityCount = ctx.activeTasks.filter(
    (t) => t.priority === 'high' || t.priority === 'urgent',
  ).length;

  const goalsInProgress = ctx.activeGoals.filter(
    (g) => g.status === 'in_progress' || g.status === 'not_started',
  ).length;

  const currentStreak = estimateStreak(profile.lastActiveDate);

  const structured: StructuredMemory = {
    productivityProfile: profile,
    pendingTaskCount,
    overdueTaskCount: profile.overdueTaskCount,
    highPriorityCount,
    goalsInProgress,
    focusDailyTarget,
    avgFocusMinutesPerDay: profile.avgFocusMinutesPerDay,
    topWorkAreas: profile.topTags,
    lastActiveDate: profile.lastActiveDate,
    currentStreak,
  };

  const narrative = buildNarrative(ctx, structured);
  return { narrative, structured };
}
