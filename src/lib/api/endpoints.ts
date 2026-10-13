// Paths are relative to `config.apiBase` (`/api`), matching notsobot.api's blueprints.
export const ApiEndpoints = Object.freeze({
  AUTH_LOGIN: '/auth/login',
  AUTH_LOGOUT: '/auth/logout',
  COMMANDS: '/commands',
  COMMANDS_STATS: '/commands/stats',
  HELP_DISCORD_BOT: '/help/discord/bot',
  HELP_DISCORD_SERVER: '/help/discord/server',
  INFO_DISCORD: '/info/discord',
  TAGS_DIRECTORY: '/tags/directory',
  USER_ME: '/users/@me',
  USER_ME_SESSIONS: '/users/@me/sessions',

  // dashboard (docs/dashboard-api.md)
  USER_ME_SETTINGS: '/users/@me/settings',
  USER_ME_TAGS: '/users/@me/tags',
  USER_ME_TAG: (tagId: string) => `/users/@me/tags/${tagId}`,
  USER_ME_TAG_VARIABLES: (tagId: string) => `/users/@me/tags/${tagId}/variables`,
  USER_ME_TAG_VARIABLE: (tagId: string, storageType: number, storageId: string) => `/users/@me/tags/${tagId}/variables/${storageType}/${storageId}`,
  USER_ME_TAG_BLOBS: (tagId: string) => `/users/@me/tags/${tagId}/blobs`,
  USER_ME_TAG_DIRECTORY: (tagId: string) => `/users/@me/tags/${tagId}/directory`,
  USER_ME_TAG_ADD: (tagId: string) => `/users/@me/tags/${tagId}/add`,
  USER_ME_GUILDS: '/users/@me/guilds',
  USER_ME_GUILD: (guildId: string) => `/users/@me/guilds/${guildId}`,
  USER_ME_GUILD_PREFIXES: (guildId: string) => `/users/@me/guilds/${guildId}/prefixes`,
  USER_ME_GUILD_PREFIXES_DELETE: (guildId: string) => `/users/@me/guilds/${guildId}/prefixes/delete`,
  USER_ME_GUILD_LIST: (guildId: string, list: string, id: string, type: string) => `/users/@me/guilds/${guildId}/${list}/${id}/${type}`,
  USER_ME_GUILD_COMMAND_LIST: (guildId: string, command: string, list: string, id: string, type: string) => {
    return `/users/@me/guilds/${guildId}/commands/${encodeURIComponent(command)}/${list}/${id}/${type}`;
  },
  USER_ME_GUILD_LOGGERS_DELETE: (guildId: string) => `/users/@me/guilds/${guildId}/loggers/delete`,
  USER_ME_GUILD_DATA_EXPORT: (guildId: string) => `/users/@me/guilds/${guildId}/data/export`,
  USER_ME_GUILD_DATA_DELETE: (guildId: string) => `/users/@me/guilds/${guildId}/data/delete`,
  // planned, not built yet (the dashboard treats 404/405 as "not available yet")
  USER_ME_DATA_EXPORT: '/users/@me/data/export',

  // admin (owner only)
  ADMIN_TAGS_DIRECTORY: '/admin/tags/directory',
  ADMIN_TAG_DIRECTORY: (tagId: string) => `/admin/tags/directory/${tagId}`,
  ADMIN_USERS: '/admin/users',
  ADMIN_USER: (userId: string) => `/admin/users/${userId}`,
  ADMIN_CONTENT_FLAGS: '/admin/content-flags',
  ADMIN_CONTENT_FLAG: (flagId: string) => `/admin/content-flags/${flagId}`,
  ADMIN_REPORTS: '/admin/reports',
  ADMIN_REPORT: (reportId: string) => `/admin/reports/${reportId}`,
});
