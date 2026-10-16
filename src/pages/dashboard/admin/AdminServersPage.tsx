import { Ban, ChevronRight, Server } from 'lucide-react';
import { useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';

import { SearchInput } from '@/components/ui/SearchInput';
import { Segmented } from '@/components/ui/Segmented';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import type { AdminGuildSummary, AdminGuildsSortBy } from '@/lib/api';
import { ADMIN_PAGE_SIZE, errorMessage, useAdminGuildsQuery } from '@/lib/api/dashboardQueries';
import { cn } from '@/lib/utils';

import { GuildIcon } from '../servers/GuildIcon';
import { DashboardHeader, EmptyState, ErrorPanel, Skeleton } from '../ui';
import { AdminServerModal, BotChip } from './AdminServerModal';
import { Chip, Pagination, useSearchParamState, useStepBackFromEmptyPage } from './adminUi';


const SORTS: Array<{value: AdminGuildsSortBy, label: string}> = [
  {value: 'newest', label: 'Newest'},
  {value: 'oldest', label: 'Oldest'},
  {value: 'name', label: 'Name'},
];

// `?bot=`: whether NotSoBot is in the server right now (`bot_guilds`)
const BOT_FILTERS = [
  {value: 'any', label: 'Any', inBot: null},
  {value: 'in', label: 'Bot in server', inBot: true},
  {value: 'out', label: 'Bot not in server', inBot: false},
] as const;

const BLOCKED_FILTERS = [
  {value: 'any', label: 'Any', blocked: null},
  {value: 'blocked', label: 'Blocked', blocked: true},
  {value: 'not', label: 'Not blocked', blocked: false},
] as const;


export function AdminServersPage() {
  const { searchParams, page, update, setPage } = useSearchParamState();
  const sortBy = SORTS.find((sort) => sort.value === searchParams.get('sort'))?.value ?? 'newest';
  const bot = BOT_FILTERS.find((item) => item.value === searchParams.get('bot')) ?? BOT_FILTERS[0];
  const blocked = BLOCKED_FILTERS.find((item) => item.value === searchParams.get('blocked')) ?? BLOCKED_FILTERS[0];
  const query = searchParams.get('q') || '';
  const debouncedQuery = useDebouncedValue(query.trim(), 300);

  const { data, isPending, isError, error, isPlaceholderData, isFetching, isRefetching, refetch } = useAdminGuildsQuery({
    query: debouncedQuery,
    inBot: bot.inBot,
    blocked: blocked.blocked,
    sortBy,
    page,
  });
  const items = data?.items ?? [];
  const steppingBack = useStepBackFromEmptyPage({page, setPage, data, isPlaceholderData, pageSize: ADMIN_PAGE_SIZE});
  const pagination = {
    page,
    count: data?.count ?? 0,
    pageSize: ADMIN_PAGE_SIZE,
    onChange: setPage,
    fetching: isFetching && isPlaceholderData,
  };
  const filtered = !!(debouncedQuery || bot.inBot !== null || blocked.blocked !== null);

  // `?server=<id>` opens the server over the list, like the user dashboard's server list
  const serverId = searchParams.get('server');
  const location = useLocation();
  const navigate = useNavigate();
  const openedHere = (location.state as {serverOpenedHere?: boolean} | null)?.serverOpenedHere === true;
  const closeServer = useCallback(() => {
    if (openedHere) {
      navigate(-1);
    } else {
      // arrived on a link with `?server=` (a report, the tags list), there's no list entry to go back to
      update({server: null}, false);
    }
    // update is recreated every render
  }, [navigate, openedHere]);
  const serverSearch = (guildId: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('server', guildId);
    return `?${next.toString()}`;
  };

  return (
    <>
      <DashboardHeader
        title='Servers'
        description='Every server NotSoBot knows about: ones it’s in now and ones that saved settings before it left. Open one to manage its settings.'
      />

      <div className='mb-4 space-y-3'>
        <SearchInput
          value={query}
          onValueChange={(value) => update({q: value})}
          placeholder='Search by name or id...'
          aria-label='Search servers'
        />
        <div className='flex flex-wrap items-center gap-3'>
          <div className='max-w-full overflow-x-auto'>
            <Segmented
              label='Bot membership'
              value={bot.value}
              options={BOT_FILTERS.map(({ value, label }) => ({value, label}))}
              onChange={(value) => update({bot: (value === 'any') ? null : value})}
            />
          </div>
          <label className='flex items-center gap-2 text-sm text-muted'>
            Blocked
            <select className='input w-36' value={blocked.value} onChange={(event) => update({blocked: (event.target.value === 'any') ? null : event.target.value})}>
              {BLOCKED_FILTERS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
          <label className='flex items-center gap-2 text-sm text-muted sm:ml-auto'>
            Sort
            <select className='input w-36' value={sortBy} onChange={(event) => update({sort: (event.target.value === 'newest') ? null : event.target.value})}>
              {SORTS.map((sort) => <option key={sort.value} value={sort.value}>{sort.label}</option>)}
            </select>
          </label>
        </div>
      </div>

      {(isPending || steppingBack) ? (
        <ListSkeleton/>
      ) : (isError && !items.length) ? (
        <ErrorPanel title='Couldn’t load servers' message={errorMessage(error)} onRetry={() => refetch()} retrying={isRefetching}/>
      ) : (!items.length) ? (
        <EmptyState icon={<Server className='size-10'/>} title='No servers found'>
          {(filtered) ? 'Try a different search or filter.' : null}
        </EmptyState>
      ) : (
        <>
          <Pagination {...pagination} className='mt-0 mb-4'/>
          <ul className={cn('card divide-y divide-line transition-opacity', isPlaceholderData && 'opacity-60')}>
            {items.map((guild) => <ServerRow key={guild.id} guild={guild} search={serverSearch(guild.id)}/>)}
          </ul>
          <Pagination {...pagination}/>
        </>
      )}

      {(serverId) ? <AdminServerModal key={serverId} guildId={serverId} onClose={closeServer}/> : null}
    </>
  );
}


function ServerRow({ guild, search }: {guild: AdminGuildSummary, search: string}) {
  return (
    <li>
      <Link
        to={{search}}
        state={{serverOpenedHere: true}}
        preventScrollReset
        className={cn(
          'flex items-center gap-3 px-4 py-3 first:rounded-t-[inherit] last:rounded-b-[inherit] hover:bg-surface-2 sm:px-5',
          guild.blocked && 'bg-danger/[0.04] shadow-[inset_3px_0_0_var(--color-danger)]',
        )}
      >
        <GuildIcon guild={{...guild, name: guild.name ?? ''}} size={40} className='size-10 rounded-xl text-xs'/>
        <div className='min-w-0 flex-1'>
          <div className={cn('truncate font-medium', (guild.name) ? 'text-white' : 'text-subtle italic')} title={guild.name ?? undefined}>
            {guild.name || 'Never saved'}
          </div>
          <div className='truncate font-mono text-xs text-subtle'>{guild.id}</div>
        </div>
        <div className='flex shrink-0 flex-wrap justify-end gap-1.5'>
          {(guild.blocked) ? (
            <Chip tone='danger' title={guild.blocked_reason ?? 'No reason given'}>
              <Ban aria-hidden className='mr-1 size-3'/>
              Blocked
            </Chip>
          ) : null}
          <BotChip bot={guild.bot}/>
        </div>
        <ChevronRight aria-hidden className='size-4 shrink-0 text-subtle'/>
      </Link>
    </li>
  );
}


function ListSkeleton() {
  return (
    <ul aria-hidden className='card divide-y divide-line'>
      {Array.from({length: 8}, (_, i) => (
        <li key={i} className='flex items-center gap-3 px-4 py-3 sm:px-5'>
          <Skeleton className='size-10 rounded-xl'/>
          <div className='flex-1'>
            <Skeleton className='h-4 w-40'/>
            <Skeleton className='mt-1.5 h-3 w-36 bg-surface-2'/>
          </div>
          <Skeleton className='h-5 w-24 bg-surface-2'/>
        </li>
      ))}
    </ul>
  );
}
