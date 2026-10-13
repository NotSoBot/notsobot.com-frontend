import { ArrowLeft, Ban, Crown, Eye } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router';

import { Routes } from '@/config';
import { ApiErrorCodes, ApiRequestError, type GuildEditableArea } from '@/lib/api';
import { errorMessage, isDiscordGrantError, isScopeMismatch, useMeGuildQuery } from '@/lib/api/dashboardQueries';

import { ErrorPanel, PanelSkeleton, Skeleton, UnsavedChangesGuard } from '../ui';
import { GuildIcon } from './GuildIcon';
import { AREA_LABEL, AREA_PERMISSION } from './guildMeta';
import { ServerDataSection } from './ServerDataSection';
import { CommandListSection, ListSection, LoggersSection, PrefixesSection } from './ServerSections';
import { ServerSettingsForm } from './ServerSettingsForm';
import { ScopeMismatchCard } from './ServersPage';


export function ServerDetailPage() {
  const { guildId = '' } = useParams();
  const { data: guild, isPending, isError, error, refetch, isRefetching } = useMeGuildQuery(guildId);
  const [ settingsDirty, setSettingsDirty ] = useState(false);

  const back = (
    <Link to={Routes.DASHBOARD_SERVERS} className='mb-4 inline-flex items-center gap-1.5 rounded text-sm text-muted transition-colors hover:text-white'>
      <ArrowLeft aria-hidden className='size-4'/>
      All servers
    </Link>
  );

  if (isPending) {
    return (
      <div aria-busy='true' aria-label='Loading server'>
        {back}
        <div className='mb-6 flex items-center gap-4'>
          <Skeleton className='size-16 rounded-2xl'/>
          <div>
            <Skeleton className='h-7 w-48'/>
            <Skeleton className='mt-2 h-3 w-32 bg-surface-2'/>
          </div>
        </div>
        <div className='space-y-4'><PanelSkeleton rows={2}/><PanelSkeleton rows={3}/></div>
      </div>
    );
  }

  if (isError) {
    const notFound = error instanceof ApiRequestError && (error.status === 404 || error.code === ApiErrorCodes.UNKNOWN_SERVER);
    return (
      <>
        {back}
        {(isScopeMismatch(error)) ? (
          <ScopeMismatchCard/>
        ) : (isDiscordGrantError(error)) ? (
          <ScopeMismatchCard reason='grant'/>
        ) : (notFound) ? (
          <ErrorPanel title='Server not found' message='NotSoBot isn’t in this server, or you aren’t a member of it.'/>
        ) : (
          <ErrorPanel title='Couldn’t load this server' message={errorMessage(error)} onRetry={() => refetch()} retrying={isRefetching}/>
        )}
      </>
    );
  }

  const canEditAnything = Object.values(guild.editable).some(Boolean);
  const lockedAreas = (Object.keys(AREA_LABEL) as Array<GuildEditableArea>).filter((area) => !guild.editable[area]);

  return (
    <>
      {back}
      <header className='mb-6 flex items-center gap-4'>
        <GuildIcon guild={guild} size={64} className='size-14 text-lg sm:size-16'/>
        <div className='min-w-0'>
          <h1 className='flex items-center gap-2 text-2xl font-bold text-white sm:text-3xl'>
            <span className='truncate' title={guild.name}>{guild.name}</span>
            {(guild.owner) ? <Crown aria-label='You own this server' className='size-5 shrink-0 text-warning'/> : null}
          </h1>
          <p className='mt-1 flex flex-wrap gap-x-3 text-sm text-subtle'>
            <span className='font-mono'>{guild.id}</span>
            <span>{(canEditAnything) ? 'You can manage this server' : 'View only'}</span>
          </p>
        </div>
      </header>

      {(lockedAreas.length) ? <ViewOnlyBanner lockedAreas={lockedAreas} all={!canEditAnything}/> : null}

      {(guild.blocked) ? (
        <p role='status' className='mb-4 flex items-start gap-2 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-fg'>
          <Ban aria-hidden className='mt-0.5 size-4 shrink-0 text-danger'/>
          <span>This server is blocked from using NotSoBot.{(guild.blocked_reason) ? ` Reason: ${guild.blocked_reason}` : null}</span>
        </p>
      ) : null}

      <div className='space-y-4'>
        <PrefixesSection guild={guild}/>
        <ServerSettingsForm guild={guild} onDirtyChange={setSettingsDirty}/>
        <ListSection guild={guild} list='allowlist'/>
        <ListSection guild={guild} list='blocklist'/>
        <CommandListSection guild={guild} list='allowlist'/>
        <CommandListSection guild={guild} list='blocklist'/>
        <LoggersSection guild={guild}/>
        <ServerDataSection guild={guild}/>
      </div>

      <UnsavedChangesGuard when={settingsDirty}/>
    </>
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
    <div role='status' className='mb-4 flex items-start gap-3 rounded-lg border border-warning/40 bg-warning/10 p-4'>
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
