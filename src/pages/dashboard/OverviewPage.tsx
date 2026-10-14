import { ArrowRight, Crown } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import { Link } from 'react-router';

import { useAuth } from '@/auth';
import { Routes } from '@/config';
import { isDiscordGrantError, isScopeMismatch, useMeGuildsQuery, useMeTagsCountQuery } from '@/lib/api/dashboardQueries';
import { UserPremiumTypes } from '@/lib/api';
import { userAvatarUrl, userDisplayTag } from '@/lib/discord';
import { cn } from '@/lib/utils';

import { CONTENT_SECTIONS, DASHBOARD_SECTIONS } from './DashboardLayout';
import { premiumLabel } from './premium';
import { Skeleton } from './ui';


const SECTION_BLURBS: Record<string, string> = {
  Tags: 'Edit your tags, their variables and stored blobs.',
  Servers: 'Prefixes, allow/blocklists, loggers and server settings.',
  Voices: 'Rename the voices you cloned with the bot.',
  Settings: 'AI personality, language, timezone, media, and exporting or deleting your data.',
};


export function OverviewPage() {
  const { user } = useAuth();
  const tagsCount = useMeTagsCountQuery();
  const guilds = useMeGuildsQuery();

  if (!user) {
    return null;
  }

  const premium = user.premium_type !== UserPremiumTypes.NONE;
  const manageable = guilds.data?.filter((guild) => guild.can_manage).length ?? 0;

  return (
    <div className='space-y-6'>
      <section className='card relative overflow-hidden p-5 sm:p-6'>
        <div aria-hidden className='absolute inset-x-0 top-0 h-16 bg-gradient-to-r from-brand/40 via-brand/10 to-transparent'/>
        <div className='relative flex flex-col gap-4 sm:flex-row sm:items-center'>
          <img src={userAvatarUrl(user, 128)} alt='' className='size-20 rounded-full border-4 border-surface bg-surface-3'/>
          <div className='min-w-0 flex-1'>
            <h1 className='truncate text-2xl font-bold text-white sm:text-3xl'>{userDisplayTag(user)}</h1>
            <p className='mt-0.5 truncate font-mono text-xs text-subtle'>{user.id}</p>
          </div>
          <div
            className={cn(
              'flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium',
              premium ? 'border-warning/50 bg-warning/10 text-warning' : 'border-line-strong bg-surface-2 text-muted',
            )}
          >
            <Crown aria-hidden className='size-4'/>
            {premiumLabel(user.premium_type)}
          </div>
        </div>
      </section>

      <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
        <Stat
          label='Tags you own'
          to={Routes.DASHBOARD_TAGS}
          value={(tagsCount.isPending) ? null : (tagsCount.isError) ? '—' : tagsCount.data.toLocaleString()}
          color='#3ba55c'
        />
        <Stat
          label='Servers with NotSoBot'
          to={Routes.DASHBOARD_SERVERS}
          value={(guilds.isPending) ? null : (guilds.isError) ? '—' : guilds.data.length.toLocaleString()}
          detail={
            (isScopeMismatch(guilds.error) || isDiscordGrantError(guilds.error)) ? 'Log in again to see your servers'
              : (guilds.data) ? `${manageable.toLocaleString()} you can manage` : undefined
          }
          color='#faa81a'
        />
      </div>

      <section aria-labelledby='overview-sections'>
        <h2 id='overview-sections' className='section-label mb-3'>Jump to</h2>
        <ul className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
          {[...CONTENT_SECTIONS, ...DASHBOARD_SECTIONS].filter((section) => section.label in SECTION_BLURBS).map((section) => (
            <li key={section.to}>
              <Link
                to={section.to}
                style={{'--cat': section.color} as CSSProperties}
                className='group card card-hover flex h-full items-start gap-3 p-4 hover:border-[var(--cat)]'
              >
                <span className='flex size-9 shrink-0 items-center justify-center rounded-md bg-[color-mix(in_srgb,var(--cat)_18%,transparent)]'>
                  <section.icon aria-hidden className='size-5 text-[var(--cat)]'/>
                </span>
                <span className='min-w-0 flex-1'>
                  <span className='block font-medium text-white'>{section.label}</span>
                  <span className='mt-0.5 block text-sm text-muted'>{SECTION_BLURBS[section.label]}</span>
                </span>
                <ArrowRight aria-hidden className='mt-1 size-4 shrink-0 text-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-white'/>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}


function Stat({ label, value, detail, to, color }: {label: string, value: ReactNode | null, detail?: string, to: string, color: string}) {
  return (
    <Link to={to} className='card card-hover block p-4 sm:p-5' style={{'--cat': color} as CSSProperties}>
      <div className='flex items-center gap-2 text-sm text-muted'>
        <span aria-hidden className='size-2 rounded-full bg-[var(--cat)]'/>
        {label}
      </div>
      <div className='mt-2 text-3xl font-bold text-white tabular-nums'>
        {(value === null) ? <Skeleton className='h-9 w-16'/> : value}
      </div>
      {(detail) ? <div className='mt-1 text-xs text-subtle'>{detail}</div> : null}
    </Link>
  );
}
