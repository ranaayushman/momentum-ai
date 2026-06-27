// ============================================================
// Reflection Repository
// Reflections are stored as a subcollection under DailyPlan documents.
// Collection path: daily_plans/{planId}/reflections
//
// A standalone "reflections" top-level collection is also supported
// for efficient cross-plan querying (e.g., history).
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
} from 'firebase/firestore';
import { db } from '@/lib/core/firebase/firestore';
import { DailyReflection } from '@/types';
import { BaseRepository, PaginatedResult } from './base.repository';
import { COLLECTIONS } from './constants';
import {
  WriteFailedError,
  ReadFailedError,
  DocumentNotFoundError,
} from './errors';

/**
 * A persisted reflection document that extends DailyReflection with
 * storage metadata.
 */
export interface ReflectionRecord extends DailyReflection {
  id: string;
  userId: string;
  /** ISO YYYY-MM-DD date the reflection is for */
  date: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Repository encapsulating all Firestore access for Reflection documents.
 */
class ReflectionRepository extends BaseRepository<ReflectionRecord> {
  constructor() {
    super(db, COLLECTIONS.REFLECTIONS);
  }

  /**
   * Persists a new reflection document. Returns the generated Firestore ID.
   */
  async createReflection(
    reflection: Omit<ReflectionRecord, 'id'>,
  ): Promise<string> {
    try {
      const colRef = collection(db, COLLECTIONS.REFLECTIONS);
      const docRef = await addDoc(colRef, reflection);
      return docRef.id;
    } catch (err) {
      throw new WriteFailedError(COLLECTIONS.REFLECTIONS, 'createReflection', err);
    }
  }

  /**
   * Returns the most recent reflection for a user.
   * Throws DocumentNotFoundError if none exist.
   */
  async getLatestReflection(userId: string): Promise<ReflectionRecord> {
    try {
      const colRef = collection(db, COLLECTIONS.REFLECTIONS);
      const q = query(
        colRef,
        where('userId', '==', userId),
        orderBy('date', 'desc'),
        limit(1),
      );
      const snap = await getDocs(q);

      if (snap.empty) {
        throw new DocumentNotFoundError(COLLECTIONS.REFLECTIONS, `latest for user ${userId}`);
      }

      const d = snap.docs[0];
      return { id: d.id, ...d.data() } as ReflectionRecord;
    } catch (err) {
      if (err instanceof DocumentNotFoundError) throw err;
      throw new ReadFailedError(COLLECTIONS.REFLECTIONS, 'getLatestReflection', err);
    }
  }

  /**
   * Returns a paginated history of reflections for a user, sorted by date descending.
   */
  async getReflectionHistory(
    userId: string,
    limitCount: number = 30,
    startAfterDoc?: DocumentSnapshot,
  ): Promise<PaginatedResult<ReflectionRecord>> {
    try {
      const colRef = collection(db, COLLECTIONS.REFLECTIONS);
      const constraints = [
        where('userId', '==', userId),
        orderBy('date', 'desc'),
        limit(limitCount),
        ...(startAfterDoc ? [startAfter(startAfterDoc)] : []),
      ];

      const q = query(colRef, ...constraints);
      const snap = await getDocs(q);

      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ReflectionRecord));
      const lastDoc = snap.docs[snap.docs.length - 1] ?? null;

      return { data, lastDoc, hasMore: snap.docs.length === limitCount };
    } catch (err) {
      throw new ReadFailedError(COLLECTIONS.REFLECTIONS, 'getReflectionHistory', err);
    }
  }
}

export const reflectionRepository = new ReflectionRepository();
