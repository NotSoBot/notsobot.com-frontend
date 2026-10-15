import { Ban, Pencil, ShieldCheck, Tags, Trash2, Users } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';

import { isOwner, useAuth } from '@/auth';
import { SearchInput } from '@/components/ui/SearchInput';
import { Segmented } from '@/components/ui/Segmented';
import { Routes } from '@/config';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { UserFlags, type AdminUserEntry, type AdminUsersSortBy } from '@/lib/api';
import { ADMIN_PAGE_SIZE, errorMessage, useAdminUsersQuery } from '@/lib/api/dashboardQueries';
import { cn } from '@/lib/utils';

import { premiumLabel } from '../premium';
import { DashboardHeader, EmptyState, ErrorPanel, Skeleton, Toggle } from '../ui';
import { adminTagsPath, Chip, ExactDate, Pagination, useSearchParamState, useStepBackFromEmptyPage, UserCell } from './adminUi';
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

// `flagged_within` in hours, by how long ago the user's last content flag was
const FLAGGED_WITHIN = [
  {value: 'any', label: 'Any time', hours: null},
  {value: '1d', label: '24h', hours: 24},
  {value: '7d', label: '7 days', hours: 24 * 7},
  {value: '30d', label: '30 days', hours: 24 * 30},
] as const;


export function adminFlagsPath(params: Record<string, string>): string {
  return `${Routes.DASHBOARD_ADMIN_FLAGS}?${new URLSearchParams(params).toString()}`;
}


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
            <table className='w-full min-w-[860px] text-left text-sm'>
              <thead className='border-b border-line text-xs text-subtle uppercase'>
                <tr>
                  <th scope='col' className='px-4 py-2.5 font-medium'>User</th>
                  <th scope='col' className='px-4 py-2.5 font-medium'>Flags</th>
                  <th scope='col' className='px-4 py-2.5 text-right font-medium'>Flagged</th>
                  <th scope='col' className='px-4 py-2.5 text-right font-medium'>Confirmed</th>
                  <th scope='col' className='px-4 py-2.5 font-medium'>Review status</th>
                  <th scope='col' className='px-4 py-2.5 font-medium'>Last flagged</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-line'>
                {items.map((entry) => <UserRow key={entry.user.id} entry={entry}/>)}
              </tbody>
            </table>
          </div>
          <Pagination {...pagination}/>
        </>
      )}
    </>
  );
}


function UserRow({ entry }: {entry: AdminUserEntry}) {
  const { user, content_flags: flags } = entry;
  const { user: me } = useAuth();
  const viewerIsOwner = isOwner(me);
  const owner = (user.flags & UserFlags.OWNER) === UserFlags.OWNER;
  const moderator = (user.flags & UserFlags.MODERATOR) === UserFlags.MODERATOR;
  // owners can't be blocked, and moderators can't block other moderators; the same goes for deleting their tags
  const canBlock = !owner && (viewerIsOwner || !moderator);
  const [ blocking, setBlocking ] = useState(false);
  const [ deletingTags, setDeletingTags ] = useState(false);
  const [ editing, setEditing ] = useState(false);
  const hasChips = owner || moderator || !!user.premium_type;
  return (
    <tr className={cn('align-middle hover:bg-surface-2', user.blocked && 'bg-danger/[0.04]')}>
      <td className={cn('px-4 py-3', user.blocked && 'shadow-[inset_3px_0_0_var(--color-danger)]')}>
        <UserCell user={user}/>
      </td>
      <td className='px-4 py-3'>
        <div className='flex flex-col items-start gap-2'>
          {(hasChips) ? (
            <div className='flex flex-wrap gap-1'>
              {(owner) ? <Chip tone='brand'>Owner</Chip> : null}
              {(moderator) ? <Chip tone='brand'>Moderator</Chip> : null}
              {(user.premium_type) ? <Chip>{premiumLabel(user.premium_type)}</Chip> : null}
            </div>
          ) : null}
          {(user.blocked) ? (
            <BlockedNotice reason={user.blocked_reason} onUnblock={(canBlock) ? () => setBlocking(true) : undefined}/>
          ) : null}
          <div className='-ml-3 flex flex-wrap gap-1'>
            {(canBlock && !user.blocked) ? (
              <button type='button' className='btn btn-sm btn-ghost text-danger' onClick={() => setBlocking(true)}>
                <Ban className='size-4'/>
                Block
              </button>
            ) : null}
            {(viewerIsOwner) ? (
              <button type='button' className='btn btn-sm btn-ghost' onClick={() => setEditing(true)}>
                <Pencil className='size-4'/>
                Edit
              </button>
            ) : null}
            <Link to={adminTagsPath(`user:${user.id}`)} className='btn btn-sm btn-ghost' title='Show this user’s tags'>
              <Tags className='size-4'/>
              Tags
            </Link>
            {(canBlock) ? (
              <button type='button' className='btn btn-sm btn-ghost text-danger' onClick={() => setDeletingTags(true)}>
                <Trash2 className='size-4'/>
                Delete tags
              </button>
            ) : null}
          </div>
        </div>
        {(blocking) ? (
          <BlockUserDialog user={user} blocked={user.blocked} blockedReason={user.blocked_reason} onClose={() => setBlocking(false)}/>
        ) : null}
        {(editing) ? <EditUserDialog user={user} onClose={() => setEditing(false)}/> : null}
        {(deletingTags) ? <DeleteUserTagsDialog user={user} onClose={() => setDeletingTags(false)}/> : null}
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
      <td className='px-4 py-3'>
        {(flags.pending || flags.dismissed || flags.reported) ? (
          <div className='flex flex-wrap gap-1'>
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


// the block, its reason and the way to undo it in one place, so a blocked row reads as blocked before anything else
// `onUnblock` is left out when the viewer isn't allowed to unblock this user
function BlockedNotice({ reason, onUnblock }: {reason: string | null, onUnblock?: () => void}) {
  return (
    <div className='w-full max-w-80 rounded-md border border-danger/30 bg-danger/10 px-3 py-2'>
      <div className='flex items-center gap-1.5'>
        <Ban className='size-3.5 shrink-0 text-[#ff8a8c]'/>
        <span className='text-xs font-semibold text-[#ff8a8c]'>Blocked</span>
        {(onUnblock) ? (
          <button type='button' className='btn btn-sm btn-ghost -my-1 -mr-2 ml-auto px-2 py-1' onClick={onUnblock}>
            <ShieldCheck className='size-3.5'/>
            Unblock
          </button>
        ) : null}
      </div>
      {(reason) ? (
        <p className='mt-1 line-clamp-2 text-xs break-words text-muted' title={reason}>{reason}</p>
      ) : (
        <p className='mt-1 text-xs text-subtle italic'>No reason given</p>
      )}
    </div>
  );
}


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
      <Chip tone={tone}>{count.toLocaleString()} {label}</Chip>
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
