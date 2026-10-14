import { ChevronDown, ChevronUp, Clock, Pencil, ShieldCheck, ShieldX, Trash2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';

import { SearchInput } from '@/components/ui/SearchInput';
import { Segmented } from '@/components/ui/Segmented';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { TagDirectoryVerificationStates, type AdminTagDirectoryItem, type AdminTagDirectorySortBy, type TagAsset, type TagDirectoryAsset } from '@/lib/api';
import { ADMIN_PAGE_SIZE, errorMessage, useAdminTagDirectoryQuery, usePatchAdminTagDirectoryMutation } from '@/lib/api/dashboardQueries';
import { cn, formatDate, formatDateTime, formatMemory } from '@/lib/utils';
import { NsfwBadge, VerificationBadge } from '@/pages/tags/tagDirectory';

import { DashboardHeader, EmptyState, ErrorPanel, Skeleton, Toggle } from '../ui';
import { Chip, DetailList, Pagination, selectAllScope, useSearchParamState, useStepBackFromEmptyPage, UserCell } from './adminUi';
import { DeleteDirectoryTagFlow } from './DeleteDirectoryTagFlow';
import { TagAssetsPanel } from './TagAssetsPanel';


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
  {value: 'servers', label: 'Most servers'},
  {value: 'name', label: 'Name'},
  {value: 'title', label: 'Title'},
];


export function AdminTagsPage() {
  const { searchParams, page, update, setPage } = useSearchParamState();
  // the dialog lives here, not in the card: deleting refetches the list, which unmounts the card (and used to lose
  // the dialog with the block request still running, so a failed block was never shown or retryable)
  const [ deletingItem, setDeletingItem ] = useState<AdminTagDirectoryItem | null>(null);
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
  const steppingBack = useStepBackFromEmptyPage({page, setPage, data, isPlaceholderData, pageSize: ADMIN_PAGE_SIZE});

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
          placeholder='Search title, name, description or content...'
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

      {(isPending || steppingBack) ? (
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
            {items.map((item) => <DirectoryTagCard key={item.id} item={item} onDelete={() => setDeletingItem(item)}/>)}
          </ul>
          <Pagination page={page} count={data?.count ?? 0} pageSize={ADMIN_PAGE_SIZE} onChange={setPage} fetching={isFetching && isPlaceholderData}/>
        </>
      )}
      {(deletingItem) ? <DeleteDirectoryTagFlow item={deletingItem} onClose={() => setDeletingItem(null)}/> : null}
    </>
  );
}


const CONTENT_COLLAPSE_LINES = 14;
const CONTENT_COLLAPSE_CHARS = 900;
// `Tag.content` is varchar(2000)
const CONTENT_MAX = 2000;
// same limits as the api's directory listing validators
const TITLE_MAX = 128;
const DESCRIPTION_MAX = 2000;

function DirectoryTagCard({ item, onDelete }: {item: AdminTagDirectoryItem, onDelete: () => void}) {
  const { tag } = item;
  const toast = useToast();
  const mutation = usePatchAdminTagDirectoryMutation();
  // separate instance so saving content doesn't show up as a pending verification change
  const contentMutation = usePatchAdminTagDirectoryMutation();
  const [ expanded, setExpanded ] = useState(false);
  const listingMutation = usePatchAdminTagDirectoryMutation();
  // null when not editing
  const [ draft, setDraft ] = useState<string | null>(null);
  const [ listingDraft, setListingDraft ] = useState<{title: string, description: string} | null>(null);

  const content = tag.content ?? '';
  const long = CONTENT_COLLAPSE_LINES < content.split('\n').length || CONTENT_COLLAPSE_CHARS < content.length;

  const saveContent = () => {
    if (draft === null) {
      return;
    }
    contentMutation.mutate({tagId: item.id, content: draft}, {
      onSuccess: () => {
        setDraft(null);
        toast(`${item.title || tag.name}: content saved`);
      },
      onError: (error) => toast(errorMessage(error), 'error'),
    });
  };

  const listingChanged = listingDraft !== null && (listingDraft.title !== item.title || listingDraft.description !== item.description);
  const listingTooLong = listingDraft !== null && (TITLE_MAX < listingDraft.title.length || DESCRIPTION_MAX < listingDraft.description.length);

  const saveListing = () => {
    if (listingDraft === null) {
      return;
    }
    // only send what changed, the api skips undefined fields
    listingMutation.mutate({
      tagId: item.id,
      title: (listingDraft.title !== item.title) ? listingDraft.title : undefined,
      description: (listingDraft.description !== item.description) ? listingDraft.description : undefined,
    }, {
      onSuccess: (updated) => {
        setListingDraft(null);
        toast(`${updated.title || tag.name}: listing saved`);
      },
      onError: (error) => toast(errorMessage(error), 'error'),
    });
  };

  // archiving a url that's in the content swaps it in the editor, staff still review and save it themselves
  const onArchived = (asset: TagAsset, sourceUrl: string | null) => {
    const current = draft ?? content;
    if (sourceUrl && current.includes(sourceUrl)) {
      setDraft(current.replaceAll(sourceUrl, asset.urls.cdn));
      toast('Archived, the url was replaced in the editor. Review and save it.');
    } else {
      toast('Archived, copy its url into the content.');
    }
  };

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
            onClick={onDelete}
          />
        </div>
      </div>

      <div className='mt-3'>
        <UserCell user={item.user} fallbackId={tag.user_id ?? null}/>
      </div>

      {(listingDraft !== null) ? (
        <div className='mt-3 space-y-2'>
          <label className='block'>
            <span className='section-label'>
              Title{' '}
              <span className={cn('normal-case tracking-normal', (TITLE_MAX < listingDraft.title.length) ? 'text-danger' : 'text-subtle')}>
                ({listingDraft.title.length.toLocaleString()} / {TITLE_MAX.toLocaleString()} chars)
              </span>
            </span>
            <input
              className='input mt-1.5'
              value={listingDraft.title}
              disabled={listingMutation.isPending}
              onChange={(event) => setListingDraft({...listingDraft, title: event.target.value})}
            />
          </label>
          <label className='block'>
            <span className='section-label'>
              Description{' '}
              <span className={cn('normal-case tracking-normal', (DESCRIPTION_MAX < listingDraft.description.length) ? 'text-danger' : 'text-subtle')}>
                ({listingDraft.description.length.toLocaleString()} / {DESCRIPTION_MAX.toLocaleString()} chars)
              </span>
            </span>
            <textarea
              className='input mt-1.5 resize-y leading-relaxed'
              rows={Math.min(12, Math.max(3, listingDraft.description.split('\n').length + 1))}
              value={listingDraft.description}
              disabled={listingMutation.isPending}
              onChange={(event) => setListingDraft({...listingDraft, description: event.target.value})}
            />
          </label>
          <div className='flex flex-wrap items-center gap-2'>
            <ActionButton
              label='Save listing'
              icon={<Pencil className='size-4'/>}
              className='btn-primary'
              disabled={listingMutation.isPending || !listingChanged || listingTooLong}
              pending={listingMutation.isPending}
              onClick={saveListing}
            />
            <button type='button' className='btn btn-sm btn-ghost' disabled={listingMutation.isPending} onClick={() => setListingDraft(null)}>Cancel</button>
            <span className='text-xs text-subtle'>Works on pending and verified listings too, the owner isn’t notified.</span>
          </div>
        </div>
      ) : (
        <div className='mt-3 flex items-start justify-between gap-2'>
          {(item.description) ? (
            <p className='min-w-0 text-sm whitespace-pre-wrap break-words text-muted'>{item.description}</p>
          ) : (
            <p className='text-sm text-subtle italic'>No description</p>
          )}
          <button
            type='button'
            className='btn btn-ghost btn-sm shrink-0'
            onClick={() => setListingDraft({title: item.title ?? '', description: item.description ?? ''})}
          >
            <Pencil className='size-4'/>
            Edit title &amp; description
          </button>
        </div>
      )}

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
          <h3 className='section-label'>
            Content{' '}
            <span className={cn('normal-case tracking-normal', (draft !== null && CONTENT_MAX < draft.length) ? 'text-danger' : 'text-subtle')}>
              ({(draft ?? content).length.toLocaleString()}{(draft !== null) ? ` / ${CONTENT_MAX.toLocaleString()}` : ''} chars)
            </span>
          </h3>
          <div className='flex gap-1'>
            {(draft === null && long) ? (
              <button type='button' className='btn btn-ghost btn-sm' onClick={() => setExpanded((value) => !value)} aria-expanded={expanded}>
                {(expanded) ? <ChevronUp className='size-4'/> : <ChevronDown className='size-4'/>}
                {(expanded) ? 'Collapse' : 'Expand'}
              </button>
            ) : null}
            {(draft === null) ? (
              <button type='button' className='btn btn-ghost btn-sm' onClick={() => setDraft(content)}>
                <Pencil className='size-4'/>
                Edit
              </button>
            ) : null}
          </div>
        </div>
        {(draft !== null) ? (
          <div>
            <textarea
              className='input resize-y font-mono leading-relaxed'
              rows={Math.min(24, Math.max(6, draft.split('\n').length + 1))}
              aria-label='Tag content'
              value={draft}
              disabled={contentMutation.isPending}
              onChange={(event) => setDraft(event.target.value)}
            />
            <div className='mt-2 flex flex-wrap items-center gap-2'>
              <ActionButton
                label='Save content'
                icon={<Pencil className='size-4'/>}
                className='btn-primary'
                disabled={contentMutation.isPending || !draft.trim() || CONTENT_MAX < draft.length || draft === content}
                pending={contentMutation.isPending}
                onClick={saveContent}
              />
              <button type='button' className='btn btn-sm btn-ghost' disabled={contentMutation.isPending} onClick={() => setDraft(null)}>Cancel</button>
              <span className='text-xs text-subtle'>Saving bypasses the lock, the owner isn’t notified and the edited date stays the same.</span>
            </div>
          </div>
        ) : (
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
        )}
        {(draft === null && long && !expanded) ? (
          <button type='button' className='mt-1 cursor-pointer text-xs text-brand hover:underline' onClick={() => setExpanded(true)}>Show full content</button>
        ) : null}
      </div>

      <TagAssetsPanel tagId={item.id} assets={tag.assets ?? []} onArchived={onArchived}/>

      {(item.assets?.length) ? (
        <div className='mt-4'>
          <h3 className='section-label mb-1.5'>Listing assets</h3>
          <ul className='space-y-1'>
            {item.assets.map((asset) => <AssetRow key={asset.id} asset={asset}/>)}
          </ul>
        </div>
      ) : null}

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
