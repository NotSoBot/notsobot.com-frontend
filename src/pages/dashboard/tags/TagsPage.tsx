import { ChevronRight, Tags as TagsIcon } from 'lucide-react';
import { useLayoutEffect, useMemo, useRef } from 'react';
import { Link, useSearchParams } from 'react-router';

import { SearchInput } from '@/components/ui/SearchInput';
import { Spinner } from '@/components/ui/Spinner';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useAuth } from '@/auth';
import { errorMessage, useMeGuildsQuery, useMeTagsQuery } from '@/lib/api/dashboardQueries';
import type { Tag, UserMe } from '@/lib/api';
import { cn, formatDate } from '@/lib/utils';

import { DashboardHeader, EmptyState, ErrorPanel, Skeleton } from '../ui';
import { readTagListState, writeTagListState } from './tagListState';
import { dashboardTagPath, TagBadges, tagLocation, TagLocationLabel } from './tagMeta';


export function TagsPage() {
  const [ searchParams, setSearchParams ] = useSearchParams();
  const query = searchParams.get('q') || '';
  const debouncedQuery = useDebouncedValue(query.trim(), 300);

  const { data, isPending, isError, error, isPlaceholderData, fetchNextPage, hasNextPage, isFetchingNextPage, isRefetching, refetch } = useMeTagsQuery(debouncedQuery);
  const items = useMemo(() => data?.pages.flatMap((page) => page.items) ?? [], [data]);
  const count = data?.pages[0]?.count ?? 0;

  // server names for the picker, when the dashboard can see the caller's servers (it's fine if it can't)
  const { user } = useAuth();
  const { data: guilds } = useMeGuildsQuery();
  const guildNames = useMemo(() => new Map((guilds ?? []).map((guild) => [guild.id, guild.name])), [guilds]);

  // ---- leave off where you were ----
  // arriving without a search (sidebar, "All tags", after a delete): bring back the last one
  useLayoutEffect(() => {
    const saved = readTagListState();
    if (!searchParams.has('q') && saved?.search) {
      setSearchParams({q: saved.search}, {replace: true, preventScrollReset: true});
    }
    // only on arrival
  }, []);

  // remember the search on the way out (the scroll position is remembered by the router, see SiteLayout)
  const queryRef = useRef(query);
  queryRef.current = query;
  useLayoutEffect(() => {
    return () => writeTagListState({search: queryRef.current});
  }, []);

  const setQuery = (value: string) => {
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      if (value) {
        next.set('q', value);
      } else {
        next.delete('q');
      }
      return next;
    }, {replace: true, preventScrollReset: true});
  };

  return (
    <>
      <DashboardHeader
        title='Your tags'
        description={
          (data) ? (
            (debouncedQuery)
              ? `${count.toLocaleString()} ${count === 1 ? 'tag matches' : 'tags match'} “${debouncedQuery}”.`
              : `You own ${count.toLocaleString()} ${count === 1 ? 'tag' : 'tags'}. Create new ones from Discord with the tag create command.`
          ) : 'Tags you own across every server.'
        }
      />

      <SearchInput
        className='mb-4'
        value={query}
        onValueChange={setQuery}
        placeholder='Search by name or content...'
        aria-label='Search your tags'
      />

      {(isPending) ? (
        <TagListSkeleton/>
      ) : (isError && !items.length) ? (
        <ErrorPanel title='Couldn’t load your tags' message={errorMessage(error)} onRetry={() => refetch()} retrying={isRefetching}/>
      ) : (!items.length) ? (
        <EmptyState icon={<TagsIcon className='size-10'/>} title={(debouncedQuery) ? 'No tags match that' : 'You don’t have any tags yet'}>
          {(debouncedQuery) ? 'Try a different search.' : 'Make one in Discord with the tag create command and it shows up here.'}
        </EmptyState>
      ) : (
        <>
          <ul className={cn('card divide-y divide-line overflow-hidden transition-opacity', isPlaceholderData && 'opacity-60')}>
            {items.map((tag) => <TagRow key={tag.id} tag={tag} user={user} guildNames={guildNames}/>)}
          </ul>
          <div className='mt-4 flex flex-col items-center gap-2'>
            <p className='text-sm text-subtle tabular-nums'>Showing {items.length.toLocaleString()} of {count.toLocaleString()}</p>
            {(hasNextPage) ? (
              <button type='button' className='btn btn-secondary' disabled={isFetchingNextPage} onClick={() => fetchNextPage()}>
                {(isFetchingNextPage) ? <Spinner className='size-4'/> : null}
                {(isFetchingNextPage) ? 'Loading…' : 'Load more'}
              </button>
            ) : null}
          </div>
        </>
      )}
    </>
  );
}


function TagRow({ tag, user, guildNames }: {tag: Tag, user: UserMe | null, guildNames: Map<string, string>}) {
  return (
    <li>
      <Link
        to={dashboardTagPath(tag.id)}
        className='group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:outline-offset-[-2px]'
      >
        <div className='min-w-0 flex-1'>
          <div className='flex flex-wrap items-center gap-2'>
            <span className='truncate font-medium text-white group-hover:text-brand'>{tag.name}</span>
            <TagBadges tag={tag}/>
          </div>
          <p className='mt-0.5 truncate font-mono text-xs text-subtle'>{tag.content.split('\n')[0] || (tag.reference_tag ? `Alias of ${tag.reference_tag.name}` : '(empty)')}</p>
          <TagLocationLabel location={tagLocation(tag, user, guildNames)} className='mt-1 flex min-w-0 items-center gap-1.5 text-xs text-muted'/>
        </div>
        <div className='hidden shrink-0 text-right text-xs text-subtle sm:block'>
          <div className='tabular-nums'>{tag.uses.toLocaleString()} uses</div>
          <div>{(tag.edited) ? `Edited ${formatDate(tag.edited)}` : `Created ${formatDate(tag.created)}`}</div>
        </div>
        <ChevronRight aria-hidden className='size-4 shrink-0 text-subtle'/>
      </Link>
    </li>
  );
}


function TagListSkeleton() {
  return (
    <ul aria-hidden className='card divide-y divide-line'>
      {Array.from({length: 8}, (_, i) => (
        <li key={i} className='flex items-center gap-3 px-4 py-3.5'>
          <div className='flex-1'>
            <Skeleton className='h-4 w-32'/>
            <Skeleton className='mt-2 h-3 w-2/3 bg-surface-2'/>
          </div>
          <Skeleton className='hidden h-8 w-20 bg-surface-2 sm:block'/>
        </li>
      ))}
    </ul>
  );
}
