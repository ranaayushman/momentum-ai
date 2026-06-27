import { User as AppUser, UserRole, ThemePreference } from '@/types';
import { AuthError } from './auth-types';
import { User as FirebaseUser } from 'firebase/auth';

/**
 * Maps raw database user document to strongly typed AppUser.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapDbUserToAppUser(dbUserRaw: any): AppUser {
  return {
    id: dbUserRaw.id,
    email: dbUserRaw.email,
    displayName: dbUserRaw.displayName || null,
    photoURL: dbUserRaw.photoURL || null,
    role: dbUserRaw.role || UserRole.USER,
    timezone: dbUserRaw.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    onboarding: {
      completed: dbUserRaw.onboarding?.completed || false,
      currentStep: dbUserRaw.onboarding?.currentStep || 1,
      answers: dbUserRaw.onboarding?.answers || {},
      completedAt: dbUserRaw.onboarding?.completedAt || null,
    },
    preferences: {
      theme: dbUserRaw.preferences?.theme || ThemePreference.SYSTEM,
      focus: {
        pomodoroWorkMinutes: dbUserRaw.preferences?.focus?.pomodoroWorkMinutes ?? 25,
        shortBreakMinutes: dbUserRaw.preferences?.focus?.shortBreakMinutes ?? 5,
        longBreakMinutes: dbUserRaw.preferences?.focus?.longBreakMinutes ?? 15,
        cyclesBeforeLongBreak: dbUserRaw.preferences?.focus?.cyclesBeforeLongBreak ?? 4,
        autoStartBreaks: dbUserRaw.preferences?.focus?.autoStartBreaks ?? false,
        autoStartWork: dbUserRaw.preferences?.focus?.autoStartWork ?? false,
      },
      notifications: {
        pushEnabled: dbUserRaw.preferences?.notifications?.pushEnabled ?? false,
        emailEnabled: dbUserRaw.preferences?.notifications?.emailEnabled ?? false,
        dailyPlanningReminder: dbUserRaw.preferences?.notifications?.dailyPlanningReminder ?? false,
        dailyPlanningTime: dbUserRaw.preferences?.notifications?.dailyPlanningTime || '08:30',
        weeklyDigest: dbUserRaw.preferences?.notifications?.weeklyDigest ?? false,
      },
      dailyFocusTargetMinutes: dbUserRaw.preferences?.dailyFocusTargetMinutes ?? 120,
    },
    createdAt: dbUserRaw.createdAt || new Date().toISOString(),
    updatedAt: dbUserRaw.updatedAt || new Date().toISOString(),
  };
}

/**
 * Creates the initial user database model structure when a new user signs up.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createInitialUserModel(firebaseUser: FirebaseUser): any {
  return {
    id: firebaseUser.uid,
    email: firebaseUser.email || '',
    displayName: firebaseUser.displayName || null,
    photoURL: firebaseUser.photoURL || null,
    role: UserRole.USER,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    onboarding: {
      completed: false,
      currentStep: 1,
      answers: {},
      completedAt: null,
    },
    preferences: {
      theme: ThemePreference.SYSTEM,
      focus: {
        pomodoroWorkMinutes: 25,
        shortBreakMinutes: 5,
        longBreakMinutes: 15,
        cyclesBeforeLongBreak: 4,
        autoStartBreaks: false,
        autoStartWork: false,
      },
      notifications: {
        pushEnabled: false,
        emailEnabled: false,
        dailyPlanningReminder: false,
        dailyPlanningTime: '08:30',
        weeklyDigest: false,
      },
      dailyFocusTargetMinutes: 120,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Maps standard Firebase authentication errors to AuthError format.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapFirebaseError(err: any): AuthError {
  const code = err?.code || 'auth/unknown-error';
  let message = err?.message || 'An unexpected authentication error occurred.';
  
  // Custom user-friendly messages for common errors
  switch (code) {
    case 'auth/invalid-email':
      message = 'The email address is badly formatted.';
      break;
    case 'auth/user-disabled':
      message = 'This user account has been disabled.';
      break;
    case 'auth/user-not-found':
      message = 'No user account found with this email.';
      break;
    case 'auth/wrong-password':
      message = 'Incorrect password. Please try again.';
      break;
    case 'auth/email-already-in-use':
      message = 'An account already exists with this email address.';
      break;
    case 'auth/popup-closed-by-user':
      message = 'Sign-in window closed before completing authentication.';
      break;
    case 'auth/cancelled-popup-request':
      message = 'Only one sign-in popup is allowed at a time.';
      break;
    default:
      break;
  }
  
  return { code, message };
}
