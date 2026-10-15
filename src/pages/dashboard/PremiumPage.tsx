// The user's premium tier and the entitlements behind it (Discord subscriptions and grants from staff). Read only,
// subscriptions are bought, renewed and cancelled in Discord.

import { Crown } from 'lucide-react';
import { Link } from 'react-router';

import { useAuth } from '@/auth';
import { Routes } from '@/config';
import { EntitlementProviders, UserPremiumTypes, type Entitlement } from '@/lib/api';
import { errorMessage, useMeEntitlementsQuery } from '@/lib/api/dashboardQueries';
import { cn, formatDate, formatExactDateTime, toDate } from '@/lib/utils';

import { Chip } from './admin/adminUi';
import { entitlementStatus, entitlementTierLabel, premiumLabel } from './premium';
import { DashboardHeader, EmptyState, ErrorPanel, Skeleton } from './ui';


export function PremiumPage() {
  const { user } = useAuth();
  const { data, isPending, isError, error, isRefetching, refetch } = useMeEntitlementsQuery();
  const items = data?.items ?? [];

  if (!user) {
    return null;
  }

  return (
    <>
      <DashboardHeader
        title='Premium'
        description='Your NotSoPremium tier and the subscriptions behind it. Buying, renewing and cancelling happen in Discord, on NotSoBot’s profile.'
      >
        <Link to={`${Routes.FAQ}#premium`} className='btn btn-sm btn-ghost'>
          What’s included
        </Link>
      </DashboardHeader>

      <CurrentTier premiumType={user.premium_type} items={(data) ? items : null}/>

      <h2 className='section-label mt-8 mb-3'>Subscriptions and grants</h2>
      {(isPending) ? (
        <ListSkeleton/>
      ) : (isError) ? (
        <ErrorPanel title='Couldn’t load your subscriptions' message={errorMessage(error)} onRetry={() => refetch()} retrying={isRefetching}/>
      ) : (!items.length) ? (
        <EmptyState icon={<Crown className='size-10'/>} title='No subscriptions yet'>
          Subscribe in Discord: open NotSoBot’s profile and pick <span className='text-fg'>Store</span>.
        </EmptyState>
      ) : (
        <>
          <ul className='card divide-y divide-line'>
            {items.map((entitlement) => <EntitlementRow key={entitlement.id} entitlement={entitlement}/>)}
          </ul>
          {(items.length < (data?.count ?? 0)) ? (
            <p className='mt-2 text-xs text-subtle'>Showing the newest {items.length.toLocaleString()} of {data?.count.toLocaleString()}.</p>
          ) : null}
        </>
      )}
    </>
  );
}


function CurrentTier({ premiumType, items }: {premiumType: number, items: Array<Entitlement> | null}) {
  const premium = premiumType !== UserPremiumTypes.NONE;
  const active = items?.filter((entitlement) => entitlement.active).length ?? 0;

  let detail: string | null = null;
  if (!premium) {
    detail = 'You’re on the free tier.';
  } else if (premiumType === UserPremiumTypes.PREMIUM_FREE) {
    detail = 'Given to you by the NotSoBot team.';
  } else if (active) {
    detail = `From ${active.toLocaleString()} active ${(active === 1) ? 'entitlement' : 'entitlements'} below.`;
  }

  return (
    <section className='card flex items-center gap-4 p-5'>
      <span
        aria-hidden
        className={cn('flex size-12 shrink-0 items-center justify-center rounded-lg', premium ? 'bg-warning/15 text-warning' : 'bg-surface-3 text-subtle')}
      >
        <Crown className='size-6'/>
      </span>
      <div className='min-w-0'>
        <div className='text-sm text-muted'>Current tier</div>
        <div className={cn('text-xl font-bold', premium ? 'text-warning' : 'text-white')}>{premiumLabel(premiumType)}</div>
        {(detail) ? <div className='mt-0.5 text-sm text-subtle'>{detail}</div> : null}
      </div>
    </section>
  );
}


function DateLabel({ label, value }: {label: string, value: string | number}) {
  return <span title={formatExactDateTime(value)}>{label} {formatDate(value)}</span>;
}


function EntitlementRow({ entitlement }: {entitlement: Entitlement}) {
  const status = entitlementStatus(entitlement);
  const discord = entitlement.provider === EntitlementProviders.DISCORD;
  const started = entitlement.starts_at ?? entitlement.created_at;
  const ended = entitlement.ends_at !== null && toDate(entitlement.ends_at).getTime() < Date.now();

  return (
    <li className='flex items-start gap-3 px-4 py-3'>
      <span
        aria-hidden
        className={cn('flex size-9 shrink-0 items-center justify-center rounded-md', entitlement.active ? 'bg-warning/15 text-warning' : 'bg-surface-3 text-subtle')}
      >
        <Crown className='size-5'/>
      </span>
      <div className='min-w-0 flex-1'>
        <div className='flex flex-wrap items-center gap-2'>
          <span className='font-medium text-white'>{entitlementTierLabel(entitlement)}</span>
          <Chip tone={status.tone}>{status.label}</Chip>
          <Chip>{(discord) ? 'Discord subscription' : 'Given by staff'}</Chip>
        </div>
        <div className='mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-subtle'>
          {(started !== null) ? <DateLabel label='Started' value={started}/> : null}
          {(entitlement.ends_at !== null) ? (
            <DateLabel label={(ended) ? 'Ended' : (discord) ? 'Current period ends' : 'Ends'} value={entitlement.ends_at}/>
          ) : (entitlement.active) ? (
            <span>No end date</span>
          ) : null}
          {(entitlement.guild_id) ? <span>Server <span className='font-mono'>{entitlement.guild_id}</span></span> : null}
          <span className='font-mono' title='Entitlement ID'>#{entitlement.id}</span>
        </div>
      </div>
    </li>
  );
}


function ListSkeleton() {
  return (
    <div aria-hidden className='card divide-y divide-line'>
      {Array.from({length: 2}, (_, i) => (
        <div key={i} className='flex items-start gap-3 px-4 py-3'>
          <Skeleton className='size-9 rounded-md'/>
          <div className='flex-1'>
            <Skeleton className='h-4 w-48'/>
            <Skeleton className='mt-1.5 h-3 w-64 bg-surface-2'/>
          </div>
        </div>
      ))}
    </div>
  );
}
