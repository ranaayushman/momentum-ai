import { useContext } from 'react';
import { AuthContext } from '@/lib/core/auth/auth-context';
import { AuthContextValue } from '@/lib/core/auth/auth-types';

/**
 * Accesses the global authentication context.
 * Must be executed within an AuthProvider context tree.
 * 
 * @returns Strongly typed AuthContextValue object
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
