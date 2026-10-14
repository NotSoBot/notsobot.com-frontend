import { AudioLines, Pencil, X } from 'lucide-react';
import { useState } from 'react';

import { SearchInput } from '@/components/ui/SearchInput';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import type { AdminVoice } from '@/lib/api';
import { ADMIN_PAGE_SIZE, errorMessage, useAdminVoicesQuery, usePatchAdminVoiceMutation } from '@/lib/api/dashboardQueries';
import { cn } from '@/lib/utils';

import { DashboardHeader, EmptyState, ErrorPanel, Skeleton } from '../ui';
import { RenameVoiceDialog, voicePlatformLabel } from '../voices/RenameVoiceDialog';
import { Chip, CopyableValue, ExactDate, Pagination, useSearchParamState, useStepBackFromEmptyPage, UserCell } from './adminUi';


export function AdminVoicesPage() {
  const { searchParams, page, update, setPage } = useSearchParamState();
  const query = searchParams.get('q') || '';
  const userId = searchParams.get('user_id') || '';
  const debouncedQuery = useDebouncedValue(query.trim(), 300);

  const { data, isPending, isError, error, isPlaceholderData, isFetching, isRefetching, refetch } = useAdminVoicesQuery({
    query: debouncedQuery,
    userId,
    page,
  });
  const mutation = usePatchAdminVoiceMutation();
  const [ renaming, setRenaming ] = useState<AdminVoice | null>(null);

  const items = data?.items ?? [];
  const steppingBack = useStepBackFromEmptyPage({page, setPage, data, isPlaceholderData, pageSize: ADMIN_PAGE_SIZE});
  const pagination = {
    page,
    count: data?.count ?? 0,
    pageSize: ADMIN_PAGE_SIZE,
    onChange: setPage,
    fetching: isFetching && isPlaceholderData,
  };

  return (
    <>
      <DashboardHeader title='Voices' description='Every voice cloned with the bot. Only the name can be changed for now.'/>

      <div className='mb-4 space-y-3'>
        <SearchInput
          value={query}
          onValueChange={(value) => update({q: value})}
          placeholder='Search by voice name, owner, or id...'
          aria-label='Search voices'
        />
        {(userId) ? (
          <div className='flex items-center gap-2 text-sm text-muted'>
            Owner
            <button
              type='button'
              className='inline-flex items-center gap-1 rounded-md border border-line bg-surface-2 px-2 py-1 font-mono text-xs text-fg hover:border-line-strong'
              onClick={() => update({user_id: null})}
              title='Clear the owner filter'
            >
              {userId}
              <X aria-label='Clear' className='size-3.5'/>
            </button>
          </div>
        ) : null}
      </div>

      {(isPending || steppingBack) ? (
        <TableSkeleton/>
      ) : (isError && !items.length) ? (
        <ErrorPanel title='Couldn’t load voices' message={errorMessage(error)} onRetry={() => refetch()} retrying={isRefetching}/>
      ) : (!items.length) ? (
        <EmptyState icon={<AudioLines className='size-10'/>} title='No voices found'>
          {(debouncedQuery || userId) ? 'Try a different search.' : null}
        </EmptyState>
      ) : (
        <>
          <Pagination {...pagination} className='mt-0 mb-4'/>
          <div className={cn('card overflow-x-auto transition-opacity', isPlaceholderData && 'opacity-60')}>
            <table className='w-full min-w-[760px] text-left text-sm'>
              <thead className='border-b border-line text-xs text-subtle uppercase'>
                <tr>
                  <th scope='col' className='px-4 py-2.5 font-medium'>Voice</th>
                  <th scope='col' className='px-4 py-2.5 font-medium'>Owner</th>
                  <th scope='col' className='px-4 py-2.5 font-medium'>Platform</th>
                  <th scope='col' className='px-4 py-2.5 font-medium'>Cloned</th>
                  <th scope='col' className='px-4 py-2.5 font-medium'><span className='sr-only'>Actions</span></th>
                </tr>
              </thead>
              <tbody className='divide-y divide-line'>
                {items.map((voice) => (
                  <tr key={voice.id} className='align-middle hover:bg-surface-2'>
                    <td className='max-w-64 px-4 py-3'>
                      <div className='truncate font-medium text-white' title={voice.name}>{voice.name}</div>
                      <CopyableValue value={voice.id} truncate={0} className='mt-0.5'/>
                    </td>
                    <td className='px-4 py-3'>
                      {(voice.user) ? (
                        <button
                          type='button'
                          className='-m-1 cursor-pointer rounded-md p-1 text-left hover:bg-surface-3'
                          title='Show only this user’s voices'
                          onClick={() => update({user_id: voice.user?.id ?? null, q: null})}
                        >
                          <UserCell user={voice.user}/>
                        </button>
                      ) : <UserCell user={null}/>}
                    </td>
                    <td className='px-4 py-3'>
                      <Chip>{voicePlatformLabel(voice.platform_type)}</Chip>
                      <div className='mt-1'><CopyableValue value={voice.platform_id} truncate={12}/></div>
                    </td>
                    <td className='px-4 py-3 whitespace-nowrap text-muted'>
                      <ExactDate value={voice.created}/>
                    </td>
                    <td className='px-4 py-3 text-right'>
                      <button type='button' className='btn btn-sm btn-ghost' onClick={() => setRenaming(voice)}>
                        <Pencil className='size-4'/>
                        Rename
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination {...pagination}/>
        </>
      )}

      {(renaming) ? <RenameVoiceDialog voice={renaming} mutation={mutation} onClose={() => setRenaming(null)}/> : null}
    </>
  );
}


function TableSkeleton() {
  return (
    <div aria-hidden className='card divide-y divide-line'>
      {Array.from({length: 6}, (_, i) => (
        <div key={i} className='flex items-center gap-3 px-4 py-3'>
          <div className='flex-1'>
            <Skeleton className='h-4 w-36'/>
            <Skeleton className='mt-1.5 h-3 w-44 bg-surface-2'/>
          </div>
          <Skeleton className='size-8 rounded-full'/>
          <Skeleton className='h-4 w-28 bg-surface-2'/>
          <Skeleton className='h-4 w-20 bg-surface-2'/>
        </div>
      ))}
    </div>
  );
}
