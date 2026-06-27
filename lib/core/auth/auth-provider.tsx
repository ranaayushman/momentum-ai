'use client';

import React, { useState, useEffect, ReactNode } from 'react';
import { AuthContext } from './auth-context';
import { authService, FirebaseUser } from '@/services/auth.service';
import { AuthState } from './auth-types';
import { mapDbUserToAppUser, mapFirebaseError } from './auth-utils';

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Authentication Provider component wrapping the React application context.
 * Marked with "use client" as it manages client-side authentication cycles and events.
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  // Listener to track Firebase auth state changes and sync user documents
  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged(async (firebaseUser: FirebaseUser | null) => {
      try {
        if (!firebaseUser) {
          setState({
            user: null,
            loading: false,
            error: null,
          });
          return;
        }

        // Sync Firestore User Profile Document
        const dbUserRaw = await authService.syncUserDoc(firebaseUser);
        const appUser = mapDbUserToAppUser(dbUserRaw);

        setState({
          user: appUser,
          loading: false,
          error: null,
        });
      } catch (err) {
        const authErr = mapFirebaseError(err);
        setState({
          user: null,
          loading: false,
          error: authErr,
        });
      }
    });

    return () => unsubscribe();
  }, []);

  /**
   * Triggers the Google sign-in process.
   */
  const login = async (): Promise<void> => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      await authService.loginWithGoogle();
    } catch (err) {
      const authErr = mapFirebaseError(err);
      setState((prev) => ({
        ...prev,
        loading: false,
        error: authErr,
      }));
    }
  };

  /**
   * Logs out the user session.
   */
  const logout = async (): Promise<void> => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      await authService.logout();
    } catch (err) {
      const authErr = mapFirebaseError(err);
      setState((prev) => ({
        ...prev,
        loading: false,
        error: authErr,
      }));
    }
  };

  const contextValue = {
    user: state.user,
    loading: state.loading,
    authenticated: !!state.user,
    error: state.error,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}
