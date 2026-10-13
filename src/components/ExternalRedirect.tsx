import { useEffect } from 'react';

import { FullPageMessage } from '@/components/ui/FullPageMessage';
import { Spinner } from '@/components/ui/Spinner';


// Replaces the current history entry with an external URL (e.g. bot invite, support server).
export function ExternalRedirect({ to, label = 'Redirecting' }: {to: string, label?: string}) {
  useEffect(() => {
    window.location.replace(to);
  }, [to]);

  return (
    <FullPageMessage title={`${label}…`}>
      <Spinner/>
      <a href={to} className='text-sm text-muted underline underline-offset-4 hover:text-fg'>
        Click here if nothing happens
      </a>
    </FullPageMessage>
  );
}
