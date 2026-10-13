import { ChevronDown, ChevronUp, Clock, ShieldCheck, ShieldX, Trash2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';

import { SearchInput } from '@/components/ui/SearchInput';
import { Segmented } from '@/components/ui/Segmented';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { TagDirectoryVerificationStates, type AdminTagDirectoryItem, type AdminTagDirectorySortBy, type TagDirectoryAsset } from '@/lib/api';
import { ADMIN_PAGE_SIZE, errorMessage, useAdminTagDirectoryQuery, usePatchAdminTagDirectoryMutation } from '@/lib/api/dashboardQueries';
import { cn, formatDate, formatDateTime, formatMemory } from '@/lib/utils';
import { NsfwBadge, VerificationBadge } from '@/pages/tags/tagDirectory';

import { DashboardHeader, EmptyState, ErrorPanel, Skeleton, Toggle } from '../ui';
import { Chip, DetailList, Pagination, selectAllScope, useSearchParamState, UserCell } from './adminUi';
import { DeleteDirectoryTagFlow } from './DeleteDirectoryTagFlow';


// same order and `status` param as the public directory, but defaults to the review queue
const FILTERS = [
  {value: 'all', label: 'All', verified: null},
  {value: 'verified', label: 'Verified', verified: TagDirectoryVerificationStates.VERIFIED},
  {value: 'pending', label: 'Pending', verified: TagDirectoryVerificationStates.PENDING_VERIFICATION},
  {value: 'unverified', label: 'Unverified', verified: TagDirectoryVerificationStates.NOT_VERIFIED},
] as const;

const DEFAULT_FILTER = FILTERS.find((item) => item.value === 'pending')!;

const SORTS: Array<{value: AdminTagDirectorySortBy, label: string}> = [
  {value: 'newest', label: 'Newest'},
  {value: 'oldest', label: 'Oldest'},
  {value: 'uses', label: 'Most used'},
  {value: 'name', label: 'Name'},
  {value: 'title', label: 'Title'},
];


export function AdminTagsPage() {
  const { searchParams, page, update, setPage } = useSearchParamState();
  const filter = FILTERS.find((item) => item.value === searchParams.get('status')) ?? DEFAULT_FILTER;
  // admins see NSFW tags unless they hide them
  const hideNsfw = searchParams.get('nsfw') === 'hide';
  const sortBy = SORTS.find((sort) => sort.value === searchParams.get('sort'))?.value ?? 'newest';
  const query = searchParams.get('q') || '';
  const debouncedQuery = useDebouncedValue(query.trim(), 300);

  const { data, isPending, isError, error, isPlaceholderData, isFetching, isRefetching, refetch } = useAdminTagDirectoryQuery({
    query: debouncedQuery,
    sortBy,
    verified: filter.verified,
    nsfw: (hideNsfw) ? false : null,
    page,
  });
  const items = data?.items ?? [];

  return (
    <>
      <DashboardHeader
        title='Directory tags'
        description='Review tags published to the tag directory. Verified tags are marked safe and can’t be edited by their owner.'
      />

      <div className='mb-4 space-y-3'>
        <SearchInput
          value={query}
          onValueChange={(value) => update({q: value})}
          placeholder='Search title, name, content, tag id or user id...'
          aria-label='Search directory tags'
        />
        <div className='flex flex-wrap items-center gap-3'>
          <div className='overflow-x-auto'>
            <Segmented
              label='Verification'
              value={filter.value}
              options={FILTERS.map(({ value, label }) => ({value, label}))}
              onChange={(value) => update({status: (value === DEFAULT_FILTER.value) ? null : value})}
            />
          </div>
          <div className='flex flex-wrap items-center gap-3 sm:ml-auto'>
            <label className='flex items-center gap-2 text-sm text-muted'>
              Sort
              <select className='input w-36' value={sortBy} onChange={(event) => update({sort: (event.target.value === 'newest') ? null : event.target.value})}>
                {SORTS.map((sort) => <option key={sort.value} value={sort.value}>{sort.label}</option>)}
              </select>
            </label>
            <div className='rounded-md border border-line bg-surface px-3 py-2'>
              <Toggle label='Show NSFW' checked={!hideNsfw} onChange={(value) => update({nsfw: (value) ? null : 'hide'})}/>
            </div>
          </div>
        </div>
      </div>

      {(isPending) ? (
        <ListSkeleton/>
      ) : (isError && !items.length) ? (
        <ErrorPanel title='Couldn’t load directory tags' message={errorMessage(error)} onRetry={() => refetch()} retrying={isRefetching}/>
      ) : (!items.length) ? (
        <EmptyState icon={<ShieldCheck className='size-10'/>} title='Nothing here'>
          {(debouncedQuery) ? (
            (filter.verified === null) ? 'No directory tags match that search.' : (
              <>
                No {filter.label.toLowerCase()} directory tags match that search.{' '}
                <button type='button' className='cursor-pointer text-brand hover:underline' onClick={() => update({status: 'all'})}>Search all tags</button>
              </>
            )
          ) : `No ${filter.label.toLowerCase()} directory tags.`}
        </EmptyState>
      ) : (
        <>
          <ul className={cn('space-y-3 transition-opacity', isPlaceholderData && 'opacity-60')}>
            {items.map((item) => <DirectoryTagCard key={item.id} item={item}/>)}
          </ul>
          <Pagination page={page} count={data?.count ?? 0} pageSize={ADMIN_PAGE_SIZE} onChange={setPage} fetching={isFetching && isPlaceholderData}/>
        </>
      )}
    </>
  );
}


const CONTENT_COLLAPSE_LINES = 14;
const CONTENT_COLLAPSE_CHARS = 900;

function DirectoryTagCard({ item }: {item: AdminTagDirectoryItem}) {
  const { tag } = item;
  const toast = useToast();
  const mutation = usePatchAdminTagDirectoryMutation();
  const [ expanded, setExpanded ] = useState(false);
  const [ deleting, setDeleting ] = useState(false);

  const content = tag.content ?? '';
  const long = CONTENT_COLLAPSE_LINES < content.split('\n').length || CONTENT_COLLAPSE_CHARS < content.length;

  const setVerified = (verified: number, label: string) => {
    mutation.mutate({tagId: item.id, verified}, {
      onSuccess: () => toast(`${item.title || tag.name}: ${label}`),
      onError: (error) => toast(errorMessage(error), 'error'),
    });
  };
  const pendingTarget = (mutation.isPending) ? mutation.variables?.verified : undefined;

  return (
    <li className='card p-4 sm:p-5'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div className='min-w-0 flex-1'>
          <div className='flex flex-wrap items-center gap-2'>
            <h2 className='truncate text-lg font-semibold text-white'>{item.title || <span className='text-subtle italic'>Untitled</span>}</h2>
            <VerificationBadge verified={item.verified}/>
            {(tag.nsfw) ? <NsfwBadge/> : null}
            {(tag.locked) ? <Chip tone='warning'>Locked</Chip> : null}
          </div>
          <p className='mt-0.5 font-mono text-sm text-code'>{tag.name}</p>
        </div>
        <div className='flex flex-wrap gap-2'>
          <ActionButton
            label='Verify'
            icon={<ShieldCheck className='size-4'/>}
            className='btn-primary'
            disabled={mutation.isPending || item.verified === TagDirectoryVerificationStates.VERIFIED}
            pending={pendingTarget === TagDirectoryVerificationStates.VERIFIED}
            onClick={() => setVerified(TagDirectoryVerificationStates.VERIFIED, 'verified')}
          />
          <ActionButton
            label='Mark pending'
            icon={<Clock className='size-4'/>}
            className='btn-secondary'
            disabled={mutation.isPending || item.verified === TagDirectoryVerificationStates.PENDING_VERIFICATION}
            pending={pendingTarget === TagDirectoryVerificationStates.PENDING_VERIFICATION}
            onClick={() => setVerified(TagDirectoryVerificationStates.PENDING_VERIFICATION, 'marked pending')}
          />
          <ActionButton
            label='Reject'
            icon={<ShieldX className='size-4'/>}
            className='btn-danger'
            disabled={mutation.isPending || item.verified === TagDirectoryVerificationStates.NOT_VERIFIED}
            pending={pendingTarget === TagDirectoryVerificationStates.NOT_VERIFIED}
            onClick={() => setVerified(TagDirectoryVerificationStates.NOT_VERIFIED, 'set to unverified')}
          />
          <ActionButton
            label='Delete'
            icon={<Trash2 className='size-4'/>}
            className='btn-danger'
            disabled={mutation.isPending}
            pending={false}
            onClick={() => setDeleting(true)}
          />
        </div>
      </div>

      <div className='mt-3'>
        <UserCell user={item.user} fallbackId={tag.user_id ?? null}/>
      </div>

      {(item.description) ? (
        <p className='mt-3 text-sm whitespace-pre-wrap break-words text-muted'>{item.description}</p>
      ) : null}

      <div className='mt-3'>
        <DetailList
          items={[
            ['Tag id', <span className='font-mono'>{tag.id}</span>],
            ['Uses', (tag.uses ?? 0).toLocaleString()],
            ['Servers', (item.server_count ?? 0).toLocaleString()],
            ['Created', <span title={formatDateTime(tag.created)}>{formatDate(tag.created)}</span>],
            (tag.edited) ? ['Edited', formatDate(tag.edited)] : null,
            (item.created) ? ['Listed', formatDate(item.created)] : null,
            (tag.server_id) ? ['Server id', <span className='font-mono'>{tag.server_id}</span>] : null,
          ]}
        />
      </div>

      <div className='mt-4'>
        <div className='mb-1.5 flex items-center justify-between gap-2'>
          <h3 className='section-label'>Content <span className='normal-case tracking-normal text-subtle'>({content.length.toLocaleString()} chars)</span></h3>
          {(long) ? (
            <button type='button' className='btn btn-ghost btn-sm' onClick={() => setExpanded((value) => !value)} aria-expanded={expanded}>
              {(expanded) ? <ChevronUp className='size-4'/> : <ChevronDown className='size-4'/>}
              {(expanded) ? 'Collapse' : 'Expand'}
            </button>
          ) : null}
        </div>
        <pre
          className={cn(
            'overflow-x-auto rounded-md border border-line bg-deep p-3 font-mono text-sm whitespace-pre-wrap break-words text-fg',
            long && !expanded && 'max-h-72 overflow-y-hidden',
            'focus:border-line-strong focus:outline-none',
          )}
          {...selectAllScope}
        >
          {content || <span className='text-subtle italic'>(empty)</span>}
        </pre>
        {(long && !expanded) ? (
          <button type='button' className='mt-1 cursor-pointer text-xs text-brand hover:underline' onClick={() => setExpanded(true)}>Show full content</button>
        ) : null}
      </div>

      {(item.assets?.length) ? (
        <div className='mt-4'>
          <h3 className='section-label mb-1.5'>Assets</h3>
          <ul className='space-y-1'>
            {item.assets.map((asset) => <AssetRow key={asset.id} asset={asset}/>)}
          </ul>
        </div>
      ) : null}

      {(deleting) ? <DeleteDirectoryTagFlow item={item} onClose={() => setDeleting(false)}/> : null}
    </li>
  );
}


function AssetRow({ asset }: {asset: TagDirectoryAsset}) {
  const meta = asset.metadata;
  const details = [
    meta?.mimetype,
    (meta?.width && meta?.height) ? `${meta.width}×${meta.height}` : null,
    (meta?.size) ? formatMemory(meta.size, 1) : null,
    (meta?.duration) ? `${meta.duration}s` : null,
  ].filter(Boolean).join(' · ');
  return (
    <li className='flex flex-wrap items-baseline gap-x-2 text-sm'>
      {(asset.urls?.cdn) ? (
        <a href={asset.urls.cdn} target='_blank' rel='noreferrer noopener' className='font-mono text-brand hover:underline'>{asset.filename}</a>
      ) : (
        <span className='font-mono text-fg'>{asset.filename}</span>
      )}
      {(details) ? <span className='text-xs text-subtle'>{details}</span> : null}
    </li>
  );
}


function ActionButton({ label, icon, className, disabled, pending, onClick }: {
  label: string,
  icon: ReactNode,
  className: string,
  disabled: boolean,
  pending: boolean,
  onClick: () => void,
}) {
  return (
    <button type='button' className={cn('btn btn-sm', className)} disabled={disabled} onClick={onClick}>
      {(pending) ? <Spinner className='size-4 border-white/40 border-t-white'/> : icon}
      {label}
    </button>
  );
}


function ListSkeleton() {
  return (
    <ul aria-hidden className='space-y-3'>
      {Array.from({length: 4}, (_, i) => (
        <li key={i} className='card p-5'>
          <Skeleton className='h-5 w-48'/>
          <Skeleton className='mt-2 h-3 w-24 bg-surface-2'/>
          <Skeleton className='mt-4 h-24 w-full bg-surface-2'/>
        </li>
      ))}
    </ul>
  );
}
