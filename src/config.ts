function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === '') {
    return fallback;
  }
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}


export const config = Object.freeze({
  apiBase: (import.meta.env.VITE_API_BASE || '/api').replace(/\/+$/, ''),
  // the old site only exposed login on the beta build, so default it to dev-only
  authEnabled: parseBoolean(import.meta.env.VITE_AUTH_ENABLED, import.meta.env.DEV),
  umamiScriptUrl: import.meta.env.VITE_UMAMI_SCRIPT_URL || null,
  umamiWebsiteId: import.meta.env.VITE_UMAMI_WEBSITE_ID || null,
});


export const Urls = Object.freeze({
  GITHUB: 'https://github.com/notsobot',
  FOXBOT: 'https://discord.com/users/66078337084162048',
  CONTACT_EMAIL: 'privacy@notsocompany.com',
});


export const Routes = Object.freeze({
  HOME: '/',
  AUTH_LOGIN: '/auth/login',
  AUTH_LOGIN_CALLBACK: '/auth/login/callback',
  AUTH_REDIRECT: '/auth/redirect',
  COMMANDS: '/commands',
  DASHBOARD: '/dashboard',
  DASHBOARD_TAGS: '/dashboard/tags',
  DASHBOARD_TAG: '/dashboard/tags/:tagId',
  DASHBOARD_SERVERS: '/dashboard/servers',
  DASHBOARD_SERVER: '/dashboard/servers/:guildId',
  DASHBOARD_SETTINGS: '/dashboard/settings',
  DASHBOARD_REMINDERS: '/dashboard/reminders',
  DASHBOARD_VOICES: '/dashboard/voices',
  DASHBOARD_ADMIN_ALL_TAGS: '/dashboard/admin/all-tags',
  DASHBOARD_ADMIN_TAGS: '/dashboard/admin/tags',
  DASHBOARD_ADMIN_USERS: '/dashboard/admin/users',
  DASHBOARD_ADMIN_FLAGS: '/dashboard/admin/flags',
  DASHBOARD_ADMIN_REPORTS: '/dashboard/admin/reports',
  DASHBOARD_ADMIN_VOICES: '/dashboard/admin/voices',
  FAQ: '/faq',
  FOXBOT: '/foxbot',
  INVITE: '/invite',
  LEGAL_PRIVACY: '/legal/privacy',
  LEGAL_TERMS_OF_SERVICE: '/legal/tos',
  STATUS: '/status',
  TAG_DIRECTORY: '/directory/tags',
  TAG_DOCS: '/docs/tags',
  TAG_DIRECTORY_ITEM: '/directory/tags/:tagId',
  SUPPORT: '/support',
  SUPPORT_INVITE: '/support/invite',
});
