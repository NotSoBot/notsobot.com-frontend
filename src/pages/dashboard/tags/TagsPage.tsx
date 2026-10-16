import { BookOpen, Tags as TagsIcon } from 'lucide-react';
import { useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import { Link, useLocation, useMatch, useNavigate, useSearchParams } from 'react-router';

import { SearchInput } from '@/components/ui/SearchInput';
import { Routes } from '@/config';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useAuth } from '@/auth';
import { errorMessage, ME_TAGS_PAGE_SIZE, useMeGuildsQuery, useMeTagsQuery } from '@/lib/api/dashboardQueries';
import { TagDirectoryVerificationStates, type MeTagsDirectoryFilter, type MeTagsSortBy, type Tag, type UserMe } from '@/lib/api';
import { cn, formatDate } from '@/lib/utils';
import { NsfwBadge, tagDirectoryItemPath } from '@/pages/tags/tagDirectory';

import { Pagination, useStepBackFromEmptyPage } from '../admin/adminUi';
import { DashboardHeader, EmptyState, ErrorPanel, Skeleton } from '../ui';
import { ServerFilterChip } from '../servers/ServerFilterChip';
import { TagDetailsModal } from './TagDetailsModal';
import { TagEditorModal } from './TagEditorModal';
import { readTagListState, writeTagListState } from './tagListState';
import { dashboardTagEditPath, dashboardTagPath, tagLocation, TagLocationChip, tagServerPath, TagStatusBadges } from './tagMeta';


const SORTS: Array<{value: MeTagsSortBy, label: string}> = [
  {value: 'newest', label: 'Newest'},
  {value: 'oldest', label: 'Oldest'},
  {value: 'uses', label: 'Most used'},
  {value: 'last_used', label: 'Recently used'},
  {value: 'name', label: 'Name'},
];

const findSort = (value: string | null | undefined) => SORTS.find((sort) => sort.value === value)?.value;

// the `directory` param, `all` is left out of the url. `description` finishes "N tags ..." in the header
const DIRECTORY_FILTERS: Array<{value: string, label: string, filter: MeTagsDirectoryFilter, description: string}> = [
  {value: 'all', label: 'All tags', filter: null, description: ''},
  {value: 'listed', label: 'Listed', filter: {listed: true, verified: null}, description: 'listed on the tag directory'},
  {value: 'verified', label: 'Verified', filter: {listed: true, verified: TagDirectoryVerificationStates.VERIFIED}, description: 'verified on the tag directory'},
  {value: 'pending', label: 'Pending verification', filter: {listed: true, verified: TagDirectoryVerificationStates.PENDING_VERIFICATION}, description: 'pending verification'},
  {value: 'unverified', label: 'Unverified', filter: {listed: true, verified: TagDirectoryVerificationStates.NOT_VERIFIED}, description: 'listed but not verified'},
  {value: 'unlisted', label: 'Not listed', filter: {listed: false}, description: 'not listed on the tag directory'},
];

const findDirectoryFilter = (value: string | null | undefined) => DIRECTORY_FILTERS.find((filter) => filter.value === value);


export function TagsPage() {
  const [ searchParams, setSearchParams ] = useSearchParams();
  const query = searchParams.get('q') || '';
  const debouncedQuery = useDebouncedValue(query.trim(), 300);
  const sortBy = findSort(searchParams.get('sort')) ?? 'newest';
  const directoryFilter = findDirectoryFilter(searchParams.get('directory')) ?? DIRECTORY_FILTERS[0];
  // `?server=<id>`: only the tags in that server (the server modal's "Your tags")
  const serverId = searchParams.get('server') || null;
  const filtered = !!debouncedQuery || directoryFilter.filter !== null || !!serverId;

  // `?page=` is 1-based, left out for the first
  const page = Math.max(0, (Number(searchParams.get('page')) || 1) - 1);

  const { data, isPending, isError, error, isPlaceholderData, isFetching, isRefetching, refetch } = useMeTagsQuery(debouncedQuery, sortBy, directoryFilter.filter, serverId, page);
  const items = useMemo(() => data?.items ?? [], [data]);
  const count = data?.count ?? 0;

  // server names for the picker, when the dashboard can see the caller's servers (it's fine if it can't)
  const { user } = useAuth();
  const { data: guilds } = useMeGuildsQuery();
  const guildNames = useMemo(() => new Map((guilds ?? []).map((guild) => [guild.id, guild.name])), [guilds]);

  // ---- leave off where you were ----
  // arriving without a search, sort or filter (sidebar, "All tags", after a delete): bring back the last ones
  useLayoutEffect(() => {
    // a server's tags start from a clean slate
    if (searchParams.has('server')) {
      return;
    }
    const saved = readTagListState();
    const restore = {
      q: (!searchParams.has('q') && saved?.search) || null,
      sort: (!searchParams.has('sort') && findSort(saved?.sort) !== 'newest' && findSort(saved?.sort)) || null,
      directory: (!searchParams.has('directory') && findDirectoryFilter(saved?.directory)?.filter && saved?.directory) || null,
    };
    if (restore.q || restore.sort || restore.directory) {
      updateParams(restore);
    }
    // only on arrival
  }, []);

  // remember the search, sort and filter on the way out (the scroll position is remembered by the router, see SiteLayout)
  const listStateRef = useRef({search: query, sort: sortBy, directory: directoryFilter.value});
  listStateRef.current = {search: query, sort: sortBy, directory: directoryFilter.value};
  useLayoutEffect(() => {
    return () => writeTagListState(listStateRef.current);
  }, []);

  // a new search, sort or filter starts back on the first page
  function updateParams(changes: Record<string, string | null>) {
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      for (const [ key, value ] of Object.entries(changes)) {
        if (value) {
          next.set(key, value);
        } else {
          next.delete(key);
        }
      }
      if (!('page' in changes)) {
        next.delete('page');
      }
      return next;
    }, {replace: true, preventScrollReset: true});
  }

  function setPage(value: number) {
    updateParams({page: (value <= 0) ? null : String(value + 1)});
    window.scrollTo({top: 0});
  }
  // deleting the last tag of the last page leaves an empty page behind
  useStepBackFromEmptyPage({page, setPage, data, isPlaceholderData, pageSize: ME_TAGS_PAGE_SIZE});

  // `/dashboard/tags/:tagId` opens the tag's details over the list and `/dashboard/tags/:tagId/edit` its editor, both keeping
  // the list's search, sort and filter in the url
  const tagId = useMatch(Routes.DASHBOARD_TAG)?.params.tagId ?? null;
  const editingId = useMatch(Routes.DASHBOARD_TAG_EDIT)?.params.tagId ?? null;
  const location = useLocation();
  const navigate = useNavigate();
  const openedHere = (location.state as {tagOpenedHere?: boolean} | null)?.tagOpenedHere === true;
  const editOpenedHere = (location.state as {editOpenedHere?: boolean} | null)?.editOpenedHere === true;
  const listSearch = useCallback(() => {
    const next = new URLSearchParams(searchParams);
    next.delete('tag');
    next.delete('tab');
    const search = next.toString();
    return (search) ? `?${search}` : '';
  }, [searchParams]);

  // links from before the details had their own path (`?tag=<id>`)
  const legacyTagId = searchParams.get('tag');
  useLayoutEffect(() => {
    if (legacyTagId && !tagId && !editingId) {
      navigate({pathname: dashboardTagPath(legacyTagId), search: listSearch()}, {replace: true, preventScrollReset: true});
    }
  }, [legacyTagId, tagId, editingId, navigate, listSearch]);

  const openTag = useCallback((id: string) => {
    navigate({pathname: dashboardTagPath(id), search: listSearch()}, {
      preventScrollReset: true,
      // stepping between tags replaces, so Back still closes the modal in one go
      replace: !!tagId,
      state: {tagOpenedHere: openedHere || !tagId},
    });
  }, [navigate, listSearch, tagId, openedHere]);

  const editTag = useCallback((id: string) => {
    navigate({pathname: dashboardTagEditPath(id), search: listSearch()}, {preventScrollReset: true, state: {editOpenedHere: true}});
  }, [navigate, listSearch]);

  const closeEditor = useCallback(() => {
    if (editOpenedHere) {
      // back to wherever it was opened from, usually the tag's details
      navigate(-1);
    } else {
      navigate({pathname: Routes.DASHBOARD_TAGS, search: listSearch()}, {replace: true, preventScrollReset: true});
    }
  }, [navigate, editOpenedHere, listSearch]);

  // from the editor back to the tag's details
  const backToTag = useCallback((id: string) => {
    if (editOpenedHere) {
      // opened from the details, so they're the previous entry
      navigate(-1);
    } else {
      navigate({pathname: dashboardTagPath(id), search: listSearch()}, {replace: true, preventScrollReset: true});
    }
  }, [navigate, editOpenedHere, listSearch]);

  const closeTag = useCallback(() => {
    if (openedHere) {
      navigate(-1);
    } else {
      // arrived on the tag's link, there's no list entry to go back to
      navigate({pathname: Routes.DASHBOARD_TAGS, search: listSearch()}, {replace: true, preventScrollReset: true});
    }
  }, [navigate, openedHere, listSearch]);

  const tagIndex = (tagId) ? items.findIndex((item) => item.id === tagId) : -1;

  const setQuery = (value: string) => updateParams({q: value});
  const setSortBy = (value: string) => updateParams({sort: (value === 'newest') ? null : value});
  const setDirectoryFilter = (value: string) => updateParams({directory: (value === 'all') ? null : value});

  return (
    <>
      <DashboardHeader
        title='Your tags'
        description={
          (data) ? (
            (debouncedQuery)
              ? `${count.toLocaleString()} ${count === 1 ? 'tag matches' : 'tags match'} “${debouncedQuery}”.`
              : (serverId && !directoryFilter.filter)
              ? `You own ${count.toLocaleString()} ${count === 1 ? 'tag' : 'tags'} in ${guildNames.get(serverId) ?? 'this server'}.`
              : (directoryFilter.filter)
              ? `${count.toLocaleString()} ${count === 1 ? 'tag' : 'tags'} ${directoryFilter.description}.`
              : `You own ${count.toLocaleString()} ${count === 1 ? 'tag' : 'tags'}. Create new ones from Discord with the tag create command.`
          ) : 'Tags you own across every server.'
        }
      />

      <div className='mb-4 flex flex-col gap-3 sm:flex-row sm:items-center'>
        <SearchInput
          className='flex-1'
          value={query}
          onValueChange={setQuery}
          placeholder='Search by name or content...'
          aria-label='Search your tags'
        />
        <label className='flex items-center gap-2 text-sm text-muted sm:shrink-0'>
          Directory
          <select className='input w-44' value={directoryFilter.value} onChange={(event) => setDirectoryFilter(event.target.value)}>
            {DIRECTORY_FILTERS.map((filter) => <option key={filter.value} value={filter.value}>{filter.label}</option>)}
          </select>
        </label>
        <label className='flex items-center gap-2 text-sm text-muted sm:shrink-0'>
          Sort
          <select className='input w-40' value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
            {SORTS.map((sort) => <option key={sort.value} value={sort.value}>{sort.label}</option>)}
          </select>
        </label>
      </div>

      {(serverId) ? <ServerFilterChip guildId={serverId} name={guildNames.get(serverId)} onClear={() => updateParams({server: null})}/> : null}

      {(isPending) ? (
        <TagListSkeleton/>
      ) : (isError && !items.length) ? (
        <ErrorPanel title='Couldn’t load your tags' message={errorMessage(error)} onRetry={() => refetch()} retrying={isRefetching}/>
      ) : (!items.length) ? (
        <EmptyState icon={<TagsIcon className='size-10'/>} title={(filtered) ? 'No tags match that' : 'You don’t have any tags yet'}>
          {(debouncedQuery) ? 'Try a different search.' : (directoryFilter.value === 'listed') ? (
            'None of your tags are listed on the tag directory. Publish one from its editor’s Directory tab.'
          ) : (directoryFilter.value === 'unlisted') ? (
            'Every one of your tags is listed on the tag directory.'
          ) : (directoryFilter.filter) ? (
            `None of your tags are ${directoryFilter.description}.`
          ) : 'Make one in Discord with the tag create command and it shows up here.'}
        </EmptyState>
      ) : (
        <>
          <ul className={cn('grid grid-cols-1 gap-3 transition-opacity sm:grid-cols-2 xl:grid-cols-3', isPlaceholderData && 'opacity-60')}>
            {items.map((tag) => <TagCard key={tag.id} tag={tag} user={user} guildNames={guildNames} onOpen={openTag}/>)}
          </ul>
          <Pagination page={page} count={count} pageSize={ME_TAGS_PAGE_SIZE} onChange={setPage} fetching={isFetching && isPlaceholderData}/>
        </>
      )}

      {(tagId) ? (
        <TagDetailsModal
          key={tagId}
          tagId={tagId}
          guildNames={guildNames}
          previousId={(0 < tagIndex) ? items[tagIndex - 1].id : null}
          nextId={(tagIndex !== -1 && tagIndex + 1 < items.length) ? items[tagIndex + 1].id : null}
          onNavigate={openTag}
          onEdit={editTag}
          onClose={closeTag}
        />
      ) : null}

      {(editingId) ? <TagEditorModal tagId={editingId} onBack={backToTag} onClose={closeEditor}/> : null}
    </>
  );
}


// laid out like the directory's cards: NSFW by the name, the states stacked top-right, aliases as a subtitle, the location pinned above the footer.
// Just enough to spot the tag, the content and the rest of its details are a click away (`TagDetailsModal`)
function TagCard({ tag, user, guildNames, onOpen }: {
  tag: Tag,
  user: UserMe | null,
  guildNames: Map<string, string>,
  onOpen: (id: string) => void,
}) {
  const location = tagLocation(tag, user, guildNames);
  return (
    <li className='group relative flex min-w-0 flex-col rounded-lg border border-line bg-surface p-4 transition-colors hover:border-brand'>
      <div className='mb-3 flex items-start justify-between gap-3'>
        <div className='min-w-0 flex-1'>
          <div className='flex items-center gap-2'>
            <h2 className='truncate font-medium text-white transition-colors group-hover:text-brand'>
              {/* stretched: the whole card opens the tag */}
              <button
                type='button'
                className='cursor-pointer text-left after:absolute after:inset-0 after:rounded-lg focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-brand'
                onClick={() => onOpen(tag.id)}
              >
                {tag.name}
              </button>
            </h2>
            {(tag.nsfw) ? <NsfwBadge/> : null}
          </div>
          {(tag.reference_tag) ? <AliasOf reference={tag.reference_tag} user={user} onOpen={onOpen}/> : null}
        </div>
        <div className='flex shrink-0 flex-col items-end gap-1.5'>
          <TagStatusBadges tag={tag}/>
        </div>
      </div>
      {/* pinned above the footer, so it sits in the same spot on every card whether or not there's an alias line */}
      <div className='mt-auto mb-3 flex min-w-0'>
        {/* servers in the caller's list (the named ones) link to their dashboard page */}
        <TagLocationChip location={location} to={tagServerPath(location)}/>
      </div>
      <div className='flex items-center justify-between gap-3 border-t border-line pt-3 text-xs text-subtle'>
        <span className='tabular-nums'>{tag.uses.toLocaleString()} uses</span>
        <span>{(tag.edited) ? `Edited ${formatDate(tag.edited)}` : `Created ${formatDate(tag.created)}`}</span>
      </div>
    </li>
  );
}


// the alias' source tag: one of the caller's own opens over the list, someone else's directory tag links to its listing.
// The links sit above the card's stretched button so they stay clickable
function AliasOf({ reference, user, onOpen }: {reference: Tag, user: UserMe | null, onOpen: (id: string) => void}) {
  const own = !!user && reference.user?.id === user.id;
  const linkClassName = 'relative z-10 inline-flex min-w-0 cursor-pointer items-center gap-1 text-brand hover:underline';
  const name = <span className='truncate'>{reference.name}</span>;
  return (
    <p className='mt-0.5 flex min-w-0 items-center gap-1 text-sm text-muted'>
      <span className='shrink-0'>Alias of</span>
      {(own) ? (
        <button type='button' className={linkClassName} title='Open your tag' onClick={() => onOpen(reference.id)}>
          {name}
        </button>
      ) : (reference.is_on_directory) ? (
        <Link to={tagDirectoryItemPath(reference.id)} className={linkClassName} title='Open on the tag directory'>
          {name}
        </Link>
      ) : <span className='min-w-0 truncate'>{reference.name}</span>}
      {(reference.is_on_directory) ? (
        <span className='inline-flex shrink-0 items-center gap-1 text-subtle'>
          <BookOpen aria-hidden className='size-3.5'/>
          from the directory
        </span>
      ) : null}
    </p>
  );
}


function TagListSkeleton() {
  return (
    <ul aria-hidden className='grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3'>
      {Array.from({length: 9}, (_, i) => (
        <li key={i} className='rounded-lg border border-line bg-surface p-4'>
          <Skeleton className='h-4 w-32'/>
          <Skeleton className='mt-3 h-3 w-1/2 bg-surface-2'/>
          <Skeleton className='mt-6 h-3 w-full bg-surface-2'/>
        </li>
      ))}
    </ul>
  );
}
