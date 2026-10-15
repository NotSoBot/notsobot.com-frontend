import { AlarmClock, ExternalLink, Pencil, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';

import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import type { Reminder } from '@/lib/api';
import {
  errorMessage,
  useDeleteMeReminderMutation,
  useMeGuildsQuery,
  useMeRemindersQuery,
  usePatchMeReminderMutation,
} from '@/lib/api/dashboardQueries';
import { formatDate, formatDateTime, formatExactDateTime } from '@/lib/utils';

import { Chip } from '../admin/adminUi';
import { DashboardHeader, EmptyState, ErrorPanel, Skeleton } from '../ui';
import { EditReminderDialog } from './EditReminderDialog';


type ReminderSortBy = 'next' | 'last' | 'newest' | 'oldest';

const SORTS: Array<{value: ReminderSortBy, label: string}> = [
  {value: 'next', label: 'Next to run'},
  {value: 'last', label: 'Last to run'},
  {value: 'newest', label: 'Newest'},
  {value: 'oldest', label: 'Oldest'},
];

// ids are snowflakes, so they order by when the reminder was made
const compareIds = (a: Reminder, b: Reminder) => a.id.length - b.id.length || a.id.localeCompare(b.id);
const compareStarts = (a: Reminder, b: Reminder) => Date.parse(a.timestamp_start) - Date.parse(b.timestamp_start) || compareIds(a, b);

const SORTERS: Record<ReminderSortBy, (a: Reminder, b: Reminder) => number> = {
  next: compareStarts,
  last: (a, b) => compareStarts(b, a),
  newest: (a, b) => compareIds(b, a),
  oldest: compareIds,
};


export function RemindersPage() {
  const { data, isPending, isError, error, isRefetching, refetch } = useMeRemindersQuery();
  // only for server names, reminders still show (as "a server") when the guild list can't load
  const guilds = useMeGuildsQuery();
  const guildNames = useMemo(() => new Map((guilds.data ?? []).map((guild) => [guild.id, guild.name])), [guilds.data]);
  const [ searchParams, setSearchParams ] = useSearchParams();
  const sortBy = SORTS.find((sort) => sort.value === searchParams.get('sort'))?.value ?? 'next';
  const items = useMemo(() => [...(data?.items ?? [])].sort(SORTERS[sortBy]), [data?.items, sortBy]);
  const setSortBy = (value: string) => {
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      if (value === 'next') {
        next.delete('sort');
      } else {
        next.set('sort', value);
      }
      return next;
    }, {replace: true, preventScrollReset: true});
  };

  const toast = useToast();
  const patch = usePatchMeReminderMutation();
  const remove = useDeleteMeReminderMutation();
  const [ editing, setEditing ] = useState<Reminder | null>(null);
  const [ deleting, setDeleting ] = useState<Reminder | null>(null);
  const whereOf = (reminder: Reminder) => (reminder.guild_id) ? (guildNames.get(reminder.guild_id) ?? 'a server') : 'your DMs';

  const confirmDelete = () => {
    if (!deleting) {
      return;
    }
    remove.mutate(deleting.id, {
      onSuccess: () => {
        toast('Reminder deleted');
        setDeleting(null);
      },
    });
  };

  return (
    <>
      <DashboardHeader
        title='Your Reminders'
        description={<>Reminders you set with the bot’s <code className='text-fg'>reminder</code> commands. You can change their text, move them to your DMs or delete them here.</>}
      />

      {(isPending) ? (
        <ListSkeleton/>
      ) : (isError) ? (
        <ErrorPanel title='Couldn’t load your reminders' message={errorMessage(error)} onRetry={() => refetch()} retrying={isRefetching}/>
      ) : (!items.length) ? (
        <EmptyState icon={<AlarmClock className='size-10'/>} title='No reminders yet'>
          Set one in Discord with <code className='text-fg'>/reminder create</code>.
        </EmptyState>
      ) : (
        <>
          <div className='mb-4 flex flex-wrap items-center gap-3 sm:justify-end'>
            <label className='flex items-center gap-2 text-sm text-muted'>
              Sort
              <select className='input w-40' value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                {SORTS.map((sort) => <option key={sort.value} value={sort.value}>{sort.label}</option>)}
              </select>
            </label>
          </div>
          <ul className='card divide-y divide-line'>
            {items.map((reminder) => (
              <ReminderRow
                key={reminder.id}
                reminder={reminder}
                where={whereOf(reminder)}
                onEdit={() => setEditing(reminder)}
                onDelete={() => setDeleting(reminder)}
              />
            ))}
          </ul>
        </>
      )}

      {(editing) ? (
        <EditReminderDialog reminder={editing} where={whereOf(editing)} mutation={patch} onClose={() => setEditing(null)}/>
      ) : null}

      {(deleting) ? (
        <ConfirmDialog
          title='Delete this reminder?'
          description='The bot won’t remind you of it anymore. This can’t be undone.'
          confirmLabel='Delete reminder'
          pending={remove.isPending}
          error={(remove.isError) ? errorMessage(remove.error, 'Couldn’t delete the reminder.') : null}
          onConfirm={confirmDelete}
          onClose={() => {
            remove.reset();
            setDeleting(null);
          }}
        />
      ) : null}
    </>
  );
}


function ReminderRow({ reminder, where, onEdit, onDelete }: {
  reminder: Reminder,
  where: string,
  onEdit: () => void,
  onDelete: () => void,
}) {
  const jumpLink = (reminder.channel_id && reminder.message_id)
    ? `https://discord.com/channels/${reminder.guild_id ?? '@me'}/${reminder.channel_id}/${reminder.message_id}`
    : null;

  return (
    <li className='flex items-start gap-3 px-4 py-3'>
      <span aria-hidden className='flex size-9 shrink-0 items-center justify-center rounded-md bg-[#faa81a]/15'>
        <AlarmClock className='size-5 text-[#faa81a]'/>
      </span>
      <div className='min-w-0 flex-1'>
        <div className='font-medium text-white' title={formatExactDateTime(reminder.timestamp_start)}>
          {(reminder.is_all_day) ? formatDate(reminder.timestamp_start) : formatDateTime(reminder.timestamp_start)}
          {(reminder.timestamp_end) ? (
            <span className='text-muted'> – {(reminder.is_all_day) ? formatDate(reminder.timestamp_end) : formatDateTime(reminder.timestamp_end)}</span>
          ) : null}
        </div>
        {(reminder.content) ? (
          <p className='mt-1 whitespace-pre-wrap break-words text-sm text-fg'>{reminder.content}</p>
        ) : (
          <p className='mt-1 text-sm italic text-subtle'>No message</p>
        )}
        <div className='mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-subtle'>
          <Chip title='The number `reminder delete` uses'>#{reminder.position}</Chip>
          {(reminder.is_all_day) ? <Chip tone='brand'>All day</Chip> : null}
          <span>In {where}</span>
        </div>
      </div>
      <div className='flex shrink-0 flex-col gap-1.5 sm:flex-row'>
        {(jumpLink) ? (
          <a href={jumpLink} target='_blank' rel='noreferrer' className='btn btn-sm btn-secondary' aria-label='Jump to the message'>
            <ExternalLink className='size-4'/>
            <span className='hidden sm:inline'>Jump</span>
          </a>
        ) : null}
        <button type='button' className='btn btn-sm btn-secondary' onClick={onEdit} aria-label='Edit reminder'>
          <Pencil className='size-4'/>
          <span className='hidden sm:inline'>Edit</span>
        </button>
        <button type='button' className='btn btn-sm btn-secondary' onClick={onDelete} aria-label='Delete reminder'>
          <Trash2 className='size-4'/>
          <span className='hidden sm:inline'>Delete</span>
        </button>
      </div>
    </li>
  );
}


function ListSkeleton() {
  return (
    <div aria-hidden className='card divide-y divide-line'>
      {Array.from({length: 3}, (_, i) => (
        <div key={i} className='flex items-start gap-3 px-4 py-3'>
          <Skeleton className='size-9 rounded-md'/>
          <div className='flex-1'>
            <Skeleton className='h-4 w-48'/>
            <Skeleton className='mt-1.5 h-3 w-64 bg-surface-2'/>
            <Skeleton className='mt-1.5 h-3 w-24 bg-surface-2'/>
          </div>
        </div>
      ))}
    </div>
  );
}
