import { User as AppUser } from '@/types';

/**
 * Standard representation of an authentication-related error.
 */
export interface AuthError {
  code: string;
  message: string;
}

/**
 * Internal state structure managed by the AuthProvider.
 */
export interface AuthState {
  user: AppUser | null;
  loading: boolean;
  error: AuthError | null;
}

/**
 * Context value structure exposed to React client components.
 */
export interface AuthContextValue {
  user: AppUser | null;
  loading: boolean;
  authenticated: boolean;
  error: AuthError | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}
