import { useEffect, useState } from 'react';
import { isRouteErrorResponse, Link, useRouteError } from 'react-router';

import { FullPageMessage } from '@/components/ui/FullPageMessage';
import { Routes } from '@/config';
import { isChunkLoadError, reloadForNewBuild } from '@/lib/chunkReload';


export function RouteErrorPage() {
  const error = useRouteError();
  // production builds swallow this otherwise, so there'd be nothing to go on
  useEffect(() => console.error('Route error:', error), [error]);
  // a stale chunk after a deploy: reload straight away instead of flashing the error (unless that already failed)
  const [ reloading, setReloading ] = useState(() => isChunkLoadError(error));
  useEffect(() => {
    if (reloading && !reloadForNewBuild()) {
      setReloading(false);
    }
  }, [reloading]);

  if (reloading) {
    return null;
  }

  let description = 'Something broke while rendering this page.';
  if (isRouteErrorResponse(error)) {
    description = `${error.status} ${error.statusText}`;
  } else if (isChunkLoadError(error)) {
    description = 'This page couldn’t finish loading, probably because the site just updated.';
  } else if (error instanceof Error && import.meta.env.DEV) {
    description = error.message;
  }
  // the actual message, small, so a screenshot of this page is enough to debug it
  const details = (!import.meta.env.DEV && error instanceof Error && !isChunkLoadError(error)) ? error.message : null;

  return (
    <FullPageMessage title='Well, that was unexpected' description={description}>
      {(details) ? <code className='max-w-xl font-mono text-xs break-words text-subtle select-all'>{details}</code> : null}
      <div className='flex gap-2'>
        <button type='button' className='btn btn-secondary' onClick={() => window.location.reload()}>Reload</button>
        <Link to={Routes.HOME} className='btn btn-primary'>Go home</Link>
      </div>
    </FullPageMessage>
  );
}
