import { Search, TriangleAlert } from 'lucide-react';
import { useCallback, useId, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router';

import { Modal } from '@/components/ui/Modal';
import { SearchInput } from '@/components/ui/SearchInput';
import { Spinner } from '@/components/ui/Spinner';
import { Routes } from '@/config';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import {
  TagDirectoryCategories,
  TagDirectorySortByFilters,
  TagDirectoryVerificationStates,
  type TagDirectoryItem,
  type TagDirectorySortBy,
} from '@/lib/api';
import { useTagDirectoryQuery } from '@/lib/api/queries';
import { userAvatarUrl } from '@/lib/discord';
import { cn, formatDate } from '@/lib/utils';

import { TagDetailModal } from './TagDetailModal';
import { AddTagButton, CategoryBadge, NsfwBadge, TAG_DIRECTORY_CATEGORY_OPTIONS, tagDirectoryItemPath, VerificationBadge } from './tagDirectory';


// URL value -> API value; defaults are left out of the URL
const SORT_OPTIONS: Array<{param: string, label: string, value: TagDirectorySortBy}> = [
  {param: 'uses', label: 'Most used', value: TagDirectorySortByFilters.USES},
  {param: 'servers', label: 'Most servers', value: TagDirectorySortByFilters.SERVERS},
  {param: 'verified', label: 'Verified first', value: TagDirectorySortByFilters.VERIFIED},
  {param: 'newest', label: 'Newest', value: TagDirectorySortByFilters.NEWEST},
  {param: 'oldest', label: 'Oldest', value: TagDirectorySortByFilters.OLDEST},
  {param: 'name', label: 'Name (A–Z)', value: TagDirectorySortByFilters.NAME},
];

// verified comes first; the rest are deliberately tucked away so people have to go looking for them
const STATUS_OPTIONS: Array<{param: string, label: string, value: number | null}> = [
  {param: 'verified', label: 'Verified tags', value: TagDirectoryVerificationStates.VERIFIED},
  {param: 'all', label: 'All tags', value: null},
  {param: 'pending', label: 'Pending tags', value: TagDirectoryVerificationStates.PENDING_VERIFICATION},
  {param: 'unverified', label: 'Unverified tags', value: TagDirectoryVerificationStates.NOT_VERIFIED},
];

const DEFAULT_SORT = 'uses';
const DEFAULT_STATUS = 'verified';

const FILTER_PARAMS = ['q', 'category', 'sort', 'status', 'nsfw'];

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
  // no `category` param (or an unknown one) is every category
  const category = TAG_DIRECTORY_CATEGORY_OPTIONS.find((option) => option.param === searchParams.get('category')) ?? null;
  // NSFW tags are hidden unless asked for
  const showNsfw = searchParams.get('nsfw') === 'show';
  const [ nsfwNoticeOpen, setNsfwNoticeOpen ] = useState(false);
  const isFiltered = !!debouncedQuery || !!category || status.param !== DEFAULT_STATUS || showNsfw;

  const { data, isPending, isError, isPlaceholderData, fetchNextPage, hasNextPage, isFetchingNextPage, refetch } = useTagDirectoryQuery({
    query: debouncedQuery,
    category: category?.value ?? null,
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
          placeholder='Search by title, name, description or user id...'
          aria-label='Search tags'
        />

        <CategoryFilter value={category?.param ?? null} onChange={(param) => updateParams({category: param})}/>

        <div className='mt-4 flex flex-wrap items-center gap-x-4 gap-y-2'>
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
          {/* kept low-key on purpose, unreviewed tags shouldn't be one click away */}
          <label className='flex items-center gap-1 text-xs text-subtle sm:ml-auto'>
            Showing
            <select
              className='input w-auto py-1 pl-2 pr-8 text-xs text-muted'
              value={status.param}
              onChange={(event) => setOption('status', DEFAULT_STATUS, event.target.value)}
            >
              {STATUS_OPTIONS.map((option) => <option key={option.param} value={option.param}>{option.label}</option>)}
            </select>
          </label>
          <label className='flex cursor-pointer items-center gap-1.5 text-xs text-subtle hover:text-muted'>
            <input
              type='checkbox'
              className='size-3.5 cursor-pointer accent-brand'
              checked={showNsfw}
              onChange={(event) => {
                updateParams({nsfw: (event.target.checked) ? 'show' : null});
                if (event.target.checked) {
                  setNsfwNoticeOpen(true);
                }
              }}
            />
            Show NSFW
          </label>
        </div>

        {(status.value !== TagDirectoryVerificationStates.VERIFIED) ? (
          <p role='alert' className='mt-4 flex gap-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-fg'>
            <TriangleAlert aria-hidden className='mt-0.5 size-4 shrink-0 text-warning'/>
            <span>
              These tags haven’t been verified by NotSoBot staff. They might be harmful or spam, so adding or running
              them is at your own discretion.
            </span>
          </p>
        ) : null}

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
          <ul className={cn('grid gap-4 transition-opacity md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4', isPlaceholderData && 'opacity-60')}>
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

      {(nsfwNoticeOpen) ? <NsfwNoticeDialog onClose={() => setNsfwNoticeOpen(false)}/> : null}
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
        <div className='flex shrink-0 flex-col items-end gap-1.5'>
          <VerificationBadge verified={item.verified} hideUnverified/>
          {(item.category !== TagDirectoryCategories.OTHER) ? <CategoryBadge category={item.category}/> : null}
        </div>
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
        <AddTagButton tag={tag} verified={item.verified}/>
      </div>
    </li>
  );
}


// "All" plus one pill per category; scrolls sideways on small screens instead of wrapping into a tall block
function CategoryFilter({ value, onChange }: {value: string | null, onChange: (param: string | null) => void}) {
  const options = [{param: null, label: 'All'}, ...TAG_DIRECTORY_CATEGORY_OPTIONS];
  return (
    <div role='group' aria-label='Category' className='-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0'>
      {options.map((option) => {
        const selected = option.param === value;
        return (
          <button
            key={option.param ?? 'all'}
            type='button'
            aria-pressed={selected}
            onClick={() => onChange(option.param)}
            className={cn(
              'shrink-0 cursor-pointer rounded-full border px-3 py-1 text-sm transition-colors',
              (selected) ? 'border-brand bg-brand text-white' : 'border-line bg-surface text-muted hover:border-brand hover:text-white',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}


// Discord doesn't allow NSFW tags anymore, so showing them is only for browsing until that changes
function NsfwNoticeDialog({ onClose }: {onClose: () => void}) {
  const titleId = useId();
  return (
    <Modal labelledBy={titleId} onClose={onClose} className='max-w-md'>
      <div className='p-5 sm:p-6'>
        <h2 id={titleId} className='pr-10 text-lg font-semibold text-white'>NSFW tags aren’t allowed on Discord</h2>
        <p className='mt-2 text-sm text-muted'>
          Discord no longer allows NSFW tags, so you can’t add or run them right now. You can still browse them here,
          but this is more of a feature for the future.
        </p>
        <div className='mt-6 flex justify-end'>
          <button type='button' className='btn btn-primary' onClick={onClose}>Got it</button>
        </div>
      </div>
    </Modal>
  );
}


function TagGridSkeleton() {
  return (
    <ul className='grid gap-4 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4' aria-hidden>
      {Array.from({length: 9}, (_, i) => (
        <li key={i} className='card h-44 animate-pulse p-4'>
          <div className='h-5 w-32 rounded bg-surface-3'/>
          <div className='mt-3 h-3 w-48 rounded bg-surface-2'/>
        </li>
      ))}
    </ul>
  );
}
