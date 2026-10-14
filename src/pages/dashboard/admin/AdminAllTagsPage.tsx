import { ChevronDown, ChevronUp, Tags } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';

import { SearchInput } from '@/components/ui/SearchInput';
import { Routes } from '@/config';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import type { AdminTagItem, AdminTagsSortBy } from '@/lib/api';
import { ADMIN_PAGE_SIZE, errorMessage, useAdminTagsQuery } from '@/lib/api/dashboardQueries';
import { cn, formatDate, formatDateTime } from '@/lib/utils';
import { NsfwBadge, VerificationBadge } from '@/pages/tags/tagDirectory';

import { DashboardHeader, EmptyState, ErrorPanel, Skeleton, Toggle } from '../ui';
import { Chip, DetailList, Pagination, selectAllScope, useSearchParamState, useStepBackFromEmptyPage, UserCell } from './adminUi';


const SORTS: Array<{value: AdminTagsSortBy, label: string}> = [
  {value: 'newest', label: 'Newest'},
  {value: 'oldest', label: 'Oldest'},
  {value: 'uses', label: 'Most used'},
  {value: 'last_used', label: 'Recently used'},
  {value: 'name', label: 'Name'},
];

// `id:<id>`, `user:<id>` or a bare id, the content toggle doesn't change those
const ID_SEARCH = /^((id|tag|user|owner):\s*)?\d+$/i;


export function AdminAllTagsPage() {
  const { searchParams, page, update, setPage } = useSearchParamState();
  const hideNsfw = searchParams.get('nsfw') === 'hide';
  const searchContent = searchParams.get('content') === '1';
  const sortBy = SORTS.find((sort) => sort.value === searchParams.get('sort'))?.value ?? 'newest';
  const query = searchParams.get('q') || '';
  const debouncedQuery = useDebouncedValue(query.trim(), 300);

  const { data, isPending, isError, error, isPlaceholderData, isFetching, isRefetching, refetch } = useAdminTagsQuery({
    query: debouncedQuery,
    searchContent,
    sortBy,
    nsfw: (hideNsfw) ? false : null,
    page,
  });
  const items = data?.items ?? [];
  const steppingBack = useStepBackFromEmptyPage({page, setPage, data, isPlaceholderData, pageSize: ADMIN_PAGE_SIZE});

  return (
    <>
      <DashboardHeader
        title='Tags'
        description={<>Every tag, personal, server and aliases. A bare id matches the tag, owner or server; <code className='text-code'>user:&lt;id&gt;</code> or <code className='text-code'>id:&lt;tag id&gt;</code> match only that.</>}
      />

      <div className='mb-4 space-y-3'>
        <SearchInput
          value={query}
          onValueChange={(value) => update({q: value})}
          placeholder={(searchContent) ? 'Search name, content or an id...' : 'Search name or an id...'}
          aria-label='Search tags'
        />
        <div className='flex flex-wrap items-center gap-3 sm:justify-end'>
          <label className='flex items-center gap-2 text-sm text-muted'>
            Sort
            <select className='input w-40' value={sortBy} onChange={(event) => update({sort: (event.target.value === 'newest') ? null : event.target.value})}>
              {SORTS.map((sort) => <option key={sort.value} value={sort.value}>{sort.label}</option>)}
            </select>
          </label>
          <div className='rounded-md border border-line bg-surface px-3 py-2'>
            <Toggle label='Search content' checked={searchContent} onChange={(value) => update({content: (value) ? '1' : null})}/>
          </div>
          <div className='rounded-md border border-line bg-surface px-3 py-2'>
            <Toggle label='Show NSFW' checked={!hideNsfw} onChange={(value) => update({nsfw: (value) ? null : 'hide'})}/>
          </div>
        </div>
      </div>

      {(isPending || steppingBack) ? (
        <ListSkeleton/>
      ) : (isError && !items.length) ? (
        <ErrorPanel title='Couldn’t load tags' message={errorMessage(error)} onRetry={() => refetch()} retrying={isRefetching}/>
      ) : (!items.length) ? (
        <EmptyState icon={<Tags className='size-10'/>} title='No tags found'>
          {(debouncedQuery && !searchContent && !ID_SEARCH.test(debouncedQuery)) ? (
            <>
              No tag names match that search.{' '}
              <button type='button' className='cursor-pointer text-brand hover:underline' onClick={() => update({content: '1'})}>Search content too</button>
            </>
          ) : (debouncedQuery || hideNsfw) ? 'Try a different search or filter.' : null}
        </EmptyState>
      ) : (
        <>
          <ul className={cn('space-y-3 transition-opacity', isPlaceholderData && 'opacity-60')}>
            {items.map((item) => <TagCard key={item.tag.id} item={item} onSearch={(value) => update({q: value})}/>)}
          </ul>
          <Pagination page={page} count={data?.count ?? 0} pageSize={ADMIN_PAGE_SIZE} onChange={setPage} fetching={isFetching && isPlaceholderData}/>
        </>
      )}
    </>
  );
}


const CONTENT_PREVIEW_LINES = 6;
const CONTENT_PREVIEW_CHARS = 400;

function TagCard({ item, onSearch }: {item: AdminTagItem, onSearch: (query: string) => void}) {
  const { tag, directory } = item;
  const [ expanded, setExpanded ] = useState(false);
  const ownerId = item.user?.id ?? tag.user_id ?? null;
  const reference = tag.reference_tag as {id: string, name: string, content?: string} | null | undefined;
  // aliases have no content of their own, they show their source's
  const content = (reference) ? (reference.content ?? '') : (tag.content ?? '');
  const long = CONTENT_PREVIEW_LINES < content.split('\n').length || CONTENT_PREVIEW_CHARS < content.length;
  const personal = !!ownerId && tag.server_id === ownerId;

  return (
    <li className='card p-4'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div className='min-w-0 flex-1'>
          <div className='flex flex-wrap items-center gap-2'>
            <h2 className='truncate font-mono text-base font-semibold text-code'>{tag.name}</h2>
            {(tag.nsfw) ? <NsfwBadge/> : null}
            {(tag.locked) ? <Chip tone='warning'>Locked</Chip> : null}
            {(tag.is_command) ? <Chip tone='brand'>Command</Chip> : null}
            {(reference) ? (
              <button type='button' className='cursor-pointer hover:opacity-80' title='Show the source tag' onClick={() => onSearch(`id:${reference.id}`)}>
                <Chip>Alias of {reference.name}</Chip>
              </button>
            ) : null}
            {(directory) ? (
              <Link
                to={`${Routes.DASHBOARD_ADMIN_TAGS}?${new URLSearchParams({q: `id:${tag.id}`, status: 'all'}).toString()}`}
                className='inline-flex items-center gap-1.5 hover:opacity-80'
                title={`Listed in the directory${(directory.title) ? ` as “${directory.title}”` : ''}`}
              >
                <Chip tone='success'>Directory</Chip>
                <VerificationBadge verified={directory.verified} hideUnverified/>
              </Link>
            ) : null}
          </div>
        </div>
        {(ownerId) ? (
          <button type='button' className='btn btn-ghost btn-sm' onClick={() => onSearch(`user:${ownerId}`)}>
            All tags by this user
          </button>
        ) : null}
      </div>

      <div className='mt-3 grid gap-3 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]'>
        <UserCell user={item.user} fallbackId={ownerId}/>
        <DetailList
          items={[
            ['Tag id', <span className='font-mono'>{tag.id}</span>],
            ['Server', (personal) ? 'Personal' : (tag.server_id) ? <span className='font-mono'>{tag.server_id}</span> : '—'],
            ['Uses', (tag.uses ?? 0).toLocaleString()],
            ['Created', <span title={formatDateTime(tag.created)}>{formatDate(tag.created)}</span>],
            (tag.edited) ? ['Edited', formatDate(tag.edited)] : null,
            (tag.last_used) ? ['Last used', <span title={formatDateTime(tag.last_used)}>{formatDate(tag.last_used)}</span>] : null,
          ]}
        />
      </div>

      <div className='mt-3'>
        <div className='mb-1.5 flex items-center justify-between gap-2'>
          <h3 className='section-label'>
            {(reference) ? 'Source content' : 'Content'}{' '}
            <span className='normal-case tracking-normal text-subtle'>({content.length.toLocaleString()} chars)</span>
          </h3>
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
            long && !expanded && 'max-h-36 overflow-y-hidden',
            'focus:border-line-strong focus:outline-none',
          )}
          {...selectAllScope}
        >
          {content || <span className='text-subtle italic'>(empty)</span>}
        </pre>
      </div>
    </li>
  );
}


function ListSkeleton() {
  return (
    <ul aria-hidden className='space-y-3'>
      {Array.from({length: 5}, (_, i) => (
        <li key={i} className='card p-4'>
          <Skeleton className='h-5 w-40'/>
          <Skeleton className='mt-3 h-8 w-56 bg-surface-2'/>
          <Skeleton className='mt-3 h-16 w-full bg-surface-2'/>
        </li>
      ))}
    </ul>
  );
}
