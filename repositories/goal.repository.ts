// ============================================================
// Goal Repository
// All Firestore operations for the "goals" collection.
// ============================================================

import {
  collection,
  query,
  where,
  orderBy,
  limit,
  addDoc,
  getDocs,
  DocumentSnapshot,
  startAfter,
  QueryConstraint,
} from 'firebase/firestore';
import { db } from '@/lib/core/firebase/firestore';
import { Goal, GoalStatus } from '@/types';
import { BaseRepository, PaginatedResult } from './base.repository';
import { COLLECTIONS } from './constants';
import {
  WriteFailedError,
  ReadFailedError,
  DeleteFailedError,
} from './errors';

/**
 * Filter options for goal queries.
 */
export interface GoalQueryOptions {
  limitCount?: number;
  startAfterDoc?: DocumentSnapshot;
  status?: GoalStatus;
  sortBy?: 'createdAt' | 'updatedAt' | 'targetDate' | 'progressPercentage';
  sortDirection?: 'asc' | 'desc';
}

/**
 * Repository encapsulating all Firestore access for Goal documents.
 */
class GoalRepository extends BaseRepository<Goal> {
  constructor() {
    super(db, COLLECTIONS.GOALS);
  }

  /**
   * Creates a new goal document. Returns the generated Firestore document ID.
   */
  async createGoal(goal: Omit<Goal, 'id'>): Promise<string> {
    try {
      const colRef = collection(db, COLLECTIONS.GOALS);
      const docRef = await addDoc(colRef, goal);
      return docRef.id;
    } catch (err) {
      throw new WriteFailedError(COLLECTIONS.GOALS, 'createGoal', err);
    }
  }

  /**
   * Partially updates an existing goal. Stamps updatedAt.
   */
  async updateGoal(goalId: string, data: Partial<Omit<Goal, 'id'>>): Promise<void> {
    try {
      await this.update(goalId, {
        ...data,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      throw new WriteFailedError(COLLECTIONS.GOALS, 'updateGoal', err);
    }
  }

  /**
   * Permanently deletes a goal document.
   */
  async deleteGoal(goalId: string): Promise<void> {
    try {
      await this.delete(goalId);
    } catch (err) {
      throw new DeleteFailedError(COLLECTIONS.GOALS, goalId, err);
    }
  }

  /**
   * Returns all goals for a user with optional status filtering and pagination.
   */
  async getGoals(
    userId: string,
    options: GoalQueryOptions = {},
  ): Promise<PaginatedResult<Goal>> {
    const {
      limitCount = 50,
      startAfterDoc,
      status,
      sortBy = 'createdAt',
      sortDirection = 'desc',
    } = options;

    try {
      const colRef = collection(db, COLLECTIONS.GOALS);
      const constraints: QueryConstraint[] = [
        where('userId', '==', userId),
        orderBy(sortBy, sortDirection),
        limit(limitCount),
      ];

      if (status !== undefined) {
        constraints.unshift(where('status', '==', status));
      }

      if (startAfterDoc) {
        constraints.push(startAfter(startAfterDoc));
      }

      const q = query(colRef, ...constraints);
      const snap = await getDocs(q);

      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Goal));
      const lastDoc = snap.docs[snap.docs.length - 1] ?? null;

      return { data, lastDoc, hasMore: snap.docs.length === limitCount };
    } catch (err) {
      throw new ReadFailedError(COLLECTIONS.GOALS, 'getGoals', err);
    }
  }
}

export const goalRepository = new GoalRepository();
