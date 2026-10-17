// Every command attempt the bot reported for the user (`/users/@me/commands`), newest first, filterable by server,
// channel and command. Read only. The filters live in the URL (`?server=`, `?channel=`, `?command=`), `?server=0` is DMs.

import { ExternalLink, SquareTerminal, X } from 'lucide-react';
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { Link } from 'react-router';

import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { CommandTypes, MeCommandResults, type Command, type CommandType, type MeCommandUse } from '@/lib/api';
import { ME_COMMANDS_PAGE_SIZE, errorMessage, useMeCommandsQuery, useMeGuildsQuery } from '@/lib/api/dashboardQueries';
import { useCommandsQuery } from '@/lib/api/queries';
import { commandPath } from '@/lib/commandPaths';
import { cn, formatDate, formatDateTime, formatExactDateTime, NO_AUTOFILL } from '@/lib/utils';

import { Chip, FilterButton, IdFilter, Pagination, useSearchParamState, useStepBackFromEmptyPage } from '../admin/adminUi';
import { DashboardHeader, EmptyState, ErrorPanel, Skeleton } from '../ui';


// the api doesn't page past this offset
const MAX_OFFSET = 100000;
const DMS = '0';

const COMMAND_TYPE_LABELS: Record<CommandType, string> = {
  [CommandTypes.PREFIXED]: 'Prefix',
  [CommandTypes.APPLICATION_SLASH]: 'Slash',
  [CommandTypes.APPLICATION_MENU_USER]: 'User app',
  [CommandTypes.APPLICATION_MENU_MESSAGE]: 'Message app',
};

type Tone = 'neutral' | 'danger' | 'warning' | 'success' | 'brand';

const RESULT_LABELS: Record<string, {label: string, tone: Tone}> = {
  [MeCommandResults.ARGUMENT_ERROR]: {label: 'Bad arguments', tone: 'warning'},
  [MeCommandResults.BLOCKED]: {label: 'Blocked', tone: 'neutral'},
  [MeCommandResults.BOT_MISSING_PERMISSIONS]: {label: 'Bot missing permissions', tone: 'warning'},
  [MeCommandResults.CANCELLED]: {label: 'Cancelled', tone: 'neutral'},
  [MeCommandResults.FAIL]: {label: 'Failed', tone: 'danger'},
  [MeCommandResults.MISSING_PERMISSIONS]: {label: 'Missing permissions', tone: 'warning'},
  [MeCommandResults.RAN]: {label: 'Ran', tone: 'success'},
  [MeCommandResults.RATELIMITED]: {label: 'Rate limited', tone: 'warning'},
  [MeCommandResults.RUN_ERROR]: {label: 'Errored', tone: 'danger'},
};


function commandLabel(use: MeCommandUse): string {
  const name = use.command_name ?? use.command_id;
  return (use.command_type === CommandTypes.APPLICATION_SLASH) ? `/${name}` : name;
}

function channelUrl(use: MeCommandUse): string {
  return `https://discord.com/channels/${use.guild_id ?? '@me'}/${use.channel_id}`;
}


export function CommandHistoryPage() {
  const { searchParams, page, update, setPage } = useSearchParamState();
  const serverId = searchParams.get('server') || null;
  const channelId = searchParams.get('channel') || '';
  const commandId = searchParams.get('command') || '';
  const filtered = !!(serverId || channelId || commandId);

  const { data, isPending, isError, error, isPlaceholderData, isFetching, isRefetching, refetch } = useMeCommandsQuery({
    guildId: serverId,
    channelId: channelId || null,
    commandId: commandId || null,
    page,
  });
  // only for names and the server filter, the history still shows (with ids) when these can't load
  const guilds = useMeGuildsQuery();
  const commands = useCommandsQuery();
  const guildNames = useMemo(() => new Map((guilds.data ?? []).map((guild) => [guild.id, guild.name])), [guilds.data]);
  const commandTypes = useMemo(() => new Map((commands.data ?? []).map((command) => [command.id, command.metadata.map((x) => x.type)])), [commands.data]);

  const items = data?.items ?? [];
  const steppingBack = useStepBackFromEmptyPage({page, setPage, data, isPlaceholderData, pageSize: ME_COMMANDS_PAGE_SIZE});
  const pagination = {
    page,
    count: Math.min(data?.count ?? 0, MAX_OFFSET + ME_COMMANDS_PAGE_SIZE),
    pageSize: ME_COMMANDS_PAGE_SIZE,
    onChange: setPage,
    fetching: isFetching && isPlaceholderData,
  };
  const serverName = (guildId: string | null) => (guildId) ? (guildNames.get(guildId) ?? null) : 'Direct messages';

  return (
    <>
      <DashboardHeader
        title='Command History'
        description='Every command you’ve used with NotSoBot, newest first. New ones can take a minute to show up.'
      />

      <div className='mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2'>
        <SummaryCard
          label={(filtered) ? 'Matching commands' : 'Commands used'}
          color='#5865f2'
          value={(isPending) ? null : (data) ? data.count.toLocaleString() : '—'}
          detail={(filtered && data) ? `of ${data.total.toLocaleString()} in total` : undefined}
        />
        <SummaryCard
          label='First command with NotSoBot'
          color='#3ba55c'
          value={(isPending) ? null : (data?.first_used) ? (
            <time dateTime={data.first_used} title={formatExactDateTime(data.first_used)}>{formatDate(data.first_used)}</time>
          ) : '—'}
          detail={(data?.first_used) ? formatDateTime(data.first_used) : undefined}
        />
      </div>

      <div className='mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3'>
        <label className='text-sm'>
          <span className='mb-1 block text-subtle'>Server</span>
          <select className='input' value={serverId ?? ''} onChange={(event) => update({server: event.target.value})}>
            <option value=''>Any server</option>
            <option value={DMS}>Direct messages</option>
            {(guilds.data ?? []).slice().sort((a, b) => a.name.localeCompare(b.name)).map((guild) => (
              <option key={guild.id} value={guild.id}>{guild.name}</option>
            ))}
            {/* a server they've left (or the list couldn't load) still filters, by its id */}
            {(serverId && serverId !== DMS && !guildNames.has(serverId)) ? <option value={serverId}>Server {serverId}</option> : null}
          </select>
        </label>
        <IdFilter label='Channel id' placeholder='Any channel' value={channelId} onChange={(value) => update({channel: value})}/>
        <CommandFilter value={commandId} commands={commands.data} onChange={(value) => update({command: value})}/>
      </div>

      {(filtered) ? (
        <div className='mb-4'>
          <button type='button' className='btn btn-secondary btn-sm' onClick={() => update({server: null, channel: null, command: null})}>
            <X aria-hidden className='size-4'/>
            Clear filters
          </button>
        </div>
      ) : null}

      {(isPending || steppingBack) ? (
        <ListSkeleton/>
      ) : (isError && !items.length) ? (
        <ErrorPanel title='Couldn’t load your command history' message={errorMessage(error)} onRetry={() => refetch()} retrying={isRefetching}/>
      ) : (!items.length) ? (
        <EmptyState icon={<SquareTerminal className='size-10'/>} title={(filtered) ? 'No commands match these filters' : 'No commands yet'}>
          {(filtered) ? null : <>Use any NotSoBot command in Discord and it’ll show up here.</>}
        </EmptyState>
      ) : (
        <>
          {(pagination.count > ME_COMMANDS_PAGE_SIZE) ? <Pagination {...pagination} className='mt-0 mb-4'/> : null}
          <ul className={cn('card divide-y divide-line transition-opacity', isPlaceholderData && 'opacity-60')}>
            {items.map((use, index) => (
              <CommandRow
                key={`${use.timestamp}-${use.channel_id}-${use.command_id}-${use.command_type}-${index}`}
                use={use}
                serverName={serverName(use.guild_id)}
                commandTypes={commandTypes.get(use.command_id)}
                onFilter={update}
              />
            ))}
          </ul>
          {(pagination.count > ME_COMMANDS_PAGE_SIZE) ? <Pagination {...pagination}/> : null}
        </>
      )}
    </>
  );
}


function SummaryCard({ label, value, detail, color }: {label: string, value: ReactNode | null, detail?: string, color: string}) {
  return (
    <div className='card p-4 sm:p-5' style={{'--cat': color} as CSSProperties}>
      <div className='flex items-center gap-2 text-sm text-muted'>
        <span aria-hidden className='size-2 rounded-full bg-[var(--cat)]'/>
        {label}
      </div>
      <div className='mt-2 text-3xl font-bold text-white tabular-nums'>
        {(value === null) ? <Skeleton className='h-9 w-24'/> : value}
      </div>
      {(detail) ? <div className='mt-1 text-xs text-subtle'>{detail}</div> : null}
    </div>
  );
}


// free text (`tag` also matches its subcommands like `tag show`), suggesting the bot's command ids; lands in the URL once
// typing stops
function CommandFilter({ value, commands, onChange }: {value: string, commands: Array<Command> | undefined, onChange: (value: string | null) => void}) {
  const [ input, setInput ] = useState(value);
  useEffect(() => setInput(value), [value]);
  const debounced = useDebouncedValue(input.trim(), 400);
  useEffect(() => {
    if (debounced !== value && debounced.length <= 64) {
      onChange(debounced || null);
    }
    // only when the typed value settles
  }, [debounced]);

  const ids = useMemo(() => (commands ?? []).map((command) => command.id).sort(), [commands]);

  return (
    <label className='text-sm'>
      <span className='mb-1 block text-subtle'>Command</span>
      <span className='relative block'>
        <input
          className='input pr-9 font-mono'
          list='command-history-commands'
          autoComplete='off'
          {...NO_AUTOFILL}
          maxLength={64}
          placeholder='Any command'
          value={input}
          onChange={(event) => setInput(event.target.value)}
        />
        {(input) ? (
          <button
            type='button'
            aria-label='Clear command filter'
            className='absolute top-1/2 right-1.5 -translate-y-1/2 cursor-pointer rounded p-1 text-subtle hover:text-fg'
            onClick={() => {
              setInput('');
              onChange(null);
            }}
          >
            <X className='size-4'/>
          </button>
        ) : null}
      </span>
      <datalist id='command-history-commands'>
        {ids.map((id) => <option key={id} value={id}/>)}
      </datalist>
    </label>
  );
}


function CommandRow({ use, serverName, commandTypes, onFilter }: {
  use: MeCommandUse,
  // null for a server they aren't in anymore
  serverName: string | null,
  // every variant the command has, for linking to it on the commands page (undefined if it isn't listed)
  commandTypes: Array<CommandType> | undefined,
  onFilter: (changes: Record<string, string | null>) => void,
}) {
  const result = (use.result) ? (RESULT_LABELS[use.result] ?? {label: use.result, tone: 'neutral' as const}) : null;
  const label = commandLabel(use);
  const linkable = !!commandTypes?.includes(use.command_type);

  return (
    <li className='flex items-start gap-3 px-4 py-3'>
      <span aria-hidden className='flex size-9 shrink-0 items-center justify-center rounded-md bg-[#5865f2]/15'>
        <SquareTerminal className='size-5 text-[#5865f2]'/>
      </span>
      <div className='min-w-0 flex-1'>
        <div className='flex flex-wrap items-center gap-2'>
          {(linkable) ? (
            <Link to={commandPath(use.command_id, use.command_type, commandTypes!)} className='font-mono font-medium text-white hover:text-brand hover:underline'>
              {label}
            </Link>
          ) : (
            <span className='font-mono font-medium text-white'>{label}</span>
          )}
          <FilterButton label={`Only ${use.command_id}`} onClick={() => onFilter({command: use.command_id})}/>
          <Chip>{COMMAND_TYPE_LABELS[use.command_type] ?? 'Command'}</Chip>
          {(result) ? <Chip tone={result.tone}>{result.label}</Chip> : null}
        </div>
        <div className='mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-subtle'>
          {/* on phones the time goes here, there's no room for it on the right */}
          <time dateTime={use.timestamp} title={formatExactDateTime(use.timestamp)} className='sm:hidden'>{formatDateTime(use.timestamp)}</time>
          <span className='inline-flex max-w-full min-w-0 shrink-0 items-center'>
            {(serverName) ? <span className='truncate'>{serverName}</span> : <span className='font-mono'>Server {use.guild_id}</span>}
            <FilterButton label='Only this server' onClick={() => onFilter({server: use.guild_id ?? DMS})}/>
          </span>
          <span className='inline-flex items-center font-mono'>
            #{use.channel_id}
            <FilterButton label='Only this channel' onClick={() => onFilter({channel: use.channel_id})}/>
          </span>
          <a href={channelUrl(use)} target='_blank' rel='noopener noreferrer' className='inline-flex items-center gap-1 whitespace-nowrap text-code hover:underline'>
            Open channel
            <ExternalLink aria-hidden className='size-3'/>
          </a>
        </div>
      </div>
      <time dateTime={use.timestamp} title={formatExactDateTime(use.timestamp)} className='hidden shrink-0 text-right text-xs text-subtle sm:block'>
        {formatDateTime(use.timestamp)}
      </time>
    </li>
  );
}


function ListSkeleton() {
  return (
    <div aria-hidden className='card divide-y divide-line'>
      {Array.from({length: 5}, (_, i) => (
        <div key={i} className='flex items-start gap-3 px-4 py-3'>
          <Skeleton className='size-9 rounded-md'/>
          <div className='flex-1'>
            <Skeleton className='h-4 w-40'/>
            <Skeleton className='mt-1.5 h-3 w-64 bg-surface-2'/>
          </div>
          <Skeleton className='h-3 w-28 bg-surface-2'/>
        </div>
      ))}
    </div>
  );
}
