import { Ban, ChevronRight, Flag, MessageSquareWarning, Server, Tags as TagsIcon, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router';

import { SearchInput } from '@/components/ui/SearchInput';
import { Segmented } from '@/components/ui/Segmented';
import { Routes } from '@/config';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import type { AdminGuildSummary, AdminGuildsSortBy } from '@/lib/api';
import { ADMIN_PAGE_SIZE, errorMessage, useAdminGuildsQuery } from '@/lib/api/dashboardQueries';
import { cn } from '@/lib/utils';

import { GuildIcon } from '../servers/GuildIcon';
import { DashboardHeader, EmptyState, ErrorPanel, Skeleton } from '../ui';
import { AdminServerModal, BotChip } from './AdminServerModal';
import { adminServerPath, Chip, FLAGGED_WITHIN, Pagination, useSearchParamState, useStepBackFromEmptyPage } from './adminUi';
import { useOpenListItem } from './AdminTagModal';


const SORTS: Array<{value: AdminGuildsSortBy, label: string}> = [
  // by id, which is when the server was made on Discord (not when NotSoBot joined it)
  {value: 'newest', label: 'Newest created'},
  {value: 'oldest', label: 'Oldest created'},
  {value: 'name', label: 'Name'},
  {value: 'flags_most', label: 'Most flags'},
  {value: 'flags_least', label: 'Fewest flags'},
  {value: 'reports_most', label: 'Most reports'},
  {value: 'reports_least', label: 'Fewest reports'},
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
  const flaggedWithin = FLAGGED_WITHIN.find((item) => item.value === searchParams.get('within')) ?? FLAGGED_WITHIN[0];
  const query = searchParams.get('q') || '';
  const debouncedQuery = useDebouncedValue(query.trim(), 300);

  const { data, isPending, isError, error, isPlaceholderData, isFetching, isRefetching, refetch } = useAdminGuildsQuery({
    query: debouncedQuery,
    inBot: bot.inBot,
    blocked: blocked.blocked,
    flaggedWithin: flaggedWithin.hours,
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
  const filtered = !!(debouncedQuery || bot.inBot !== null || blocked.blocked !== null || flaggedWithin.hours);

  // `/dashboard/admin/servers/<id>` opens the server over the list, ← / → step through this page's servers
  const { openId: serverId, previousId, nextId, open, close } = useOpenListItem(items, (guild) => guild.id, Routes.DASHBOARD_ADMIN_SERVERS);

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
          <div className='flex max-w-full items-center gap-2 text-sm text-muted'>
            <span aria-hidden>Last flagged</span>
            <div className='overflow-x-auto'>
              <Segmented
                label='Last flagged within'
                value={flaggedWithin.value}
                options={FLAGGED_WITHIN.map(({ value, label }) => ({value, label}))}
                onChange={(value) => update({within: (value === 'any') ? null : value})}
              />
            </div>
          </div>
          <label className='flex items-center gap-2 text-sm text-muted'>
            Blocked
            <select className='input w-36' value={blocked.value} onChange={(event) => update({blocked: (event.target.value === 'any') ? null : event.target.value})}>
              {BLOCKED_FILTERS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
          <label className='flex items-center gap-2 text-sm text-muted sm:ml-auto'>
            Sort
            <select className='input w-40' value={sortBy} onChange={(event) => update({sort: (event.target.value === 'newest') ? null : event.target.value})}>
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
            {items.map((guild) => <ServerRow key={guild.id} guild={guild} onOpen={open}/>)}
          </ul>
          <Pagination {...pagination}/>
        </>
      )}

      {(serverId) ? <AdminServerModal guildId={serverId} previousId={previousId} nextId={nextId} onNavigate={open} onClose={close}/> : null}
    </>
  );
}


function ServerRow({ guild, onOpen }: {guild: AdminGuildSummary, onOpen: (guildId: string) => void}) {
  return (
    <li>
      <Link
        to={adminServerPath(guild.id)}
        onClick={(event) => {
          // a plain click opens it over the list (keeping the filters), new tabs and copied links still get the url
          if (!event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && event.button === 0) {
            event.preventDefault();
            onOpen(guild.id);
          }
        }}
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
          <ServerCounts counts={guild.counts} className='mt-1 sm:hidden'/>
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
        <ServerCounts counts={guild.counts} className='hidden sm:flex'/>
        <ChevronRight aria-hidden className='size-4 shrink-0 text-subtle'/>
      </Link>
    </li>
  );
}


// the modal's shortcut counts, so staff can spot busy or troublesome servers without opening each one
const COUNTS: Array<{key: keyof AdminGuildSummary['counts'], icon: LucideIcon, label: string, alert?: boolean}> = [
  {key: 'tags', icon: TagsIcon, label: 'tags'},
  {key: 'content_flags', icon: Flag, label: 'content flags', alert: true},
  {key: 'reports', icon: MessageSquareWarning, label: 'reports', alert: true},
];

function ServerCounts({ counts, className }: {counts: AdminGuildSummary['counts'] | undefined, className?: string}) {
  // an API from before `counts` was added leaves it out
  if (!counts) {
    return null;
  }
  return (
    <div className={cn('flex shrink-0 items-center gap-3 text-xs tabular-nums', className)}>
      {COUNTS.map(({ key, icon: Icon, label, alert }) => {
        const value = counts[key];
        const text = `${value.toLocaleString()} ${label}`;
        return (
          <span
            key={key}
            title={text}
            className={cn(
              'inline-flex items-center gap-1 sm:min-w-12',
              (!value) ? 'text-subtle/60' : (alert) ? 'text-warning' : 'text-muted',
            )}
          >
            <Icon aria-hidden className='size-3.5 shrink-0'/>
            <span aria-hidden>{value.toLocaleString()}</span>
            <span className='sr-only'>{text}</span>
          </span>
        );
      })}
    </div>
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
