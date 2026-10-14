// Bug, user and server reports sent with the bot's `report` command (prefixed and slash).
// `content` is whatever the reporter typed, so it's only ever rendered as plain text.

import { ExternalLink, Filter, Inbox, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';

import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { Routes } from '@/config';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { ReportStatuses, ReportTypes, type Report, type ReportPatch, type ReportStatus } from '@/lib/api';
import { ADMIN_PAGE_SIZE, errorMessage, useAdminReportsQuery, usePatchAdminReportMutation } from '@/lib/api/dashboardQueries';
import { cn, formatDateTime } from '@/lib/utils';

import { DashboardHeader, EmptyState, ErrorPanel, Skeleton } from '../ui';
import { Chip, CopyableValue, DetailList, ExactDate, Pagination, useSearchParamState, useStepBackFromEmptyPage, UserCell } from './adminUi';


type Tone = 'warning' | 'danger' | 'neutral' | 'brand' | 'success';

const STATUSES: Array<{value: ReportStatus, label: string, action: string, tone: Tone}> = [
  {value: ReportStatuses.OPEN, label: 'Open', action: 'Reopen', tone: 'warning'},
  {value: ReportStatuses.RESOLVED, label: 'Resolved', action: 'Resolve', tone: 'success'},
  {value: ReportStatuses.DISMISSED, label: 'Dismissed', action: 'Dismiss', tone: 'neutral'},
];

const TYPES: Array<{value: number, label: string, tone: Tone}> = [
  {value: ReportTypes.BUG, label: 'Bug', tone: 'brand'},
  {value: ReportTypes.USER, label: 'User', tone: 'danger'},
  {value: ReportTypes.SERVER, label: 'Server', tone: 'warning'},
];

function statusInfo(status: number) {
  return STATUSES.find((item) => item.value === status) ?? {value: status, label: `Status ${status}`, action: '', tone: 'neutral' as Tone};
}

function typeInfo(type: number) {
  return TYPES.find((item) => item.value === type) ?? {value: type, label: `Type ${type}`, tone: 'neutral' as Tone};
}


function parseEnum(value: string | null): number | null {
  if (value === null || value === '' || Number.isNaN(Number(value))) {
    return null;
  }
  return Number(value);
}


export function AdminReportsPage() {
  const { searchParams, page, update, setPage } = useSearchParamState();
  const type = parseEnum(searchParams.get('type'));
  const status = parseEnum(searchParams.get('status'));
  const userId = (searchParams.get('user_id') || '').trim();
  const targetId = (searchParams.get('target_id') || '').trim();

  const { data, isPending, isError, error, isPlaceholderData, isFetching, isRefetching, refetch } = useAdminReportsQuery({
    type,
    status,
    userId,
    targetId,
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
  const filtered = !!(type !== null || status !== null || userId || targetId);

  return (
    <>
      <DashboardHeader
        title='Reports'
        description='Bug, user and server reports sent with the bot’s report command, newest first.'
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
          <span className='mb-1 block text-subtle'>Type</span>
          <select className='input' value={(type === null) ? '' : String(type)} onChange={(event) => update({type: event.target.value})}>
            <option value=''>Any</option>
            {TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        <IdFilter
          label='Reporter id'
          placeholder='Any reporter'
          value={userId}
          onChange={(value) => update({user_id: value})}
        />
        <IdFilter
          label='Target id'
          placeholder='Any user or server'
          value={targetId}
          onChange={(value) => update({target_id: value})}
        />
      </div>

      {(isPending || steppingBack) ? (
        <ListSkeleton/>
      ) : (isError && !items.length) ? (
        <ErrorPanel title='Couldn’t load reports' message={errorMessage(error)} onRetry={() => refetch()} retrying={isRefetching}/>
      ) : (!items.length) ? (
        <EmptyState icon={<Inbox className='size-10'/>} title='No reports'>
          {(filtered) ? 'Nothing matches these filters.' : null}
        </EmptyState>
      ) : (
        <>
          <Pagination {...pagination} className='mt-0 mb-4'/>
          <ul className={cn('space-y-3 transition-opacity', isPlaceholderData && 'opacity-60')}>
            {items.map((report) => (
              <ReportCard
                key={report.id}
                report={report}
                onFilterReporter={(value) => update({user_id: value})}
                onFilterTarget={(value) => update({target_id: value})}
              />
            ))}
          </ul>
          <Pagination {...pagination}/>
        </>
      )}
    </>
  );
}


// edits locally and lands in the URL once typing stops (and only when it's a snowflake)
function IdFilter({ label, placeholder, value, onChange }: {
  label: string,
  placeholder: string,
  value: string,
  onChange: (value: string | null) => void,
}) {
  const [ input, setInput ] = useState(value);
  useEffect(() => setInput(value), [value]);
  const debounced = useDebouncedValue(input.trim(), 400);
  useEffect(() => {
    if (debounced !== value && (!debounced || /^\d+$/.test(debounced))) {
      onChange(debounced);
    }
    // only when the typed value settles
  }, [debounced]);

  return (
    <label className='text-sm'>
      <span className='mb-1 block text-subtle'>{label}</span>
      <span className='relative block'>
        <input
          className='input pr-9 font-mono'
          inputMode='numeric'
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


function FilterButton({ label, onClick }: {label: string, onClick: () => void}) {
  return (
    <button
      type='button'
      aria-label={label}
      title={label}
      className='shrink-0 cursor-pointer rounded p-1 text-subtle hover:bg-surface-3 hover:text-fg'
      onClick={onClick}
    >
      <Filter className='size-3.5'/>
    </button>
  );
}


function ReportCard({ report, onFilterReporter, onFilterTarget }: {
  report: Report,
  onFilterReporter: (userId: string) => void,
  onFilterTarget: (targetId: string) => void,
}) {
  const toast = useToast();
  const mutation = usePatchAdminReportMutation();
  const [ notes, setNotes ] = useState(report.notes ?? '');
  useEffect(() => setNotes(report.notes ?? ''), [report.notes]);
  const notesDirty = notes !== (report.notes ?? '');

  const status = statusInfo(report.status);
  const type = typeInfo(report.type);
  const pendingStatus = (mutation.isPending) ? mutation.variables?.patch.status : undefined;
  const savingNotes = mutation.isPending && mutation.variables?.patch.status === undefined;

  // a status change carries unsaved notes along, so "write a note, click Resolve" is one step
  const setStatus = (value: ReportStatus) => {
    const patch: ReportPatch = {status: value};
    if (notesDirty) {
      patch.notes = notes.trim() || null;
    }
    mutation.mutate({reportId: report.id, patch}, {
      onSuccess: () => toast(`Report ${report.id}: ${statusInfo(value).label.toLowerCase()}`),
      onError: (error) => toast(errorMessage(error), 'error'),
    });
  };
  const saveNotes = () => {
    mutation.mutate({reportId: report.id, patch: {notes: notes.trim() || null}}, {
      onSuccess: () => toast(`Report ${report.id}: notes saved`),
      onError: (error) => toast(errorMessage(error), 'error'),
    });
  };

  // where the report command was used; a DM has no guild
  const jumpUrl = (report.channel_id && report.message_id)
    ? `https://discord.com/channels/${report.guild_id ?? '@me'}/${report.channel_id}/${report.message_id}`
    : null;

  return (
    <li className='card p-4 sm:p-5'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div className='min-w-0'>
          <div className='flex flex-wrap items-center gap-2'>
            <span className='font-mono text-sm text-white'>#{report.id}</span>
            <Chip tone={type.tone}>{type.label}</Chip>
            <Chip tone={status.tone}>{status.label}</Chip>
          </div>
          <p className='mt-1 text-xs text-subtle'><ExactDate value={report.created} format={formatDateTime}/></p>
        </div>
        <div className='flex flex-wrap gap-2'>
          {STATUSES.map((item) => (
            <button
              key={item.value}
              type='button'
              className={cn('btn btn-sm', (item.value === ReportStatuses.RESOLVED) ? 'btn-primary' : 'btn-secondary')}
              disabled={mutation.isPending || report.status === item.value}
              onClick={() => setStatus(item.value)}
            >
              {(pendingStatus === item.value) ? <Spinner className='size-3.5'/> : null}
              {item.action}
            </button>
          ))}
        </div>
      </div>

      <div className='mt-4 grid gap-4 lg:grid-cols-2'>
        <div>
          <h3 className='section-label mb-1'>Reporter</h3>
          <div className='flex items-center gap-2'>
            <UserCell user={report.user}/>
            <FilterButton label='Show reports from this user' onClick={() => onFilterReporter(report.user.id)}/>
            {(report.user.blocked) ? <Chip tone='danger' title={report.user.blocked_reason ?? undefined}>blocked</Chip> : null}
          </div>
        </div>
        {(report.type !== ReportTypes.BUG) ? (
          <div>
            <h3 className='section-label mb-1'>Reported {(report.type === ReportTypes.SERVER) ? 'server' : 'user'}</h3>
            {(report.target_id) ? (
              <div className='flex flex-wrap items-center gap-2'>
                <CopyableValue value={report.target_id} truncate={0}/>
                <FilterButton label='Show reports about this target' onClick={() => onFilterTarget(report.target_id!)}/>
                {(report.type === ReportTypes.USER) ? (
                  <Link to={`${Routes.DASHBOARD_ADMIN_USERS}?q=${report.target_id}`} className='text-xs text-code hover:underline'>
                    Find in users
                  </Link>
                ) : null}
              </div>
            ) : (
              <p className='text-sm text-subtle'>Not given</p>
            )}
          </div>
        ) : null}
      </div>

      <div className='mt-4'>
        <h3 className='section-label mb-1'>Report</h3>
        <p className='rounded-md border border-line bg-deep px-3 py-2 text-sm whitespace-pre-wrap break-words text-fg'>{report.content}</p>
      </div>

      <div className='mt-4'>
        <h3 className='section-label mb-1'>Sent from</h3>
        <DetailList
          items={[
            ['Server', (report.guild_id) ? <CopyableValue value={report.guild_id} truncate={0}/> : 'Direct messages'],
            ['Channel', (report.channel_id) ? <CopyableValue value={report.channel_id} truncate={0}/> : '—'],
            ['Message', (report.message_id) ? (
              <span className='inline-flex flex-wrap items-center gap-2'>
                <CopyableValue value={report.message_id} truncate={0}/>
                {(jumpUrl) ? (
                  <a href={jumpUrl} target='_blank' rel='noopener noreferrer' className='inline-flex items-center gap-1 text-xs text-code hover:underline'>
                    Open in Discord
                    <ExternalLink aria-hidden className='size-3'/>
                  </a>
                ) : null}
              </span>
            ) : '—'],
            (report.reviewed_at || report.reviewed_by) ? ['Reviewed', (
              <span>
                {(report.reviewed_at) ? <ExactDate value={report.reviewed_at} format={formatDateTime}/> : null}
                {(report.reviewed_by) ? <> by <span className='font-mono'>{report.reviewed_by}</span></> : null}
              </span>
            )] : null,
          ]}
        />
      </div>

      <form
        className='mt-4'
        onSubmit={(event) => {
          event.preventDefault();
          saveNotes();
        }}
      >
        <label htmlFor={`report-notes-${report.id}`} className='section-label mb-1 block'>Notes</label>
        <textarea
          id={`report-notes-${report.id}`}
          className='input min-h-16 resize-y'
          rows={2}
          maxLength={2000}
          value={notes}
          placeholder='Add a note for other reviewers (saved with the next status change too)...'
          onChange={(event) => setNotes(event.target.value)}
        />
        {(notesDirty) ? (
          <div className='mt-2 flex justify-end gap-2'>
            <button type='button' className='btn btn-ghost btn-sm' disabled={mutation.isPending} onClick={() => setNotes(report.notes ?? '')}>Discard</button>
            <button type='submit' className='btn btn-primary btn-sm' disabled={mutation.isPending}>
              {(savingNotes) ? <Spinner className='size-3.5 border-white/40 border-t-white'/> : null}
              Save notes
            </button>
          </div>
        ) : null}
      </form>
    </li>
  );
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
