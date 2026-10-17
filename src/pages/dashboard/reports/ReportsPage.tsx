// The reports the user sent with the bot's report commands and where they stand. The reports are made in Discord, here they
// can talk with staff (only ever "NotSoAdmin" to them) about one and reopen it, even after it was resolved or dismissed.
// `content` is whatever the user typed, so it's only ever rendered as plain text.

import { ArrowLeft, ExternalLink, MessageSquareWarning, MessagesSquare, RotateCcw } from 'lucide-react';
import { Link, useParams } from 'react-router';

import { useAuth } from '@/auth';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { ReportStatuses, ReportTypes, type MeReport } from '@/lib/api';
import { Routes } from '@/config';
import {
  ME_REPORTS_PAGE_SIZE,
  errorMessage,
  useMeReportMessagesQuery,
  useMeReportQuery,
  useMeReportsQuery,
  usePostMeReportMessageMutation,
  useReopenMeReportMutation,
} from '@/lib/api/dashboardQueries';
import { cn, formatDateTime, formatExactDateTime } from '@/lib/utils';

import { Chip, Pagination, useSearchParamState, useStepBackFromEmptyPage } from '../admin/adminUi';
import { DashboardHeader, EmptyState, ErrorPanel, Panel, Skeleton } from '../ui';
import { REPORT_STATUSES, reportJumpUrl, reportStatusInfo, reportTypeInfo } from './reportLabels';
import { REPORT_STAFF_NAME, ReportThread } from './ReportThread';


function parseStatus(value: string | null): number | null {
  if (value === null || value === '' || Number.isNaN(Number(value))) {
    return null;
  }
  return Number(value);
}


// `/dashboard/reports/<id>` shows just that report (a link to it), the list otherwise
export function ReportsPage() {
  const { itemId } = useParams();
  return (itemId) ? <SingleReport reportId={itemId}/> : <ReportsList/>;
}


function reportPath(reportId: string): string {
  return `${Routes.DASHBOARD_REPORTS}/${reportId}`;
}


function SingleReport({ reportId }: {reportId: string}) {
  const { data: report, isPending, isError, error, isRefetching, refetch } = useMeReportQuery(reportId);
  return (
    <>
      <DashboardHeader title='Report' description={<span className='font-mono'>#{reportId}</span>}>
        <Link to={Routes.DASHBOARD_REPORTS} className='btn btn-secondary btn-sm'>
          <ArrowLeft className='size-4'/>
          All reports
        </Link>
      </DashboardHeader>
      {(isPending) ? (
        <ListSkeleton/>
      ) : (isError || !report) ? (
        <ErrorPanel title='Couldn’t load this report' message={errorMessage(error)} onRetry={() => refetch()} retrying={isRefetching}/>
      ) : (
        <>
          <ul className='card divide-y divide-line'>
            <ReportRow report={report} linked={false}/>
          </ul>
          <ReportConversation report={report}/>
        </>
      )}
    </>
  );
}


// works whatever the status is; replying alone doesn't reopen it, that's the Reopen button
function ReportConversation({ report }: {report: MeReport}) {
  const toast = useToast();
  const { user } = useAuth();
  const messages = useMeReportMessagesQuery(report.id);
  const send = usePostMeReportMessageMutation(report.id);
  const reopen = useReopenMeReportMutation(report.id);
  const closed = report.status !== ReportStatuses.OPEN;

  return (
    <Panel
      className='mt-4'
      title='Conversation'
      description={<>Talk with the NotSoBot team about this report. Their replies show up here as {REPORT_STAFF_NAME}.</>}
    >
      <ReportThread
        viewer='reporter'
        reporter={user}
        messages={messages.data?.items}
        loading={messages.isPending}
        error={messages.error}
        onRetry={() => messages.refetch()}
        onSend={(content) => send.mutateAsync(content).catch((error) => {
          toast(errorMessage(error), 'error');
          throw error;
        })}
        sending={send.isPending}
        notice={(closed) ? (
          <>This report is {reportStatusInfo(report.status).label.toLowerCase()}. Replying won’t reopen it, use <span className='text-fg'>Reopen</span> if you still need it looked at.</>
        ) : undefined}
        actions={(closed) ? (
          <button
            type='button'
            className='btn btn-secondary btn-sm'
            disabled={reopen.isPending}
            onClick={() => reopen.mutate(undefined, {
              onSuccess: () => toast('Report reopened'),
              onError: (error) => toast(errorMessage(error), 'error'),
            })}
          >
            {(reopen.isPending) ? <Spinner className='size-3.5'/> : <RotateCcw aria-hidden className='size-3.5'/>}
            Reopen
          </button>
        ) : null}
      />
    </Panel>
  );
}


function ReportsList() {
  const { searchParams, page, update, setPage } = useSearchParamState();
  const status = parseStatus(searchParams.get('status'));

  const { data, isPending, isError, error, isPlaceholderData, isFetching, isRefetching, refetch } = useMeReportsQuery({status, page});
  const items = data?.items ?? [];
  const steppingBack = useStepBackFromEmptyPage({page, setPage, data, isPlaceholderData, pageSize: ME_REPORTS_PAGE_SIZE});
  const pagination = {
    page,
    count: data?.count ?? 0,
    pageSize: ME_REPORTS_PAGE_SIZE,
    onChange: setPage,
    fetching: isFetching && isPlaceholderData,
  };

  return (
    <>
      <DashboardHeader
        title='Your Reports'
        description={<>Reports you’ve sent to the NotSoBot developers with the bot’s <code className='text-fg'>report</code> commands, newest first.</>}
      >
        <label className='flex items-center gap-2 text-sm text-muted'>
          Status
          <select className='input w-36' value={(status === null) ? '' : String(status)} onChange={(event) => update({status: event.target.value})}>
            <option value=''>Any</option>
            {REPORT_STATUSES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
      </DashboardHeader>

      {(isPending || steppingBack) ? (
        <ListSkeleton/>
      ) : (isError && !items.length) ? (
        <ErrorPanel title='Couldn’t load your reports' message={errorMessage(error)} onRetry={() => refetch()} retrying={isRefetching}/>
      ) : (!items.length) ? (
        <EmptyState icon={<MessageSquareWarning className='size-10'/>} title={(status === null) ? 'No reports yet' : `No ${reportStatusInfo(status).label.toLowerCase()} reports`}>
          {(status === null) ? (
            <>Send one in Discord with <code className='text-fg'>/report</code>, or right-click a user or one of NotSoBot’s messages and pick <span className='text-fg'>Apps → Report</span>.</>
          ) : null}
        </EmptyState>
      ) : (
        <>
          {(pagination.count > ME_REPORTS_PAGE_SIZE) ? <Pagination {...pagination} className='mt-0 mb-4'/> : null}
          <ul className={cn('card divide-y divide-line transition-opacity', isPlaceholderData && 'opacity-60')}>
            {items.map((report) => <ReportRow key={report.id} report={report}/>)}
          </ul>
          {(pagination.count > ME_REPORTS_PAGE_SIZE) ? <Pagination {...pagination}/> : null}
        </>
      )}
    </>
  );
}


function ReportTarget({ report }: {report: MeReport}) {
  if (report.type === ReportTypes.MESSAGE) {
    const jumpUrl = reportJumpUrl(report);
    return (jumpUrl) ? (
      <a href={jumpUrl} target='_blank' rel='noopener noreferrer' className='inline-flex items-center gap-1 text-code hover:underline'>
        Reported message
        <ExternalLink aria-hidden className='size-3'/>
      </a>
    ) : null;
  }
  if (report.target_id && report.type !== ReportTypes.BUG) {
    return <span>About <span className='font-mono'>{report.target_id}</span></span>;
  }
  return null;
}


// `linked` rows (the list) link to the report's own page, where the conversation is
function ReportRow({ report, linked = true }: {report: MeReport, linked?: boolean}) {
  const type = reportTypeInfo(report.type);
  const status = reportStatusInfo(report.status);
  const staffReplied = report.last_reply?.author === 'staff';

  return (
    <li className='flex items-start gap-3 px-4 py-3'>
      <span aria-hidden className='flex size-9 shrink-0 items-center justify-center rounded-md bg-[#ed4245]/15'>
        <MessageSquareWarning className='size-5 text-[#ed4245]'/>
      </span>
      <div className='min-w-0 flex-1'>
        <div className='flex flex-wrap items-center gap-2'>
          <Chip tone={type.tone}>{type.label}</Chip>
          <Chip tone={status.tone}>{status.label}</Chip>
          {(staffReplied && linked) ? <Chip tone='brand' title='The last reply is from the NotSoBot team'>{REPORT_STAFF_NAME} replied</Chip> : null}
          <span className='text-xs text-subtle' title={formatExactDateTime(report.created)}>{formatDateTime(report.created)}</span>
        </div>
        <p className='mt-1.5 whitespace-pre-wrap break-words text-sm text-fg'>{report.content}</p>
        <div className='mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-subtle'>
          <ReportTarget report={report}/>
          {(report.reviewed_at) ? (
            <span title={formatExactDateTime(report.reviewed_at)}>Reviewed {formatDateTime(report.reviewed_at)}</span>
          ) : null}
          {(linked) ? (
            <Link to={reportPath(report.id)} className='inline-flex items-center gap-1 hover:text-fg hover:underline'>
              <MessagesSquare aria-hidden className='size-3'/>
              {(report.replies) ? `${report.replies} ${(report.replies === 1) ? 'reply' : 'replies'}` : 'Reply'}
            </Link>
          ) : null}
          <Link to={reportPath(report.id)} className='font-mono hover:text-fg hover:underline' title='Link to this report'>#{report.id}</Link>
        </div>
      </div>
    </li>
  );
}


function ListSkeleton() {
  return (
    <div aria-hidden className='card divide-y divide-line'>
      {Array.from({length: 3}, (_, i) => (
        <div key={i} className='flex items-start gap-3 px-4 py-3'>
          <Skeleton className='size-9 rounded-md'/>
          <div className='flex-1'>
            <Skeleton className='h-4 w-40'/>
            <Skeleton className='mt-1.5 h-3 w-72 bg-surface-2'/>
            <Skeleton className='mt-1.5 h-3 w-32 bg-surface-2'/>
          </div>
        </div>
      ))}
    </div>
  );
}
