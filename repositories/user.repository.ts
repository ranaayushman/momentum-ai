// ============================================================
// User Repository
// All Firestore operations for the "users" collection.
// ============================================================


import { db } from '@/lib/core/firebase/firestore';
import { User } from '@/types';
import { BaseRepository } from './base.repository';
import { COLLECTIONS } from './constants';
import { WriteFailedError } from './errors';
import { doc, updateDoc } from 'firebase/firestore';

/**
 * Repository encapsulating all Firestore access for User documents.
 */
class UserRepository extends BaseRepository<User> {
  constructor() {
    super(db, COLLECTIONS.USERS);
  }

  /**
   * Retrieves a user by their Firebase UID.
   * Throws DocumentNotFoundError if the profile does not exist.
   */
  async getUserById(userId: string): Promise<User> {
    return this.findById(userId);
  }

  /**
   * Checks if a user document exists for the given UID.
   */
  async userExists(userId: string): Promise<boolean> {
    return this.exists(userId);
  }

  /**
   * Creates or fully overwrites a user document.
   * Use this when registering a new user.
   */
  async createUser(user: User): Promise<void> {
    try {
      const { id, ...data } = user;
      await this.set(id, data);
    } catch (err) {
      throw new WriteFailedError(COLLECTIONS.USERS, 'createUser', err);
    }
  }

  /**
   * Partially updates an existing user document.
   */
  async updateUser(userId: string, data: Partial<Omit<User, 'id'>>): Promise<void> {
    try {
      await this.update(userId, {
        ...data,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      throw new WriteFailedError(COLLECTIONS.USERS, 'updateUser', err);
    }
  }

  /**
   * Updates the user's display name and/or photo URL.
   */
  async updateProfile(
    userId: string,
    profile: { displayName?: string | null; photoURL?: string | null },
  ): Promise<void> {
    try {
      await this.update(userId, {
        ...profile,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      throw new WriteFailedError(COLLECTIONS.USERS, 'updateProfile', err);
    }
  }

  /**
   * Stamps the user's last login time.
   * Used after a successful authentication event.
   */
  async updateLastLogin(userId: string): Promise<void> {
    try {
      const ref = doc(db, COLLECTIONS.USERS, userId);
      await updateDoc(ref, {
        updatedAt: new Date().toISOString(),
        // Store last login as ISO string for consistency with the User model
        lastLoginAt: new Date().toISOString(),
      });
    } catch (err) {
      throw new WriteFailedError(COLLECTIONS.USERS, 'updateLastLogin', err);
    }
  }
}

export const userRepository = new UserRepository();
