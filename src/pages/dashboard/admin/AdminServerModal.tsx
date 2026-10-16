import { AlarmClock, AlertTriangle, Ban, Flag, MessageSquareWarning, ShieldCheck, Tags as TagsIcon } from 'lucide-react';
import { useId, useState } from 'react';

import { isOwner, useAuth } from '@/auth';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { Routes } from '@/config';
import { ApiErrorCodes, ApiRequestError, type AdminGuild, type AdminGuildSummary } from '@/lib/api';
import { errorMessage, GuildScopeContext, useAdminGuildQuery, usePatchAdminGuildMutation } from '@/lib/api/dashboardQueries';
import { formatDateTime } from '@/lib/utils';

import { GuildIcon } from '../servers/GuildIcon';
import { YourStuffLink } from '../servers/ServerDetailsModal';
import { ServerDataSection } from '../servers/ServerDataSection';
import { CommandListSection, ListSection, LoggersSection, PrefixesSection } from '../servers/ServerSections';
import { ServerSettingsForm } from '../servers/ServerSettingsForm';
import { PanelSkeleton, Panel, Skeleton, UnsavedChangesGuard } from '../ui';
import { BLOCK_REASON_MAX } from './BlockUserDialog';
import { Chip, CopyableValue, ExactDate } from './adminUi';
import { AdminTagModal } from './AdminTagModal';


const TITLE_ID = 'admin-server-modal-title';


function adminListPath(route: string, params: Record<string, string>): string {
  return `${route}?${new URLSearchParams(params).toString()}`;
}


// Any server over the admin server list (`/dashboard/admin/servers/<id>`): shortcuts to what's linked to it, blocking it,
// and the same settings sections as the user dashboard's server modal, all editable (through `/admin/guilds`). ← / → (and
// the footer's arrows) step through the servers on the list page.
export function AdminServerModal({ guildId, previousId, nextId, onNavigate, onClose }: {
  guildId: string,
  previousId: string | null,
  nextId: string | null,
  onNavigate: (guildId: string) => void,
  onClose: () => void,
}) {
  const { data: guild, isPending, error, refetch, isRefetching } = useAdminGuildQuery(guildId);
  const [ settingsDirty, setSettingsDirty ] = useState(false);
  // what to do once unsaved settings are discarded: close, or go to another server
  const [ confirming, setConfirming ] = useState<{close: true} | {navigate: string} | null>(null);

  const leave = (action: {close: true} | {navigate: string}) => {
    if ('close' in action) {
      onClose();
    } else {
      setSettingsDirty(false);
      onNavigate(action.navigate);
    }
  };
  const request = (action: {close: true} | {navigate: string}) => {
    if (settingsDirty) {
      setConfirming(action);
    } else {
      leave(action);
    }
  };

  return (
    <AdminTagModal
      labelledBy={TITLE_ID}
      previousId={previousId}
      nextId={nextId}
      onNavigate={(id) => request({navigate: id})}
      onClose={() => request({close: true})}
    >
      {(guild) ? (
        <GuildScopeContext.Provider value='admin'>
          <ServerDetails key={guild.id} guild={guild} onDirtyChange={setSettingsDirty}/>
        </GuildScopeContext.Provider>
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

      {(confirming) ? (
        <ConfirmDialog
          title='Discard unsaved changes?'
          description={('close' in confirming) ?
            'You have edits to this server’s settings that haven’t been saved. If you close it now, they’ll be lost.' :
            'You have edits to this server’s settings that haven’t been saved. If you go to another server now, they’ll be lost.'}
          confirmLabel={('close' in confirming) ? 'Discard and close' : 'Discard and continue'}
          onConfirm={() => {
            setConfirming(null);
            leave(confirming);
          }}
          onClose={() => setConfirming(null)}
        />
      ) : null}
      {/* leaving the page altogether (the shortcuts, the sidebar) */}
      <UnsavedChangesGuard when={settingsDirty}/>
    </AdminTagModal>
  );
}


function ServerLoadError({ error, onRetry, retrying }: {error: Error | null, onRetry: () => void, retrying: boolean}) {
  const notFound = error instanceof ApiRequestError && (error.status === 404 || error.code === ApiErrorCodes.UNKNOWN_SERVER);
  return (
    <div className='px-6 py-16 text-center'>
      <AlertTriangle className='mx-auto mb-4 size-14 text-danger'/>
      <h2 id={TITLE_ID} className='mb-3 text-2xl font-bold text-white'>{(notFound) ? 'Server not found' : 'Couldn’t load this server'}</h2>
      <p className='mb-6 text-muted'>{(notFound) ? 'NotSoBot isn’t in this server and has nothing saved for it.' : errorMessage(error)}</p>
      {(notFound) ? null : <button type='button' className='btn btn-secondary' disabled={retrying} onClick={onRetry}>Retry</button>}
    </div>
  );
}


function ServerDetails({ guild, onDirtyChange }: {guild: AdminGuild, onDirtyChange: (dirty: boolean) => void}) {
  return (
    <>
      <header className='rounded-t-xl border-b border-line bg-surface px-6 pt-6 pb-5 sm:pr-14'>
        <div className='flex min-w-0 items-center gap-4 pr-8 sm:pr-0'>
          <GuildIcon guild={guild} size={64} className='size-14 shrink-0 text-lg sm:size-16'/>
          <div className='min-w-0'>
            <h2 id={TITLE_ID} className='truncate text-2xl font-bold text-white' title={guild.name}>{guild.name || 'Unnamed server'}</h2>
            <div className='mt-1 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-subtle'>
              <CopyableValue value={guild.id} truncate={0}/>
              <BotChip bot={guild.bot}/>
              {(guild.blocked) ? <Chip tone='danger'>Blocked</Chip> : null}
              {(guild.bot) ? (
                <span className='text-xs'>
                  Shard {guild.bot.shard_id}
                  {(guild.bot.updated) ? <> · seen <ExactDate value={guild.bot.updated} format={formatDateTime}/></> : null}
                </span>
              ) : null}
            </div>
          </div>
        </div>
        <ServerShortcuts guild={guild}/>
      </header>

      <div className='space-y-4 p-4 sm:p-6'>
        <BlockPanel guild={guild}/>
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


export function BotChip({ bot }: {bot: AdminGuildSummary['bot']}) {
  if (!bot) {
    return <Chip title='NotSoBot isn’t in this server anymore (or never joined it). Its settings are kept.'>Bot not in server</Chip>;
  }
  return <Chip tone='success' title={`Shard ${bot.shard_id}`}>Bot in server</Chip>;
}


// the other admin pages filtered to this server; the counts match what each one shows
function ServerShortcuts({ guild }: {guild: AdminGuild}) {
  const { counts } = guild as {counts?: AdminGuild['counts']};
  // an API from before `counts` was added leaves it out
  if (!counts) {
    return null;
  }
  return (
    <nav aria-label='Linked to this server' className='mt-4 flex flex-wrap gap-2'>
      <YourStuffLink to={adminListPath(Routes.DASHBOARD_ADMIN_TAGS, {server: guild.id})} icon={TagsIcon} label='Tags' count={counts.tags}/>
      {/* a count only: reminders are people's private notes, so staff don't get to read them */}
      <span
        className='inline-flex items-center gap-2 rounded-md border border-line bg-surface px-3 py-2 text-sm text-muted'
        title='Reminders set in this server. Their contents are private.'
      >
        <AlarmClock aria-hidden className='size-4 text-subtle'/>
        Reminders
        <span className='rounded bg-surface-3 px-1.5 text-xs tabular-nums'>{counts.reminders.toLocaleString()}</span>
      </span>
      {/* every status, blocked users' flags included, like the count */}
      <YourStuffLink
        to={adminListPath(Routes.DASHBOARD_ADMIN_FLAGS, {guild_id: guild.id, status: 'all', blocked: '1'})}
        icon={Flag}
        label='Content flags'
        count={counts.content_flags}
      />
      <YourStuffLink
        to={adminListPath(Routes.DASHBOARD_ADMIN_REPORTS, {guild_id: guild.id, status: 'all'})}
        icon={MessageSquareWarning}
        label='Reports'
        count={counts.reports}
      />
    </nav>
  );
}


// blocking stops NotSoBot from responding in the server; like users, only bot owners can unblock
function BlockPanel({ guild }: {guild: AdminGuild}) {
  const { user } = useAuth();
  const canUnblock = isOwner(user);
  const [ dialogOpen, setDialogOpen ] = useState(false);

  return (
    <Panel
      title='Access'
      accent='#ed4245'
      description='Blocking stops NotSoBot from responding to anyone in this server. Its settings are kept.'
      readOnly={(guild.blocked && !canUnblock) ? 'Only bot owners can unblock servers.' : undefined}
    >
      {(guild.blocked) ? (
        <div className='flex flex-col gap-3 rounded-md border border-danger/30 bg-danger/10 px-3 py-2.5 sm:flex-row sm:items-start sm:justify-between'>
          <div className='min-w-0'>
            <p className='flex items-center gap-1.5 text-sm font-semibold text-[#ff8a8c]'>
              <Ban aria-hidden className='size-4 shrink-0'/>
              Blocked
            </p>
            {(guild.blocked_reason) ? (
              <p className='mt-1 text-sm break-words whitespace-pre-wrap text-fg'>{guild.blocked_reason}</p>
            ) : (
              <p className='mt-1 text-sm text-subtle italic'>No reason given</p>
            )}
          </div>
          {(canUnblock) ? (
            <button type='button' className='btn btn-secondary btn-sm shrink-0' onClick={() => setDialogOpen(true)}>
              <ShieldCheck aria-hidden className='size-4'/>
              Unblock
            </button>
          ) : null}
        </div>
      ) : (
        <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <p className='text-sm text-muted'>Not blocked. NotSoBot works here as usual.</p>
          <button type='button' className='btn btn-danger btn-sm shrink-0' onClick={() => setDialogOpen(true)}>
            <Ban aria-hidden className='size-4'/>
            Block server
          </button>
        </div>
      )}
      {(dialogOpen) ? <BlockServerDialog guild={guild} onClose={() => setDialogOpen(false)}/> : null}
    </Panel>
  );
}


function BlockServerDialog({ guild, onClose }: {guild: AdminGuild, onClose: () => void}) {
  const titleId = useId();
  const reasonId = useId();
  const toast = useToast();
  const mutation = usePatchAdminGuildMutation(guild.id);
  const [ reason, setReason ] = useState('');
  const { blocked } = guild;
  const name = guild.name || guild.id;

  const submit = () => {
    const patch = (blocked) ? {blocked: false} : {blocked: true, blocked_reason: reason.trim() || null};
    mutation.mutate(patch, {
      onSuccess: () => {
        toast((blocked) ? `Unblocked ${name}` : `Blocked ${name}`);
        onClose();
      },
    });
  };

  return (
    <Modal labelledBy={titleId} onClose={() => !mutation.isPending && onClose()} className='max-w-lg'>
      <form
        className='p-5 sm:p-6'
        onSubmit={(event) => {
          event.preventDefault();
          if (!mutation.isPending) {
            submit();
          }
        }}
      >
        <h2 id={titleId} className='pr-10 text-lg font-semibold break-words text-white'>
          {(blocked) ? `Unblock ${name}?` : `Block ${name} from NotSoBot?`}
        </h2>

        {(blocked) ? (
          <p className='mt-3 text-sm text-muted'>NotSoBot will respond in this server again.</p>
        ) : (
          <>
            <p className='mt-3 text-sm text-muted'>NotSoBot stops responding to everyone in this server. Only bot owners can undo it.</p>
            <label htmlFor={reasonId} className='mt-3 mb-1.5 block text-sm text-muted'>Block reason</label>
            <textarea
              id={reasonId}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={BLOCK_REASON_MAX}
              rows={2}
              disabled={mutation.isPending}
              className='input'
              autoFocus
            />
          </>
        )}

        {(mutation.isError) ? (
          <p role='alert' className='mt-4 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-fg'>
            {errorMessage(mutation.error, (blocked) ? 'Couldn’t unblock the server.' : 'Couldn’t block the server.')}
          </p>
        ) : null}

        <div className='mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end'>
          <button type='button' className='btn btn-secondary' onClick={onClose} disabled={mutation.isPending}>Cancel</button>
          <button type='submit' className={(blocked) ? 'btn btn-primary' : 'btn btn-danger'} disabled={mutation.isPending}>
            {(mutation.isPending) ? <Spinner className='size-4 border-white/40 border-t-white'/> : (blocked) ? <ShieldCheck className='size-4'/> : <Ban className='size-4'/>}
            {(blocked) ? 'Unblock' : 'Block'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
