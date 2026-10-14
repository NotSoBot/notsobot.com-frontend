import { Check, ChevronLeft, ChevronRight, Copy } from 'lucide-react';
import { useEffect, useState, type KeyboardEvent, type ReactNode } from 'react';
import { useSearchParams } from 'react-router';

import { Routes } from '@/config';
import type { AdminUserRef } from '@/lib/api';
import { userAvatarUrl, userDisplayTag } from '@/lib/discord';
import { cn } from '@/lib/utils';


// the Tags tab searching `query`, like `user:<id>`
export function adminTagsPath(query: string): string {
  return `${Routes.DASHBOARD_ADMIN_ALL_TAGS}?${new URLSearchParams({q: query}).toString()}`;
}


// Filters live in the URL so a filtered view can be linked/bookmarked; every change resets to page 1.
export function useSearchParamState() {
  const [ searchParams, setSearchParams ] = useSearchParams();
  const page = Math.max(0, (Number(searchParams.get('page')) || 1) - 1);

  const update = (changes: Record<string, string | null>, resetPage = true) => {
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      for (const [ key, value ] of Object.entries(changes)) {
        if (value === null || value === '') {
          next.delete(key);
        } else {
          next.set(key, value);
        }
      }
      if (resetPage && !('page' in changes)) {
        next.delete('page');
      }
      return next;
    }, {replace: true, preventScrollReset: true});
  };

  const setPage = (value: number) => {
    update({page: (value <= 0) ? null : String(value + 1)}, false);
    window.scrollTo({top: 0});
  };

  return {searchParams, page, update, setPage};
}


// Acting on the last item of the last page (or a refetch shrinking the list) can leave you on a page that's now
// empty, which would show the empty state with no pagination to go back. Jump to the last page that has items
// instead; returns true while that's happening so the caller can keep showing its skeleton.
export function useStepBackFromEmptyPage({ page, setPage, data, isPlaceholderData, pageSize }: {
  page: number,
  setPage: (page: number) => void,
  data: {items: Array<unknown>, count: number} | undefined,
  isPlaceholderData: boolean,
  pageSize: number,
}): boolean {
  const stepBack = 0 < page && !!data && !isPlaceholderData && !data.items.length;
  const lastPage = (data) ? Math.max(0, Math.ceil(data.count / pageSize) - 1) : 0;
  useEffect(() => {
    if (stepBack) {
      setPage(Math.min(page - 1, lastPage));
    }
    // setPage is recreated every render
  }, [stepBack, page, lastPage]);
  return stepBack;
}


export function Pagination({ page, count, pageSize, onChange, fetching = false, className }: {
  page: number,
  count: number,
  pageSize: number,
  onChange: (page: number) => void,
  fetching?: boolean,
  className?: string,
}) {
  const pages = Math.max(1, Math.ceil(count / pageSize));
  const start = (count) ? page * pageSize + 1 : 0;
  const end = Math.min(count, (page + 1) * pageSize);
  return (
    <nav aria-label='Pagination' className={cn('mt-4 flex flex-wrap items-center justify-between gap-3', className)}>
      <p className='text-sm text-subtle tabular-nums'>
        {start.toLocaleString()}–{end.toLocaleString()} of {count.toLocaleString()}
      </p>
      <div className='flex items-center gap-2'>
        <button type='button' className='btn btn-secondary btn-sm' disabled={page <= 0 || fetching} onClick={() => onChange(page - 1)}>
          <ChevronLeft aria-hidden className='size-4'/>
          Previous
        </button>
        <span className='text-sm text-muted tabular-nums'>Page {(page + 1).toLocaleString()} / {pages.toLocaleString()}</span>
        <button type='button' className='btn btn-secondary btn-sm' disabled={pages <= page + 1 || fetching} onClick={() => onChange(page + 1)}>
          Next
          <ChevronRight aria-hidden className='size-4'/>
        </button>
      </div>
    </nav>
  );
}


// Spread onto a read-only text block (url, hash, tag content) so it can take focus from a click and Ctrl/Cmd+A
// selects just its text instead of the whole page.
export const selectAllScope = {
  tabIndex: 0,
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
    if ((event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === 'a') {
      event.preventDefault();
      const selection = window.getSelection();
      if (selection) {
        const range = document.createRange();
        range.selectNodeContents(event.currentTarget);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
  },
};


// avatar + name + id; avatars come from Discord's CDN (never from user-submitted content)
export function UserCell({ user, fallbackId, size = 'md' }: {user: AdminUserRef | null, fallbackId?: string | null, size?: 'sm' | 'md'}) {
  if (!user) {
    return (
      <span className='text-sm text-subtle'>
        Unknown user{(fallbackId) ? <> · <span className='font-mono'>{fallbackId}</span></> : null}
      </span>
    );
  }
  return (
    <span className='flex min-w-0 items-center gap-2'>
      <img
        src={userAvatarUrl(user, 64)}
        alt=''
        loading='lazy'
        className={cn('shrink-0 rounded-full bg-surface-3', (size === 'sm') ? 'size-6' : 'size-8')}
      />
      <span className='min-w-0'>
        <span className='block truncate text-sm font-medium text-white'>{userDisplayTag(user)}</span>
        <span className='block truncate font-mono text-xs text-subtle'>{user.id}</span>
      </span>
    </span>
  );
}


// Long values (hashes, ids) shown shortened with a copy button; the full value is in the title.
export function CopyableValue({ value, truncate = 16, className }: {value: string, truncate?: number, className?: string}) {
  const [ copied, setCopied ] = useState(false);
  const shown = (truncate && truncate < value.length) ? `${value.slice(0, truncate)}…` : value;
  return (
    <span className={cn('inline-flex min-w-0 items-center gap-1', className)}>
      <code title={value} className='truncate font-mono text-xs text-fg select-all focus:outline-none' {...selectAllScope}>{shown}</code>
      <button
        type='button'
        aria-label='Copy'
        title='Copy'
        className='shrink-0 cursor-pointer rounded p-0.5 text-subtle hover:bg-surface-3 hover:text-fg'
        onClick={() => {
          void navigator.clipboard?.writeText(value).then(() => {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
          });
        }}
      >
        {(copied) ? <Check className='size-3.5 text-success'/> : <Copy className='size-3.5'/>}
      </button>
    </span>
  );
}


export function Chip({ children, tone = 'neutral', title }: {children: ReactNode, tone?: 'neutral' | 'danger' | 'warning' | 'success' | 'brand', title?: string}) {
  return (
    <span
      title={title}
      className={cn(
        'inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium whitespace-nowrap',
        (tone === 'danger') ? 'bg-danger/20 text-[#ff8a8c]'
          : (tone === 'warning') ? 'bg-warning/20 text-warning'
          : (tone === 'success') ? 'bg-success/20 text-[#6fd391]'
          : (tone === 'brand') ? 'bg-brand/25 text-[#aab2ff]'
          : 'bg-line-strong text-muted',
      )}
    >
      {children}
    </span>
  );
}


// label/value pairs in a compact grid
export function DetailList({ items }: {items: Array<[ReactNode, ReactNode] | null | false>}) {
  return (
    <dl className='grid grid-cols-[max-content_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-sm'>
      {items.filter((item): item is [ReactNode, ReactNode] => !!item).map(([ label, value ], i) => (
        <div key={i} className='contents'>
          <dt className='text-subtle'>{label}</dt>
          <dd className='min-w-0 break-words text-fg'>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
