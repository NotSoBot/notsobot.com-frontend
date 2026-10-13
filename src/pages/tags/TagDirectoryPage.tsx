import { Search } from 'lucide-react';
import { useCallback, useMemo } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router';

import { SearchInput } from '@/components/ui/SearchInput';
import { Segmented } from '@/components/ui/Segmented';
import { Spinner } from '@/components/ui/Spinner';
import { Routes } from '@/config';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import {
  TagDirectorySortByFilters,
  TagDirectoryVerificationStates,
  type TagDirectoryItem,
  type TagDirectorySortBy,
} from '@/lib/api';
import { useTagDirectoryQuery } from '@/lib/api/queries';
import { userAvatarUrl } from '@/lib/discord';
import { cn, formatDate } from '@/lib/utils';

import { TagDetailModal } from './TagDetailModal';
import { AddTagButton, NsfwBadge, tagDirectoryItemPath, VerificationBadge } from './tagDirectory';


// URL value -> API value; defaults are left out of the URL
const SORT_OPTIONS: Array<{param: string, label: string, value: TagDirectorySortBy}> = [
  {param: 'uses', label: 'Most used', value: TagDirectorySortByFilters.USES},
  {param: 'verified', label: 'Verified first', value: TagDirectorySortByFilters.VERIFIED},
  {param: 'newest', label: 'Newest', value: TagDirectorySortByFilters.NEWEST},
  {param: 'oldest', label: 'Oldest', value: TagDirectorySortByFilters.OLDEST},
  {param: 'name', label: 'Name (A–Z)', value: TagDirectorySortByFilters.NAME},
];

const STATUS_OPTIONS: Array<{param: string, label: string, value: number | null}> = [
  {param: 'all', label: 'All', value: null},
  {param: 'verified', label: 'Verified', value: TagDirectoryVerificationStates.VERIFIED},
  {param: 'pending', label: 'Pending', value: TagDirectoryVerificationStates.PENDING_VERIFICATION},
  {param: 'unverified', label: 'Unverified', value: TagDirectoryVerificationStates.NOT_VERIFIED},
];

const DEFAULT_SORT = 'uses';
const DEFAULT_STATUS = 'verified';

const FILTER_PARAMS = ['q', 'sort', 'status', 'nsfw'];

function findOption<T extends {param: string}>(options: Array<T>, param: string | null, defaultParam: string): T {
  return options.find((option) => option.param === param) ?? options.find((option) => option.param === defaultParam)!;
}


export function TagDirectoryPage() {
  const [ searchParams, setSearchParams ] = useSearchParams();
  const query = searchParams.get('q') || '';
  // the API does the searching, so don't hit it on every keystroke
  const debouncedQuery = useDebouncedValue(query.trim(), 300);
  const sort = findOption(SORT_OPTIONS, searchParams.get('sort'), DEFAULT_SORT);
  const status = findOption(STATUS_OPTIONS, searchParams.get('status'), DEFAULT_STATUS);
  // NSFW tags are hidden unless asked for
  const showNsfw = searchParams.get('nsfw') === 'show';
  const isFiltered = !!debouncedQuery || status.param !== DEFAULT_STATUS || showNsfw;

  const { data, isPending, isError, isPlaceholderData, fetchNextPage, hasNextPage, isFetchingNextPage, refetch } = useTagDirectoryQuery({
    query: debouncedQuery,
    sortBy: sort.value,
    verified: status.value,
    nsfw: (showNsfw) ? null : false,
  });

  const items = useMemo(() => data?.pages.flatMap((page) => page.items) ?? [], [data]);
  const count = data?.pages[0]?.count ?? 0;

  // `/directory/tags/:tagId` is a child route, so this page stays mounted (search, loaded pages,
  // scroll position) and the tag opens as a modal on top of it.
  const { tagId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const openedHere = (location.state as {fromDirectory?: boolean} | null)?.fromDirectory === true;

  const openTag = useCallback((id: string) => {
    navigate({pathname: tagDirectoryItemPath(id), search: location.search}, {
      preventScrollReset: true,
      // stepping between tags replaces, so Back still closes the modal in one go
      replace: !!tagId,
      state: {fromDirectory: openedHere || !tagId},
    });
  }, [navigate, location.search, tagId, openedHere]);

  const closeTag = useCallback(() => {
    if (openedHere) {
      navigate(-1);
    } else {
      // arrived on a shared /directory/tags/:id link; there's no directory entry to go back to
      navigate({pathname: Routes.TAG_DIRECTORY, search: location.search}, {replace: true, preventScrollReset: true});
    }
  }, [navigate, openedHere, location.search]);

  const tagIndex = (tagId) ? items.findIndex((item) => item.id === tagId) : -1;

  const updateParams = (updates: Record<string, string | null>) => {
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          next.set(key, value);
        } else {
          next.delete(key);
        }
      }
      return next;
    }, {replace: true, preventScrollReset: true});
  };

  // defaults stay out of the URL so the plain directory link is the default view
  const setOption = (key: string, defaultParam: string, param: string) => {
    updateParams({[key]: (param === defaultParam) ? null : param});
  };

  const clearFilters = () => {
    updateParams(Object.fromEntries(FILTER_PARAMS.map((key) => [key, null])));
  };

  return (
    <div className='container-page py-8'>
      <header className='mb-8'>
        <h1 className='mb-2 text-4xl font-bold text-white'>Tag Directory</h1>
        <p className='text-muted'>
          Browse and add custom tags to your server.
          {(data && !isFiltered) ? ` ${count.toLocaleString()} tags available.` : null}
        </p>
      </header>

      <div className='mb-8'>
        <SearchInput
          size='lg'
          value={query}
          onValueChange={(value) => updateParams({q: value})}
          placeholder='Search by name, description, tag id or user id...'
          aria-label='Search tags'
        />

        <div className='mt-4 flex flex-wrap items-center gap-2'>
          <Segmented
            label='Verification'
            value={status.param}
            options={STATUS_OPTIONS.map(({ param, label }) => ({value: param, label}))}
            onChange={(value) => setOption('status', DEFAULT_STATUS, value)}
          />
          <label className='flex cursor-pointer items-center gap-1.5 text-xs text-subtle hover:text-muted sm:ml-auto'>
            <input
              type='checkbox'
              className='size-3.5 cursor-pointer accent-brand'
              checked={showNsfw}
              onChange={(event) => updateParams({nsfw: (event.target.checked) ? 'show' : null})}
            />
            Show NSFW
          </label>
          <label className='flex items-center gap-2 text-sm text-muted'>
            Sort by
            <select
              className='input w-auto'
              value={sort.param}
              onChange={(event) => setOption('sort', DEFAULT_SORT, event.target.value)}
            >
              {SORT_OPTIONS.map((option) => <option key={option.param} value={option.param}>{option.label}</option>)}
            </select>
          </label>
        </div>

        {(isFiltered && data) ? (
          <div className='mt-3 flex items-center gap-3 text-sm text-muted'>
            <span>Found {count.toLocaleString()} tag{(count === 1) ? '' : 's'}</span>
            <button type='button' className='cursor-pointer text-brand hover:underline' onClick={clearFilters}>
              Clear filters
            </button>
          </div>
        ) : null}
      </div>

      {(isPending) ? (
        <TagGridSkeleton/>
      ) : (isError && !items.length) ? (
        <div className='card flex flex-col items-center gap-3 p-12 text-center'>
          <p className='text-muted'>Couldn't load the tag directory right now.</p>
          <button type='button' className='btn btn-secondary' onClick={() => refetch()}>Retry</button>
        </div>
      ) : (!items.length) ? (
        <div className='card p-12 text-center'>
          <Search className='mx-auto mb-4 size-16 text-subtle'/>
          <h2 className='mb-2 text-xl text-white'>No tags found</h2>
          <p className='text-muted'>Try adjusting your search or filters</p>
        </div>
      ) : (
        <>
          <ul className={cn('grid gap-4 transition-opacity md:grid-cols-2 lg:grid-cols-3', isPlaceholderData && 'opacity-60')}>
            {items.map((item) => <TagCard key={item.id} item={item} search={location.search}/>)}
          </ul>

          {(hasNextPage) ? (
            <div className='mt-8 flex justify-center'>
              <button type='button' className='btn btn-secondary' disabled={isFetchingNextPage} onClick={() => fetchNextPage()}>
                {isFetchingNextPage ? <Spinner className='size-4'/> : null}
                {isFetchingNextPage ? 'Loading…' : 'Load more'}
              </button>
            </div>
          ) : null}
        </>
      )}

      {(tagId) ? (
        <TagDetailModal
          tagId={tagId}
          initialItem={(tagIndex !== -1) ? items[tagIndex] : undefined}
          previousId={(0 < tagIndex) ? items[tagIndex - 1].id : null}
          nextId={(tagIndex !== -1 && tagIndex + 1 < items.length) ? items[tagIndex + 1].id : null}
          onNavigate={openTag}
          onClose={closeTag}
        />
      ) : null}
    </div>
  );
}


function TagCard({ item, search }: {item: TagDirectoryItem, search: string}) {
  const { tag } = item;
  return (
    <li className='group relative flex flex-col rounded-lg border border-line bg-surface p-4 transition-colors hover:border-brand'>
      <div className='mb-3 flex items-start justify-between gap-3'>
        <div className='min-w-0 flex-1'>
          <div className='mb-1 flex items-center gap-2'>
            <h2 className='truncate text-lg font-medium text-white transition-colors group-hover:text-brand'>
              {/* stretched link: the whole card is clickable without nesting the Add button inside a link */}
              <Link
                to={{pathname: tagDirectoryItemPath(item.id), search}}
                state={{fromDirectory: true}}
                preventScrollReset
                className='after:absolute after:inset-0 after:rounded-lg'
              >
                {tag.name}
              </Link>
            </h2>
            {(tag.nsfw) ? <NsfwBadge/> : null}
          </div>
          {(item.title) ? <p className='mb-2 text-sm text-muted'>{item.title}</p> : null}
        </div>
        <VerificationBadge verified={item.verified} hideUnverified/>
      </div>

      {(item.description) ? <p className='mb-3 line-clamp-2 text-sm text-muted'>{item.description}</p> : null}

      <div className='mt-auto mb-3 flex items-center justify-between text-xs text-subtle'>
        <div className='flex items-center gap-3'>
          <span>{tag.uses.toLocaleString()} uses</span>
          <span>{item.server_count.toLocaleString()} servers</span>
        </div>
        <span>{formatDate(item.created)}</span>
      </div>

      <div className='flex items-center justify-between border-t border-line pt-3'>
        <div className='flex min-w-0 items-center gap-2'>
          <img src={userAvatarUrl(tag.user, 32)} alt='' loading='lazy' className='size-6 rounded-full bg-surface-3'/>
          <span className='truncate text-sm text-muted'>{tag.user.username}</span>
        </div>
        <AddTagButton tag={tag}/>
      </div>
    </li>
  );
}


function TagGridSkeleton() {
  return (
    <ul className='grid gap-4 md:grid-cols-2 lg:grid-cols-3' aria-hidden>
      {Array.from({length: 9}, (_, i) => (
        <li key={i} className='card h-44 animate-pulse p-4'>
          <div className='h-5 w-32 rounded bg-surface-3'/>
          <div className='mt-3 h-3 w-48 rounded bg-surface-2'/>
        </li>
      ))}
    </ul>
  );
}
