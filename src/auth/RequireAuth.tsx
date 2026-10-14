import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';

import { FullPageMessage } from '@/components/ui/FullPageMessage';
import { Spinner } from '@/components/ui/Spinner';
import { Routes } from '@/config';

import { useAuth } from './AuthContext';


/**
 * Route guard for pages that need a logged-in user (e.g. a future dashboard).
 *
 *   <Route element={<RequireAuth/>}>
 *     <Route path='/dashboard' element={<DashboardPage/>}/>
 *   </Route>
 *
 * Anonymous visitors are sent to `/auth/login?next=<current path>` and come back here after Discord.
 */
export function RequireAuth({ children }: {children?: ReactNode}) {
  const { loggedOut, status, retry } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return (
      <FullPageMessage>
        <Spinner/>
      </FullPageMessage>
    );
  }

  if (status === 'error') {
    return (
      <FullPageMessage title="Couldn't reach NotSoBot" description='We could not verify your session. Try again in a moment.'>
        <button type='button' className='btn btn-secondary' onClick={retry}>Retry</button>
      </FullPageMessage>
    );
  }

  if (status === 'anonymous') {
    // logging out on a protected page shouldn't immediately start a new login
    if (loggedOut) {
      return <Navigate to={Routes.HOME} replace/>;
    }
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`${Routes.AUTH_LOGIN}?next=${next}`} replace/>;
  }

  return children ?? <Outlet/>;
}
