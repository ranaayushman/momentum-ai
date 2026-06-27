import { useAuth } from './use-auth';
import { User } from '@/types';

/**
 * Custom hook to retrieve the currently authenticated user details.
 * 
 * @returns The synchronized AppUser object, or null if unauthenticated
 */
export function useCurrentUser(): User | null {
  const { user } = useAuth();
  return user;
}
