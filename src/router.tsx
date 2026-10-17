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
import { NOT_FOUND_PAGE, PAGES, type PageMeta } from '@/seo';


// `handle.title` is rendered into <title> by SiteLayout. the same metadata is what the worker serves to crawlers
export type RouteHandle = PageMeta;


const routes: Array<RouteObject> = [
  {
    element: <SiteLayout/>,
    errorElement: <RouteErrorPage/>,
    HydrateFallback: () => null,
    children: [
      {index: true, element: <HomePage/>},
      {
        path: Routes.COMMANDS,
        element: <CommandsPage/>,
        handle: PAGES.COMMANDS,
        // the command is a drawer over the list, so the list stays mounted underneath
        children: [
          {index: true},
          {path: ':commandId', handle: PAGES.COMMAND},
          {path: ':commandId/:commandType', handle: PAGES.COMMAND_TYPE},
        ],
      },
      {path: Routes.FAQ, element: <FaqPage/>, handle: PAGES.FAQ},
      {path: Routes.STATUS, element: <StatusPage/>, handle: PAGES.STATUS},
      {
        path: Routes.TAG_DIRECTORY,
        element: <TagDirectoryPage/>,
        handle: PAGES.TAG_DIRECTORY,
        // the tag is a modal over the directory, so the directory stays mounted underneath
        children: [{index: true}, {path: ':tagId', handle: PAGES.TAG_DIRECTORY_ITEM}],
      },
      // the docs content is large, so it's only fetched when someone opens it. both languages share one page, so
      // switching between them keeps the search
      {
        lazy: async () => ({Component: (await import('@/pages/docs/TagDocsPage')).TagDocsPage}),
        children: [
          {path: Routes.TAG_DOCS, handle: PAGES.TAG_DOCS},
          {path: Routes.TAG_DOCS_MEDIASCRIPT, handle: PAGES.TAG_DOCS_MEDIASCRIPT},
        ],
      },
      {path: '/docs', element: <Navigate to={Routes.TAG_DOCS} replace/>},
      {path: Routes.LEGAL_PRIVACY, element: <PrivacyPage/>, handle: PAGES.LEGAL_PRIVACY},
      {path: Routes.LEGAL_TERMS_OF_SERVICE, element: <TermsPage/>, handle: PAGES.LEGAL_TERMS_OF_SERVICE},

      // auth (Discord OAuth via notsobot.api)
      {path: Routes.AUTH_LOGIN, element: <LoginPage/>, handle: PAGES.AUTH_LOGIN},
      {path: Routes.AUTH_LOGIN_CALLBACK, element: <LoginCallbackPage/>, handle: PAGES.AUTH_LOGIN_CALLBACK},
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
            handle: PAGES.DASHBOARD,
            children: [
              {index: true, lazy: async () => ({Component: (await import('@/pages/dashboard/OverviewPage')).OverviewPage})},
              // a tag's details and editor open over the list (`TagsPage` reads the child match), so the list stays mounted under them
              {
                path: Routes.DASHBOARD_TAGS,
                lazy: async () => ({Component: (await import('@/pages/dashboard/tags/TagsPage')).TagsPage}),
                handle: PAGES.DASHBOARD_TAGS,
                children: [
                  {path: Routes.DASHBOARD_TAG, element: null, handle: PAGES.DASHBOARD_TAG},
                  {path: Routes.DASHBOARD_TAG_EDIT, element: null, handle: PAGES.DASHBOARD_TAG_EDIT},
                ],
              },
              {path: Routes.DASHBOARD_APPLICATIONS, lazy: async () => ({Component: (await import('@/pages/dashboard/applications/ApplicationsPage')).ApplicationsPage}), handle: PAGES.DASHBOARD_APPLICATIONS},
              {path: Routes.DASHBOARD_COMMANDS, lazy: async () => ({Component: (await import('@/pages/dashboard/commands/CommandHistoryPage')).CommandHistoryPage}), handle: PAGES.DASHBOARD_COMMANDS},
              {path: Routes.DASHBOARD_SERVERS, lazy: async () => ({Component: (await import('@/pages/dashboard/servers/ServersPage')).ServersPage}), handle: PAGES.DASHBOARD_SERVERS},
              {path: Routes.DASHBOARD_SERVER, lazy: async () => ({Component: (await import('@/pages/dashboard/servers/ServerDetailPage')).ServerDetailPage}), handle: PAGES.DASHBOARD_SERVER},
              {path: Routes.DASHBOARD_PREMIUM, lazy: async () => ({Component: (await import('@/pages/dashboard/PremiumPage')).PremiumPage}), handle: PAGES.DASHBOARD_PREMIUM},
              {path: Routes.DASHBOARD_SETTINGS, lazy: async () => ({Component: (await import('@/pages/dashboard/settings/SettingsPage')).SettingsPage}), handle: PAGES.DASHBOARD_SETTINGS},
              {path: Routes.DASHBOARD_FILES, lazy: async () => ({Component: (await import('@/pages/dashboard/files/FilesPage')).FilesPage}), handle: PAGES.DASHBOARD_FILES},
              {path: Routes.DASHBOARD_REMINDERS, lazy: async () => ({Component: (await import('@/pages/dashboard/reminders/RemindersPage')).RemindersPage}), handle: PAGES.DASHBOARD_REMINDERS},
              {path: `${Routes.DASHBOARD_REPORTS}/:itemId?`, lazy: async () => ({Component: (await import('@/pages/dashboard/reports/ReportsPage')).ReportsPage}), handle: PAGES.DASHBOARD_REPORTS},
              {path: Routes.DASHBOARD_VOICES, lazy: async () => ({Component: (await import('@/pages/dashboard/voices/VoicesPage')).VoicesPage}), handle: PAGES.DASHBOARD_VOICES},
              // NotSoBot staff only (owners and moderators)
              {
                element: <RequireStaff/>,
                children: [
                  {path: '/dashboard/admin', element: <Navigate to={Routes.DASHBOARD_ADMIN_TAGS} replace/>},
                  {path: Routes.DASHBOARD_ADMIN_APPLICATIONS, lazy: async () => ({Component: (await import('@/pages/dashboard/admin/AdminApplicationsPage')).AdminApplicationsPage}), handle: PAGES.DASHBOARD_ADMIN_APPLICATIONS},
                  {path: Routes.DASHBOARD_ADMIN_TAGS, lazy: async () => ({Component: (await import('@/pages/dashboard/admin/AdminAllTagsPage')).AdminAllTagsPage}), handle: PAGES.DASHBOARD_ADMIN_TAGS},
                  {path: `${Routes.DASHBOARD_ADMIN_TAG_DIRECTORY}/:itemId?`, lazy: async () => ({Component: (await import('@/pages/dashboard/admin/AdminTagsPage')).AdminTagsPage}), handle: PAGES.DASHBOARD_ADMIN_TAG_DIRECTORY},
                  {path: `${Routes.DASHBOARD_ADMIN_USERS}/:itemId?`, lazy: async () => ({Component: (await import('@/pages/dashboard/admin/AdminUsersPage')).AdminUsersPage}), handle: PAGES.DASHBOARD_ADMIN_USERS},
                  {path: Routes.DASHBOARD_ADMIN_ENTITLEMENTS, lazy: async () => ({Component: (await import('@/pages/dashboard/admin/AdminEntitlementsPage')).AdminEntitlementsPage}), handle: PAGES.DASHBOARD_ADMIN_ENTITLEMENTS},
                  {path: `${Routes.DASHBOARD_ADMIN_FLAGS}/:itemId?`, lazy: async () => ({Component: (await import('@/pages/dashboard/admin/AdminContentFlagsPage')).AdminContentFlagsPage}), handle: PAGES.DASHBOARD_ADMIN_FLAGS},
                  {path: `${Routes.DASHBOARD_ADMIN_REPORTS}/:itemId?`, lazy: async () => ({Component: (await import('@/pages/dashboard/admin/AdminReportsPage')).AdminReportsPage}), handle: PAGES.DASHBOARD_ADMIN_REPORTS},
                  {path: `${Routes.DASHBOARD_ADMIN_SERVERS}/:itemId?`, lazy: async () => ({Component: (await import('@/pages/dashboard/admin/AdminServersPage')).AdminServersPage}), handle: PAGES.DASHBOARD_ADMIN_SERVERS},
                  {path: Routes.DASHBOARD_ADMIN_VOICES, lazy: async () => ({Component: (await import('@/pages/dashboard/admin/AdminVoicesPage')).AdminVoicesPage}), handle: PAGES.DASHBOARD_ADMIN_VOICES},
                ],
              },
            ],
          },
        ],
      },

      {path: '*', element: <NotFoundPage/>, handle: NOT_FOUND_PAGE},
    ],
  },
];


export const router = createBrowserRouter(routes);
