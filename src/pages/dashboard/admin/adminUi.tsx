import { Check, ChevronDown, ChevronLeft, ChevronRight, Copy, X } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link, useSearchParams } from 'react-router';

import { Routes } from '@/config';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import type { AdminUserRef } from '@/lib/api';
import { userAvatarUrl, userDisplayTag } from '@/lib/discord';
import { cn, formatDate, formatExactDateTime, toDate } from '@/lib/utils';


// the Tags tab searching `query`, like `user:<id>`
export function adminTagsPath(query: string): string {
  return `${Routes.DASHBOARD_ADMIN_TAGS}?${new URLSearchParams({q: query}).toString()}`;
}

// the admin server list with that server open over it
export function adminServerPath(guildId: string): string {
  return `${Routes.DASHBOARD_ADMIN_SERVERS}/${guildId}`;
}


// Filters live in the URL so a filtered view can be linked/bookmarked; every change resets to page 1.
// `?within=` → `flagged_within` in hours, by how long ago the last content flag was (users and servers)
export const FLAGGED_WITHIN = [
  {value: 'any', label: 'Any time', hours: null},
  {value: '1d', label: '24h', hours: 24},
  {value: '7d', label: '7 days', hours: 24 * 7},
  {value: '30d', label: '30 days', hours: 24 * 30},
] as const;


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


// a date that shows the exact time, to the second, on hover or focus. A real popup rather than `title`, which
// takes a second to show up (or never does, e.g. on touch) and left only the help cursor
export function ExactDate({ value, format = formatDate, className }: {
  value: string | number,
  format?: (value: string | number) => string,
  className?: string,
}) {
  const [ rect, setRect ] = useState<DOMRect | null>(null);
  const date = toDate(value);
  const valid = !Number.isNaN(date.getTime());
  const show = (event: { currentTarget: HTMLElement }) => setRect(event.currentTarget.getBoundingClientRect());
  const hide = () => setRect(null);

  useEffect(() => {
    if (!rect) {
      return;
    }
    // it's positioned once, so drop it instead of leaving it behind when the page scrolls
    window.addEventListener('scroll', hide, {capture: true, passive: true});
    return () => window.removeEventListener('scroll', hide, {capture: true});
  }, [rect]);

  return (
    <>
      <time
        dateTime={(valid) ? date.toISOString() : undefined}
        tabIndex={(valid) ? 0 : undefined}
        onMouseEnter={(valid) ? show : undefined}
        onMouseLeave={hide}
        onFocus={(valid) ? show : undefined}
        onBlur={hide}
        className={cn(
          (valid) && 'cursor-default underline decoration-line-strong decoration-dotted underline-offset-2 hover:decoration-muted focus:outline-none focus-visible:decoration-brand',
          className,
        )}
      >
        {format(value)}
      </time>
      {(rect) ? createPortal(<ExactDateTooltip rect={rect} text={formatExactDateTime(value)}/>, document.body) : null}
    </>
  );
}


function ExactDateTooltip({ rect, text }: {rect: DOMRect, text: string}) {
  const ref = useRef<HTMLDivElement>(null);
  const [ left, setLeft ] = useState<number | null>(null);
  // centered over the date but kept inside the viewport, which needs its own width; hidden until measured
  useLayoutEffect(() => {
    const width = ref.current?.offsetWidth ?? 0;
    const centered = rect.left + rect.width / 2 - width / 2;
    setLeft(Math.min(Math.max(centered, 8), window.innerWidth - width - 8));
  }, [rect]);
  // flipped below when there's no room above
  const above = 48 < rect.top;
  return (
    <div
      ref={ref}
      role='tooltip'
      style={{left: left ?? 0, top: (above) ? rect.top - 6 : rect.bottom + 6, visibility: (left === null) ? 'hidden' : undefined}}
      className={cn(
        'pointer-events-none fixed z-50 rounded-md border border-line-strong bg-deep px-2.5 py-1.5',
        'text-xs whitespace-nowrap text-fg tabular-nums shadow-xl shadow-black/40',
        above && '-translate-y-full',
      )}
    >
      {text}
    </div>
  );
}


// Spread onto a read-only text block (url, hash, tag content) so it can take focus from a click and Ctrl/Cmd+A
// selects just its text instead of the whole page.
// The range runs from the first to the last text node rather than `selectNodeContents`: a selection that ends at
// the block's boundary makes Safari paint the gaps right of and below the text, filling the box unevenly.
export const selectAllScope = {
  tabIndex: 0,
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
    if ((event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === 'a') {
      event.preventDefault();
      const selection = window.getSelection();
      if (selection) {
        const range = document.createRange();
        const walker = document.createTreeWalker(event.currentTarget, NodeFilter.SHOW_TEXT);
        const first = walker.nextNode() as Text | null;
        let last = first;
        while (walker.nextNode()) {
          last = walker.currentNode as Text;
        }
        if (first && last) {
          range.setStart(first, 0);
          range.setEnd(last, last.length);
        } else {
          range.selectNodeContents(event.currentTarget);
        }
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
// With `to` the value itself is the link (to that server, tag or user's admin page), the copy button stays next to it.
export function CopyableValue({ value, truncate = 16, className, to, linkTitle }: {
  value: string,
  truncate?: number,
  className?: string,
  to?: string,
  linkTitle?: string,
}) {
  const shown = (truncate && truncate < value.length) ? `${value.slice(0, truncate)}…` : value;
  return (
    <span className={cn('inline-flex min-w-0 items-center gap-1', className)}>
      {(to) ? (
        <Link to={to} title={linkTitle ?? value} className='truncate font-mono text-xs text-code underline-offset-2 hover:underline'>{shown}</Link>
      ) : (
        <code title={value} className='truncate font-mono text-xs text-fg select-all focus:outline-none' {...selectAllScope}>{shown}</code>
      )}
      <CopyButton value={value}/>
    </span>
  );
}


// Copies `value` and shows a check for a moment. Icon only by default; with `label` it's a small ghost button
// sized for section headers (tag content, flagged urls).
export function CopyButton({ value, label }: {value: string, label?: string}) {
  const [ copied, setCopied ] = useState(false);
  const copy = () => {
    void navigator.clipboard?.writeText(value).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    });
  };
  if (label) {
    return (
      <button type='button' className='btn btn-ghost btn-sm' onClick={copy}>
        {(copied) ? <Check className='size-4 text-success'/> : <Copy className='size-4'/>}
        {(copied) ? 'Copied' : label}
      </button>
    );
  }
  return (
    <button
      type='button'
      aria-label='Copy'
      title='Copy'
      className='shrink-0 cursor-pointer rounded p-0.5 text-subtle hover:bg-surface-3 hover:text-fg'
      onClick={copy}
    >
      {(copied) ? <Check className='size-3.5 text-success'/> : <Copy className='size-3.5'/>}
    </button>
  );
}


export function Chip({ children, className, tone = 'neutral', title }: {children: ReactNode, className?: string, tone?: 'neutral' | 'danger' | 'warning' | 'success' | 'brand', title?: string}) {
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
        className,
      )}
    >
      {children}
    </span>
  );
}


// A reviewed report or flag folded down to one line; clicking anywhere on it opens the full card again.
// Plain content only inside (no buttons, links or focusable dates), since the whole row is a button.
export function CollapsedCard({ children, onExpand }: {children: ReactNode, onExpand: () => void}) {
  return (
    <li className='card'>
      <button
        type='button'
        aria-expanded={false}
        className='flex w-full cursor-pointer flex-wrap items-center gap-x-3 gap-y-1.5 rounded-[inherit] px-4 py-2.5 text-left hover:bg-surface-2 sm:px-5'
        onClick={onExpand}
      >
        <ChevronRight aria-hidden className='size-4 shrink-0 text-subtle'/>
        {children}
      </button>
    </li>
  );
}


// folds an expanded reviewed card back into its CollapsedCard
export function CollapseButton({ onClick }: {onClick: () => void}) {
  return (
    <button
      type='button'
      aria-expanded
      aria-label='Collapse'
      title='Collapse'
      className='shrink-0 cursor-pointer rounded p-1 text-subtle hover:bg-surface-3 hover:text-fg'
      onClick={onClick}
    >
      <ChevronDown className='size-4'/>
    </button>
  );
}


// label/value pairs in a compact grid
export function DetailList({ items }: {items: Array<[ReactNode, ReactNode] | null | false>}) {
  return (
    // content-start: next to a taller list (side by side) its rows stay packed at the top instead of spreading out
    <dl className='grid grid-cols-[max-content_minmax(0,1fr)] content-start gap-x-4 gap-y-1.5 text-sm'>
      {items.filter((item): item is [ReactNode, ReactNode] => !!item).map(([ label, value ], i) => (
        <div key={i} className='contents'>
          <dt className='text-subtle'>{label}</dt>
          <dd className='min-w-0 break-words text-fg'>{value}</dd>
        </div>
      ))}
    </dl>
  );
}


// edits locally and lands in the URL once typing stops (and only when it's a snowflake)
export function IdFilter({ className, label, placeholder, value, onChange }: {
  className?: string,
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
    <label className={cn('text-sm', className)}>
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
