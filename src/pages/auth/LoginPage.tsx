import { useEffect } from 'react';
import { Navigate, useSearchParams } from 'react-router';

import { sanitizeReturnTo, useAuth } from '@/auth';
import { FullPageMessage } from '@/components/ui/FullPageMessage';
import { Spinner } from '@/components/ui/Spinner';
import { Routes } from '@/config';


// `/auth/login?next=/some/page` — linkable entry point that bounces to Discord OAuth,
// or straight to `next` if the visitor is already logged in.
export function LoginPage() {
  const { status, login } = useAuth();
  const [ searchParams ] = useSearchParams();
  const next = sanitizeReturnTo(searchParams.get('next')) || Routes.HOME;

  const shouldRedirect = status === 'anonymous' || status === 'error';
  useEffect(() => {
    if (shouldRedirect) {
      login(next);
    }
  }, [shouldRedirect, login, next]);

  if (status === 'authenticated') {
    return <Navigate to={next} replace/>;
  }

  return (
    <FullPageMessage title={status === 'loading' ? 'Checking your session…' : 'Redirecting to Discord…'}>
      <Spinner/>
    </FullPageMessage>
  );
}
