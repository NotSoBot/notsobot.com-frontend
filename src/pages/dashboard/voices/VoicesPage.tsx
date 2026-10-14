import { AudioLines, Pencil } from 'lucide-react';
import { useState } from 'react';

import type { Voice } from '@/lib/api';
import { errorMessage, useMeVoicesQuery, usePatchMeVoiceMutation } from '@/lib/api/dashboardQueries';
import { formatDate } from '@/lib/utils';

import { Chip } from '../admin/adminUi';
import { DashboardHeader, EmptyState, ErrorPanel, Skeleton } from '../ui';
import { RenameVoiceDialog, voicePlatformLabel } from './RenameVoiceDialog';


export function VoicesPage() {
  const { data, isPending, isError, error, isRefetching, refetch } = useMeVoicesQuery();
  const mutation = usePatchMeVoiceMutation();
  const [ renaming, setRenaming ] = useState<Voice | null>(null);
  const items = data?.items ?? [];

  return (
    <>
      <DashboardHeader
        title='Your Voices'
        description={<>Voices you cloned with the bot’s <code className='text-fg'>voice clone</code> command. You can rename them here.</>}
      />

      {(isPending) ? (
        <ListSkeleton/>
      ) : (isError) ? (
        <ErrorPanel title='Couldn’t load your voices' message={errorMessage(error)} onRetry={() => refetch()} retrying={isRefetching}/>
      ) : (!items.length) ? (
        <EmptyState icon={<AudioLines className='size-10'/>} title='No cloned voices yet'>
          Clone one in Discord with <code className='text-fg'>voice clone</code> and an audio clip of someone speaking.
        </EmptyState>
      ) : (
        <ul className='card divide-y divide-line'>
          {items.map((voice) => (
            <li key={voice.id} className='flex items-center gap-3 px-4 py-3'>
              <span aria-hidden className='flex size-9 shrink-0 items-center justify-center rounded-md bg-[#eb459e]/15'>
                <AudioLines className='size-5 text-[#eb459e]'/>
              </span>
              <div className='min-w-0 flex-1'>
                <div className='truncate font-medium text-white'>{voice.name}</div>
                <div className='mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-subtle'>
                  <Chip>{voicePlatformLabel(voice.platform_type)}</Chip>
                  <span>Cloned {formatDate(voice.created)}</span>
                </div>
              </div>
              <button type='button' className='btn btn-sm btn-secondary shrink-0' onClick={() => setRenaming(voice)}>
                <Pencil className='size-4'/>
                Rename
              </button>
            </li>
          ))}
        </ul>
      )}

      {(renaming) ? <RenameVoiceDialog voice={renaming} mutation={mutation} onClose={() => setRenaming(null)}/> : null}
    </>
  );
}


function ListSkeleton() {
  return (
    <div aria-hidden className='card divide-y divide-line'>
      {Array.from({length: 2}, (_, i) => (
        <div key={i} className='flex items-center gap-3 px-4 py-3'>
          <Skeleton className='size-9 rounded-md'/>
          <div className='flex-1'>
            <Skeleton className='h-4 w-40'/>
            <Skeleton className='mt-1.5 h-3 w-28 bg-surface-2'/>
          </div>
          <Skeleton className='h-8 w-24 bg-surface-2'/>
        </div>
      ))}
    </div>
  );
}
