import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useSyncExternalStore, type ReactNode } from 'react';

import { api, ApiEndpoints, ApiRequestError, apiUrl } from '@/lib/api';
import { queryKeys } from '@/lib/api/queries';

import { AuthContext, type AuthContextValue, type AuthStatus } from './AuthContext';
import { saveReturnTo } from './returnTo';
import { tokenStorage } from './tokenStorage';


function isAuthRejection(error: unknown): boolean {
  return error instanceof ApiRequestError && (error.status === 401 || error.status === 403);
}


export function AuthProvider({ children }: {children: ReactNode}) {
  const queryClient = useQueryClient();
  const token = useSyncExternalStore(tokenStorage.subscribe, tokenStorage.get, () => null);

  const meQuery = useQuery({
    queryKey: queryKeys.me(token),
    queryFn: ({ signal }) => api.fetchMe(signal),
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    // don't hammer the API with a token it already rejected
    retry: (failureCount, error) => !isAuthRejection(error) && failureCount < 2,
  });

  // A rejected token is dead; drop it so the UI falls back to logged out.
  // (401s are already cleared by the API client; `/users/@me` also answers 403 when the session is gone.)
  useEffect(() => {
    if (token && isAuthRejection(meQuery.error) && tokenStorage.get() === token) {
      tokenStorage.clear();
    }
  }, [meQuery.error, token]);

  // Forget any per-user cached data once logged out (including logouts from another tab).
  useEffect(() => {
    if (!token) {
      queryClient.removeQueries({queryKey: ['users', '@me']});
    }
  }, [queryClient, token]);

  const login = useCallback((returnTo?: string) => {
    saveReturnTo(returnTo ?? (window.location.pathname + window.location.search));
    window.location.assign(apiUrl(ApiEndpoints.AUTH_LOGIN));
  }, []);

  const logout = useCallback(async () => {
    if (tokenStorage.get()) {
      try {
        await api.logout();
      } catch {
        // session may already be gone server-side; clear locally regardless
      }
    }
    tokenStorage.clear();
  }, []);

  const completeLogin = useCallback((value: string) => {
    tokenStorage.set(value);
  }, []);

  const { refetch } = meQuery;
  const retry = useCallback(() => {
    void refetch();
  }, [refetch]);

  let status: AuthStatus;
  if (!token) {
    status = 'anonymous';
  } else if (meQuery.data) {
    status = 'authenticated';
  } else if (meQuery.isError) {
    status = isAuthRejection(meQuery.error) ? 'anonymous' : 'error';
  } else {
    status = 'loading';
  }

  const user = (status === 'authenticated') ? meQuery.data ?? null : null;

  const value = useMemo<AuthContextValue>(() => ({
    status,
    user,
    token,
    isAuthenticated: status === 'authenticated',
    login,
    logout,
    completeLogin,
    retry,
  }), [status, user, token, login, logout, completeLogin, retry]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
