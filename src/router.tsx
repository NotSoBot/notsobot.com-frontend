import { createBrowserRouter, Navigate, type RouteObject } from 'react-router';

import { RequireAuth, RequireStaff } from '@/auth';
import { ExternalRedirect } from '@/components/ExternalRedirect';
import { SiteLayout } from '@/components/layout/SiteLayout';
import { Routes, Urls } from '@/config';
import { ApiEndpoints, apiUrl } from '@/lib/api';
import { BotAddedRedirectPage } from '@/pages/auth/BotAddedRedirectPage';
import { LoginCallbackPage } from '@/pages/auth/LoginCallbackPage';
import { LoginPage } from '@/pages/auth/LoginPage';
import { CommandsPage } from '@/pages/commands/CommandsPage';
import { FaqPage } from '@/pages/FaqPage';
import { HomePage } from '@/pages/HomePage';
import { PrivacyPage } from '@/pages/legal/PrivacyPage';
import { TermsPage } from '@/pages/legal/TermsPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { RouteErrorPage } from '@/pages/RouteErrorPage';
import { StatusPage } from '@/pages/StatusPage';
import { TagDirectoryPage } from '@/pages/tags/TagDirectoryPage';


// `handle.title` is rendered into <title> by SiteLayout
export interface RouteHandle {
  title?: string,
}


const routes: Array<RouteObject> = [
  {
    element: <SiteLayout/>,
    errorElement: <RouteErrorPage/>,
    HydrateFallback: () => null,
    children: [
      {index: true, element: <HomePage/>},
      {path: Routes.COMMANDS, element: <CommandsPage/>, handle: {title: 'Commands'} satisfies RouteHandle},
      {path: Routes.FAQ, element: <FaqPage/>, handle: {title: 'FAQ'} satisfies RouteHandle},
      {path: Routes.STATUS, element: <StatusPage/>, handle: {title: 'Status'} satisfies RouteHandle},
      {
        path: Routes.TAG_DIRECTORY,
        element: <TagDirectoryPage/>,
        handle: {title: 'Tag Directory'} satisfies RouteHandle,
        // the tag is a modal over the directory, so the directory stays mounted underneath
        children: [{index: true}, {path: ':tagId'}],
      },
      // the docs content is large, so it's only fetched when someone opens it
      {
        path: Routes.TAG_DOCS,
        lazy: async () => ({Component: (await import('@/pages/docs/TagDocsPage')).TagDocsPage}),
        handle: {title: 'Tag Scripting'} satisfies RouteHandle,
      },
      {path: '/docs', element: <Navigate to={Routes.TAG_DOCS} replace/>},
      {path: Routes.LEGAL_PRIVACY, element: <PrivacyPage/>, handle: {title: 'Privacy Policy'} satisfies RouteHandle},
      {path: Routes.LEGAL_TERMS_OF_SERVICE, element: <TermsPage/>, handle: {title: 'Terms of Service'} satisfies RouteHandle},

      // auth (Discord OAuth via notsobot.api)
      {path: Routes.AUTH_LOGIN, element: <LoginPage/>, handle: {title: 'Log in'} satisfies RouteHandle},
      {path: Routes.AUTH_LOGIN_CALLBACK, element: <LoginCallbackPage/>, handle: {title: 'Log in'} satisfies RouteHandle},
      {path: Routes.AUTH_REDIRECT, element: <BotAddedRedirectPage/>},

      // short legal paths (used by the new design)
      {path: '/privacy', element: <Navigate to={Routes.LEGAL_PRIVACY} replace/>},
      {path: '/terms', element: <Navigate to={Routes.LEGAL_TERMS_OF_SERVICE} replace/>},

      // vanity redirects
      {path: Routes.INVITE, element: <ExternalRedirect to={apiUrl(ApiEndpoints.HELP_DISCORD_BOT)} label='Opening Discord'/>},
      {path: Routes.SUPPORT, element: <ExternalRedirect to={apiUrl(ApiEndpoints.HELP_DISCORD_SERVER)} label='Opening the support server'/>},
      {path: Routes.SUPPORT_INVITE, element: <ExternalRedirect to={apiUrl(ApiEndpoints.HELP_DISCORD_SERVER)} label='Opening the support server'/>},
      {path: Routes.FOXBOT, element: <ExternalRedirect to={Urls.FOXBOT}/>},

      // authenticated pages (the dashboard is code-split: only fetched when someone opens it)
      {
        element: <RequireAuth/>,
        children: [
          {
            path: Routes.DASHBOARD,
            lazy: async () => ({Component: (await import('@/pages/dashboard/DashboardLayout')).DashboardLayout}),
            handle: {title: 'Dashboard'} satisfies RouteHandle,
            children: [
              {index: true, lazy: async () => ({Component: (await import('@/pages/dashboard/OverviewPage')).OverviewPage})},
              {path: Routes.DASHBOARD_TAGS, lazy: async () => ({Component: (await import('@/pages/dashboard/tags/TagsPage')).TagsPage}), handle: {title: 'Your Tags'} satisfies RouteHandle},
              {path: Routes.DASHBOARD_TAG, lazy: async () => ({Component: (await import('@/pages/dashboard/tags/TagEditorPage')).TagEditorPage}), handle: {title: 'Edit Tag'} satisfies RouteHandle},
              {path: Routes.DASHBOARD_SERVERS, lazy: async () => ({Component: (await import('@/pages/dashboard/servers/ServersPage')).ServersPage}), handle: {title: 'Servers'} satisfies RouteHandle},
              {path: Routes.DASHBOARD_SERVER, lazy: async () => ({Component: (await import('@/pages/dashboard/servers/ServerDetailPage')).ServerDetailPage}), handle: {title: 'Server'} satisfies RouteHandle},
              {path: Routes.DASHBOARD_SETTINGS, lazy: async () => ({Component: (await import('@/pages/dashboard/settings/SettingsPage')).SettingsPage}), handle: {title: 'Settings'} satisfies RouteHandle},
              {path: Routes.DASHBOARD_REMINDERS, lazy: async () => ({Component: (await import('@/pages/dashboard/reminders/RemindersPage')).RemindersPage}), handle: {title: 'Your Reminders'} satisfies RouteHandle},
              {path: Routes.DASHBOARD_VOICES, lazy: async () => ({Component: (await import('@/pages/dashboard/voices/VoicesPage')).VoicesPage}), handle: {title: 'Your Voices'} satisfies RouteHandle},
              // NotSoBot staff only (owners and moderators)
              {
                element: <RequireStaff/>,
                children: [
                  {path: '/dashboard/admin', element: <Navigate to={Routes.DASHBOARD_ADMIN_ALL_TAGS} replace/>},
                  {path: Routes.DASHBOARD_ADMIN_ALL_TAGS, lazy: async () => ({Component: (await import('@/pages/dashboard/admin/AdminAllTagsPage')).AdminAllTagsPage}), handle: {title: 'Tags'} satisfies RouteHandle},
                  {path: Routes.DASHBOARD_ADMIN_TAGS, lazy: async () => ({Component: (await import('@/pages/dashboard/admin/AdminTagsPage')).AdminTagsPage}), handle: {title: 'Directory Tags'} satisfies RouteHandle},
                  {path: Routes.DASHBOARD_ADMIN_USERS, lazy: async () => ({Component: (await import('@/pages/dashboard/admin/AdminUsersPage')).AdminUsersPage}), handle: {title: 'Users'} satisfies RouteHandle},
                  {path: Routes.DASHBOARD_ADMIN_FLAGS, lazy: async () => ({Component: (await import('@/pages/dashboard/admin/AdminContentFlagsPage')).AdminContentFlagsPage}), handle: {title: 'Content Flags'} satisfies RouteHandle},
                  {path: Routes.DASHBOARD_ADMIN_REPORTS, lazy: async () => ({Component: (await import('@/pages/dashboard/admin/AdminReportsPage')).AdminReportsPage}), handle: {title: 'Reports'} satisfies RouteHandle},
                  {path: Routes.DASHBOARD_ADMIN_VOICES, lazy: async () => ({Component: (await import('@/pages/dashboard/admin/AdminVoicesPage')).AdminVoicesPage}), handle: {title: 'Voices'} satisfies RouteHandle},
                ],
              },
            ],
          },
        ],
      },

      {path: '*', element: <NotFoundPage/>, handle: {title: 'Not Found'} satisfies RouteHandle},
    ],
  },
];


export const router = createBrowserRouter(routes);
