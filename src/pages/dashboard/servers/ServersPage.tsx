import { Crown, Eye, KeyRound, Server, Settings2 } from 'lucide-react';
import { useCallback, useMemo } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router';

import { useAuth } from '@/auth';
import { ApiEndpoints, apiUrl, type UserGuildSummary } from '@/lib/api';
import { errorMessage, isDiscordGrantError, isScopeMismatch, useMeGuildsQuery } from '@/lib/api/dashboardQueries';
import { cn } from '@/lib/utils';

import { DashboardHeader, EmptyState, ErrorPanel, Skeleton } from '../ui';
import { GuildIcon } from './GuildIcon';
import { ServerDetailsModal } from './ServerDetailsModal';


export function ServersPage() {
  const { data, isPending, isError, error, refetch, isRefetching } = useMeGuildsQuery();

  // ones you can manage first, then alphabetical
  const guilds = useMemo(() => {
    return (data ?? []).slice().sort((a, b) => Number(b.can_manage) - Number(a.can_manage) || a.name.localeCompare(b.name));
  }, [data]);

  // `?server=<id>` opens the server over the list, like `?tag=` on the tag list
  const [ searchParams ] = useSearchParams();
  const serverId = searchParams.get('server');
  const location = useLocation();
  const navigate = useNavigate();
  const openedHere = (location.state as {serverOpenedHere?: boolean} | null)?.serverOpenedHere === true;
  const closeServer = useCallback(() => {
    if (openedHere) {
      navigate(-1);
    } else {
      // arrived on a link with `?server=`, there's no list entry to go back to
      const next = new URLSearchParams(searchParams);
      next.delete('server');
      navigate({search: next.toString()}, {replace: true, preventScrollReset: true});
    }
  }, [navigate, openedHere, searchParams]);

  return (
    <>
      <DashboardHeader
        title='Servers'
        description='Servers you share with NotSoBot. Manage the ones where you have the right permissions.'
      />

      {(isPending) ? (
        <ServerGridSkeleton/>
      ) : (isScopeMismatch(error)) ? (
        <ScopeMismatchCard/>
      ) : (isDiscordGrantError(error)) ? (
        <ScopeMismatchCard reason='grant'/>
      ) : (isError) ? (
        <ErrorPanel title='Couldn’t load your servers' message={errorMessage(error)} onRetry={() => refetch()} retrying={isRefetching}/>
      ) : (!guilds.length) ? (
        <EmptyState icon={<Server className='size-10'/>} title='No servers with NotSoBot yet'>
          <a href={apiUrl(ApiEndpoints.HELP_DISCORD_BOT)} className='mt-3 inline-flex btn btn-discord'>Add NotSoBot to a server</a>
        </EmptyState>
      ) : (
        <ul className='grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3'>
          {guilds.map((guild) => <ServerCard key={guild.id} guild={guild}/>)}
        </ul>
      )}

      {(serverId) ? <ServerDetailsModal key={serverId} guildId={serverId} onClose={closeServer}/> : null}
    </>
  );
}


function ServerCard({ guild }: {guild: UserGuildSummary}) {
  return (
    <li>
      <Link
        to={{search: `?${new URLSearchParams({server: guild.id})}`}}
        state={{serverOpenedHere: true}}
        preventScrollReset
        className={cn(
          'group card card-hover flex h-full items-center gap-3 p-4',
          (guild.can_manage) ? 'hover:border-brand' : 'hover:border-line-strong',
        )}
      >
        <GuildIcon guild={guild} size={48} className='size-12 text-sm'/>
        <div className='min-w-0 flex-1'>
          <div className='flex items-center gap-1.5'>
            <span className='truncate font-medium text-white' title={guild.name}>{guild.name}</span>
            {(guild.owner) ? <Crown aria-label='Owner' className='size-3.5 shrink-0 text-warning'/> : null}
          </div>
          <div className='mt-0.5 text-xs text-subtle'>{(guild.owner) ? 'Owner' : (guild.can_manage) ? 'Can manage' : 'Member'}</div>
        </div>
        <span
          className={cn(
            'inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors',
            (guild.can_manage) ? 'bg-brand text-white group-hover:bg-brand-hover' : 'bg-surface-3 text-muted group-hover:text-white',
          )}
        >
          {(guild.can_manage) ? <Settings2 aria-hidden className='size-3.5'/> : <Eye aria-hidden className='size-3.5'/>}
          {(guild.can_manage) ? 'Manage' : 'View'}
        </span>
      </Link>
    </li>
  );
}


// `scope`: the session predates the `guilds` scope; `grant`: Discord revoked/expired the login
export function ScopeMismatchCard({ reason = 'scope' }: {reason?: 'scope' | 'grant'}) {
  const { login } = useAuth();
  return (
    <div className='card flex flex-col items-center gap-4 p-8 text-center sm:p-10'>
      <span className='flex size-12 items-center justify-center rounded-full bg-brand/20'>
        <KeyRound aria-hidden className='size-6 text-brand'/>
      </span>
      <div className='max-w-md'>
        <h2 className='text-lg font-semibold text-white'>{(reason === 'grant') ? 'Discord needs you to log in again' : 'Let NotSoBot see your servers'}</h2>
        <p className='mt-1.5 text-sm text-muted'>
          {(reason === 'grant') ? (
            'Discord no longer accepts the login this session was made with (it expired or the app was deauthorized), so we can’t read your server list. Log in again to fix it.'
          ) : (
            'You logged in before the site could ask Discord for your server list. Log in again and allow “Know what servers you’re in” so we can show the servers you share with NotSoBot. Nothing else changes.'
          )}
        </p>
      </div>
      <button type='button' className='btn btn-discord' onClick={() => login()}>Log in again with Discord</button>
    </div>
  );
}


function ServerGridSkeleton() {
  return (
    <ul aria-hidden className='grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3'>
      {Array.from({length: 6}, (_, i) => (
        <li key={i} className='card flex items-center gap-3 p-4'>
          <Skeleton className='size-12 rounded-2xl'/>
          <div className='flex-1'>
            <Skeleton className='h-4 w-28'/>
            <Skeleton className='mt-2 h-3 w-16 bg-surface-2'/>
          </div>
          <Skeleton className='h-7 w-16 bg-surface-2'/>
        </li>
      ))}
    </ul>
  );
}
