import { AlarmClock, AlertTriangle, ArrowUpRight, Ban, Crown, Eye, SquareTerminal, Tags as TagsIcon, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';

import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Modal } from '@/components/ui/Modal';
import { Routes } from '@/config';
import { ApiErrorCodes, ApiRequestError, type GuildEditableArea, type UserGuild } from '@/lib/api';
import { errorMessage, isDiscordGrantError, isScopeMismatch, useMeGuildQuery, useMeRemindersQuery, useMeTagsCountQuery } from '@/lib/api/dashboardQueries';

import { PanelSkeleton, Skeleton, UnsavedChangesGuard } from '../ui';
import { GuildIcon } from './GuildIcon';
import { AREA_LABEL, AREA_PERMISSION } from './guildMeta';
import { ServerDataSection } from './ServerDataSection';
import { CommandListSection, ListSection, LoggersSection, PrefixesSection } from './ServerSections';
import { ServerSettingsForm } from './ServerSettingsForm';
import { ScopeMismatchCard } from './ServersPage';


const TITLE_ID = 'dashboard-server-modal-title';


// One of your servers over the server list (`?server=<id>`): everything you can see and change about it, plus shortcuts to
// your own reminders and tags in it. Closing with unsaved settings asks first.
export function ServerDetailsModal({ guildId, onClose }: {guildId: string, onClose: () => void}) {
  const { data: guild, isPending, error, refetch, isRefetching } = useMeGuildQuery(guildId);
  const [ settingsDirty, setSettingsDirty ] = useState(false);
  const [ confirmingClose, setConfirmingClose ] = useState(false);

  const requestClose = () => {
    if (settingsDirty) {
      setConfirmingClose(true);
    } else {
      onClose();
    }
  };

  return (
    <Modal labelledBy={TITLE_ID} onClose={requestClose}>
      {(guild) ? (
        <ServerDetails guild={guild} onDirtyChange={setSettingsDirty}/>
      ) : (isPending) ? (
        <div aria-busy='true'>
          <h2 id={TITLE_ID} className='sr-only'>Loading server</h2>
          <div className='flex items-center gap-4 border-b border-line px-6 pt-6 pb-5'>
            <Skeleton className='size-16 rounded-2xl'/>
            <div>
              <Skeleton className='h-7 w-48'/>
              <Skeleton className='mt-2 h-3 w-32 bg-surface-2'/>
            </div>
          </div>
          <div className='space-y-4 p-6'><PanelSkeleton rows={2}/><PanelSkeleton rows={3}/></div>
        </div>
      ) : (
        <ServerLoadError error={error} onRetry={() => refetch()} retrying={isRefetching}/>
      )}

      {(confirmingClose) ? (
        <ConfirmDialog
          title='Discard unsaved changes?'
          description='You have edits to this server’s settings that haven’t been saved. If you close it now, they’ll be lost.'
          confirmLabel='Discard and close'
          onConfirm={() => {
            setConfirmingClose(false);
            onClose();
          }}
          onClose={() => setConfirmingClose(false)}
        />
      ) : null}
      {/* leaving the page altogether (the reminders/tags shortcuts, the sidebar) */}
      <UnsavedChangesGuard when={settingsDirty}/>
    </Modal>
  );
}


function ServerLoadError({ error, onRetry, retrying }: {error: Error | null, onRetry: () => void, retrying: boolean}) {
  const notFound = error instanceof ApiRequestError && (error.status === 404 || error.code === ApiErrorCodes.UNKNOWN_SERVER);
  if (isScopeMismatch(error) || isDiscordGrantError(error)) {
    return (
      <div className='p-6 pt-14'>
        <h2 id={TITLE_ID} className='sr-only'>Couldn’t load this server</h2>
        <ScopeMismatchCard reason={(isDiscordGrantError(error)) ? 'grant' : 'scope'}/>
      </div>
    );
  }
  return (
    <div className='px-6 py-16 text-center'>
      <AlertTriangle className='mx-auto mb-4 size-14 text-danger'/>
      <h2 id={TITLE_ID} className='mb-3 text-2xl font-bold text-white'>{(notFound) ? 'Server not found' : 'Couldn’t load this server'}</h2>
      <p className='mb-6 text-muted'>{(notFound) ? 'NotSoBot isn’t in this server, or you aren’t a member of it.' : errorMessage(error)}</p>
      {(notFound) ? null : <button type='button' className='btn btn-secondary' disabled={retrying} onClick={onRetry}>Retry</button>}
    </div>
  );
}


function ServerDetails({ guild, onDirtyChange }: {guild: UserGuild, onDirtyChange: (dirty: boolean) => void}) {
  const canEditAnything = Object.values(guild.editable).some(Boolean);
  const lockedAreas = (Object.keys(AREA_LABEL) as Array<GuildEditableArea>).filter((area) => !guild.editable[area]);

  return (
    <>
      <header className='rounded-t-xl border-b border-line bg-surface px-6 pt-6 pb-5 sm:pr-14'>
        <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
          <div className='flex min-w-0 items-center gap-4 pr-8 sm:pr-0'>
            <GuildIcon guild={guild} size={64} className='size-14 shrink-0 text-lg sm:size-16'/>
            <div className='min-w-0'>
              <h2 id={TITLE_ID} className='flex items-center gap-2 text-2xl font-bold text-white'>
                <span className='truncate' title={guild.name}>{guild.name}</span>
                {(guild.owner) ? <Crown aria-label='You own this server' className='size-5 shrink-0 text-warning'/> : null}
              </h2>
              <p className='mt-1 flex flex-wrap gap-x-3 text-sm text-subtle'>
                <span className='font-mono'>{guild.id}</span>
                <span>{(canEditAnything) ? 'You can manage this server' : 'View only'}</span>
              </p>
            </div>
          </div>
          <YourStuffLinks guildId={guild.id}/>
        </div>
      </header>

      <div className='space-y-4 p-4 sm:p-6'>
        {(lockedAreas.length) ? <ViewOnlyBanner lockedAreas={lockedAreas} all={!canEditAnything}/> : null}

        {(guild.blocked) ? (
          <p role='status' className='flex items-start gap-2 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-fg'>
            <Ban aria-hidden className='mt-0.5 size-4 shrink-0 text-danger'/>
            <span>This server is blocked from using NotSoBot.{(guild.blocked_reason) ? ` Reason: ${guild.blocked_reason}` : null}</span>
          </p>
        ) : null}

        <PrefixesSection guild={guild}/>
        <ServerSettingsForm guild={guild} onDirtyChange={onDirtyChange}/>
        <ListSection guild={guild} list='allowlist'/>
        <ListSection guild={guild} list='blocklist'/>
        <CommandListSection guild={guild} list='allowlist'/>
        <CommandListSection guild={guild} list='blocklist'/>
        <LoggersSection guild={guild}/>
        <ServerDataSection guild={guild}/>
      </div>
    </>
  );
}


// "Your commands" / "Your reminders" / "Your tags" in this server, opening those pages filtered to it
function YourStuffLinks({ guildId }: {guildId: string}) {
  const reminders = useMeRemindersQuery();
  const tags = useMeTagsCountQuery(guildId);
  const reminderCount = reminders.data?.items.filter((reminder) => reminder.guild_id === guildId).length;
  const search = `?${new URLSearchParams({server: guildId})}`;
  return (
    <nav aria-label='Your things in this server' className='flex shrink-0 flex-wrap gap-2'>
      {/* no count, it'd scan their whole command history every time a server is opened */}
      <YourStuffLink to={`${Routes.DASHBOARD_COMMANDS}${search}`} icon={SquareTerminal} label='Your commands' count={undefined}/>
      <YourStuffLink to={`${Routes.DASHBOARD_REMINDERS}${search}`} icon={AlarmClock} label='Your reminders' count={reminderCount}/>
      <YourStuffLink to={`${Routes.DASHBOARD_TAGS}${search}`} icon={TagsIcon} label='Your tags' count={tags.data}/>
    </nav>
  );
}


// a shortcut to a list filtered to the server, with how many it'll show (the admin server modal uses it too)
export function YourStuffLink({ to, icon: Icon, label, count }: {to: string, icon: LucideIcon, label: string, count: number | undefined}) {
  return (
    <Link to={to} className='group/stuff inline-flex items-center gap-2 rounded-md border border-line-strong bg-surface-2 px-3 py-2 text-sm font-medium text-fg transition-colors hover:border-brand hover:text-white'>
      <Icon aria-hidden className='size-4 text-muted transition-colors group-hover/stuff:text-brand'/>
      {label}
      {(count === undefined) ? null : (
        <span className='rounded bg-surface-3 px-1.5 text-xs text-muted tabular-nums'>{count.toLocaleString()}</span>
      )}
      <ArrowUpRight aria-hidden className='size-3.5 text-subtle transition-colors group-hover/stuff:text-brand'/>
    </Link>
  );
}


// Says up front what can't be changed here, and which permission it would take.
function ViewOnlyBanner({ lockedAreas, all }: {lockedAreas: Array<GuildEditableArea>, all: boolean}) {
  const byPermission = new Map<string, Array<string>>();
  for (const area of lockedAreas) {
    const permission = AREA_PERMISSION[area];
    byPermission.set(permission, [...(byPermission.get(permission) ?? []), AREA_LABEL[area]]);
  }
  return (
    <div role='status' className='flex items-start gap-3 rounded-lg border border-warning/40 bg-warning/10 p-4'>
      <Eye aria-hidden className='mt-0.5 size-5 shrink-0 text-warning'/>
      <div className='min-w-0 text-sm'>
        <p className='font-semibold text-white'>
          {(all) ? 'View only: you can see this server’s setup but can’t change anything.' : 'Some sections are view only.'}
        </p>
        <ul className='mt-1 space-y-0.5 text-fg'>
          {Array.from(byPermission, ([permission, areas]) => (
            <li key={permission}>
              {(all) ? 'Changing ' : ''}{areas.join(', ')} {(all) ? 'needs' : 'need'} the <span className='font-medium text-white'>{permission}</span> permission.
            </li>
          ))}
        </ul>
        <p className='mt-1.5 text-muted'>Server owners can change everything. Ask one of the server’s admins if something needs updating.</p>
      </div>
    </div>
  );
}
