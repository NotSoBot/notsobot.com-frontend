// The reports the user sent with the bot's report commands and where they stand. Read only, the reports are made in Discord.
// `content` is whatever the user typed, so it's only ever rendered as plain text.

import { ExternalLink, MessageSquareWarning } from 'lucide-react';

import { ReportTypes, type MeReport } from '@/lib/api';
import { ME_REPORTS_PAGE_SIZE, errorMessage, useMeReportsQuery } from '@/lib/api/dashboardQueries';
import { cn, formatDateTime, formatExactDateTime } from '@/lib/utils';

import { Chip, Pagination, useSearchParamState, useStepBackFromEmptyPage } from '../admin/adminUi';
import { DashboardHeader, EmptyState, ErrorPanel, Skeleton } from '../ui';
import { REPORT_STATUSES, reportJumpUrl, reportStatusInfo, reportTypeInfo } from './reportLabels';


function parseStatus(value: string | null): number | null {
  if (value === null || value === '' || Number.isNaN(Number(value))) {
    return null;
  }
  return Number(value);
}


export function ReportsPage() {
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


function ReportRow({ report }: {report: MeReport}) {
  const type = reportTypeInfo(report.type);
  const status = reportStatusInfo(report.status);

  return (
    <li className='flex items-start gap-3 px-4 py-3'>
      <span aria-hidden className='flex size-9 shrink-0 items-center justify-center rounded-md bg-[#ed4245]/15'>
        <MessageSquareWarning className='size-5 text-[#ed4245]'/>
      </span>
      <div className='min-w-0 flex-1'>
        <div className='flex flex-wrap items-center gap-2'>
          <Chip tone={type.tone}>{type.label}</Chip>
          <Chip tone={status.tone}>{status.label}</Chip>
          <span className='text-xs text-subtle' title={formatExactDateTime(report.created)}>{formatDateTime(report.created)}</span>
        </div>
        <p className='mt-1.5 whitespace-pre-wrap break-words text-sm text-fg'>{report.content}</p>
        <div className='mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-subtle'>
          <ReportTarget report={report}/>
          {(report.reviewed_at) ? (
            <span title={formatExactDateTime(report.reviewed_at)}>Reviewed {formatDateTime(report.reviewed_at)}</span>
          ) : null}
          <span className='font-mono' title='Report ID'>#{report.id}</span>
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
