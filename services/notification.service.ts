// ============================================================
// Notification Service
// Orchestrates notification business logic.
// Never accesses Firestore directly.
// ============================================================

import { Notification, NotificationType } from '@/types';
import { notificationRepository } from '@/repositories';
import { BaseService } from './base.service';
import { ValidationError } from './errors';

// ─── Input DTOs ───────────────────────────────────────────────

export interface CreateNotificationInput {
  userId: string;
  title: string;
  body: string;
  type: NotificationType;
  actionUrl?: string | null;
}

// ─── Service ──────────────────────────────────────────────────

class NotificationService extends BaseService {
  /**
   * Creates a new in-app notification. Returns the notification ID.
   */
  async createNotification(input: CreateNotificationInput): Promise<string> {
    return this.run('createNotification', async () => {
      this.assertNonEmpty(input.userId, 'userId');
      this.assertNonEmpty(input.title, 'title');
      this.assertNonEmpty(input.body, 'body');

      const now = this.nowIso();
      const notification: Omit<Notification, 'id'> = {
        userId: input.userId,
        title: input.title.trim(),
        body: input.body.trim(),
        type: input.type,
        isRead: false,
        actionUrl: input.actionUrl ?? null,
        createdAt: now,
      };

      return notificationRepository.createNotification(notification);
    });
  }

  /**
   * Marks a single notification as read.
   */
  async markAsRead(notificationId: string): Promise<void> {
    return this.run('markAsRead', async () => {
      this.assertNonEmpty(notificationId, 'notificationId');
      await notificationRepository.markAsRead(notificationId);
    });
  }

  /**
   * Marks all of a user's unread notifications as read using a batched write.
   */
  async markAllRead(userId: string): Promise<void> {
    return this.run('markAllRead', async () => {
      this.assertNonEmpty(userId, 'userId');
      await notificationRepository.markAllAsRead(userId);
    });
  }

  /**
   * Deletes a notification by its ID.
   */
  async deleteNotification(notificationId: string): Promise<void> {
    return this.run('deleteNotification', async () => {
      this.assertNonEmpty(notificationId, 'notificationId');
      await notificationRepository.delete(notificationId);
    });
  }

  /**
   * Returns all unread notifications for a user.
   */
  async getUnreadNotifications(
    userId: string,
    limitCount: number = 50,
  ): Promise<Notification[]> {
    return this.run('getUnreadNotifications', async () => {
      this.assertNonEmpty(userId, 'userId');
      if (limitCount < 1 || limitCount > 200) {
        throw new ValidationError('limitCount must be between 1 and 200.', 'limitCount');
      }
      return notificationRepository.getUnreadNotifications(userId, limitCount);
    });
  }

  /**
   * Returns the count of unread notifications for a user.
   */
  async getUnreadCount(userId: string): Promise<number> {
    return this.run('getUnreadCount', async () => {
      this.assertNonEmpty(userId, 'userId');
      const notifications = await notificationRepository.getUnreadNotifications(userId, 200);
      return notifications.length;
    });
  }

  /**
   * Returns all notifications (read and unread) for a user.
   */
  async getAllNotifications(
    userId: string,
    limitCount: number = 50,
  ): Promise<Notification[]> {
    return this.run('getAllNotifications', async () => {
      this.assertNonEmpty(userId, 'userId');
      return notificationRepository.getAllNotifications(userId, limitCount);
    });
  }
}

export const notificationService = new NotificationService();
