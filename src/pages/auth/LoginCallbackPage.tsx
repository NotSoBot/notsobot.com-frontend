import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';

import { clearReturnTo, consumeLoginPending, peekReturnTo, useAuth } from '@/auth';
import { FullPageMessage } from '@/components/ui/FullPageMessage';
import { Spinner } from '@/components/ui/Spinner';
import { config, Routes } from '@/config';

import { LoginDisabledMessage } from './LoginPage';


// notsobot.api finishes the Discord OAuth exchange at `/api/auth/login/callback`, then redirects
// here with the session token in the URL fragment: `/auth/login/callback#<token>`.
// The fragment never reaches any server, and we strip it from history as soon as we've read it.
export function LoginCallbackPage() {
  const { completeLogin } = useAuth();
  const navigate = useNavigate();

  // read once during the first render, so StrictMode's double effects can't lose them
  const [ token ] = useState(() => {
    const raw = window.location.hash.slice(1);
    try {
      return decodeURIComponent(raw) || null;
    } catch {
      return raw || null;
    }
  });
  const [ returnTo ] = useState(peekReturnTo);
  // only accept a token for a login this tab started (read once, StrictMode renders twice)
  const [ started ] = useState(consumeLoginPending);

  useEffect(() => {
    // never leave the token in the address bar / history
    window.history.replaceState(window.history.state, '', window.location.pathname);

    // with auth off a token that still arrives here (from the API directly) is never used
    if (!token || !started || !config.authEnabled) {
      return;
    }
    completeLogin(token);
    clearReturnTo();
    navigate(returnTo, {replace: true});
  }, [completeLogin, navigate, returnTo, started, token]);

  if (!config.authEnabled) {
    return <LoginDisabledMessage/>;
  }

  if (token && !started) {
    return (
      <FullPageMessage title='Login link not started here' description="This login wasn't started from this tab, so we didn't use it. Log in again if you meant to.">
        <div className='flex gap-2'>
          <Link to={Routes.AUTH_LOGIN} className='btn btn-discord'>Log in</Link>
          <Link to={Routes.HOME} className='btn btn-secondary'>Go home</Link>
        </div>
      </FullPageMessage>
    );
  }

  if (!token) {
    return (
      <FullPageMessage title='Login failed' description="Discord didn't hand us a session. Give it another try.">
        <div className='flex gap-2'>
          <Link to={Routes.AUTH_LOGIN} className='btn btn-discord'>Try again</Link>
          <Link to={Routes.HOME} className='btn btn-secondary'>Go home</Link>
        </div>
      </FullPageMessage>
    );
  }

  return (
    <FullPageMessage title='Logging you in…'>
      <Spinner/>
    </FullPageMessage>
  );
}
