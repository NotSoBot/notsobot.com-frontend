import { Ban, ChevronDown, Pencil, ShieldCheck, Tags, Trash2, Users } from 'lucide-react';
import { useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router';

import { isOwner, useAuth } from '@/auth';
import { SearchInput } from '@/components/ui/SearchInput';
import { Segmented } from '@/components/ui/Segmented';
import { Routes } from '@/config';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { UserFlags, type AdminUserEntry, type AdminUsersSortBy } from '@/lib/api';
import { ADMIN_PAGE_SIZE, errorMessage, useAdminUserEntryQuery, useAdminUsersQuery } from '@/lib/api/dashboardQueries';
import { userAvatarUrl, userDisplayTag } from '@/lib/discord';
import { cn } from '@/lib/utils';

import { premiumLabel } from '../premium';
import { DashboardHeader, EmptyState, ErrorPanel, Skeleton, Toggle } from '../ui';
import { adminTagsPath, Chip, CopyableValue, ExactDate, FLAGGED_WITHIN, Pagination, useSearchParamState, useStepBackFromEmptyPage, UserCell } from './adminUi';
import { AdminTagModal, useOpenListItem } from './AdminTagModal';
import { BlockUserDialog } from './BlockUserDialog';
import { DeleteUserTagsDialog } from './DeleteUserTagsDialog';
import { EditUserDialog } from './EditUserDialog';


const SORTS: Array<{value: AdminUsersSortBy, label: string}> = [
  {value: 'flags', label: 'Most flagged'},
  {value: 'confirmed', label: 'Most confirmed'},
  {value: 'last_flagged', label: 'Last flagged'},
  {value: 'newest', label: 'Newest'},
  {value: 'username', label: 'Username'},
];



export function adminFlagsPath(params: Record<string, string>): string {
  return `${Routes.DASHBOARD_ADMIN_FLAGS}?${new URLSearchParams(params).toString()}`;
}

function adminReportsPath(params: Record<string, string>): string {
  return `${Routes.DASHBOARD_ADMIN_REPORTS}?${new URLSearchParams(params).toString()}`;
}

// the modal's actions, real buttons so they read as clickable; destructive ones tinted red
const ACTION = 'btn btn-sm btn-secondary';
const DANGER_ACTION = 'btn btn-sm border border-danger/40 bg-danger/10 text-danger hover:bg-danger/20';

const TITLE_ID = 'admin-user-modal-title';


export function AdminUsersPage() {
  const { searchParams, page, update, setPage } = useSearchParamState();
  const sortBy = SORTS.find((sort) => sort.value === searchParams.get('sort'))?.value ?? 'flags';
  const onlyFlagged = searchParams.get('flagged') === '1';
  const flaggedWithin = FLAGGED_WITHIN.find((item) => item.value === searchParams.get('within')) ?? FLAGGED_WITHIN[0];
  const query = searchParams.get('q') || '';
  const debouncedQuery = useDebouncedValue(query.trim(), 300);

  const { data, isPending, isError, error, isPlaceholderData, isFetching, isRefetching, refetch } = useAdminUsersQuery({
    query: debouncedQuery,
    sortBy,
    onlyFlagged,
    flaggedWithin: flaggedWithin.hours,
    page,
  });
  const items = data?.items ?? [];
  // `/dashboard/admin/users/<id>` opens the user over the list, ← / → step through this page's users
  const { openId, openItem: listedItem, previousId, nextId, open, close } = useOpenListItem(items, (entry) => entry.user.id, Routes.DASHBOARD_ADMIN_USERS);
  const linked = useAdminUserEntryQuery(openId, !listedItem);
  const openItem = listedItem ?? linked.data ?? null;
  const steppingBack = useStepBackFromEmptyPage({page, setPage, data, isPlaceholderData, pageSize: ADMIN_PAGE_SIZE});
  const pagination = {
    page,
    count: data?.count ?? 0,
    pageSize: ADMIN_PAGE_SIZE,
    onChange: setPage,
    fetching: isFetching && isPlaceholderData,
  };

  return (
    <>
      <DashboardHeader title='Users' description='Everyone NotSoBot knows about, with their content flag history.'/>

      <div className='mb-4 space-y-3'>
        <SearchInput
          value={query}
          onValueChange={(value) => update({q: value})}
          placeholder='Search by username or id...'
          aria-label='Search users'
        />
        <div className='flex flex-wrap items-center gap-3'>
          <div className='flex max-w-full items-center gap-2 text-sm text-muted'>
            <span aria-hidden>Last flagged</span>
            <div className='overflow-x-auto'>
              <Segmented
                label='Last flagged within'
                value={flaggedWithin.value}
                options={FLAGGED_WITHIN.map(({ value, label }) => ({value, label}))}
                onChange={(value) => update({within: (value === 'any') ? null : value})}
              />
            </div>
          </div>
          <label className='flex items-center gap-2 text-sm text-muted sm:ml-auto'>
            Sort
            <select className='input w-40' value={sortBy} onChange={(event) => update({sort: (event.target.value === 'flags') ? null : event.target.value})}>
              {SORTS.map((sort) => <option key={sort.value} value={sort.value}>{sort.label}</option>)}
            </select>
          </label>
          <div className='rounded-md border border-line bg-surface px-3 py-2'>
            <Toggle label='Only flagged' checked={onlyFlagged} onChange={(value) => update({flagged: (value) ? '1' : null})}/>
          </div>
        </div>
      </div>

      {(isPending || steppingBack) ? (
        <TableSkeleton/>
      ) : (isError && !items.length) ? (
        <ErrorPanel title='Couldn’t load users' message={errorMessage(error)} onRetry={() => refetch()} retrying={isRefetching}/>
      ) : (!items.length) ? (
        <EmptyState icon={<Users className='size-10'/>} title='No users found'>
          {(debouncedQuery || onlyFlagged || flaggedWithin.hours) ? 'Try a different search or filter.' : null}
        </EmptyState>
      ) : (
        <>
          <Pagination {...pagination} className='mt-0 mb-4'/>
          <div className={cn('card overflow-x-auto transition-opacity', isPlaceholderData && 'opacity-60')}>
            <table className='w-full min-w-[940px] text-left text-sm'>
              <thead className='border-b border-line text-xs whitespace-nowrap text-subtle uppercase'>
                <tr>
                  <th scope='col' className='px-4 py-2.5 font-medium'>User</th>
                  <th scope='col' className='px-4 py-2.5 font-medium'>Account</th>
                  <th scope='col' className='px-4 py-2.5 text-right font-medium'>Flagged</th>
                  <th scope='col' className='px-4 py-2.5 text-right font-medium'>Confirmed</th>
                  <th scope='col' className='px-4 py-2.5 text-right font-medium'>Reports</th>
                  <th scope='col' className='px-4 py-2.5 text-right font-medium'>Review status</th>
                  <th scope='col' className='px-4 py-2.5 font-medium'>Last flagged</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-line'>
                {items.map((entry) => <UserRow key={entry.user.id} entry={entry} onOpen={open}/>)}
              </tbody>
            </table>
          </div>
          <Pagination {...pagination}/>
        </>
      )}

      {(openItem) ? (
        <AdminTagModal labelledBy={TITLE_ID} previousId={previousId} nextId={nextId} onNavigate={open} onClose={close}>
          <UserDetails key={openItem.user.id} entry={openItem}/>
        </AdminTagModal>
      ) : null}
    </>
  );
}


function userRoles(user: AdminUserEntry['user']) {
  const owner = (user.flags & UserFlags.OWNER) === UserFlags.OWNER;
  const moderator = (user.flags & UserFlags.MODERATOR) === UserFlags.MODERATOR;
  return {owner, moderator};
}

function RoleChips({ user }: {user: AdminUserEntry['user']}) {
  const { owner, moderator } = userRoles(user);
  if (!owner && !moderator && !user.premium_type) {
    return null;
  }
  return (
    <div className='flex flex-wrap gap-1'>
      {(owner) ? <Chip tone='brand'>Owner</Chip> : null}
      {(moderator) ? <Chip tone='brand'>Moderator</Chip> : null}
      {(user.premium_type) ? <Chip>{premiumLabel(user.premium_type)}</Chip> : null}
    </div>
  );
}


// The whole row opens the user (their actions live in the modal); the counts stay links to the flags/reports behind them
function UserRow({ entry, onOpen }: {entry: AdminUserEntry, onOpen: (userId: string) => void}) {
  const { user, content_flags: flags } = entry;
  return (
    <tr
      className={cn('cursor-pointer align-middle transition-colors', (user.blocked) ? 'bg-danger/[0.07] hover:bg-danger/[0.11]' : 'hover:bg-white/[0.035]')}
      onClick={(event) => {
        // the counts' own links (and selecting text) keep working
        if (event.target instanceof Element && event.target.closest('a, button:not([data-row-open])')) {
          return;
        }
        if (window.getSelection()?.toString()) {
          return;
        }
        onOpen(user.id);
      }}
    >
      <td className={cn('px-4 py-3', user.blocked && 'shadow-[inset_4px_0_0_var(--color-danger)]')}>
        <button
          type='button'
          data-row-open
          className='-m-1 cursor-pointer rounded p-1 text-left focus-visible:outline-2 focus-visible:outline-brand'
          aria-label={`Open ${user.username}`}
        >
          <UserCell user={user}/>
        </button>
      </td>
      <td className='px-4 py-3'>
        <div className='flex flex-col items-start gap-2'>
          <RoleChips user={user}/>
          {(user.blocked) ? <BlockedNotice reason={user.blocked_reason}/> : null}
        </div>
      </td>
      <td className='px-4 py-3 text-right tabular-nums'>
        {(flags.total) ? (
          <Link
            to={adminFlagsPath({user_id: user.id, status: 'all'})}
            className='font-semibold text-white hover:text-brand hover:underline'
            title='Show this user’s content flags'
          >
            {flags.flagged.toLocaleString()}
            <span className='font-normal text-subtle'> / {flags.total.toLocaleString()}</span>
          </Link>
        ) : (
          <span className='text-subtle'>0</span>
        )}
      </td>
      <td className='px-4 py-3 text-right tabular-nums'>
        {(flags.confirmed) ? (
          <Link
            to={adminFlagsPath({user_id: user.id, status: '1'})}
            className='font-semibold text-danger hover:underline'
            title='Show this user’s confirmed content flags'
          >
            {flags.confirmed.toLocaleString()}
          </Link>
        ) : (
          <span className='text-subtle'>0</span>
        )}
      </td>
      <td className='px-4 py-3 text-right tabular-nums'>
        {(entry.reports) ? (
          <Link
            to={adminReportsPath({target_id: user.id, status: 'all'})}
            className='font-semibold text-warning hover:underline'
            title='Show reports about this user'
          >
            {entry.reports.toLocaleString()}
          </Link>
        ) : (
          <span className='text-subtle'>0</span>
        )}
      </td>
      <td className='px-4 py-3 text-right'>
        {(flags.pending || flags.dismissed || flags.reported) ? (
          <div className='flex flex-wrap justify-end gap-1'>
            <StatusCount userId={user.id} status='0' label='pending' count={flags.pending} tone='warning'/>
            <StatusCount userId={user.id} status='2' label='dismissed' count={flags.dismissed} tone='neutral'/>
            <StatusCount userId={user.id} status='3' label='reported' count={flags.reported} tone='brand'/>
          </div>
        ) : <span className='text-subtle'>—</span>}
      </td>
      <td className='px-4 py-3 whitespace-nowrap text-muted'>
        {(flags.last_flagged_at) ? <ExactDate value={flags.last_flagged_at}/> : '—'}
      </td>
    </tr>
  );
}


// The user's modal: who they are, their flag/report numbers (each a link to the list behind it), and everything staff
// can do to them
function UserDetails({ entry }: {entry: AdminUserEntry}) {
  const { user, content_flags: flags } = entry;
  const { user: me } = useAuth();
  const viewerIsOwner = isOwner(me);
  const { owner, moderator } = userRoles(user);
  // owners can't be blocked, and moderators can't block other moderators; the same goes for deleting their tags
  const canBlock = !owner && (viewerIsOwner || !moderator);
  const [ blocking, setBlocking ] = useState(false);
  const [ deletingTags, setDeletingTags ] = useState(false);
  const [ editing, setEditing ] = useState(false);

  return (
    <div className='p-4 sm:p-6'>
      <div className='flex items-center gap-4 pr-10'>
        <img src={userAvatarUrl(user, 128)} alt='' className='size-16 shrink-0 rounded-full bg-surface-3'/>
        <div className='min-w-0'>
          <h2 id={TITLE_ID} className='truncate text-xl font-semibold text-white'>{userDisplayTag(user)}</h2>
          <div className='mt-1 flex items-center gap-1.5 text-xs text-subtle'>
            User id
            <CopyableValue value={user.id} truncate={0}/>
          </div>
          <div className='mt-2'><RoleChips user={user}/></div>
        </div>
      </div>

      {(user.blocked) ? <div className='mt-4 [&>div]:w-full'><BlockedNotice reason={user.blocked_reason}/></div> : null}

      <section className='mt-5'>
        <h3 className='section-label mb-2'>Actions</h3>
        <div className='flex flex-wrap gap-2'>
          {(viewerIsOwner) ? (
            <button type='button' className={ACTION} onClick={() => setEditing(true)}>
              <Pencil className='size-4'/>
              Edit flags & premium
            </button>
          ) : null}
          <Link to={adminTagsPath(`user:${user.id}`)} className={ACTION}>
            <Tags className='size-4'/>
            View tags
          </Link>
          {(canBlock) ? (
            (user.blocked) ? (
              <button type='button' className={ACTION} onClick={() => setBlocking(true)}>
                <ShieldCheck className='size-4'/>
                Unblock
              </button>
            ) : (
              <button type='button' className={DANGER_ACTION} onClick={() => setBlocking(true)}>
                <Ban className='size-4'/>
                Block
              </button>
            )
          ) : null}
          {(canBlock) ? (
            <button type='button' className={DANGER_ACTION} onClick={() => setDeletingTags(true)}>
              <Trash2 className='size-4'/>
              Delete tags
            </button>
          ) : null}
        </div>
        {(!canBlock) ? (
          <p className='mt-2 text-xs text-subtle'>{(owner) ? 'Owners can’t be blocked.' : 'Only owners can block moderators.'}</p>
        ) : null}
      </section>

      <section className='mt-5'>
        <h3 className='section-label mb-2'>Content flags</h3>
        <div className='grid grid-cols-2 gap-2 sm:grid-cols-4'>
          <StatLink label='Flagged' to={adminFlagsPath({user_id: user.id, status: 'all'})} value={`${flags.flagged.toLocaleString()} / ${flags.total.toLocaleString()}`}/>
          <StatLink label='Confirmed' to={adminFlagsPath({user_id: user.id, status: '1'})} value={flags.confirmed.toLocaleString()} tone='text-danger'/>
          <StatLink label='Pending' to={adminFlagsPath({user_id: user.id, status: '0'})} value={flags.pending.toLocaleString()} tone='text-warning'/>
          <div className='rounded-md border border-line bg-deep px-3 py-2'>
            <p className='text-xs text-subtle'>Last flagged</p>
            <p className='mt-0.5 text-sm text-fg'>{(flags.last_flagged_at) ? <ExactDate value={flags.last_flagged_at}/> : '—'}</p>
          </div>
        </div>
        {(flags.dismissed || flags.reported) ? (
          <div className='mt-2 flex flex-wrap gap-1'>
            <StatusCount userId={user.id} status='2' label='dismissed' count={flags.dismissed} tone='neutral'/>
            <StatusCount userId={user.id} status='3' label='reported' count={flags.reported} tone='brand'/>
          </div>
        ) : null}
      </section>

      <section className='mt-5'>
        <h3 className='section-label mb-2'>Reports</h3>
        <div className='grid grid-cols-2 gap-2'>
          <StatLink label='About them' to={adminReportsPath({target_id: user.id, status: 'all'})} value={entry.reports.toLocaleString()} tone='text-warning'/>
          <StatLink label='Sent by them' to={adminReportsPath({user_id: user.id, status: 'all'})} value='Show'/>
        </div>
      </section>

      {(blocking) ? (
        <BlockUserDialog user={user} blocked={user.blocked} blockedReason={user.blocked_reason} onClose={() => setBlocking(false)}/>
      ) : null}
      {(editing) ? <EditUserDialog user={user} onClose={() => setEditing(false)}/> : null}
      {(deletingTags) ? <DeleteUserTagsDialog user={user} onClose={() => setDeletingTags(false)}/> : null}
    </div>
  );
}


function StatLink({ label, value, to, tone = 'text-white' }: {label: string, value: string, to: string, tone?: string}) {
  return (
    <Link to={to} className='group/stat rounded-md border border-line bg-deep px-3 py-2 transition-colors hover:border-brand'>
      <p className='text-xs text-subtle'>{label}</p>
      <p className={cn('mt-0.5 text-sm font-semibold tabular-nums group-hover/stat:underline', tone)}>{value}</p>
    </Link>
  );
}


// a red callout with the block reason, two lines at most until "Show full reason" opens the rest
function BlockedNotice({ reason }: {reason: string | null}) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [ expanded, setExpanded ] = useState(false);
  const [ overflowing, setOverflowing ] = useState(false);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || expanded) {
      return;
    }
    const measure = () => setOverflowing(element.scrollHeight > element.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [reason, expanded]);

  return (
    <div className='w-72 rounded-md border border-danger/40 bg-danger/15 px-3 py-2'>
      <p className='flex items-center gap-1.5 text-xs font-bold tracking-wide text-[#ff8a8c] uppercase'>
        <Ban aria-hidden className='size-3.5 shrink-0'/>
        Blocked
      </p>
      {(reason) ? (
        <p ref={ref} className={cn('mt-1 text-xs break-words whitespace-pre-wrap text-fg', !expanded && 'line-clamp-2')}>{reason}</p>
      ) : (
        <p className='mt-1 text-xs text-muted italic'>No reason given</p>
      )}
      {(reason && (overflowing || expanded)) ? (
        <button
          type='button'
          className='mt-1.5 inline-flex cursor-pointer items-center gap-1 rounded text-xs font-semibold text-[#ff8a8c] hover:text-white'
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
        >
          {(expanded) ? 'Show less' : 'Show full reason'}
          <ChevronDown aria-hidden className={cn('size-3.5 transition-transform', expanded && 'rotate-180')}/>
        </button>
      ) : null}
    </div>
  );
}


const STATUS_COUNT_TITLES: Record<string, string> = {
  '3': 'Reported outside NotSoBot (like Discord Trust & Safety or NCMEC). Only a marker, it counts as confirmed.',
};

function StatusCount({ userId, status, label, count, tone }: {
  userId: string,
  status: string,
  label: string,
  count: number,
  tone: 'warning' | 'danger' | 'neutral' | 'brand',
}) {
  if (!count) {
    return null;
  }
  return (
    <Link to={adminFlagsPath({user_id: userId, status})} className='hover:opacity-80'>
      <Chip tone={tone} title={STATUS_COUNT_TITLES[status]}>{count.toLocaleString()} {label}</Chip>
    </Link>
  );
}


function TableSkeleton() {
  return (
    <div aria-hidden className='card divide-y divide-line'>
      {Array.from({length: 8}, (_, i) => (
        <div key={i} className='flex items-center gap-3 px-4 py-3'>
          <Skeleton className='size-8 rounded-full'/>
          <div className='flex-1'>
            <Skeleton className='h-4 w-32'/>
            <Skeleton className='mt-1.5 h-3 w-40 bg-surface-2'/>
          </div>
          <Skeleton className='h-4 w-16 bg-surface-2'/>
        </div>
      ))}
    </div>
  );
}
