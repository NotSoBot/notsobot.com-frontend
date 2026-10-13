import { useEffect, useState } from 'react';
import { Navigate } from 'react-router';

import { Routes } from '@/config';
import { AnalyticsEvents, trackEvent } from '@/lib/analytics';


// Discord sends people here after they add the bot (`DISCORD_INVITE_REDIRECT_URI` on the API).
// The invite is an implicit grant, so `state` (the host that generated the invite) comes back in the fragment.
export function BotAddedRedirectPage() {
  // capture during render: <Navigate>'s effect runs before ours and would wipe the fragment
  const [ from ] = useState(() => {
    return new URLSearchParams(window.location.hash.slice(1)).get('state');
  });

  useEffect(() => {
    if (from) {
      trackEvent(AnalyticsEvents.BOT_ADDED, {from});
    }
  }, [from]);

  return <Navigate to={Routes.COMMANDS} replace/>;
}
