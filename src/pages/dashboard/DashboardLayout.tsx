import { Database, Flag, Inbox, LayoutDashboard, Server, Settings, ShieldCheck, Tags, Users, type LucideIcon } from 'lucide-react';
import type { CSSProperties } from 'react';
import { NavLink, Outlet } from 'react-router';

import { isStaff, useAuth } from '@/auth';
import { ToastProvider } from '@/components/ui/Toast';
import { Routes } from '@/config';
import { userAvatarUrl } from '@/lib/discord';
import { cn } from '@/lib/utils';

import { premiumLabel } from './premium';


interface Section {
  to: string,
  label: string,
  icon: LucideIcon,
  color: string,
  end?: boolean,
}

export const DASHBOARD_SECTIONS: ReadonlyArray<Section> = [
  {to: Routes.DASHBOARD, label: 'Overview', icon: LayoutDashboard, color: '#5865f2', end: true},
  {to: Routes.DASHBOARD_TAGS, label: 'Tags', icon: Tags, color: '#3ba55c'},
  {to: Routes.DASHBOARD_SERVERS, label: 'Servers', icon: Server, color: '#faa81a'},
  {to: Routes.DASHBOARD_SETTINGS, label: 'Settings', icon: Settings, color: '#00b0f4'},
  {to: Routes.DASHBOARD_DATA, label: 'Your Data', icon: Database, color: '#ed4245'},
];

// only shown to NotSoBot staff, owners and moderators (the routes are guarded by <RequireStaff/> too)
export const ADMIN_SECTIONS: ReadonlyArray<Section> = [
  {to: Routes.DASHBOARD_ADMIN_ALL_TAGS, label: 'Tags', icon: Tags, color: '#00b0f4'},
  {to: Routes.DASHBOARD_ADMIN_TAGS, label: 'Directory Tags', icon: ShieldCheck, color: '#3ba55c'},
  {to: Routes.DASHBOARD_ADMIN_USERS, label: 'Users', icon: Users, color: '#5865f2'},
  {to: Routes.DASHBOARD_ADMIN_FLAGS, label: 'Content Flags', icon: Flag, color: '#ed4245'},
  {to: Routes.DASHBOARD_ADMIN_REPORTS, label: 'Reports', icon: Inbox, color: '#faa81a'},
];


export function DashboardLayout() {
  const { user } = useAuth();

  return (
    <ToastProvider>
      <div className='container-page py-6 sm:py-8'>
        <div className='grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-8'>
          <aside aria-label='Dashboard' className='lg:sticky lg:top-24 lg:self-start'>
            {(user) ? (
              <div className='mb-4 hidden items-center gap-3 px-1 lg:flex'>
                <img src={userAvatarUrl(user, 64)} alt='' className='size-10 rounded-full bg-surface-3'/>
                <div className='min-w-0'>
                  <div className='truncate font-semibold text-white'>{user.username}</div>
                  <div className='truncate text-xs text-subtle'>{premiumLabel(user.premium_type)}</div>
                </div>
              </div>
            ) : null}
            <h2 className='section-label mb-2 hidden px-1 lg:block'>Dashboard</h2>
            <nav aria-label='Dashboard sections'>
              <SectionList sections={DASHBOARD_SECTIONS}/>
            </nav>
            {(isStaff(user)) ? (
              <nav aria-label='Admin sections' className='mt-3 lg:mt-6'>
                <h2 className='section-label mb-2 hidden px-1 lg:block'>Admin</h2>
                <SectionList sections={ADMIN_SECTIONS}/>
              </nav>
            ) : null}
          </aside>

          <div className='min-w-0'>
            <Outlet/>
          </div>
        </div>
      </div>
    </ToastProvider>
  );
}


function SectionList({ sections }: {sections: ReadonlyArray<Section>}) {
  return (
    <ul className='-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 lg:mx-0 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:px-0 lg:pb-0'>
      {sections.map((section) => (
        <li key={section.to} className='shrink-0'>
          <NavLink
            to={section.to}
            end={section.end}
            style={{'--cat': section.color} as CSSProperties}
            className={({ isActive }) => cn(
              'flex items-center gap-2.5 rounded-md border px-3 py-2 text-sm whitespace-nowrap transition-colors lg:border-transparent',
              isActive ? 'border-brand/70 bg-surface-3 text-white' : 'border-line text-muted hover:bg-surface-2 hover:text-white',
            )}
          >
            <section.icon aria-hidden className='size-4 shrink-0 text-[var(--cat)]'/>
            {section.label}
          </NavLink>
        </li>
      ))}
    </ul>
  );
}
