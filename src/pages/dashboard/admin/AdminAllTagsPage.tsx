import { BookMarked, ChevronDown, ChevronUp, Search, ShieldCheck, Tags } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';

import { SearchInput } from '@/components/ui/SearchInput';
import { Routes } from '@/config';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import type { AdminTagItem, AdminTagsSortBy } from '@/lib/api';
import { ADMIN_PAGE_SIZE, errorMessage, useAdminTagsQuery } from '@/lib/api/dashboardQueries';
import { cn } from '@/lib/utils';
import { tagLocation, type TagLocation, type TagLocationKind } from '@/pages/dashboard/tags/tagMeta';
import { NsfwBadge, VerificationBadge } from '@/pages/tags/tagDirectory';

import { DashboardHeader, EmptyState, ErrorPanel, Skeleton, Toggle } from '../ui';
import { Chip, CopyableValue, ExactDate, Pagination, selectAllScope, useSearchParamState, useStepBackFromEmptyPage, UserCell } from './adminUi';
import { TagStoragePanel } from './TagStoragePanel';


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
  const pagination = {
    page,
    count: data?.count ?? 0,
    pageSize: ADMIN_PAGE_SIZE,
    onChange: setPage,
    fetching: isFetching && isPlaceholderData,
  };

  return (
    <>
      <DashboardHeader
        title='Tags'
        description={<>Every tag, personal, server and aliases. A bare id matches the tag, owner or server; <code className='text-code'>user:&lt;id&gt;</code> or <code className='text-code'>id:&lt;tag id&gt;</code> match only that.</>}
      >
        <Link to={Routes.DASHBOARD_ADMIN_TAGS} className='btn btn-secondary'>
          <ShieldCheck aria-hidden className='size-4'/>
          Directory
        </Link>
      </DashboardHeader>

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
          <Pagination {...pagination} className='mt-0 mb-4'/>
          <ul className={cn('space-y-3 transition-opacity', isPlaceholderData && 'opacity-60')}>
            {items.map((item) => <TagCard key={item.tag.id} item={item} onSearch={(value) => update({q: value})}/>)}
          </ul>
          <Pagination {...pagination}/>
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
  const location = tagLocation({server_id: tag.server_id, guild_id: tag.guild_id ?? null}, (ownerId) ? {id: ownerId, channel_id: item.user?.channel_id ?? null} : null);
  const directoryLink = (directory) ? (
    <Link
      to={`${Routes.DASHBOARD_ADMIN_TAGS}?${new URLSearchParams({q: `id:${tag.id}`, status: 'all'}).toString()}`}
      className='inline-flex items-center gap-1.5 hover:opacity-80'
      title={`Listed in the directory${(directory.title) ? ` as “${directory.title}”` : ''}`}
    >
      {(location.kind === 'personal') ? null : <Chip tone='success'>Listed</Chip>}
      <VerificationBadge verified={directory.verified} hideUnverified/>
    </Link>
  ) : null;

  return (
    <li className='card overflow-hidden'>
      <div className='flex flex-col items-start gap-2 px-4 pt-4 pb-3 sm:flex-row sm:justify-between sm:gap-4'>
        <div className='w-full min-w-0 sm:flex-1'>
          <div className='flex flex-wrap items-center gap-2'>
            <h2 className='min-w-0 truncate font-mono text-base font-semibold text-code'>{tag.name}</h2>
            {(tag.nsfw) ? <NsfwBadge/> : null}
            {(tag.locked) ? <Chip tone='warning'>Locked</Chip> : null}
            {(tag.is_command) ? <Chip tone='brand'>Command</Chip> : null}
            {(reference) ? (
              <button type='button' className='cursor-pointer hover:opacity-80' title='Show the source tag' onClick={() => onSearch(`id:${reference.id}`)}>
                <Chip>Alias of {reference.name}</Chip>
              </button>
            ) : null}
            {(location.kind === 'personal') ? null : directoryLink}
          </div>
          <div className='mt-1 flex items-center gap-1.5 text-xs whitespace-nowrap text-subtle'>
            Tag id
            <CopyableValue value={tag.id} truncate={0}/>
          </div>
        </div>
        <LocationChip location={location} extra={(location.kind === 'personal') ? directoryLink : null}/>
      </div>

      <div className='flex flex-wrap items-center gap-x-6 gap-y-3 border-y border-line bg-surface-2 px-4 py-2.5'>
        <div className='flex min-w-0 items-center gap-1'>
          <UserCell user={item.user} fallbackId={ownerId} size='sm'/>
          {(ownerId) ? (
            <button type='button' className='btn btn-ghost btn-sm shrink-0' title='Show every tag by this user' onClick={() => onSearch(`user:${ownerId}`)}>
              <Search className='size-3.5'/>
              All their tags
            </button>
          ) : null}
        </div>
        <dl className='flex flex-wrap gap-x-5 gap-y-1 text-sm sm:ml-auto'>
          <Stat label='Uses'>{(tag.uses ?? 0).toLocaleString()}</Stat>
          <Stat label='Created'><ExactDate value={tag.created}/></Stat>
          {(tag.edited) ? <Stat label='Edited'><ExactDate value={tag.edited}/></Stat> : null}
          {(tag.last_used) ? <Stat label='Last used'><ExactDate value={tag.last_used}/></Stat> : null}
        </dl>
      </div>

      <div className='px-4 pt-3 pb-4'>
        <div className='mb-1.5 flex min-h-8 items-center justify-between gap-2'>
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
        <TagStoragePanel tagId={tag.id} className='mt-3'/>
      </div>
    </li>
  );
}


// staff wording for where a tag lives; directory tags live under their owner's id, so that id isn't shown
const LOCATION_LABELS: Record<TagLocationKind, string> = {
  server: 'Guild',
  dm: 'DM',
  group_dm: 'Group DM',
  personal: 'Directory',
  global: 'Global',
};

function LocationChip({ location, extra }: {location: TagLocation, extra?: ReactNode}) {
  const Icon = (location.kind === 'personal') ? BookMarked : location.icon;
  const id = (location.kind === 'personal') ? null : location.id;
  return (
    <span className='inline-flex max-w-full items-center gap-1.5 rounded-md border border-line-strong bg-surface-2 px-2 py-1 text-xs'>
      <Icon aria-hidden className='size-3.5 shrink-0 text-muted'/>
      <span className='shrink-0 font-medium text-fg'>{LOCATION_LABELS[location.kind]}</span>
      {(id) ? <CopyableValue value={id} truncate={0} className='text-subtle'/> : null}
      {extra}
    </span>
  );
}


function Stat({ label, children }: {label: string, children: ReactNode}) {
  return (
    <div className='flex items-baseline gap-1.5'>
      <dt className='text-xs text-subtle'>{label}</dt>
      <dd className='text-fg tabular-nums'>{children}</dd>
    </div>
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
