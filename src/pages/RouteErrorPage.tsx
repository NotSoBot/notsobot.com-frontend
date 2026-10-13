import { isRouteErrorResponse, Link, useRouteError } from 'react-router';

import { FullPageMessage } from '@/components/ui/FullPageMessage';
import { Routes } from '@/config';


export function RouteErrorPage() {
  const error = useRouteError();

  let description = 'Something broke while rendering this page.';
  if (isRouteErrorResponse(error)) {
    description = `${error.status} ${error.statusText}`;
  } else if (error instanceof Error && import.meta.env.DEV) {
    description = error.message;
  }

  return (
    <FullPageMessage title='Well, that was unexpected' description={description}>
      <div className='flex gap-2'>
        <button type='button' className='btn btn-secondary' onClick={() => window.location.reload()}>Reload</button>
        <Link to={Routes.HOME} className='btn btn-primary'>Go home</Link>
      </div>
    </FullPageMessage>
  );
}
