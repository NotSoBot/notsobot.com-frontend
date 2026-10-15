// Every entitlement: Discord premium subscriptions and the manual grants made from the Users page. Read only,
// premium is changed from the Users page (owners) or on Discord.

import { Crown } from 'lucide-react';

import { SearchInput } from '@/components/ui/SearchInput';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { EntitlementProviders } from '@/lib/api';
import { ADMIN_PAGE_SIZE, errorMessage, useAdminEntitlementsQuery } from '@/lib/api/dashboardQueries';
import { cn } from '@/lib/utils';

import { ENTITLEMENT_PROVIDERS, ENTITLEMENT_TIERS, entitlementProviderLabel, entitlementStatus, entitlementTierLabel } from '../premium';
import { DashboardHeader, EmptyState, ErrorPanel, Skeleton } from '../ui';
import { Chip, CopyableValue, ExactDate, Pagination, useSearchParamState, useStepBackFromEmptyPage, UserCell } from './adminUi';


function parseNumber(value: string | null): number | null {
  if (value === null || value === '' || Number.isNaN(Number(value))) {
    return null;
  }
  return Number(value);
}

function parseActive(value: string | null): boolean | null {
  return (value === 'true') ? true : (value === 'false') ? false : null;
}


export function AdminEntitlementsPage() {
  const { searchParams, page, update, setPage } = useSearchParamState();
  const userId = searchParams.get('user_id') || '';
  const provider = searchParams.get('provider') || null;
  const premiumType = parseNumber(searchParams.get('premium_type'));
  const active = parseActive(searchParams.get('active'));
  const debouncedUserId = useDebouncedValue(userId.trim(), 300);
  // the api only takes an id here, so anything else isn't sent
  const validUserId = /^\d{1,20}$/.test(debouncedUserId) ? debouncedUserId : '';

  const { data, isPending, isError, error, isPlaceholderData, isFetching, isRefetching, refetch } = useAdminEntitlementsQuery({
    userId: validUserId,
    provider,
    premiumType,
    active,
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
  const filtered = !!(validUserId || provider || premiumType !== null || active !== null);

  return (
    <>
      <DashboardHeader
        title='Entitlements'
        description='Every premium entitlement, newest first: Discord subscriptions and the premium owners give from the Users page.'
      />

      <div className='mb-4 space-y-3'>
        <SearchInput
          value={userId}
          onValueChange={(value) => update({user_id: value})}
          placeholder='Filter by user id...'
          aria-label='Filter by user id'
        />
        {(debouncedUserId && !validUserId) ? <p className='text-xs text-warning'>Enter a user id (numbers only).</p> : null}
        <div className='flex flex-wrap items-center gap-3'>
          <label className='flex items-center gap-2 text-sm text-muted'>
            Status
            <select
              className='input w-32'
              value={(active === null) ? '' : String(active)}
              onChange={(event) => update({active: event.target.value})}
            >
              <option value=''>Any</option>
              <option value='true'>Active</option>
              <option value='false'>Inactive</option>
            </select>
          </label>
          <label className='flex items-center gap-2 text-sm text-muted'>
            Tier
            <select
              className='input w-36'
              value={(premiumType === null) ? '' : String(premiumType)}
              onChange={(event) => update({premium_type: event.target.value})}
            >
              <option value=''>Any</option>
              {ENTITLEMENT_TIERS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
          <label className='flex items-center gap-2 text-sm text-muted'>
            Source
            <select className='input w-36' value={provider ?? ''} onChange={(event) => update({provider: event.target.value})}>
              <option value=''>Any</option>
              {ENTITLEMENT_PROVIDERS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
        </div>
      </div>

      {(isPending || steppingBack) ? (
        <TableSkeleton/>
      ) : (isError && !items.length) ? (
        <ErrorPanel title='Couldn’t load entitlements' message={errorMessage(error)} onRetry={() => refetch()} retrying={isRefetching}/>
      ) : (!items.length) ? (
        <EmptyState icon={<Crown className='size-10'/>} title='No entitlements found'>
          {(filtered) ? 'Try different filters.' : null}
        </EmptyState>
      ) : (
        <>
          <Pagination {...pagination} className='mt-0 mb-4'/>
          <div className={cn('card overflow-x-auto transition-opacity', isPlaceholderData && 'opacity-60')}>
            <table className='w-full min-w-[860px] text-left text-sm'>
              <thead className='border-b border-line text-xs text-subtle uppercase'>
                <tr>
                  <th scope='col' className='px-4 py-2.5 font-medium'>User</th>
                  <th scope='col' className='px-4 py-2.5 font-medium'>Tier</th>
                  <th scope='col' className='px-4 py-2.5 font-medium'>Source</th>
                  <th scope='col' className='px-4 py-2.5 font-medium'>Starts</th>
                  <th scope='col' className='px-4 py-2.5 font-medium'>Ends</th>
                  <th scope='col' className='px-4 py-2.5 font-medium'>ID</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-line'>
                {items.map((entitlement) => {
                  const status = entitlementStatus(entitlement);
                  const started = entitlement.starts_at ?? entitlement.created_at;
                  return (
                    <tr key={entitlement.id} className='align-middle hover:bg-surface-2'>
                      <td className='px-4 py-3'>
                        {(entitlement.user) ? (
                          <button
                            type='button'
                            className='-m-1 cursor-pointer rounded-md p-1 text-left hover:bg-surface-3'
                            title='Show only this user’s entitlements'
                            onClick={() => update({user_id: entitlement.user?.id ?? null})}
                          >
                            <UserCell user={entitlement.user}/>
                          </button>
                        ) : (entitlement.guild_id) ? (
                          <div className='text-xs text-muted'>
                            Server
                            <CopyableValue value={entitlement.guild_id} truncate={0} className='mt-0.5'/>
                          </div>
                        ) : <UserCell user={null}/>}
                      </td>
                      <td className='px-4 py-3'>
                        <div className='font-medium whitespace-nowrap text-white'>{entitlementTierLabel(entitlement)}</div>
                        {(entitlement.premium_type === null) ? <div className='font-mono text-xs text-subtle' title='SKU'>{entitlement.sku_id}</div> : null}
                        <div className='mt-1'><Chip tone={status.tone}>{status.label}</Chip></div>
                      </td>
                      <td className='px-4 py-3'>
                        <Chip tone={(entitlement.provider === EntitlementProviders.MANUAL) ? 'brand' : 'neutral'}>
                          {entitlementProviderLabel(entitlement.provider)}
                        </Chip>
                        {(entitlement.granted_by) ? (
                          <div className='mt-1 text-xs text-subtle'>
                            by <CopyableValue value={entitlement.granted_by} truncate={0}/>
                          </div>
                        ) : (entitlement.external_id) ? (
                          <div className='mt-1' title='Discord entitlement ID'>
                            <CopyableValue value={entitlement.external_id} truncate={0}/>
                          </div>
                        ) : null}
                      </td>
                      <td className='px-4 py-3 whitespace-nowrap text-muted'>
                        {(started !== null) ? <ExactDate value={started}/> : '—'}
                      </td>
                      <td className='px-4 py-3 whitespace-nowrap text-muted'>
                        {(entitlement.ends_at !== null) ? <ExactDate value={entitlement.ends_at}/> : 'Never'}
                      </td>
                      <td className='px-4 py-3'>
                        <CopyableValue value={entitlement.id} truncate={0}/>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination {...pagination}/>
        </>
      )}
    </>
  );
}


function TableSkeleton() {
  return (
    <div aria-hidden className='card divide-y divide-line'>
      {Array.from({length: 6}, (_, i) => (
        <div key={i} className='flex items-center gap-3 px-4 py-3'>
          <Skeleton className='size-8 rounded-full'/>
          <div className='flex-1'>
            <Skeleton className='h-4 w-36'/>
            <Skeleton className='mt-1.5 h-3 w-24 bg-surface-2'/>
          </div>
          <Skeleton className='h-4 w-24 bg-surface-2'/>
          <Skeleton className='h-4 w-28 bg-surface-2'/>
          <Skeleton className='h-4 w-28 bg-surface-2'/>
        </div>
      ))}
    </div>
  );
}
