import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { api } from './index';
import { TagDirectorySortByFilters, type MeTagsDirectoryFilter, type MeTagsSortBy, type TagDirectoryFilters, type TagDirectoryItem } from './types';


export const queryKeys = {
  commands: ['commands'] as const,
  commandStats: (since: string) => ['commands', 'stats', {since}] as const,
  infoDiscord: ['info', 'discord'] as const,
  tagDirectory: (filters: TagDirectoryFilters) => ['tags', 'directory', filters] as const,
  tagDirectoryItem: (id: string) => ['tags', 'directory', 'item', id] as const,
  // keyed on the token so switching accounts never shows a stale user
  me: (token: string | null) => ['users', '@me', token] as const,
  meSessions: (token: string | null) => ['users', '@me', token, 'sessions'] as const,
  // dashboard; everything per-user lives under ['users', '@me'] so logging out drops it
  meSettings: (token: string | null) => ['users', '@me', token, 'settings'] as const,
  meTags: (token: string | null) => ['users', '@me', token, 'tags'] as const,
  meTagsList: (token: string | null, query: string, sortBy: MeTagsSortBy, directory: MeTagsDirectoryFilter, serverId: string | null) => ['users', '@me', token, 'tags', 'list', {query, sortBy, directory, serverId}] as const,
  meTag: (token: string | null, tagId: string) => ['users', '@me', token, 'tags', 'item', tagId] as const,
  meTagVariables: (token: string | null, tagId: string, scope: object) => ['users', '@me', token, 'tags', 'item', tagId, 'variables', scope] as const,
  meTagBlobs: (token: string | null, tagId: string, scope: object) => ['users', '@me', token, 'tags', 'item', tagId, 'blobs', scope] as const,
  meTagDirectory: (token: string | null, tagId: string) => ['users', '@me', token, 'tags', 'item', tagId, 'directory'] as const,
  meTagServers: (token: string | null, tagId: string) => ['users', '@me', token, 'tags', 'item', tagId, 'servers'] as const,
  meEntitlements: (token: string | null) => ['users', '@me', token, 'entitlements'] as const,
  meReminders: (token: string | null) => ['users', '@me', token, 'reminders'] as const,
  meReports: (token: string | null, filters: object) => ['users', '@me', token, 'reports', filters] as const,
  meVoices: (token: string | null) => ['users', '@me', token, 'voices'] as const,
  meGuilds: (token: string | null) => ['users', '@me', token, 'guilds'] as const,
  meGuild: (token: string | null, guildId: string) => ['users', '@me', token, 'guilds', guildId] as const,
  // admin (owner only); under the session too so logging out drops it
  admin: (token: string | null) => ['users', '@me', token, 'admin'] as const,
  adminTags: (token: string | null, filters: object) => ['users', '@me', token, 'admin', 'all-tags', filters] as const,
  adminTagDirectory: (token: string | null, filters: object) => ['users', '@me', token, 'admin', 'tags', filters] as const,
  adminTagStorage: (token: string | null, tagId: string, kind: 'variables' | 'blobs', filters: object) => ['users', '@me', token, 'admin', 'tag-storage', tagId, kind, filters] as const,
  adminTagServers: (token: string | null, tagId: string) => ['users', '@me', token, 'admin', 'tag-servers', tagId] as const,
  adminUsers: (token: string | null, filters: object) => ['users', '@me', token, 'admin', 'users', filters] as const,
  adminContentFlags: (token: string | null, filters: object) => ['users', '@me', token, 'admin', 'content-flags', filters] as const,
  adminEntitlements: (token: string | null, filters: object) => ['users', '@me', token, 'admin', 'entitlements', filters] as const,
  adminReports: (token: string | null, filters: object) => ['users', '@me', token, 'admin', 'reports', filters] as const,
  adminVoices: (token: string | null, filters: object) => ['users', '@me', token, 'admin', 'voices', filters] as const,
  // a server's list rows and its detail are both under `guilds`, so one invalidation refreshes either after an edit
  adminGuilds: (token: string | null, filters: object) => ['users', '@me', token, 'admin', 'guilds', 'list', filters] as const,
  adminGuild: (token: string | null, guildId: string) => ['users', '@me', token, 'admin', 'guilds', 'detail', guildId] as const,
};


export function useCommandsQuery() {
  return useQuery({
    queryKey: queryKeys.commands,
    queryFn: ({ signal }) => api.fetchCommands(signal),
    staleTime: 10 * 60 * 60 * 1000,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}


// Usage over the last `days` days. `since` is floored to the hour so the key (and the API's
// response) stays stable for a while instead of changing every millisecond.
export function useCommandStatsQuery(days = 7) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  since.setUTCMinutes(0, 0, 0);
  return useQuery({
    queryKey: queryKeys.commandStats(since.toISOString()),
    queryFn: ({ signal }) => api.fetchCommandStats(since, signal),
    staleTime: 10 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}


// the status page polls every 2s; other pages (home stats) just read it once
export function useInfoDiscordQuery({ poll = true }: {poll?: boolean} = {}) {
  return useQuery({
    queryKey: queryKeys.infoDiscord,
    queryFn: ({ signal }) => api.fetchInfoDiscord(signal),
    refetchInterval: (poll) ? 2000 : false,
    staleTime: (poll) ? 0 : 60 * 1000,
    refetchIntervalInBackground: false,
  });
}


const TAG_DIRECTORY_PAGE_SIZE = 48;

// Newest pages `before` the last id we've seen (stable while new tags get published); the other
// sorts aren't keyed on the id, so they page by how many items are already loaded.
type TagDirectoryPageParam = {before?: string, offset?: number};

export function useTagDirectoryQuery(filters: TagDirectoryFilters) {
  const { query, category, sortBy, verified, nsfw } = filters;
  return useInfiniteQuery({
    queryKey: queryKeys.tagDirectory(filters),
    queryFn: ({ pageParam, signal }) => api.fetchTagDirectory({query, category, sortBy, verified, nsfw, ...pageParam, limit: TAG_DIRECTORY_PAGE_SIZE}, signal),
    initialPageParam: {} as TagDirectoryPageParam,
    getNextPageParam: (lastPage, pages): TagDirectoryPageParam | undefined => {
      if (lastPage.items.length < TAG_DIRECTORY_PAGE_SIZE) {
        return undefined;
      }
      if (sortBy === TagDirectorySortByFilters.NEWEST) {
        return {before: lastPage.items[lastPage.items.length - 1].id};
      }
      return {offset: pages.reduce((total, page) => total + page.items.length, 0)};
    },
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
  });
}


// `initialData` lets a modal opened from the directory list show the card's data immediately
export function useTagDirectoryItemQuery(id: string, initialData?: TagDirectoryItem) {
  return useQuery({
    queryKey: queryKeys.tagDirectoryItem(id),
    queryFn: ({ signal }) => api.fetchTagDirectoryItem(id, signal),
    initialData,
    staleTime: 60 * 1000,
  });
}
