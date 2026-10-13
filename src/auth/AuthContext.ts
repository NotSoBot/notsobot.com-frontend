import { createContext, useContext } from 'react';

import type { UserMe } from '@/lib/api';


/**
 * - `anonymous`: no token stored
 * - `loading`: token stored, `/users/@me` in flight
 * - `authenticated`: token verified, `user` is set
 * - `error`: token stored but the API could not be reached (token is kept, `retry()` to try again)
 */
export type AuthStatus = 'anonymous' | 'loading' | 'authenticated' | 'error';


export interface AuthContextValue {
  status: AuthStatus,
  user: UserMe | null,
  token: string | null,
  isAuthenticated: boolean,
  // full-page redirect to Discord OAuth via `/api/auth/login`; returns to `returnTo` (default: current page)
  login: (returnTo?: string) => void,
  // revokes the session server-side (best effort) and clears local state
  logout: () => Promise<void>,
  // stores a token handed back by the OAuth callback
  completeLogin: (token: string) => void,
  retry: () => void,
}


export const AuthContext = createContext<AuthContextValue | null>(null);


export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return value;
}
