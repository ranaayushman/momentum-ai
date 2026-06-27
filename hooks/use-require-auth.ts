import { useAuth } from './use-auth';
import { User } from '@/types';

export interface RequireAuthResult {
  /** True when auth state is fully loaded and user is authenticated */
  isAuthenticated: boolean;
  /** True if the authentication state is resolving in the background */
  isLoading: boolean;
  /** Access to the currently authenticated user document fields */
  user: User | null;
}

/**
 * Simple authentication indicator for client components.
 * Does not invoke automatic navigation/redirect logic.
 * 
 * @returns Status of user authentication and load state
 */
export function useRequireAuth(): RequireAuthResult {
  const { user, loading } = useAuth();

  return {
    isAuthenticated: !loading && user !== null,
    isLoading: loading,
    user,
  };
}
