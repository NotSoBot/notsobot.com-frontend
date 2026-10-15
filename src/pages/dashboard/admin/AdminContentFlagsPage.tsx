// Content flags are records of media the bot's safety scan flagged. This page is deliberately text only:
// NEVER render `source_url` (or any other url here) as <img>/<video>/<iframe>/background-image or any other
// embed, and never as a link. At most it's plain, selectable text.

import { Ban, Flag, Info, Languages, MessageSquareWarning, ShieldCheck, X } from 'lucide-react';
import { useEffect, useId, useState } from 'react';

import { isOwner, useAuth } from '@/auth';
import { Modal } from '@/components/ui/Modal';
import { SearchInput } from '@/components/ui/SearchInput';

import { Spinner } from '@/components/ui/Spinner';
import { useToast, type ToastAction } from '@/components/ui/Toast';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import {
  CONTENT_FLAG_TEXT_MIMETYPE,
  ContentFlagCategories,
  ContentFlagStatuses,
  ContentFlagTypes,
  type ContentFlag,
  type ContentFlagMatchCounts,
  type ContentFlagMatches,
  type ContentFlagStatus,
  type ContentFlagType,
  type ContentFlagUser,
  UserFlags,
} from '@/lib/api';
import { ADMIN_CONTENT_FLAGS_PAGE_SIZE, errorMessage, useAdminContentFlagsQuery, useFetchContentFlagMatches, useFlagAdminContentFlagPromptMutation, usePatchAdminContentFlagMutation, usePatchAdminUserMutation, useTranslateAdminContentFlagMutation } from '@/lib/api/dashboardQueries';
import { cn, formatDateTime, formatMemory } from '@/lib/utils';

import { DashboardHeader, EmptyState, ErrorPanel, Skeleton, Toggle } from '../ui';
import { Chip, CollapseButton, CollapsedCard, CopyableValue, CopyButton, DetailList, ExactDate, Pagination, selectAllScope, useSearchParamState, useStepBackFromEmptyPage, UserCell } from './adminUi';
import { BLOCK_REASON_MAX, BlockUserDialog } from './BlockUserDialog';


type Tone = 'warning' | 'danger' | 'neutral' | 'brand';

// `short` is the action's label in the phone-width action bar, where the buttons share one row
const STATUSES: Array<{value: ContentFlagStatus, label: string, action: string, short: string, tone: Tone}> = [
  {value: ContentFlagStatuses.PENDING, label: 'Pending', action: 'Mark pending', short: 'Pending', tone: 'warning'},
  {value: ContentFlagStatuses.CONFIRMED, label: 'Confirmed', action: 'Confirm', short: 'Confirm', tone: 'danger'},
  {value: ContentFlagStatuses.DISMISSED, label: 'Dismissed', action: 'Dismiss', short: 'Dismiss', tone: 'neutral'},
  {value: ContentFlagStatuses.REPORTED, label: 'Reported', action: 'Mark reported', short: 'Report', tone: 'brand'},
];

const TYPE_LABELS: Record<ContentFlagType, string> = {media: 'Media', text: 'Text'};

// shown on hover wherever the pdq is
function pdqHint(distance?: number): string {
  return 'PDQ is a visual hash: it matches visually similar media (resized, re-encoded, lightly edited), not just the exact same file' +
    `${(distance) ? `, up to ${distance} of its 256 bits can differ` : ''}. For videos and GIFs it's only one frame: the first flagged frame, or the first frame when no single frame was flagged.`;
}

function statusInfo(status: number) {
  return STATUSES.find((item) => item.value === status) ?? {value: status, label: `Status ${status}`, action: '', short: '', tone: 'neutral' as Tone};
}


// no `status` param means the review queue (pending), `all` means any status
const DEFAULT_STATUS = ContentFlagStatuses.PENDING;
const ANY_STATUS = 'all';

function parseStatus(value: string | null): number | null {
  if (value === null || value === '') {
    return DEFAULT_STATUS;
  }
  if (value === ANY_STATUS || Number.isNaN(Number(value))) {
    return null;
  }
  return Number(value);
}

function parseBool(value: string | null): boolean | null {
  return (value === '1' || value === 'true') ? true : (value === '0' || value === 'false') ? false : null;
}

// the default reason when blocking someone from one of their flags
function flagBlockReason(flag: ContentFlag): string {
  return `Content flag #${flag.id}${(flag.category) ? ` (${flag.category})` : ''}`;
}

// The undo button on the toast after a flag's status changes, putting it back to `previous`. Uses `mutateAsync` since
// the card has usually left the list (and unmounted) by the time it's clicked, and `mutate`'s callbacks don't run then.
// None for a status this page doesn't know, since it couldn't be set back.
function useUndoStatusAction(): (flagId: string, previous: number) => ToastAction | undefined {
  const toast = useToast();
  const mutation = usePatchAdminContentFlagMutation();
  return (flagId, previous) => {
    const status = STATUSES.find((item) => item.value === previous);
    if (!status) {
      return undefined;
    }
    return {
      label: 'Undo',
      onClick: () => {
        mutation.mutateAsync({flagId, patch: {status: status.value}}).then(
          () => toast(`Flag ${flagId}: back to ${status.label.toLowerCase()}`),
          (error) => toast(errorMessage(error), 'error'),
        );
      },
    };
  };
}

// owners can't be blocked, moderators only by owners; mirrors `admin_patch_user`
function canBlockUser(user: ContentFlagUser, viewerIsOwner: boolean): boolean {
  const owner = (user.flags & UserFlags.OWNER) === UserFlags.OWNER;
  const moderator = (user.flags & UserFlags.MODERATOR) === UserFlags.MODERATOR;
  return !owner && (viewerIsOwner || !moderator);
}


export function AdminContentFlagsPage() {
  const { searchParams, page, update, setPage } = useSearchParamState();
  // kept here so the dialog survives the card leaving the list (e.g. filtered by a status that excludes "reported")
  const [ reportingFlag, setReportingFlag ] = useState<ContentFlag | null>(null);
  const userId = (searchParams.get('user_id') || '').trim();
  const guildId = (searchParams.get('guild_id') || '').trim();
  const channelId = (searchParams.get('channel_id') || '').trim();
  const tagId = (searchParams.get('tag_id') || '').trim();
  const commandId = (searchParams.get('command_id') || '').trim();
  const status = parseStatus(searchParams.get('status'));
  const category = searchParams.get('category') || '';
  const needsHumanReview = parseBool(searchParams.get('needs_human_review'));
  const autoConfirmed = parseBool(searchParams.get('auto_confirmed'));
  const type = ContentFlagTypes.find((item) => item === searchParams.get('type')) ?? null;
  // flags of blocked users are hidden unless `blocked=1`
  const includeBlocked = searchParams.get('blocked') === '1';
  const search = searchParams.get('q') || '';
  const debouncedSearch = useDebouncedValue(search.trim(), 300);

  const { data, isPending, isError, error, isPlaceholderData, isFetching, isRefetching, refetch } = useAdminContentFlagsQuery({
    userId,
    guildId,
    channelId,
    tagId,
    commandId,
    status,
    category,
    needsHumanReview,
    autoConfirmed,
    type,
    includeBlocked,
    search: debouncedSearch,
    page,
  });
  const items = data?.items ?? [];
  const steppingBack = useStepBackFromEmptyPage({page, setPage, data, isPlaceholderData, pageSize: ADMIN_CONTENT_FLAGS_PAGE_SIZE});
  const filtered = !!(userId || guildId || channelId || tagId || commandId || status !== null || category || needsHumanReview !== null || autoConfirmed !== null || type || debouncedSearch);
  const pagination = {
    page,
    count: data?.count ?? 0,
    pageSize: ADMIN_CONTENT_FLAGS_PAGE_SIZE,
    onChange: setPage,
    fetching: isFetching && isPlaceholderData,
  };

  return (
    <>
      <DashboardHeader
        title='Content flags'
        description='Media the safety scan flagged. Shown as metadata only, nothing is previewed.'
      />

      <SearchInput
        className='mb-4'
        value={search}
        onValueChange={(value) => update({q: value})}
        placeholder='Search by case #, message id, tag id, command, text, prompt, url or hash...'
        aria-label='Search content flags'
      />

      <div className='card mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-12'>
        <label className='text-sm lg:col-span-3'>
          <span className='mb-1 block text-subtle'>Type</span>
          <select className='input' value={type ?? ''} onChange={(event) => update({type: event.target.value})}>
            <option value=''>Any</option>
            {ContentFlagTypes.map((item) => <option key={item} value={item}>{TYPE_LABELS[item]}</option>)}
          </select>
        </label>
        <label className='text-sm lg:col-span-3'>
          <span className='mb-1 block text-subtle'>Status</span>
          <select
            className='input'
            value={(status === null) ? ANY_STATUS : String(status)}
            onChange={(event) => update({status: (event.target.value === String(DEFAULT_STATUS)) ? null : event.target.value})}
          >
            <option value={ANY_STATUS}>Any</option>
            {STATUSES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        <label className='text-sm lg:col-span-3'>
          <span className='mb-1 block text-subtle'>Category</span>
          <select className='input' value={category} onChange={(event) => update({category: event.target.value})}>
            <option value=''>Any</option>
            {(category && !(ContentFlagCategories as ReadonlyArray<string>).includes(category)) ? <option value={category}>{category}</option> : null}
            {ContentFlagCategories.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label className='text-sm lg:col-span-3'>
          <span className='mb-1 block text-subtle'>Needs review</span>
          <select
            className='input'
            value={(needsHumanReview === null) ? '' : (needsHumanReview) ? '1' : '0'}
            onChange={(event) => update({needs_human_review: event.target.value})}
          >
            <option value=''>Any</option>
            <option value='1'>Yes</option>
            <option value='0'>No</option>
          </select>
        </label>
        <IdFilter label='User id' placeholder='Any user' value={userId} onChange={(value) => update({user_id: value})}/>
        <IdFilter label='Guild id' placeholder='Any guild' value={guildId} onChange={(value) => update({guild_id: value})}/>
        <IdFilter label='Channel id' placeholder='Any channel' value={channelId} onChange={(value) => update({channel_id: value})}/>
        <IdFilter label='Tag id' placeholder='Any tag' value={tagId} onChange={(value) => update({tag_id: value})}/>
        {/* wider so the example in the placeholder isn't cut off */}
        <IdFilter
          className='sm:col-span-2 lg:col-span-8'
          label='Command id'
          placeholder='Any command, e.g. tag or tag.show'
          value={commandId}
          pattern={COMMAND_ID_PATTERN}
          onChange={(value) => update({command_id: value})}
        />
        <label className='text-sm lg:col-span-4'>
          <span className='mb-1 block text-subtle'>Auto-confirmed</span>
          <select
            className='input'
            value={(autoConfirmed === null) ? '' : (autoConfirmed) ? '1' : '0'}
            onChange={(event) => update({auto_confirmed: event.target.value})}
          >
            <option value=''>Any</option>
            <option value='1'>Yes</option>
            <option value='0'>No</option>
          </select>
        </label>
        <div className='flex items-end lg:col-span-4'>
          <div className='w-full rounded-md border border-line bg-surface px-3 py-2'>
            <Toggle label='Show blocked users' checked={includeBlocked} onChange={(value) => update({blocked: (value) ? '1' : null})}/>
          </div>
        </div>
      </div>

      {(isPending || steppingBack) ? (
        <ListSkeleton/>
      ) : (isError && !items.length) ? (
        <ErrorPanel title='Couldn’t load content flags' message={errorMessage(error)} onRetry={() => refetch()} retrying={isRefetching}/>
      ) : (!items.length) ? (
        <EmptyState icon={<Flag className='size-10'/>} title='No content flags'>
          {(filtered) ? 'Nothing matches these filters.' : null}
          {(!includeBlocked) ? (
            <>
              {(filtered) ? ' ' : null}Flags from blocked users are hidden.{' '}
              <button type='button' className='cursor-pointer text-brand hover:underline' onClick={() => update({blocked: '1'})}>Show them</button>
            </>
          ) : null}
        </EmptyState>
      ) : (
        <>
          <Pagination {...pagination} className='mt-0 mb-4'/>
          <ul className={cn('space-y-3 transition-opacity', isPlaceholderData && 'opacity-60')}>
            {items.map((flag) => <ContentFlagCard key={flag.id} flag={flag} onReport={() => setReportingFlag(flag)}/>)}
          </ul>
          <Pagination {...pagination}/>
        </>
      )}
      {(reportingFlag) ? <ReportFlagDialog flag={reportingFlag} onClose={() => setReportingFlag(null)}/> : null}
    </>
  );
}


const SNOWFLAKE_PATTERN = /^\d+$/;
// `tag.show`, `media.aiv.tools.extract.media`; spaces are allowed since the api treats them as dots
const COMMAND_ID_PATTERN = /^[\w.\- ]+$/;

// edits locally and lands in the URL once typing stops, only for empty values or ones matching `pattern`
function IdFilter({ className = 'lg:col-span-4', label, placeholder, value, pattern = SNOWFLAKE_PATTERN, onChange }: {
  className?: string,
  label: string,
  placeholder: string,
  value: string,
  pattern?: RegExp,
  onChange: (value: string | null) => void,
}) {
  const numeric = pattern === SNOWFLAKE_PATTERN;
  const [ input, setInput ] = useState(value);
  useEffect(() => setInput(value), [value]);
  const debounced = useDebouncedValue(input.trim(), 400);
  useEffect(() => {
    if (debounced !== value && (!debounced || pattern.test(debounced))) {
      onChange(debounced);
    }
    // only when the typed value settles
  }, [debounced]);

  return (
    <label className={cn('text-sm', className)}>
      <span className='mb-1 block text-subtle'>{label}</span>
      <span className='relative block'>
        <input
          className='input pr-9 font-mono'
          inputMode={(numeric) ? 'numeric' : 'text'}
          spellCheck={false}
          autoCapitalize='off'
          placeholder={placeholder}
          value={input}
          onChange={(event) => setInput(event.target.value)}
        />
        {(input) ? (
          <button
            type='button'
            aria-label={`Clear ${label.toLowerCase()} filter`}
            className='absolute top-1/2 right-1.5 -translate-y-1/2 cursor-pointer rounded p-1 text-subtle hover:text-fg'
            onClick={() => {
              setInput('');
              onChange(null);
            }}
          >
            <X className='size-4'/>
          </button>
        ) : null}
      </span>
    </label>
  );
}


function ContentFlagCard({ flag, onReport }: {flag: ContentFlag, onReport: () => void}) {
  const toast = useToast();
  const { user: me } = useAuth();
  const viewerIsOwner = isOwner(me);
  const [ blocking, setBlocking ] = useState(false);
  const { user } = flag;
  // only owners can unblock
  const canToggleBlock = !!user && ((user.blocked) ? viewerIsOwner : canBlockUser(user, viewerIsOwner));
  const mutation = usePatchAdminContentFlagMutation();
  const translation = useTranslateAdminContentFlagMutation();
  const [ notes, setNotes ] = useState(flag.notes ?? '');
  useEffect(() => setNotes(flag.notes ?? ''), [flag.notes]);
  const notesDirty = notes !== (flag.notes ?? '');
  const reviewed = flag.status !== ContentFlagStatuses.PENDING;
  // any flag can fold down to one line, reviewed ones start folded and fold again whenever their status changes
  const [ expanded, setExpanded ] = useState(!reviewed);
  useEffect(() => setExpanded(flag.status === ContentFlagStatuses.PENDING), [flag.status]);
  const status = statusInfo(flag.status);
  const isText = flag.mimetype === CONTENT_FLAG_TEXT_MIMETYPE;
  const fetchMatches = useFetchContentFlagMatches();
  const [ checkingMatches, setCheckingMatches ] = useState(false);
  // other flags of the same media, set while the "confirm the matches too?" dialog is open
  const [ matches, setMatches ] = useState<ContentFlagMatches | null>(null);
  // set while the "flag the prompt instead of the media?" dialog is open
  const [ flaggingPrompt, setFlaggingPrompt ] = useState(false);
  const pendingStatus = (mutation.isPending) ? mutation.variables?.patch.status : (checkingMatches) ? ContentFlagStatuses.CONFIRMED : undefined;
  const savingNotes = mutation.isPending && mutation.variables?.patch.notes !== undefined;

  const undoAction = useUndoStatusAction();

  const setStatus = (value: ContentFlagStatus, match?: MatchSelection) => {
    const others = match?.others ?? 0;
    const previous = flag.status;
    mutation.mutate({flagId: flag.id, patch: {status: value, match_sha256: match?.sha256 || undefined, match_pdq: match?.pdq || undefined}}, {
      onSuccess: () => {
        const label = statusInfo(value).label.toLowerCase();
        // no undo when matches changed too, the api doesn't say which flags those were so they can't be put back
        toast(
          (others) ? `Flag ${flag.id} and ${others.toLocaleString()} matching ${(others === 1) ? 'flag' : 'flags'}: ${label}` : `Flag ${flag.id}: ${label}`,
          'success',
          (others) ? undefined : undoAction(flag.id, previous),
        );
      },
      onError: (error) => toast(errorMessage(error), 'error'),
    });
  };
  // confirming looks for other pending flags of the same media first, and offers to confirm those too
  const confirm = async () => {
    setCheckingMatches(true);
    let found: ContentFlagMatches;
    try {
      found = await fetchMatches(flag.id);
    } catch (error) {
      toast(errorMessage(error, 'Couldn’t check for other flags of the same media.'), 'error');
      return;
    } finally {
      setCheckingMatches(false);
    }
    if ((found.sha256?.pending ?? 0) + (found.pdq?.pending ?? 0)) {
      setMatches(found);
    } else {
      setStatus(ContentFlagStatuses.CONFIRMED);
    }
  };
  const translate = () => {
    translation.mutate({flagId: flag.id}, {
      onSuccess: (updated) => {
        if (updated.translation) {
          toast(`Flag ${flag.id}: translated from ${updated.translation_language ?? 'unknown'}`);
        } else if (updated.translation_language === 'en') {
          toast(`Flag ${flag.id}: already in English`);
        } else {
          toast(`Flag ${flag.id}: no translation returned`, 'error');
        }
      },
      onError: (error) => toast(errorMessage(error), 'error'),
    });
  };
  const saveNotes = () => {
    mutation.mutate({flagId: flag.id, patch: {notes: notes.trim() || null}}, {
      onSuccess: () => toast(`Flag ${flag.id}: notes saved`),
      onError: (error) => toast(errorMessage(error), 'error'),
    });
  };

  const flagged = flag.flagged ?? [];
  const forReview = flag.flagged_for_review ?? [];
  const framesFlagged = flag.frames_flagged ?? [];
  const scores = Object.entries(flag.scores_worst ?? {});

  if (!expanded) {
    return (
      <CollapsedCard onExpand={() => setExpanded(true)}>
        {/* fixed widths so every collapsed row lines up in columns */}
        <span className='w-44 font-mono text-sm text-white'>#{flag.id}</span>
        <Chip tone={status.tone} className='w-20 justify-center'>{status.label}</Chip>
        <Chip className='w-14 justify-center'>{(isText) ? 'text' : 'media'}</Chip>
        {(flag.category)
          ? <Chip tone={(flag.category.startsWith('unsafe')) ? 'danger' : 'warning'} className='w-36 justify-center'>{flag.category}</Chip>
          : <span aria-hidden className='w-36'/>}
        <UserCell user={flag.user} fallbackId={flag.user_id} size='sm'/>
        {(user?.blocked) ? <Chip tone='danger' title={user.blocked_reason || undefined}>Blocked</Chip> : null}
        {(flag.auto_confirmed_from) ? <Chip title={`Same media as #${flag.auto_confirmed_from}, which was already confirmed`}>auto-confirmed</Chip> : null}
        <span className='ml-auto text-xs text-subtle'>{formatDateTime(flag.created)}</span>
      </CollapsedCard>
    );
  }

  const statusButton = (item: typeof STATUSES[number], compact: boolean) => (
    <button
      key={item.value}
      type='button'
      className={cn('btn', (compact) ? 'px-2' : 'btn-sm', (item.value === ContentFlagStatuses.CONFIRMED) ? 'btn-danger' : 'btn-secondary')}
      disabled={mutation.isPending || checkingMatches || flag.status === item.value}
      // reporting goes through a dialog so the uploader can be blocked in the same step
      onClick={() => (item.value === ContentFlagStatuses.REPORTED) ? onReport() :
        (item.value === ContentFlagStatuses.CONFIRMED) ? confirm() : setStatus(item.value)}
    >
      {(pendingStatus === item.value) ? <Spinner className='size-3.5'/> : null}
      {(compact) ? item.short : item.action}
    </button>
  );

  return (
    <li className='card p-4 sm:p-5'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div className='min-w-0 flex-1 sm:flex-initial'>
          <div className='flex flex-wrap items-center gap-2'>
            <CollapseButton onClick={() => setExpanded(false)}/>
            <span className='min-w-0 truncate font-mono text-sm text-white'>#{flag.id}</span>
            {/* on phones the status sits alone on the id's line and the rest of the chips wrap below */}
            <Chip tone={status.tone} className='ml-auto sm:ml-0'>{status.label}</Chip>
            <div className='flex basis-full flex-wrap items-center gap-2 sm:basis-auto'>
              <Chip>{(isText) ? 'text' : 'media'}</Chip>
              {(flag.category) ? <Chip tone={(flag.category.startsWith('unsafe')) ? 'danger' : 'warning'}>{flag.category}</Chip> : null}
              {(flag.action) ? <Chip>action: {flag.action}</Chip> : null}
              {(flag.needs_human_review) ? <Chip tone='warning'>needs human review</Chip> : null}
              {(flag.auto_confirmed_from) ? <Chip title={`Same media as #${flag.auto_confirmed_from}, which was already confirmed`}>auto-confirmed</Chip> : null}
            </div>
          </div>
          <p className='mt-1.5 text-xs text-subtle sm:mt-1'><ExactDate value={flag.created} format={formatDateTime}/></p>
        </div>
        {/* phones get these as a bar at the bottom of the card instead */}
        <div className='hidden flex-wrap gap-2 sm:flex'>
          {STATUSES.map((item) => statusButton(item, false))}
        </div>
      </div>

      <div className='mt-3 flex flex-wrap items-center gap-2'>
        <UserCell user={flag.user} fallbackId={flag.user_id}/>
        {(user?.blocked) ? <Chip tone='danger' title={user.blocked_reason || undefined}>Blocked</Chip> : null}
        {(user && canToggleBlock) ? (
          <button
            type='button'
            className={cn('btn btn-sm', (user.blocked) ? 'btn-secondary' : 'btn-ghost text-danger')}
            onClick={() => setBlocking(true)}
          >
            {(user.blocked) ? <ShieldCheck className='size-4'/> : <Ban className='size-4'/>}
            {(user.blocked) ? 'Unblock' : 'Block user'}
          </button>
        ) : null}
      </div>
      {(user?.blocked && user.blocked_reason) ? <p className='mt-1 text-xs break-words text-subtle'>Blocked for: {user.blocked_reason}</p> : null}

      {(flagged.length || forReview.length) ? (
        <div className='mt-3 flex flex-wrap items-center gap-1.5'>
          {flagged.map((label) => <Chip key={`f-${label}`} tone='danger'>{label}</Chip>)}
          {forReview.map((label) => <Chip key={`r-${label}`} tone='warning' title='Flagged for review'>review: {label}</Chip>)}
        </div>
      ) : null}

      <div className='mt-4 grid gap-4 lg:grid-cols-2'>
        <DetailList
          items={[
            ['Model', flag.model || '—'],
            ['Mimetype', flag.mimetype || '—'],
            ['Size', (flag.size !== null && flag.size !== undefined) ? `${formatMemory(flag.size, 1)} (${flag.size.toLocaleString()} B)` : '—'],
            (isText) ? null : ['Frames', (flag.frames !== null && flag.frames !== undefined)
              ? `${framesFlagged.length.toLocaleString()} flagged of ${flag.frames.toLocaleString()}`
              : '—'],
            (framesFlagged.length) ? ['Flagged frames', <span className='font-mono text-xs'>{framesFlagged.join(', ')}</span>] : null,
            ['SHA-256', (flag.sha256) ? <CopyableValue value={flag.sha256}/> : '—'],
            (isText) ? null : [
              <span title={pdqHint()} className='cursor-help underline decoration-dotted underline-offset-2'>PDQ</span>,
              (flag.pdq) ? <CopyableValue value={flag.pdq}/> : '—',
            ],
          ]}
        />
        <DetailList
          items={[
            ['Command', (flag.command_id) ? <span className='font-mono'>{flag.command_id}</span> : '—'],
            ['Guild', (flag.guild_id) ? <CopyableValue value={flag.guild_id} truncate={0}/> : '—'],
            ['Channel', (flag.channel_id) ? <CopyableValue value={flag.channel_id} truncate={0}/> : '—'],
            ['Message', (flag.message_id) ? <CopyableValue value={flag.message_id} truncate={0}/> : '—'],
            (flag.tag_id) ? ['Tag', <CopyableValue value={flag.tag_id} truncate={0}/>] : null,
            (flag.reviewed_at || flag.reviewed_by) ? ['Reviewed', (
              <span>
                {(flag.reviewed_at) ? <ExactDate value={flag.reviewed_at} format={formatDateTime}/> : null}
                {(flag.reviewed_by) ? <> by <span className='font-mono'>{flag.reviewed_by}</span></> : null}
              </span>
            )] : null,
          ]}
        />
      </div>

      {(flag.query) ? (
        <div className='mt-4'>
          <div className='mb-1 flex min-h-8 items-center justify-between gap-2'>
            <h3 className='section-label'>{(isText) ? 'Flagged text' : 'Query'}</h3>
            <div className='flex items-center gap-1'>
              {(!isText) ? (
                <button
                  type='button'
                  className='btn btn-ghost btn-sm'
                  title='The prompt is the problem, not the media: turn this into a text flag on the prompt'
                  onClick={() => setFlaggingPrompt(true)}
                >
                  <MessageSquareWarning aria-hidden className='size-4 shrink-0'/>
                  {/* icon only on phones, the label squeezes the header onto three lines there */}
                  <span className='sr-only sm:not-sr-only'>Flag prompt only</span>
                </button>
              ) : null}
              {(!flag.translation && flag.translation_language !== 'en') ? (
                <button type='button' className='btn btn-ghost btn-sm' disabled={translation.isPending} onClick={translate}>
                  {(translation.isPending) ? <Spinner className='size-3.5'/> : <Languages aria-hidden className='size-4'/>}
                  Translate
                </button>
              ) : null}
              <CopyButton value={flag.query} label='Copy'/>
            </div>
          </div>
          <p className='rounded-md border border-line bg-deep px-3 py-2 font-mono text-sm whitespace-pre-wrap break-words text-fg focus:border-line-strong focus:outline-none' {...selectAllScope}>{flag.query}</p>
        </div>
      ) : null}

      {(flag.query && flag.translation) ? (
        <div className='mt-4'>
          <div className='mb-1 flex min-h-8 items-center justify-between gap-2'>
            <h3 className='section-label'>
              Translation <span className='normal-case tracking-normal text-subtle'>({flag.translation_language ?? '?'} → en)</span>
            </h3>
            <div className='flex items-center gap-1'>
              <button type='button' className='btn btn-ghost btn-sm' disabled={translation.isPending} onClick={translate}>
                {(translation.isPending) ? <Spinner className='size-3.5'/> : <Languages aria-hidden className='size-4'/>}
                Retranslate
              </button>
              <CopyButton value={flag.translation} label='Copy'/>
            </div>
          </div>
          <p className='rounded-md border border-line bg-deep px-3 py-2 font-mono text-sm whitespace-pre-wrap break-words text-fg focus:border-line-strong focus:outline-none' {...selectAllScope}>{flag.translation}</p>
        </div>
      ) : (flag.query && flag.translation_language === 'en') ? (
        <p className='mt-2 text-xs text-subtle'>Already in English, no translation needed.</p>
      ) : null}

      {(flag.source_url) ? (
        <div className='mt-4'>
          <div className='mb-1 flex min-h-8 items-center justify-between gap-2'>
            <h3 className='section-label'>Source URL <span className='normal-case tracking-normal text-subtle'>(not loaded)</span></h3>
            <CopyButton value={flag.source_url} label='Copy'/>
          </div>
          {/* plain text on purpose: no link, no preview */}
          <p className='rounded-md border border-line bg-deep px-3 py-2 font-mono text-xs break-all text-muted select-all focus:border-line-strong focus:outline-none' {...selectAllScope}>{flag.source_url}</p>
        </div>
      ) : null}

      {(scores.length) ? (
        <div className='mt-4'>
          <h3 className='section-label mb-1'>Worst scores</h3>
          <dl className='flex flex-wrap gap-1.5'>
            {scores.map(([ key, value ]) => (
              <div key={key} className='flex items-baseline gap-1.5 rounded bg-deep px-2 py-1 text-xs'>
                <dt className='text-subtle'>{key}</dt>
                <dd className='font-mono text-fg tabular-nums'>{formatScore(value)}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}

      <form
        className='mt-4'
        onSubmit={(event) => {
          event.preventDefault();
          saveNotes();
        }}
      >
        <label htmlFor={`flag-notes-${flag.id}`} className='section-label mb-1 block'>Notes</label>
        <textarea
          id={`flag-notes-${flag.id}`}
          className='input min-h-16 resize-y'
          rows={2}
          value={notes}
          placeholder='Add a note for other reviewers...'
          onChange={(event) => setNotes(event.target.value)}
        />
        {(notesDirty) ? (
          <div className='mt-2 flex justify-end gap-2'>
            <button type='button' className='btn btn-ghost btn-sm' disabled={mutation.isPending} onClick={() => setNotes(flag.notes ?? '')}>Discard</button>
            <button type='submit' className='btn btn-primary btn-sm' disabled={mutation.isPending}>
              {(savingNotes) ? <Spinner className='size-3.5 border-white/40 border-t-white'/> : null}
              Save notes
            </button>
          </div>
        ) : null}
      </form>

      {/* the current status is left out, its button would only ever be disabled */}
      <div className='-mx-4 mt-4 -mb-4 grid auto-cols-fr grid-flow-col gap-2 border-t border-line p-3 sm:hidden'>
        {STATUSES.filter((item) => item.value !== flag.status).map((item) => statusButton(item, true))}
      </div>

      {(matches) ? (
        <ConfirmMatchesDialog
          flag={flag}
          matches={matches}
          // closed before the request so the dialog never outlives the card (it leaves the pending queue once confirmed)
          onConfirm={(match) => {
            setMatches(null);
            setStatus(ContentFlagStatuses.CONFIRMED, match);
          }}
          onClose={() => setMatches(null)}
        />
      ) : null}
      {(flaggingPrompt) ? <FlagPromptDialog flag={flag} onClose={() => setFlaggingPrompt(false)}/> : null}
      {(blocking && user) ? (
        <BlockUserDialog
          user={user}
          blocked={user.blocked}
          blockedReason={user.blocked_reason}
          defaultReason={flagBlockReason(flag)}
          onClose={() => setBlocking(false)}
        />
      ) : null}
    </li>
  );
}


interface MatchSelection {
  sha256: boolean,
  pdq: boolean,
  // how many pending flags those cover
  others: number,
}

// Asked when confirming a flag other pending flags share the media with: the exact same file (sha256) or visually
// similar media (pdq). Nothing is ticked to start with, each kind of match is opted into.
function ConfirmMatchesDialog({ flag, matches, onConfirm, onClose }: {
  flag: ContentFlag,
  matches: ContentFlagMatches,
  onConfirm: (match: MatchSelection) => void,
  onClose: () => void,
}) {
  const titleId = useId();
  const [ sha256, setSha256 ] = useState(false);
  const [ pdq, setPdq ] = useState(false);
  const others = ((sha256) ? matches.sha256?.pending ?? 0 : 0) + ((pdq) ? matches.pdq?.pending ?? 0 : 0);

  return (
    <Modal labelledBy={titleId} onClose={onClose} className='max-w-lg'>
      <form
        className='p-5 sm:p-6'
        onSubmit={(event) => {
          event.preventDefault();
          onConfirm({sha256, pdq, others});
        }}
      >
        <h2 id={titleId} className='pr-10 text-lg font-semibold text-white'>Other flags match #{flag.id}</h2>
        <p className='mt-2 text-sm text-muted'>Tick the matches to confirm along with it. Only pending flags are changed.</p>

        <div className='mt-4 space-y-2'>
          <MatchOption
            label='Same file'
            kind='SHA-256'
            hash={flag.sha256}
            counts={matches.sha256}
            checked={sha256}
            onChange={setSha256}
          />
          <MatchOption
            label='Visually similar'
            kind='PDQ'
            hint={pdqHint(matches.pdq_distance)}
            hash={flag.pdq}
            counts={matches.pdq}
            checked={pdq}
            onChange={setPdq}
          />
        </div>

        <div className='mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end'>
          <button type='button' className='btn btn-secondary' onClick={onClose}>Cancel</button>
          <button type='submit' className='btn btn-danger'>
            {(others) ? `Confirm ${(others + 1).toLocaleString()} flags` : `Confirm only #${flag.id}`}
          </button>
        </div>
      </form>
    </Modal>
  );
}


// One kind of match in `ConfirmMatchesDialog`: its pending count to tick, and the reviewed ones it leaves alone
function MatchOption({ label, kind, hint, hash, counts, checked, onChange }: {
  label: string,
  kind: string,
  hint?: string,
  hash: string | null,
  counts: ContentFlagMatchCounts | null,
  checked: boolean,
  onChange: (checked: boolean) => void,
}) {
  const id = useId();
  if (!hash || !counts || !(counts.pending + counts.dismissed + counts.reported)) {
    return null;
  }
  const ignored = [
    (counts.dismissed) ? `${counts.dismissed.toLocaleString()} dismissed` : null,
    (counts.reported) ? `${counts.reported.toLocaleString()} reported` : null,
  ].filter(Boolean);

  return (
    <div className={cn('rounded-md border p-3 text-sm', (checked) ? 'border-danger/60 bg-danger/5' : 'border-line')}>
      <label htmlFor={id} className={cn('flex items-start gap-2', (counts.pending) ? 'cursor-pointer' : 'cursor-not-allowed')}>
        <input
          id={id}
          type='checkbox'
          checked={checked}
          disabled={!counts.pending}
          onChange={(event) => onChange(event.target.checked)}
          className='mt-0.5'
        />
        <span className='min-w-0 flex-1'>
          <span className='flex flex-wrap items-center gap-1.5'>
            <span className='font-medium text-white'>{label}</span>
            <span title={hint} className={cn('inline-flex items-center gap-1 text-subtle', hint && 'cursor-help')}>
              ({kind})
              {(hint) ? <Info aria-hidden className='size-3.5'/> : null}
            </span>
            <Chip tone={(counts.pending) ? 'warning' : 'neutral'} className='ml-auto'>{counts.pending.toLocaleString()} pending</Chip>
          </span>
          {(hint) ? <span className='sr-only'>{hint}</span> : null}
          {(ignored.length) ? (
            <span className='mt-1 block text-xs text-subtle'>
              Ignoring {ignored.join(' and ')}, {((counts.dismissed + counts.reported) === 1) ? 'it keeps its' : 'they keep their'} status.
            </span>
          ) : null}
        </span>
      </label>
      {/* outside the label so copying doesn't toggle the checkbox */}
      <div className='mt-2 pl-6'>
        <CopyableValue value={hash}/>
      </div>
    </div>
  );
}


// Turns a media flag into a text flag on its prompt, for imagine/edit outputs where the prompt was the problem and not
// the image that was sent in. The media's hashes are dropped, so confirming it never matches other flags of that image.
function FlagPromptDialog({ flag, onClose }: {flag: ContentFlag, onClose: () => void}) {
  const titleId = useId();
  const toast = useToast();
  const mutation = useFlagAdminContentFlagPromptMutation();

  const submit = () => {
    mutation.mutate({flagId: flag.id}, {
      onSuccess: () => {
        toast(`Flag ${flag.id}: now flags the prompt`);
        onClose();
      },
    });
  };

  return (
    <Modal labelledBy={titleId} onClose={() => !mutation.isPending && onClose()} className='max-w-lg'>
      <form
        className='p-5 sm:p-6'
        onSubmit={(event) => {
          event.preventDefault();
          if (!mutation.isPending) {
            submit();
          }
        }}
      >
        <h2 id={titleId} className='pr-10 text-lg font-semibold text-white'>Flag the prompt of #{flag.id} instead of the media?</h2>
        <p className='mt-2 text-sm text-muted'>
          This becomes a text flag on the prompt below. The media’s SHA-256, PDQ, frames and source URL are removed, so
          confirming it won’t match other flags of the same image. The status and scanner labels stay. This can’t be undone.
        </p>
        <p className='mt-3 rounded-md border border-line bg-deep px-3 py-2 font-mono text-sm whitespace-pre-wrap break-words text-fg'>{flag.query}</p>

        {(mutation.isError) ? (
          <p role='alert' className='mt-4 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-fg'>
            {errorMessage(mutation.error, 'Couldn’t flag the prompt.')}
          </p>
        ) : null}

        <div className='mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end'>
          <button type='button' className='btn btn-secondary' onClick={onClose} disabled={mutation.isPending}>Cancel</button>
          <button type='submit' className='btn btn-danger' disabled={mutation.isPending}>
            {(mutation.isPending) ? <Spinner className='size-4 border-white/40 border-t-white'/> : null}
            Flag prompt only
          </button>
        </div>
      </form>
    </Modal>
  );
}


// Marks a flag reported and (optionally) blocks whoever posted it, in one go.
function ReportFlagDialog({ flag, onClose }: {flag: ContentFlag, onClose: () => void}) {
  const titleId = useId();
  const blockId = useId();
  const reasonId = useId();
  const toast = useToast();
  const { user: me } = useAuth();
  const report = usePatchAdminContentFlagMutation();
  const block = usePatchAdminUserMutation();
  const undoAction = useUndoStatusAction();

  const { user } = flag;
  // already blocked, or one this viewer isn't allowed to block
  const blockable = !!user && !user.blocked && canBlockUser(user, isOwner(me));
  const [ blockUser, setBlockUser ] = useState(false);
  const [ reason, setReason ] = useState(flagBlockReason(flag));
  // once set, a failed block can be retried without re-reporting
  const [ reported, setReported ] = useState(false);

  const pending = report.isPending || block.isPending;

  const runBlock = () => {
    if (!user) {
      return;
    }
    block.mutate({userId: user.id, patch: {blocked: true, blocked_reason: reason.trim() || null}}, {
      onSuccess: () => {
        toast(`Blocked ${user.username}`);
        onClose();
      },
    });
  };

  const submit = () => {
    if (reported) {
      runBlock();
      return;
    }
    report.mutate({flagId: flag.id, patch: {status: ContentFlagStatuses.REPORTED}}, {
      onSuccess: () => {
        setReported(true);
        // only undoes the report, a block in the same step stays (unblocking is for owners)
        toast(`Flag ${flag.id}: reported`, 'success', undoAction(flag.id, flag.status));
        if (blockUser && blockable) {
          runBlock();
        } else {
          onClose();
        }
      },
    });
  };

  const error = (report.isError) ?
    errorMessage(report.error, 'Couldn’t mark the flag reported.') :
    (block.isError) ? `The flag was marked reported, but blocking failed: ${errorMessage(block.error, 'Couldn’t block the user.')}` : null;

  return (
    <Modal labelledBy={titleId} onClose={() => !pending && onClose()} className='max-w-lg'>
      <form
        className='p-5 sm:p-6'
        onSubmit={(event) => {
          event.preventDefault();
          if (!pending) {
            submit();
          }
        }}
      >
        <h2 id={titleId} className='pr-10 text-lg font-semibold text-white'>Mark flag #{flag.id} reported?</h2>

        <div className='mt-3 rounded-md border border-line bg-deep p-3'>
          <UserCell user={user} fallbackId={flag.user_id}/>
          {(flag.category || user?.blocked) ? (
            <div className='mt-2 flex flex-wrap gap-1.5'>
              {(flag.category) ? <Chip tone={(flag.category.startsWith('unsafe')) ? 'danger' : 'warning'}>{flag.category}</Chip> : null}
              {(user?.blocked) ? <Chip tone='danger' title={user.blocked_reason || undefined}>Already blocked</Chip> : null}
            </div>
          ) : null}
        </div>

        {(user && blockable) ? (
          <div className='mt-3 rounded-md border border-line p-3 text-sm'>
            <label htmlFor={blockId} className='flex cursor-pointer items-start gap-2'>
              <input
                id={blockId}
                type='checkbox'
                checked={blockUser}
                onChange={(event) => setBlockUser(event.target.checked)}
                disabled={pending || reported}
                className='mt-0.5'
              />
              <span>
                <span className='flex items-center gap-1.5 font-medium text-white'>
                  <Ban aria-hidden className='size-4 text-danger'/>
                  Block {user.username} from NotSoBot
                </span>
                <span className='mt-0.5 block text-muted'>Stops them from using NotSoBot anywhere.</span>
              </span>
            </label>
            {(blockUser) ? (
              <div className='mt-3'>
                <label htmlFor={reasonId} className='mb-1.5 block text-muted'>Block reason</label>
                <textarea
                  id={reasonId}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  maxLength={BLOCK_REASON_MAX}
                  rows={2}
                  disabled={pending}
                  className='input'
                />
              </div>
            ) : null}
          </div>
        ) : null}

        {(error) ? (
          <p role='alert' className='mt-4 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-fg'>{error}</p>
        ) : null}

        <div className='mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end'>
          <button type='button' className='btn btn-secondary' onClick={onClose} disabled={pending}>
            {(reported) ? 'Close' : 'Cancel'}
          </button>
          <button type='submit' className='btn btn-danger' disabled={pending}>
            {(pending) ? <Spinner className='size-4 border-white/40 border-t-white'/> : null}
            {(reported) ? 'Retry block' : `Mark reported${(blockUser && blockable) ? ' and block' : ''}`}
          </button>
        </div>
      </form>
    </Modal>
  );
}


function formatScore(value: unknown): string {
  if (typeof value === 'number') {
    return (Number.isInteger(value)) ? String(value) : value.toFixed(3);
  }
  if (typeof value === 'string' || typeof value === 'boolean') {
    return String(value);
  }
  return JSON.stringify(value);
}


function ListSkeleton() {
  return (
    <ul aria-hidden className='space-y-3'>
      {Array.from({length: 4}, (_, i) => (
        <li key={i} className='card p-5'>
          <Skeleton className='h-4 w-56'/>
          <Skeleton className='mt-3 h-8 w-40 bg-surface-2'/>
          <Skeleton className='mt-4 h-20 w-full bg-surface-2'/>
        </li>
      ))}
    </ul>
  );
}
