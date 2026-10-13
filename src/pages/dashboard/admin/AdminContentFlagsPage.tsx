// Content flags are records of media the bot's safety scan flagged. This page is deliberately text only:
// NEVER render `source_url` (or any other url here) as <img>/<video>/<iframe>/background-image or any other
// embed, and never as a link. At most it's plain, selectable text.

import { Ban, Flag, X } from 'lucide-react';
import { useEffect, useId, useState } from 'react';

import { Modal } from '@/components/ui/Modal';

import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { ContentFlagCategories, ContentFlagStatuses, type ContentFlag, type ContentFlagStatus } from '@/lib/api';
import { ADMIN_PAGE_SIZE, errorMessage, useAdminContentFlagsQuery, usePatchAdminContentFlagMutation, usePatchAdminUserMutation } from '@/lib/api/dashboardQueries';
import { cn, formatDateTime, formatMemory } from '@/lib/utils';

import { DashboardHeader, EmptyState, ErrorPanel, Skeleton } from '../ui';
import { Chip, CopyableValue, DetailList, Pagination, selectAllScope, useSearchParamState, UserCell } from './adminUi';
import { BLOCK_REASON_MAX } from './BlockUserDialog';


type Tone = 'warning' | 'danger' | 'neutral' | 'brand';

const STATUSES: Array<{value: ContentFlagStatus, label: string, action: string, tone: Tone}> = [
  {value: ContentFlagStatuses.PENDING, label: 'Pending', action: 'Mark pending', tone: 'warning'},
  {value: ContentFlagStatuses.CONFIRMED, label: 'Confirmed', action: 'Confirm', tone: 'danger'},
  {value: ContentFlagStatuses.DISMISSED, label: 'Dismissed', action: 'Dismiss', tone: 'neutral'},
  {value: ContentFlagStatuses.REPORTED, label: 'Reported', action: 'Mark reported', tone: 'brand'},
];

function statusInfo(status: number) {
  return STATUSES.find((item) => item.value === status) ?? {value: status, label: `Status ${status}`, action: '', tone: 'neutral' as Tone};
}


function parseStatus(value: string | null): number | null {
  if (value === null || value === '' || Number.isNaN(Number(value))) {
    return null;
  }
  return Number(value);
}

function parseBool(value: string | null): boolean | null {
  return (value === '1' || value === 'true') ? true : (value === '0' || value === 'false') ? false : null;
}


export function AdminContentFlagsPage() {
  const { searchParams, page, update, setPage } = useSearchParamState();
  const userId = (searchParams.get('user_id') || '').trim();
  const status = parseStatus(searchParams.get('status'));
  const category = searchParams.get('category') || '';
  const needsHumanReview = parseBool(searchParams.get('needs_human_review'));

  // the user id box edits locally and lands in the URL once typing stops
  const [ userIdInput, setUserIdInput ] = useState(userId);
  useEffect(() => setUserIdInput(userId), [userId]);
  const debouncedUserId = useDebouncedValue(userIdInput.trim(), 400);
  useEffect(() => {
    if (debouncedUserId !== userId && (!debouncedUserId || /^\d+$/.test(debouncedUserId))) {
      update({user_id: debouncedUserId});
    }
    // only when the typed value settles
  }, [debouncedUserId]);

  const { data, isPending, isError, error, isPlaceholderData, isFetching, isRefetching, refetch } = useAdminContentFlagsQuery({
    userId,
    status,
    category,
    needsHumanReview,
    page,
  });
  const items = data?.items ?? [];
  const filtered = !!(userId || status !== null || category || needsHumanReview !== null);

  return (
    <>
      <DashboardHeader
        title='Content flags'
        description='Media the safety scan flagged. Shown as metadata only, nothing is previewed.'
      />

      <div className='card mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4'>
        <label className='text-sm'>
          <span className='mb-1 block text-subtle'>Status</span>
          <select className='input' value={(status === null) ? '' : String(status)} onChange={(event) => update({status: event.target.value})}>
            <option value=''>Any</option>
            {STATUSES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        <label className='text-sm'>
          <span className='mb-1 block text-subtle'>Category</span>
          <select className='input' value={category} onChange={(event) => update({category: event.target.value})}>
            <option value=''>Any</option>
            {(category && !(ContentFlagCategories as ReadonlyArray<string>).includes(category)) ? <option value={category}>{category}</option> : null}
            {ContentFlagCategories.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label className='text-sm'>
          <span className='mb-1 block text-subtle'>Needs human review</span>
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
        <label className='text-sm'>
          <span className='mb-1 block text-subtle'>User id</span>
          <span className='relative block'>
            <input
              className='input pr-9 font-mono'
              inputMode='numeric'
              placeholder='Any user'
              value={userIdInput}
              onChange={(event) => setUserIdInput(event.target.value)}
            />
            {(userIdInput) ? (
              <button
                type='button'
                aria-label='Clear user filter'
                className='absolute top-1/2 right-1.5 -translate-y-1/2 cursor-pointer rounded p-1 text-subtle hover:text-fg'
                onClick={() => {
                  setUserIdInput('');
                  update({user_id: null});
                }}
              >
                <X className='size-4'/>
              </button>
            ) : null}
          </span>
        </label>
      </div>

      {(isPending) ? (
        <ListSkeleton/>
      ) : (isError && !items.length) ? (
        <ErrorPanel title='Couldn’t load content flags' message={errorMessage(error)} onRetry={() => refetch()} retrying={isRefetching}/>
      ) : (!items.length) ? (
        <EmptyState icon={<Flag className='size-10'/>} title='No content flags'>
          {(filtered) ? 'Nothing matches these filters.' : null}
        </EmptyState>
      ) : (
        <>
          <ul className={cn('space-y-3 transition-opacity', isPlaceholderData && 'opacity-60')}>
            {items.map((flag) => <ContentFlagCard key={flag.id} flag={flag}/>)}
          </ul>
          <Pagination page={page} count={data?.count ?? 0} pageSize={ADMIN_PAGE_SIZE} onChange={setPage} fetching={isFetching && isPlaceholderData}/>
        </>
      )}
    </>
  );
}


function ContentFlagCard({ flag }: {flag: ContentFlag}) {
  const toast = useToast();
  const mutation = usePatchAdminContentFlagMutation();
  const [ notes, setNotes ] = useState(flag.notes ?? '');
  useEffect(() => setNotes(flag.notes ?? ''), [flag.notes]);
  const notesDirty = notes !== (flag.notes ?? '');
  const [ reporting, setReporting ] = useState(false);

  const status = statusInfo(flag.status);
  const pendingStatus = (mutation.isPending) ? mutation.variables?.patch.status : undefined;
  const savingNotes = mutation.isPending && mutation.variables?.patch.notes !== undefined;

  const setStatus = (value: ContentFlagStatus) => {
    mutation.mutate({flagId: flag.id, patch: {status: value}}, {
      onSuccess: () => toast(`Flag ${flag.id}: ${statusInfo(value).label.toLowerCase()}`),
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

  return (
    <li className='card p-4 sm:p-5'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div className='min-w-0'>
          <div className='flex flex-wrap items-center gap-2'>
            <span className='font-mono text-sm text-white'>#{flag.id}</span>
            <Chip tone={status.tone}>{status.label}</Chip>
            {(flag.category) ? <Chip tone={(flag.category.startsWith('unsafe')) ? 'danger' : 'warning'}>{flag.category}</Chip> : null}
            {(flag.action) ? <Chip>action: {flag.action}</Chip> : null}
            {(flag.needs_human_review) ? <Chip tone='warning'>needs human review</Chip> : null}
          </div>
          <p className='mt-1 text-xs text-subtle'>{formatDateTime(flag.created)}</p>
        </div>
        <div className='flex flex-wrap gap-2'>
          {STATUSES.map((item) => (
            <button
              key={item.value}
              type='button'
              className={cn('btn btn-sm', (item.value === ContentFlagStatuses.CONFIRMED) ? 'btn-danger' : 'btn-secondary')}
              disabled={mutation.isPending || flag.status === item.value}
              // reporting goes through a dialog so the uploader can be blocked in the same step
              onClick={() => (item.value === ContentFlagStatuses.REPORTED) ? setReporting(true) : setStatus(item.value)}
            >
              {(pendingStatus === item.value) ? <Spinner className='size-3.5'/> : null}
              {item.action}
            </button>
          ))}
        </div>
      </div>

      <div className='mt-3'>
        <UserCell user={flag.user} fallbackId={flag.user_id}/>
      </div>

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
            ['Frames', (flag.frames !== null && flag.frames !== undefined)
              ? `${framesFlagged.length.toLocaleString()} flagged of ${flag.frames.toLocaleString()}`
              : '—'],
            (framesFlagged.length) ? ['Flagged frames', <span className='font-mono text-xs'>{framesFlagged.join(', ')}</span>] : null,
            ['SHA-256', (flag.sha256) ? <CopyableValue value={flag.sha256}/> : '—'],
            ['PDQ', (flag.pdq) ? <CopyableValue value={flag.pdq}/> : '—'],
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
                {(flag.reviewed_at) ? formatDateTime(flag.reviewed_at) : null}
                {(flag.reviewed_by) ? <> by <span className='font-mono'>{flag.reviewed_by}</span></> : null}
              </span>
            )] : null,
          ]}
        />
      </div>

      {(flag.query) ? (
        <div className='mt-4'>
          <h3 className='section-label mb-1'>Query</h3>
          <p className='rounded-md border border-line bg-deep px-3 py-2 font-mono text-sm whitespace-pre-wrap break-words text-fg focus:border-line-strong focus:outline-none' {...selectAllScope}>{flag.query}</p>
        </div>
      ) : null}

      {(flag.source_url) ? (
        <div className='mt-4'>
          <h3 className='section-label mb-1'>Source URL <span className='normal-case tracking-normal text-subtle'>(not loaded)</span></h3>
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

      {(reporting) ? <ReportFlagDialog flag={flag} onClose={() => setReporting(false)}/> : null}
    </li>
  );
}


// Marks a flag reported and (optionally) blocks whoever posted it, in one go.
function ReportFlagDialog({ flag, onClose }: {flag: ContentFlag, onClose: () => void}) {
  const titleId = useId();
  const blockId = useId();
  const reasonId = useId();
  const toast = useToast();
  const report = usePatchAdminContentFlagMutation();
  const block = usePatchAdminUserMutation();

  const { user } = flag;
  const [ blockUser, setBlockUser ] = useState(false);
  const [ reason, setReason ] = useState(`Content flag #${flag.id}${(flag.category) ? ` (${flag.category})` : ''}`);
  // once set, a failed block can be retried without re-reporting
  const [ reported, setReported ] = useState(false);

  const pending = report.isPending || block.isPending;

  const runBlock = () => {
    if (!user) {
      return;
    }
    block.mutate({userId: user.id, blocked: true, reason: reason.trim()}, {
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
        toast(`Flag ${flag.id}: reported`);
        if (blockUser && user) {
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
          {(flag.category) ? <div className='mt-2'><Chip tone={(flag.category.startsWith('unsafe')) ? 'danger' : 'warning'}>{flag.category}</Chip></div> : null}
        </div>

        {(user) ? (
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
            {(reported) ? 'Retry block' : `Mark reported${(blockUser && user) ? ' and block' : ''}`}
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
