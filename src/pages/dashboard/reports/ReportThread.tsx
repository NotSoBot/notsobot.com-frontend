// The conversation on a report between the reporter and staff, dashboard only, shared by the user's reports page and the
// admin one. Staff are only ever "NotSoAdmin" to the reporter; the admin side also shows which staff member it was.
// Status changes are in the thread too, so it reads as the report's history. Messages are only ever rendered as plain text.

import { MessagesSquare, Send } from 'lucide-react';
import { useState, type ReactNode } from 'react';

import logo from '@/assets/logos/NotSoLogo.svg';
import { Spinner } from '@/components/ui/Spinner';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { ReportStatuses, type ReportMessage, type User } from '@/lib/api';
import { errorMessage } from '@/lib/api/dashboardQueries';
import { userDisplayTag } from '@/lib/discord';
import { cn, formatDateTime } from '@/lib/utils';

import { ExactDate } from '../admin/adminUi';
import { CharCounter, InlineError, Skeleton } from '../ui';


export const REPORT_STAFF_NAME = 'NotSoAdmin';
const MAX_LENGTH = 2000;

const STATUS_VERBS: Record<number, string> = {
  [ReportStatuses.OPEN]: 'reopened',
  [ReportStatuses.RESOLVED]: 'resolved',
  [ReportStatuses.DISMISSED]: 'dismissed',
};


export function ReportThread({ viewer, reporter, messages, loading, error, onRetry, onSend, sending, notice, actions }: {
  // who's looking: the reporter sees themself as "You", staff see the reporter's name and which staff member replied
  viewer: 'staff' | 'reporter',
  reporter: Pick<User, 'id' | 'avatar' | 'discriminator' | 'username'> | null,
  messages: Array<ReportMessage> | undefined,
  loading: boolean,
  error: unknown,
  onRetry: () => void,
  // resolves when it's sent, the draft is only cleared then
  onSend: (content: string) => Promise<unknown>,
  sending: boolean,
  // shown above the reply box, e.g. that replying won't reopen it
  notice?: ReactNode,
  // next to the send button, e.g. the reporter's Reopen
  actions?: ReactNode,
}) {
  const [ draft, setDraft ] = useState('');
  const content = draft.trim();
  const canSend = !!content && content.length <= MAX_LENGTH && !sending;

  const send = () => {
    if (!canSend) {
      return;
    }
    onSend(content).then(() => setDraft(''), () => {});
  };

  const reporterName = (viewer === 'reporter') ? 'You' : (reporter) ? userDisplayTag(reporter) : 'Reporter';
  const placeholder = (viewer === 'staff') ? `Reply to the reporter as ${REPORT_STAFF_NAME}...` : `Reply to ${REPORT_STAFF_NAME}...`;

  return (
    <section aria-label='Conversation'>
      {(loading) ? (
        <ThreadSkeleton/>
      ) : (error && !messages) ? (
        <InlineError>
          Couldn’t load the conversation: {errorMessage(error)}{' '}
          <button type='button' className='underline hover:text-fg' onClick={onRetry}>Try again</button>
        </InlineError>
      ) : (!messages?.length) ? (
        <p className='flex items-center gap-2 rounded-md border border-dashed border-line px-3 py-3 text-sm text-subtle'>
          <MessagesSquare aria-hidden className='size-4 shrink-0'/>
          {(viewer === 'staff') ? 'No replies yet. Anything you send here shows up on the reporter’s dashboard as NotSoAdmin.' : 'No replies yet. You can message the NotSoBot team about this report here.'}
        </p>
      ) : (
        <ol className='flex flex-col gap-3'>
          {messages.map((message) => (
            <li key={message.id}>
              {(message.content === null) ? (
                <StatusEvent message={message} viewer={viewer} reporterName={reporterName}/>
              ) : (
                <Message message={message} viewer={viewer} reporter={reporter} reporterName={reporterName}/>
              )}
            </li>
          ))}
        </ol>
      )}

      <form
        className='mt-3'
        onSubmit={(event) => {
          event.preventDefault();
          send();
        }}
      >
        {(notice) ? <p className='mb-2 text-xs text-subtle'>{notice}</p> : null}
        <textarea
          aria-label='Reply'
          className='input min-h-20 resize-y'
          rows={3}
          maxLength={MAX_LENGTH}
          value={draft}
          placeholder={placeholder}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            // ctrl/cmd+enter sends, a plain enter is a new line
            if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              send();
            }
          }}
        />
        <div className='mt-2 flex flex-wrap items-center justify-end gap-2'>
          {(draft.length) ? <span className='mr-auto text-xs text-subtle'><CharCounter length={draft.length} max={MAX_LENGTH}/></span> : null}
          {actions}
          <button type='submit' className='btn btn-primary btn-sm' disabled={!canSend}>
            {(sending) ? <Spinner className='size-3.5 border-white/40 border-t-white'/> : <Send aria-hidden className='size-3.5'/>}
            Send
          </button>
        </div>
      </form>
    </section>
  );
}


function StaffAvatar({ className }: {className?: string}) {
  return (
    <span aria-hidden className={cn('flex shrink-0 items-center justify-center rounded-full bg-brand/15', className)}>
      <img src={logo} alt='' className='size-[70%]'/>
    </span>
  );
}


function Message({ message, viewer, reporter, reporterName }: {
  message: ReportMessage,
  viewer: 'staff' | 'reporter',
  reporter: Pick<User, 'id' | 'avatar' | 'discriminator' | 'username'> | null,
  reporterName: string,
}) {
  const fromStaff = message.author === 'staff';
  return (
    <div className={cn('flex items-start gap-2.5', (fromStaff === (viewer === 'staff')) && 'flex-row-reverse')}>
      {(fromStaff) ? (
        <StaffAvatar className='size-8'/>
      ) : (reporter) ? (
        <UserAvatar user={reporter} size={64} loading='lazy' className='size-8 shrink-0 rounded-full bg-surface-3'/>
      ) : (
        <span aria-hidden className='size-8 shrink-0 rounded-full bg-surface-3'/>
      )}
      <div className={cn('min-w-0 max-w-[85%] rounded-lg border px-3 py-2', (fromStaff) ? 'border-brand/30 bg-brand/10' : 'border-line bg-deep')}>
        <div className='flex flex-wrap items-baseline gap-x-2 gap-y-0.5'>
          <span className='text-sm font-medium text-white'>{(fromStaff) ? REPORT_STAFF_NAME : reporterName}</span>
          {/* which staff member it was, the reporter never gets this */}
          {(fromStaff && viewer === 'staff' && message.author_id) ? (
            <span className='font-mono text-xs text-subtle' title='The staff member who sent it, the reporter only sees NotSoAdmin'>{message.author_id}</span>
          ) : null}
          <span className='text-xs text-subtle'><ExactDate value={message.created} format={formatDateTime}/></span>
        </div>
        <p className='mt-1 text-sm whitespace-pre-wrap break-words text-fg'>{message.content}</p>
      </div>
    </div>
  );
}


function StatusEvent({ message, viewer, reporterName }: {message: ReportMessage, viewer: 'staff' | 'reporter', reporterName: string}) {
  const who = (message.author === 'staff') ? REPORT_STAFF_NAME : reporterName;
  const verb = STATUS_VERBS[message.status ?? -1] ?? 'changed';
  return (
    <p className='flex items-center gap-3 text-xs text-subtle'>
      <span aria-hidden className='h-px flex-1 bg-line'/>
      <span className='text-center'>
        <span className='text-muted'>{who}</span> {verb} this report
        {(message.author === 'staff' && viewer === 'staff' && message.author_id) ? <> (<span className='font-mono'>{message.author_id}</span>)</> : null}
        {' · '}
        <ExactDate value={message.created} format={formatDateTime}/>
      </span>
      <span aria-hidden className='h-px flex-1 bg-line'/>
    </p>
  );
}


function ThreadSkeleton() {
  return (
    <div aria-hidden className='flex flex-col gap-3'>
      {Array.from({length: 2}, (_, i) => (
        <div key={i} className={cn('flex items-start gap-2.5', i % 2 && 'flex-row-reverse')}>
          <Skeleton className='size-8 rounded-full'/>
          <Skeleton className='h-14 w-2/3 rounded-lg bg-surface-2'/>
        </div>
      ))}
    </div>
  );
}
