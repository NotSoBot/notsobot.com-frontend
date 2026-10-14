import { ApiEndpoints } from './endpoints';
import { ApiRequestError, apiRequest } from './client';
import { ApiErrorCodes } from './types';
import type {
  AdminTagDirectoryItem,
  AdminTagDirectoryPage,
  AdminUser,
  AdminUserPatch,
  AdminUsersPage,
  AdminTagDirectorySortBy,
  AdminTagsPage,
  AdminTagsSortBy,
  AdminUsersSortBy,
  Command,
  ContentFlag,
  ContentFlagPatch,
  ContentFlagType,
  ContentFlagsPage,
  CommandStat,
  Report,
  ReportPatch,
  ReportsPage,
  GuildListKind,
  InfoDiscord,
  Tag,
  TagAsset,
  TagBlobs,
  TagBlobsPut,
  TagDirectoryItem,
  TagDirectoryListingInput,
  TagDirectoryPage,
  TagPatch,
  TagsPage,
  TagStorageScope,
  TagStorageType,
  TagVariable,
  TagVariables,
  UserGuild,
  UserGuildDataDelete,
  UserGuildDataExport,
  UserGuildPatch,
  UserGuildSummary,
  UserMe,
  UserSession,
  UserSettings,
  UserSettingsPatch,
} from './types';


export * from './client';
export * from './endpoints';
export * from './types';


export const api = {
  fetchCommands: (signal?: AbortSignal) => {
    return apiRequest<Array<Command>>(ApiEndpoints.COMMANDS, {auth: false, signal});
  },

  fetchCommandStats: (since: Date | null, signal?: AbortSignal) => {
    return apiRequest<Array<CommandStat>>(ApiEndpoints.COMMANDS_STATS, {
      auth: false,
      signal,
      query: {since: since?.toISOString()},
    });
  },

  fetchInfoDiscord: (signal?: AbortSignal) => {
    // polled every 2s, so give up quickly and let the next poll try again
    return apiRequest<InfoDiscord>(ApiEndpoints.INFO_DISCORD, {auth: false, signal, timeout: 5000});
  },

  fetchTagDirectory: (params: {
    query?: string,
    sortBy?: number,
    verified?: number | null,
    nsfw?: boolean | null,
    before?: string,
    offset?: number,
    limit?: number,
  }, signal?: AbortSignal) => {
    return apiRequest<TagDirectoryPage>(ApiEndpoints.TAGS_DIRECTORY, {
      auth: false,
      signal,
      query: {
        query: params.query || undefined,
        sort_by: params.sortBy,
        verified: params.verified,
        nsfw: params.nsfw,
        before: params.before,
        offset: params.offset || undefined,
        limit: params.limit,
      },
    });
  },

  // There's no public single-item endpoint; the directory is keyed and ordered by tag id,
  // so asking for the first item strictly before `id + 1` returns exactly that tag (if listed).
  fetchTagDirectoryItem: async (id: string, signal?: AbortSignal): Promise<TagDirectoryItem | null> => {
    if (!/^\d{1,21}$/.test(id)) {
      return null;
    }
    const page = await apiRequest<TagDirectoryPage>(ApiEndpoints.TAGS_DIRECTORY, {
      auth: false,
      signal,
      query: {before: (BigInt(id) + 1n).toString(), limit: 1},
    });
    const item = page.items[0];
    return (item && item.id === id) ? item : null;
  },

  fetchMe: (signal?: AbortSignal) => {
    return apiRequest<UserMe>(ApiEndpoints.USER_ME, {signal});
  },

  fetchMeSessions: (signal?: AbortSignal) => {
    return apiRequest<Array<UserSession>>(ApiEndpoints.USER_ME_SESSIONS, {signal});
  },

  logout: () => {
    return apiRequest<void>(ApiEndpoints.AUTH_LOGOUT);
  },


  // --- dashboard (docs/dashboard-api.md) ---

  fetchMeSettings: (signal?: AbortSignal) => {
    return apiRequest<UserSettings>(ApiEndpoints.USER_ME_SETTINGS, {signal});
  },

  patchMeSettings: (body: UserSettingsPatch) => {
    return apiRequest<UserSettings>(ApiEndpoints.USER_ME_SETTINGS, {method: 'PATCH', body});
  },

  fetchMeTags: (params: {query?: string, before?: string, limit?: number}, signal?: AbortSignal) => {
    return apiRequest<TagsPage>(ApiEndpoints.USER_ME_TAGS, {
      signal,
      query: {query: params.query || undefined, before: params.before, limit: params.limit},
    });
  },

  fetchMeTag: (tagId: string, signal?: AbortSignal) => {
    return apiRequest<Tag>(ApiEndpoints.USER_ME_TAG(tagId), {signal});
  },

  patchMeTag: (tagId: string, body: TagPatch) => {
    return apiRequest<Tag>(ApiEndpoints.USER_ME_TAG(tagId), {method: 'PATCH', body});
  },

  // null when the tag isn't on the directory
  fetchMeTagDirectory: async (tagId: string, signal?: AbortSignal): Promise<TagDirectoryItem | null> => {
    try {
      return await apiRequest<TagDirectoryItem>(ApiEndpoints.USER_ME_TAG_DIRECTORY(tagId), {signal});
    } catch (error) {
      if (error instanceof ApiRequestError && error.code === ApiErrorCodes.UNKNOWN_TAG_DIRECTORY_ITEM) {
        return null;
      }
      throw error;
    }
  },

  // publishes the tag (moving it to your personal tags), or edits the listing if it's already there
  publishMeTagDirectory: (tagId: string, body: TagDirectoryListingInput) => {
    return apiRequest<TagDirectoryItem>(ApiEndpoints.USER_ME_TAG_DIRECTORY(tagId), {method: 'PUT', body});
  },

  patchMeTagDirectory: (tagId: string, body: TagDirectoryListingInput) => {
    return apiRequest<TagDirectoryItem>(ApiEndpoints.USER_ME_TAG_DIRECTORY(tagId), {method: 'PATCH', body});
  },

  // puts an unverified listing up for review, which locks the tag
  requestMeTagDirectoryVerification: (tagId: string) => {
    return apiRequest<TagDirectoryItem>(ApiEndpoints.USER_ME_TAG_DIRECTORY_VERIFY(tagId), {method: 'POST'});
  },

  // only while it's still pending, unlocks the tag again
  cancelMeTagDirectoryVerification: (tagId: string) => {
    return apiRequest<TagDirectoryItem>(ApiEndpoints.USER_ME_TAG_DIRECTORY_VERIFY(tagId), {method: 'DELETE'});
  },

  deleteMeTag: (tagId: string) => {
    return apiRequest<void>(ApiEndpoints.USER_ME_TAG(tagId), {method: 'DELETE'});
  },

  fetchMeTagVariables: (tagId: string, scope: TagStorageScope, signal?: AbortSignal) => {
    return apiRequest<TagVariables>(ApiEndpoints.USER_ME_TAG_VARIABLES(tagId), {signal, query: {...scope}});
  },

  // an empty `value` deletes the variable (same as the bot endpoint)
  putMeTagVariable: (tagId: string, storageType: TagStorageType, storageId: string, body: {name: string, value: string}) => {
    return apiRequest<TagVariable>(ApiEndpoints.USER_ME_TAG_VARIABLE(tagId, storageType, storageId), {method: 'PUT', body});
  },

  deleteMeTagVariable: (tagId: string, storageType: TagStorageType, storageId: string, name: string) => {
    return apiRequest<void>(ApiEndpoints.USER_ME_TAG_VARIABLE(tagId, storageType, storageId), {method: 'DELETE', query: {name}});
  },

  fetchMeTagBlobs: (tagId: string, scope: TagStorageScope, signal?: AbortSignal) => {
    return apiRequest<TagBlobs>(ApiEndpoints.USER_ME_TAG_BLOBS(tagId), {signal, query: {...scope}});
  },

  // replaces every blob in the given scope (blobs left out are removed)
  putMeTagBlobs: (tagId: string, body: TagBlobsPut) => {
    return apiRequest<TagBlobs>(ApiEndpoints.USER_ME_TAG_BLOBS(tagId), {method: 'PUT', body});
  },

  fetchMeGuilds: (signal?: AbortSignal) => {
    return apiRequest<Array<UserGuildSummary>>(ApiEndpoints.USER_ME_GUILDS, {signal});
  },

  fetchMeGuild: (guildId: string, signal?: AbortSignal) => {
    return apiRequest<UserGuild>(ApiEndpoints.USER_ME_GUILD(guildId), {signal});
  },

  patchMeGuild: (guildId: string, body: UserGuildPatch) => {
    return apiRequest<unknown>(ApiEndpoints.USER_ME_GUILD(guildId), {method: 'PATCH', body});
  },

  addMeGuildPrefix: (guildId: string, prefix: string) => {
    return apiRequest<unknown>(ApiEndpoints.USER_ME_GUILD_PREFIXES(guildId), {method: 'PUT', body: {prefix}});
  },

  removeMeGuildPrefix: (guildId: string, prefix: string) => {
    return apiRequest<unknown>(ApiEndpoints.USER_ME_GUILD_PREFIXES_DELETE(guildId), {method: 'POST', body: {prefix}});
  },

  setMeGuildListEntry: (guildId: string, list: GuildListKind, id: string, type: string, present: boolean) => {
    return apiRequest<void>(ApiEndpoints.USER_ME_GUILD_LIST(guildId, list, id, type), {method: (present) ? 'PUT' : 'DELETE'});
  },

  setMeGuildCommandListEntry: (guildId: string, list: GuildListKind, command: string, id: string, type: string, present: boolean) => {
    return apiRequest<void>(ApiEndpoints.USER_ME_GUILD_COMMAND_LIST(guildId, command, list, id, type), {method: (present) ? 'PUT' : 'DELETE'});
  },

  removeMeGuildLogger: (guildId: string, body: {channel_id: string, type: number}) => {
    return apiRequest<void>(ApiEndpoints.USER_ME_GUILD_LOGGERS_DELETE(guildId), {method: 'POST', body});
  },

  // adds a tag directory tag to a server (`guild_id`) or your DMs with the bot (no `guild_id`), as an alias
  addMeTag: (tagId: string, body: {guild_id?: string, name?: string}) => {
    return apiRequest<Tag>(ApiEndpoints.USER_ME_TAG_ADD(tagId), {method: 'POST', body});
  },

  // server owners only
  exportMeGuildData: (guildId: string) => {
    return apiRequest<UserGuildDataExport>(ApiEndpoints.USER_ME_GUILD_DATA_EXPORT(guildId), {timeout: 60 * 1000});
  },

  deleteMeGuildData: (guildId: string) => {
    return apiRequest<UserGuildDataDelete>(ApiEndpoints.USER_ME_GUILD_DATA_DELETE(guildId), {method: 'POST', timeout: 60 * 1000});
  },

  requestMeDataExport: () => {
    return apiRequest<unknown>(ApiEndpoints.USER_ME_DATA_EXPORT, {method: 'POST'});
  },

  deleteMe: () => {
    return apiRequest<void>(ApiEndpoints.USER_ME, {method: 'DELETE'});
  },


  // --- admin (owner only) ---

  fetchAdminTags: (params: {
    query?: string,
    searchContent?: boolean,
    sortBy?: AdminTagsSortBy,
    nsfw?: boolean | null,
    offset?: number,
    limit?: number,
  }, signal?: AbortSignal) => {
    return apiRequest<AdminTagsPage>(ApiEndpoints.ADMIN_TAGS, {
      signal,
      query: {
        query: params.query || undefined,
        search_content: (params.searchContent) ? true : undefined,
        sort_by: params.sortBy,
        nsfw: params.nsfw,
        offset: params.offset || undefined,
        limit: params.limit,
      },
    });
  },

  fetchAdminTagDirectory: (params: {
    query?: string,
    sortBy?: AdminTagDirectorySortBy,
    verified?: number | null,
    nsfw?: boolean | null,
    offset?: number,
    limit?: number,
  }, signal?: AbortSignal) => {
    return apiRequest<AdminTagDirectoryPage>(ApiEndpoints.ADMIN_TAGS_DIRECTORY, {
      signal,
      query: {
        query: params.query || undefined,
        sort_by: params.sortBy,
        verified: params.verified,
        nsfw: params.nsfw,
        offset: params.offset || undefined,
        limit: params.limit,
      },
    });
  },

  // `content` rewrites the tag even though it's locked (verified/pending)
  patchAdminTagDirectory: (tagId: string, body: {verified?: number, content?: string, title?: string, description?: string}) => {
    return apiRequest<AdminTagDirectoryItem>(ApiEndpoints.ADMIN_TAG_DIRECTORY(tagId), {method: 'PATCH', body});
  },

  // archives a file, or whatever `url` points at, for the tag; the content isn't touched
  uploadAdminTagAsset: (tagId: string, source: {file: File} | {url: string}) => {
    let body: FormData | {url: string};
    if ('file' in source) {
      body = new FormData();
      body.append('file', source.file);
    } else {
      body = {url: source.url};
    }
    // the api downloads/probes the media first, which can take a while for videos
    return apiRequest<TagAsset>(ApiEndpoints.ADMIN_TAG_ASSETS(tagId), {method: 'POST', body, timeout: 120_000});
  },

  deleteAdminTagAsset: (tagId: string, assetId: string) => {
    return apiRequest<void>(ApiEndpoints.ADMIN_TAG_ASSET(tagId, assetId), {method: 'DELETE'});
  },

  // `deleteTag` also deletes the tag itself (and its aliases), not just the listing
  deleteAdminTagDirectory: (tagId: string, params: {deleteTag?: boolean} = {}) => {
    return apiRequest<void>(ApiEndpoints.ADMIN_TAG_DIRECTORY(tagId), {
      method: 'DELETE',
      query: {delete_tag: (params.deleteTag) ? true : undefined},
    });
  },

  fetchAdminUsers: (params: {
    query?: string,
    sortBy?: AdminUsersSortBy,
    onlyFlagged?: boolean,
    // hours
    flaggedWithin?: number | null,
    offset?: number,
    limit?: number,
  }, signal?: AbortSignal) => {
    return apiRequest<AdminUsersPage>(ApiEndpoints.ADMIN_USERS, {
      signal,
      query: {
        query: params.query || undefined,
        sort_by: params.sortBy,
        only_flagged: (params.onlyFlagged) ? true : undefined,
        flagged_within: params.flaggedWithin ?? undefined,
        offset: params.offset || undefined,
        limit: params.limit,
      },
    });
  },

  patchAdminUser: (userId: string, body: AdminUserPatch) => {
    return apiRequest<AdminUser>(ApiEndpoints.ADMIN_USER(userId), {method: 'PATCH', body});
  },

  fetchAdminContentFlags: (params: {
    userId?: string,
    guildId?: string,
    channelId?: string,
    status?: number | null,
    category?: string,
    needsHumanReview?: boolean | null,
    type?: ContentFlagType | null,
    search?: string,
    offset?: number,
    limit?: number,
  }, signal?: AbortSignal) => {
    return apiRequest<ContentFlagsPage>(ApiEndpoints.ADMIN_CONTENT_FLAGS, {
      signal,
      query: {
        user_id: params.userId || undefined,
        guild_id: params.guildId || undefined,
        channel_id: params.channelId || undefined,
        status: params.status,
        category: params.category || undefined,
        needs_human_review: params.needsHumanReview,
        type: params.type || undefined,
        search: params.search || undefined,
        offset: params.offset || undefined,
        limit: params.limit,
      },
    });
  },

  patchAdminContentFlag: (flagId: string, body: ContentFlagPatch) => {
    return apiRequest<ContentFlag>(ApiEndpoints.ADMIN_CONTENT_FLAG(flagId), {method: 'PATCH', body});
  },

  fetchAdminReports: (params: {
    type?: number | null,
    status?: number | null,
    userId?: string,
    targetId?: string,
    offset?: number,
    limit?: number,
  }, signal?: AbortSignal) => {
    return apiRequest<ReportsPage>(ApiEndpoints.ADMIN_REPORTS, {
      signal,
      query: {
        type: params.type,
        status: params.status,
        user_id: params.userId || undefined,
        target_id: params.targetId || undefined,
        offset: params.offset || undefined,
        limit: params.limit,
      },
    });
  },

  patchAdminReport: (reportId: string, body: ReportPatch) => {
    return apiRequest<Report>(ApiEndpoints.ADMIN_REPORT(reportId), {method: 'PATCH', body});
  },
};
