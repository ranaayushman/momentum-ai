// ============================================================
// Task Repository
// All Firestore operations for the "tasks" collection.
// Supports pagination, sorting, and filtering by status.
// ============================================================

import {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  addDoc,
  DocumentSnapshot,
  QueryConstraint,
} from 'firebase/firestore';
import { db } from '@/lib/core/firebase/firestore';
import { Task, TaskStatus } from '@/types';
import { BaseRepository, PaginatedResult } from './base.repository';
import { COLLECTIONS } from './constants';
import {
  WriteFailedError,
  ReadFailedError,
  DeleteFailedError,
} from './errors';

/**
 * Sorting field options for task queries.
 */
export type TaskSortField = 'createdAt' | 'updatedAt' | 'dueDate' | 'priority';

/**
 * Sort direction.
 */
export type SortDirection = 'asc' | 'desc';

/**
 * Options for paginated task queries.
 */
export interface TaskQueryOptions {
  limitCount?: number;
  startAfterDoc?: DocumentSnapshot;
  sortBy?: TaskSortField;
  sortDirection?: SortDirection;
}

/**
 * Repository encapsulating all Firestore access for Task documents.
 */
class TaskRepository extends BaseRepository<Task> {
  constructor() {
    super(db, COLLECTIONS.TASKS);
  }

  /**
   * Creates a new task document. Returns the generated document ID.
   */
  async createTask(task: Omit<Task, 'id'>): Promise<string> {
    try {
      const colRef = collection(db, COLLECTIONS.TASKS);
      const docRef = await addDoc(colRef, task);
      return docRef.id;
    } catch (err) {
      throw new WriteFailedError(COLLECTIONS.TASKS, 'createTask', err);
    }
  }

  /**
   * Partially updates an existing task. Automatically stamps updatedAt.
   */
  async updateTask(taskId: string, data: Partial<Omit<Task, 'id'>>): Promise<void> {
    try {
      await this.update(taskId, {
        ...data,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      throw new WriteFailedError(COLLECTIONS.TASKS, 'updateTask', err);
    }
  }

  /**
   * Permanently deletes a task document.
   */
  async deleteTask(taskId: string): Promise<void> {
    try {
      await this.delete(taskId);
    } catch (err) {
      throw new DeleteFailedError(COLLECTIONS.TASKS, taskId, err);
    }
  }

  /**
   * Retrieves a single task by its document ID.
   */
  async getTask(taskId: string): Promise<Task> {
    return this.findById(taskId);
  }

  /**
   * Returns all tasks belonging to a user, with optional pagination and sorting.
   */
  async getTasksByUser(
    userId: string,
    options: TaskQueryOptions = {},
  ): Promise<PaginatedResult<Task>> {
    const {
      limitCount = 50,
      startAfterDoc,
      sortBy = 'createdAt',
      sortDirection = 'desc',
    } = options;

    try {
      const colRef = collection(db, COLLECTIONS.TASKS);
      const constraints: QueryConstraint[] = [
        where('userId', '==', userId),
        orderBy(sortBy, sortDirection),
        limit(limitCount),
      ];

      if (startAfterDoc) {
        constraints.push(startAfter(startAfterDoc));
      }

      const q = query(colRef, ...constraints);
      const snap = await getDocs(q);

      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Task));
      const lastDoc = snap.docs[snap.docs.length - 1] ?? null;

      return { data, lastDoc, hasMore: snap.docs.length === limitCount };
    } catch (err) {
      throw new ReadFailedError(COLLECTIONS.TASKS, 'getTasksByUser', err);
    }
  }

  /**
   * Returns tasks for a user scheduled on a specific date.
   * Matches against the task's dueDate field (ISO YYYY-MM-DD string).
   */
  async getTasksByDate(
    userId: string,
    date: string,
    options: TaskQueryOptions = {},
  ): Promise<PaginatedResult<Task>> {
    const { limitCount = 100, startAfterDoc, sortBy = 'priority', sortDirection = 'desc' } = options;

    try {
      const colRef = collection(db, COLLECTIONS.TASKS);
      const constraints: QueryConstraint[] = [
        where('userId', '==', userId),
        where('dueDate', '==', date),
        orderBy(sortBy, sortDirection),
        limit(limitCount),
      ];

      if (startAfterDoc) {
        constraints.push(startAfter(startAfterDoc));
      }

      const q = query(colRef, ...constraints);
      const snap = await getDocs(q);

      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Task));
      const lastDoc = snap.docs[snap.docs.length - 1] ?? null;

      return { data, lastDoc, hasMore: snap.docs.length === limitCount };
    } catch (err) {
      throw new ReadFailedError(COLLECTIONS.TASKS, 'getTasksByDate', err);
    }
  }

  /**
   * Returns tasks for a user filtered to a specific status, with optional pagination.
   */
  private async getTasksByStatus(
    userId: string,
    status: TaskStatus,
    options: TaskQueryOptions = {},
  ): Promise<PaginatedResult<Task>> {
    const {
      limitCount = 50,
      startAfterDoc,
      sortBy = 'updatedAt',
      sortDirection = 'desc',
    } = options;

    try {
      const colRef = collection(db, COLLECTIONS.TASKS);
      const constraints: QueryConstraint[] = [
        where('userId', '==', userId),
        where('status', '==', status),
        orderBy(sortBy, sortDirection),
        limit(limitCount),
      ];

      if (startAfterDoc) {
        constraints.push(startAfter(startAfterDoc));
      }

      const q = query(colRef, ...constraints);
      const snap = await getDocs(q);

      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Task));
      const lastDoc = snap.docs[snap.docs.length - 1] ?? null;

      return { data, lastDoc, hasMore: snap.docs.length === limitCount };
    } catch (err) {
      throw new ReadFailedError(COLLECTIONS.TASKS, `getTasksByStatus(${status})`, err);
    }
  }

  /**
   * Returns all completed tasks for a user.
   */
  async getCompletedTasks(
    userId: string,
    options: TaskQueryOptions = {},
  ): Promise<PaginatedResult<Task>> {
    return this.getTasksByStatus(userId, TaskStatus.COMPLETED, options);
  }

  /**
   * Returns all pending (TODO) tasks for a user.
   */
  async getPendingTasks(
    userId: string,
    options: TaskQueryOptions = {},
  ): Promise<PaginatedResult<Task>> {
    return this.getTasksByStatus(userId, TaskStatus.TODO, options);
  }
}

export const taskRepository = new TaskRepository();
