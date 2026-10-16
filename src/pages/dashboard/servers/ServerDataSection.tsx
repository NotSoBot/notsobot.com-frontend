import { Download, ShieldAlert, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { isOwner, useAuth } from '@/auth';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import type { UserGuild, UserGuildDataExport } from '@/lib/api';
import { errorMessage, useDeleteGuildDataMutation, useExportGuildDataMutation, useGuildScope } from '@/lib/api/dashboardQueries';

import { Panel } from '../ui';


const DELETE_CONFIRM_PHRASE = 'delete server data';


function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // give the browser a moment to start the download before the url goes away
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportFilename(guildId: string, data: UserGuildDataExport): string {
  const date = new Date(data.timestamp).toISOString().slice(0, 10);
  return `notsobot-server-${guildId}-${date}.json`;
}


// Owner only: download or wipe what NotSoBot stores for this server. From the admin panel any staff member can export
// and bot owners can delete.
export function ServerDataSection({ guild }: {guild: UserGuild}) {
  const toast = useToast();
  const { user } = useAuth();
  const staff = useGuildScope() === 'admin';
  const canExport = staff || guild.owner;
  const canDelete = (staff) ? isOwner(user) : guild.owner;
  const readOnly = (canExport && canDelete) ? undefined
    : (staff) ? 'Only bot owners can delete a server’s data.'
    : 'Only the server owner can export or delete this server’s data.';
  const exportData = useExportGuildDataMutation(guild.id);
  const deleteData = useDeleteGuildDataMutation(guild.id);
  const [ confirmingDelete, setConfirmingDelete ] = useState(false);

  const runExport = () => {
    exportData.mutate(undefined, {
      onSuccess: (data) => {
        downloadJson(exportFilename(guild.id, data), data);
        toast('Server data exported');
      },
      onError: (error) => toast(errorMessage(error, 'Couldn’t export the server’s data.'), 'error'),
    });
  };

  const confirmDelete = () => {
    deleteData.mutate(undefined, {
      onSuccess: ({ tags_deleted }) => {
        setConfirmingDelete(false);
        toast(`Server data deleted${(tags_deleted) ? ` (${tags_deleted.toLocaleString()} ${(tags_deleted === 1) ? 'tag' : 'tags'})` : ''}`);
      },
    });
  };

  return (
    <Panel
      title='Server data'
      accent='#ed4245'
      description='Export or delete everything NotSoBot stores for this server.'
      readOnly={readOnly}
    >
      <div className='space-y-5'>
        <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
          <div className='min-w-0 text-sm'>
            <p className='font-medium text-white'>Export</p>
            <p className='mt-0.5 text-muted'>A JSON file with this server’s settings, prefixes, allow/blocklists, loggers and tags.</p>
          </div>
          <button type='button' className='btn btn-secondary shrink-0' onClick={runExport} disabled={!canExport || exportData.isPending}>
            {(exportData.isPending) ? <Spinner className='size-4'/> : <Download aria-hidden className='size-4'/>}
            Export data
          </button>
        </div>

        <p className='flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-fg'>
          <ShieldAlert aria-hidden className='mt-0.5 size-4 shrink-0 text-warning'/>
          <span>
            Logger webhook URLs aren’t included because they’re sensitive data: anyone with one can post in that channel.
            Tag variables, tag blobs and the content of directory tags aren’t included either.
          </span>
        </p>

        <div className='flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-start sm:justify-between'>
          <div className='min-w-0 text-sm'>
            <p className='font-medium text-white'>Delete</p>
            <p className='mt-0.5 text-muted'>
              Removes this server’s tags and their storage, settings, prefixes, allow/blocklists and loggers (their webhooks too).
              NotSoBot stays in the server with default settings.
            </p>
          </div>
          <button
            type='button'
            className='btn btn-danger shrink-0'
            onClick={() => setConfirmingDelete(true)}
            disabled={!canDelete || deleteData.isPending}
          >
            <Trash2 aria-hidden className='size-4'/>
            Delete data
          </button>
        </div>
      </div>

      {(confirmingDelete) ? (
        <ConfirmDialog
          title={`Delete ${guild.name}’s data?`}
          description={(
            <>
              <p>This deletes every tag made in this server along with its variables and blobs, all server settings, prefixes, allow/blocklists and loggers. It can’t be undone, so export first if you might want it back.</p>
              <p className='mt-2'>Members’ own data (their reminders, personal tags and command history) isn’t touched.</p>
            </>
          )}
          confirmLabel='Delete server data'
          confirmPhrase={DELETE_CONFIRM_PHRASE}
          pending={deleteData.isPending}
          error={(deleteData.isError) ? errorMessage(deleteData.error, 'Couldn’t delete the server’s data.') : null}
          onConfirm={confirmDelete}
          onClose={() => {
            deleteData.reset();
            setConfirmingDelete(false);
          }}
        />
      ) : null}
    </Panel>
  );
}
