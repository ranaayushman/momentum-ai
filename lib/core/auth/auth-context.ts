import { createContext } from 'react';
import { AuthContextValue } from './auth-types';

/**
 * Global authentication context.
 */
export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
