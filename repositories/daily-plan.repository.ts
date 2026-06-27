// ============================================================
// Daily Plan Repository
// All Firestore operations for the "daily_plans" collection.
// ============================================================

import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  doc,
  getDoc,
} from 'firebase/firestore';
import { db } from '@/lib/core/firebase/firestore';
import { DailyPlan } from '@/types';
import { BaseRepository } from './base.repository';
import { COLLECTIONS } from './constants';
import {
  DocumentNotFoundError,
  WriteFailedError,
  ReadFailedError,
} from './errors';

/**
 * Derives a deterministic document ID for a user's daily plan.
 * Format: "{userId}_{YYYY-MM-DD}"
 */
function buildDailyPlanId(userId: string, date: string): string {
  return `${userId}_${date}`;
}

/**
 * Repository encapsulating all Firestore access for DailyPlan documents.
 */
class DailyPlanRepository extends BaseRepository<DailyPlan> {
  constructor() {
    super(db, COLLECTIONS.DAILY_PLANS);
  }

  /**
   * Creates a daily plan with a deterministic ID derived from userId and date.
   */
  async createDailyPlan(plan: Omit<DailyPlan, 'id'>): Promise<string> {
    const planId = buildDailyPlanId(plan.userId, plan.date);
    try {
      await this.set(planId, plan);
      return planId;
    } catch (err) {
      throw new WriteFailedError(COLLECTIONS.DAILY_PLANS, 'createDailyPlan', err);
    }
  }

  /**
   * Partially updates an existing daily plan. Stamps updatedAt.
   */
  async updateDailyPlan(
    planId: string,
    data: Partial<Omit<DailyPlan, 'id'>>,
  ): Promise<void> {
    try {
      await this.update(planId, {
        ...data,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      throw new WriteFailedError(COLLECTIONS.DAILY_PLANS, 'updateDailyPlan', err);
    }
  }

  /**
   * Returns the user's daily plan for today (current date in ISO YYYY-MM-DD).
   * Throws DocumentNotFoundError if no plan exists yet.
   */
  async getTodayPlan(userId: string): Promise<DailyPlan> {
    const today = new Date().toISOString().slice(0, 10);
    return this.getPlanByDate(userId, today);
  }

  /**
   * Returns the user's daily plan for a specific date (ISO YYYY-MM-DD format).
   * Throws DocumentNotFoundError if no plan exists for that date.
   */
  async getPlanByDate(userId: string, date: string): Promise<DailyPlan> {
    const planId = buildDailyPlanId(userId, date);
    try {
      const ref = doc(db, COLLECTIONS.DAILY_PLANS, planId);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        throw new DocumentNotFoundError(COLLECTIONS.DAILY_PLANS, planId);
      }
      return { id: snap.id, ...snap.data() } as DailyPlan;
    } catch (err) {
      if (err instanceof DocumentNotFoundError) throw err;
      throw new ReadFailedError(COLLECTIONS.DAILY_PLANS, 'getPlanByDate', err);
    }
  }

  /**
   * Returns all daily plans for a user, ordered by date descending.
   */
  async getPlanHistory(
    userId: string,
    limitCount: number = 30,
  ): Promise<DailyPlan[]> {
    try {
      const colRef = collection(db, COLLECTIONS.DAILY_PLANS);
      const q = query(
        colRef,
        where('userId', '==', userId),
        orderBy('date', 'desc'),
        limit(limitCount),
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as DailyPlan));
    } catch (err) {
      throw new ReadFailedError(COLLECTIONS.DAILY_PLANS, 'getPlanHistory', err);
    }
  }
}

export const dailyPlanRepository = new DailyPlanRepository();
