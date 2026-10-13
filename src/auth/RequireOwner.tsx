import type { ReactNode } from 'react';
import { Navigate, Outlet } from 'react-router';

import { Routes } from '@/config';

import { useAuth } from './AuthContext';
import { isOwner } from './permissions';


/**
 * Route guard for owner-only pages (the dashboard's admin section). Goes inside <RequireAuth/>, so the
 * user is already loaded; everyone else is sent back to the dashboard. The API enforces this too (403).
 */
export function RequireOwner({ children }: {children?: ReactNode}) {
  const { user } = useAuth();
  if (!isOwner(user)) {
    return <Navigate to={Routes.DASHBOARD} replace/>;
  }
  return children ?? <Outlet/>;
}
