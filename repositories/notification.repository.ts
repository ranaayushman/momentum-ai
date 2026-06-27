// ============================================================
// Notification Repository
// All Firestore operations for the "notifications" collection.
// ============================================================

import {
  collection,
  query,
  where,
  orderBy,
  limit,
  addDoc,
  updateDoc,
  getDocs,
  writeBatch,
  doc,
} from 'firebase/firestore';
import { db } from '@/lib/core/firebase/firestore';
import { Notification } from '@/types';
import { BaseRepository } from './base.repository';
import { COLLECTIONS } from './constants';
import {
  WriteFailedError,
  ReadFailedError,
} from './errors';

/**
 * Repository encapsulating all Firestore access for Notification documents.
 */
class NotificationRepository extends BaseRepository<Notification> {
  constructor() {
    super(db, COLLECTIONS.NOTIFICATIONS);
  }

  /**
   * Creates a new notification document. Returns the generated Firestore ID.
   */
  async createNotification(
    notification: Omit<Notification, 'id'>,
  ): Promise<string> {
    try {
      const colRef = collection(db, COLLECTIONS.NOTIFICATIONS);
      const docRef = await addDoc(colRef, notification);
      return docRef.id;
    } catch (err) {
      throw new WriteFailedError(COLLECTIONS.NOTIFICATIONS, 'createNotification', err);
    }
  }

  /**
   * Marks a single notification as read.
   */
  async markAsRead(notificationId: string): Promise<void> {
    try {
      const ref = doc(db, COLLECTIONS.NOTIFICATIONS, notificationId);
      await updateDoc(ref, { isRead: true });
    } catch (err) {
      throw new WriteFailedError(COLLECTIONS.NOTIFICATIONS, 'markAsRead', err);
    }
  }

  /**
   * Marks all of a user's unread notifications as read using a batched write.
   */
  async markAllAsRead(userId: string): Promise<void> {
    try {
      const colRef = collection(db, COLLECTIONS.NOTIFICATIONS);
      const q = query(
        colRef,
        where('userId', '==', userId),
        where('isRead', '==', false),
      );
      const snap = await getDocs(q);

      if (snap.empty) return;

      const batch = writeBatch(db);
      snap.docs.forEach((d) => {
        batch.update(d.ref, { isRead: true });
      });
      await batch.commit();
    } catch (err) {
      throw new WriteFailedError(COLLECTIONS.NOTIFICATIONS, 'markAllAsRead', err);
    }
  }

  /**
   * Returns all unread notifications for a user, sorted by creation time descending.
   */
  async getUnreadNotifications(
    userId: string,
    limitCount: number = 50,
  ): Promise<Notification[]> {
    try {
      const colRef = collection(db, COLLECTIONS.NOTIFICATIONS);
      const q = query(
        colRef,
        where('userId', '==', userId),
        where('isRead', '==', false),
        orderBy('createdAt', 'desc'),
        limit(limitCount),
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Notification));
    } catch (err) {
      throw new ReadFailedError(COLLECTIONS.NOTIFICATIONS, 'getUnreadNotifications', err);
    }
  }

  /**
   * Returns all notifications for a user (read and unread), sorted by creation time.
   */
  async getAllNotifications(
    userId: string,
    limitCount: number = 50,
  ): Promise<Notification[]> {
    try {
      const colRef = collection(db, COLLECTIONS.NOTIFICATIONS);
      const q = query(
        colRef,
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(limitCount),
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Notification));
    } catch (err) {
      throw new ReadFailedError(COLLECTIONS.NOTIFICATIONS, 'getAllNotifications', err);
    }
  }
}

export const notificationRepository = new NotificationRepository();
