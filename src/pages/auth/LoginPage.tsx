import { useEffect } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router';

import { sanitizeReturnTo, useAuth } from '@/auth';
import { FullPageMessage } from '@/components/ui/FullPageMessage';
import { Spinner } from '@/components/ui/Spinner';
import { config, Routes } from '@/config';


// `/auth/login?next=/some/page` — linkable entry point that bounces to Discord OAuth,
// or straight to `next` if the visitor is already logged in.
export function LoginPage() {
  const { status, login } = useAuth();
  const [ searchParams ] = useSearchParams();
  const next = sanitizeReturnTo(searchParams.get('next')) || Routes.HOME;

  const shouldRedirect = config.authEnabled && (status === 'anonymous' || status === 'error');
  useEffect(() => {
    if (shouldRedirect) {
      login(next);
    }
  }, [shouldRedirect, login, next]);

  if (status === 'authenticated') {
    return <Navigate to={next} replace/>;
  }

  if (!config.authEnabled) {
    return <LoginDisabledMessage/>;
  }

  return (
    <FullPageMessage title={status === 'loading' ? 'Checking your session…' : 'Redirecting to Discord…'}>
      <Spinner/>
    </FullPageMessage>
  );
}


// shown on the login and callback routes when this build has auth turned off (VITE_AUTH_ENABLED)
export function LoginDisabledMessage() {
  return (
    <FullPageMessage title='Logging in isn’t available' description='Logging in to notsobot.com is turned off right now.'>
      <Link to={Routes.HOME} className='btn btn-secondary'>Go home</Link>
    </FullPageMessage>
  );
}
