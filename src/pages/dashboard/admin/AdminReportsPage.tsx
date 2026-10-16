// Bug, user, server, message and tag reports sent with the bot's `report` commands (prefixed, slash and context menus).
// `content` is whatever the reporter typed, so it's only ever rendered as plain text.

import { ExternalLink, Filter, Inbox } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';

import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { Routes } from '@/config';
import { ReportStatuses, ReportTypes, type Report, type ReportPatch, type ReportStatus } from '@/lib/api';
import { ADMIN_PAGE_SIZE, errorMessage, useAdminReportsQuery, usePatchAdminReportMutation } from '@/lib/api/dashboardQueries';
import { cn, formatDateTime } from '@/lib/utils';

import { DashboardHeader, EmptyState, ErrorPanel, Skeleton } from '../ui';
import { REPORT_TYPES, type ReportTone, reportJumpUrl, reportTypeInfo } from '../reports/reportLabels';
import { AdminTagModal, useOpenListItem } from './AdminTagModal';
import { adminServerPath, Chip, CopyableValue, DetailList, ExactDate, IdFilter, Pagination, useSearchParamState, useStepBackFromEmptyPage, UserCell } from './adminUi';


type Tone = ReportTone;

const STATUSES: Array<{value: ReportStatus, label: string, action: string, tone: Tone}> = [
  {value: ReportStatuses.OPEN, label: 'Open', action: 'Reopen', tone: 'warning'},
  {value: ReportStatuses.RESOLVED, label: 'Resolved', action: 'Resolve', tone: 'success'},
  {value: ReportStatuses.DISMISSED, label: 'Dismissed', action: 'Dismiss', tone: 'neutral'},
];

const TYPES = REPORT_TYPES;

// message reports are only for the bot's own responses, they target whoever used the command
const TARGET_LABELS: Record<number, string> = {
  [ReportTypes.USER]: 'user',
  [ReportTypes.SERVER]: 'server',
  [ReportTypes.MESSAGE]: 'command user',
  [ReportTypes.TAG]: 'tag',
};

function statusInfo(status: number) {
  return STATUSES.find((item) => item.value === status) ?? {value: status, label: `Status ${status}`, action: '', tone: 'neutral' as Tone};
}

const typeInfo = reportTypeInfo;

const TITLE_ID = 'admin-report-modal-title';


function parseEnum(value: string | null): number | null {
  if (value === null || value === '' || Number.isNaN(Number(value))) {
    return null;
  }
  return Number(value);
}

// defaults to the open ones (the review queue), `status=all` shows every report
function parseStatus(value: string | null): number | null {
  return (value === 'all') ? null : parseEnum(value) ?? ReportStatuses.OPEN;
}


export function AdminReportsPage() {
  const { searchParams, page, update, setPage } = useSearchParamState();
  const type = parseEnum(searchParams.get('type'));
  const status = parseStatus(searchParams.get('status'));
  const userId = (searchParams.get('user_id') || '').trim();
  const targetId = (searchParams.get('target_id') || '').trim();
  // sent from the server or about it (the admin server modal's "Reports")
  const guildId = (searchParams.get('guild_id') || '').trim();

  const { data, isPending, isError, error, isPlaceholderData, isFetching, isRefetching, refetch } = useAdminReportsQuery({
    type,
    status,
    userId,
    targetId,
    guildId,
    page,
  });
  const items = data?.items ?? [];
  const { openItem, previousId, nextId, open, close } = useOpenListItem(items, (report) => report.id);
  const steppingBack = useStepBackFromEmptyPage({page, setPage, data, isPlaceholderData, pageSize: ADMIN_PAGE_SIZE});
  const pagination = {
    page,
    count: data?.count ?? 0,
    pageSize: ADMIN_PAGE_SIZE,
    onChange: setPage,
    fetching: isFetching && isPlaceholderData,
  };
  const filtered = !!(type !== null || status !== ReportStatuses.OPEN || userId || targetId || guildId);
  // closes the report first, the one it's filtering by might not be in the new list
  const filterBy = (changes: Record<string, string | null>) => {
    close();
    update(changes);
  };

  return (
    <>
      <DashboardHeader
        title='Reports'
        description='Bug, user, server, message and tag reports sent with the bot’s report commands, newest first.'
      />

      <div className='card mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5'>
        <label className='text-sm'>
          <span className='mb-1 block text-subtle'>Status</span>
          <select
            className='input'
            value={(status === null) ? 'all' : String(status)}
            onChange={(event) => update({status: (event.target.value === String(ReportStatuses.OPEN)) ? null : event.target.value})}
          >
            <option value='all'>Any</option>
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
          placeholder='Any user, server or tag'
          value={targetId}
          onChange={(value) => update({target_id: value})}
        />
        <IdFilter
          label='Server id'
          placeholder='Sent from or about'
          value={guildId}
          onChange={(value) => update({guild_id: value})}
        />
      </div>

      {(isPending || steppingBack) ? (
        <ListSkeleton/>
      ) : (isError && !items.length) ? (
        <ErrorPanel title='Couldn’t load reports' message={errorMessage(error)} onRetry={() => refetch()} retrying={isRefetching}/>
      ) : (!items.length) ? (
        <EmptyState icon={<Inbox className='size-10'/>} title={(filtered) ? 'No reports' : 'No open reports'}>
          {(filtered) ? 'Nothing matches these filters.' : 'Everything’s been reviewed.'}
        </EmptyState>
      ) : (
        <>
          <Pagination {...pagination} className='mt-0 mb-4'/>
          <ul className={cn('card divide-y divide-line transition-opacity', isPlaceholderData && 'opacity-60')}>
            {items.map((report) => <ReportRow key={report.id} report={report} onOpen={open}/>)}
          </ul>
          <Pagination {...pagination}/>
        </>
      )}

      {(openItem) ? (
        <AdminTagModal labelledBy={TITLE_ID} previousId={previousId} nextId={nextId} onNavigate={open} onClose={close}>
          <ReportDetails
            key={openItem.id}
            report={openItem}
            onFilterReporter={(value) => filterBy({user_id: value})}
            onFilterTarget={(value) => filterBy({target_id: value})}
          />
        </AdminTagModal>
      ) : null}
    </>
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


// one line per report, just enough to triage from; the rest is in `ReportDetails` a click away.
// Plain content only inside (no buttons, links or focusable dates), since the whole row is a button.
function ReportRow({ report, onOpen }: {report: Report, onOpen: (id: string) => void}) {
  const status = statusInfo(report.status);
  const type = typeInfo(report.type);
  return (
    <li>
      <button
        type='button'
        className='flex w-full cursor-pointer flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-2.5 text-left first:rounded-t-[inherit] hover:bg-surface-2 sm:px-5'
        onClick={() => onOpen(report.id)}
      >
        {/* fixed widths so every row lines up in columns */}
        <span className='w-44 font-mono text-sm text-white'>#{report.id}</span>
        <Chip tone={type.tone} className='w-16 justify-center'>{type.label}</Chip>
        <Chip tone={status.tone} className='w-20 justify-center'>{status.label}</Chip>
        <span className='w-52 min-w-0'><UserCell user={report.user} size='sm'/></span>
        <span className='min-w-0 flex-1 basis-40 truncate text-sm text-muted'>{report.content}</span>
        <span className='ml-auto text-xs text-subtle'>{formatDateTime(report.created)}</span>
      </button>
    </li>
  );
}


function ReportDetails({ report, onFilterReporter, onFilterTarget }: {
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

  // where the report command was used, or the reported message for message reports; a DM has no guild
  const isMessageReport = report.type === ReportTypes.MESSAGE;
  const jumpUrl = reportJumpUrl(report);

  return (
    <div className='p-4 pr-14 sm:p-6 sm:pr-14'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div className='min-w-0'>
          <div className='flex flex-wrap items-center gap-2'>
            <h2 id={TITLE_ID} className='font-mono text-lg font-semibold text-white'>Report #{report.id}</h2>
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
            <h3 className='section-label mb-1'>Reported {TARGET_LABELS[report.type] ?? 'target'}</h3>
            {(report.target_id) ? (
              <div className='flex flex-wrap items-center gap-2'>
                <CopyableValue value={report.target_id} truncate={0}/>
                <FilterButton label='Show reports about this target' onClick={() => onFilterTarget(report.target_id!)}/>
                {(report.type === ReportTypes.USER || report.type === ReportTypes.MESSAGE) ? (
                  <Link to={`${Routes.DASHBOARD_ADMIN_USERS}?q=${report.target_id}`} className='text-xs text-code hover:underline'>
                    Find in users
                  </Link>
                ) : null}
                {(report.type === ReportTypes.TAG) ? (
                  <Link to={`${Routes.DASHBOARD_ADMIN_ALL_TAGS}?q=${report.target_id}`} className='text-xs text-code hover:underline'>
                    Find in tags
                  </Link>
                ) : null}
                {(report.type === ReportTypes.SERVER) ? (
                  <Link to={adminServerPath(report.target_id)} className='text-xs text-code hover:underline'>
                    Open server
                  </Link>
                ) : null}
              </div>
            ) : (
              <p className='text-sm text-subtle'>Not given</p>
            )}
          </div>
        ) : null}
        {(isMessageReport && report.tag_id) ? (
          <div>
            <h3 className='section-label mb-1'>Reported tag</h3>
            <div className='flex flex-wrap items-center gap-2'>
              <CopyableValue value={report.tag_id} truncate={0}/>
              <Link to={`${Routes.DASHBOARD_ADMIN_ALL_TAGS}?q=${report.tag_id}`} className='text-xs text-code hover:underline'>
                Find in tags
              </Link>
            </div>
          </div>
        ) : null}
      </div>

      <div className='mt-4'>
        <h3 className='section-label mb-1'>Report</h3>
        <p className='rounded-md border border-line bg-deep px-3 py-2 text-sm whitespace-pre-wrap break-words text-fg'>{report.content}</p>
      </div>

      <div className='mt-4'>
        <h3 className='section-label mb-1'>{(isMessageReport) ? 'Reported message' : 'Sent from'}</h3>
        <DetailList
          items={[
            ['Server', (report.guild_id) ? (
              <span className='inline-flex flex-wrap items-center gap-2'>
                <CopyableValue value={report.guild_id} truncate={0}/>
                <Link to={adminServerPath(report.guild_id)} className='text-xs text-code hover:underline'>Open server</Link>
              </span>
            ) : 'Direct messages'],
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
    </div>
  );
}


function ListSkeleton() {
  return (
    <ul aria-hidden className='card divide-y divide-line'>
      {Array.from({length: 6}, (_, i) => (
        <li key={i} className='flex items-center gap-3 px-4 py-3 sm:px-5'>
          <Skeleton className='h-4 w-44'/>
          <Skeleton className='h-5 w-16 bg-surface-2'/>
          <Skeleton className='h-5 w-20 bg-surface-2'/>
          <Skeleton className='size-6 rounded-full bg-surface-2'/>
          <Skeleton className='h-3 flex-1 bg-surface-2'/>
        </li>
      ))}
    </ul>
  );
}
