// Query/mutation hooks for the user dashboard (`/users/@me/...`, see docs/dashboard-api.md).
// Every key is scoped to the session token, so switching accounts never shows someone else's data.

import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/auth';

import { ApiRequestError } from './client';
import { api } from './index';
import { queryKeys } from './queries';
import type {
  AdminTagDirectoryItem,
  AdminTagDirectoryPage,
  AdminUsersSortBy,
  ContentFlag,
  ContentFlagPatch,
  ContentFlagsPage,
  GuildListKind,
  Report,
  ReportPatch,
  ReportsPage,
  Tag,
  TagBlobsPut,
  TagDirectoryItem,
  TagDirectoryListingInput,
  TagPatch,
  TagsPage,
  TagStorageScope,
  TagStorageType,
  TagVariables,
  UserGuildPatch,
  UserSettings,
  UserSettingsPatch,
} from './types';
import { ApiErrorCodes } from './types';


export const ME_TAGS_PAGE_SIZE = 25;


// 404/405 from a planned endpoint means it hasn't shipped yet
export function isNotAvailableYet(error: unknown): boolean {
  return error instanceof ApiRequestError && (error.status === 404 || error.status === 405);
}

export function isScopeMismatch(error: unknown): boolean {
  return error instanceof ApiRequestError && error.status === 403 && error.code === ApiErrorCodes.DISCORD_OAUTH_SCOPE_MISMATCH;
}

// the Discord grant behind the session was revoked or expired; logging in again fixes it
export function isDiscordGrantError(error: unknown): boolean {
  return error instanceof ApiRequestError && error.status === 401 && error.code === ApiErrorCodes.DISCORD_OAUTH_ERROR;
}

export function hasErrorCode(error: unknown, code: number): boolean {
  return error instanceof ApiRequestError && error.code === code;
}

// which form field a 400 INVALID_FORM_BODY points at (the API flattens metadata into the body)
export function errorField(error: unknown): string | null {
  if (error instanceof ApiRequestError && error.code === ApiErrorCodes.INVALID_FORM_BODY) {
    const field = error.body?.field;
    return (typeof field === 'string') ? field : null;
  }
  return null;
}

export function errorMessage(error: unknown, fallback = 'Something went wrong. Try again.'): string {
  if (error instanceof ApiRequestError) {
    switch (error.code) {
      case ApiErrorCodes.DISCORD_RATELIMITED:
        return 'Discord is rate limiting us right now. Try again in a minute.';
      case ApiErrorCodes.DISCORD_FETCH_FAILED:
      case ApiErrorCodes.DISCORD_API_ERROR:
        return 'Discord didn’t answer properly. Try again in a moment.';
      case ApiErrorCodes.EXTERNAL_SERVICE_TIMEOUT:
        return 'Your Discord session is being refreshed. Try again in a few seconds.';
      case ApiErrorCodes.DISCORD_OAUTH_ERROR:
        return 'Discord no longer accepts this login. Log in again to continue.';
      case ApiErrorCodes.MISSING_ACCESS:
        return 'You don’t have permission to change this.';
      case ApiErrorCodes.TAG_LOCKED:
        return 'This tag is locked, so it can’t be edited right now.';
      case ApiErrorCodes.TAG_NAME_TAKEN:
        return 'You already have a tag with this name here.';
      case ApiErrorCodes.TAG_DIRECTORY_NAME_TAKEN:
        return 'You already have a personal tag with this name. Rename one of them first.';
      case ApiErrorCodes.TAG_DIRECTORY_CANNOT_PUBLISH_ALIAS:
        return 'Aliases can’t be published. Publish the tag it points to instead.';
      case ApiErrorCodes.TAG_DIRECTORY_PENDING_VERIFICATION:
        return 'This listing is being reviewed for verification, so it can’t be edited right now.';
      case ApiErrorCodes.MAX_TAG_DIRECTORY:
        return 'You’ve reached the limit of tags you can publish.';
    }
    if (error.status === 0 || 500 <= error.status) {
      return 'NotSoBot had trouble with that. Try again in a moment.';
    }
    return error.body?.message || fallback;
  }
  if (error instanceof DOMException && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
    return 'The request timed out. Try again.';
  }
  return fallback;
}


/* settings */

export function useMeSettingsQuery() {
  const { token } = useAuth();
  return useQuery({
    queryKey: queryKeys.meSettings(token),
    queryFn: ({ signal }) => api.fetchMeSettings(signal),
  });
}


// optimistic: the form shows the new values right away and rolls back if the API refuses
export function usePatchMeSettingsMutation() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const key = queryKeys.meSettings(token);
  return useMutation({
    mutationFn: (body: UserSettingsPatch) => api.patchMeSettings(body),
    onMutate: async (body) => {
      await queryClient.cancelQueries({queryKey: key});
      const previous = queryClient.getQueryData<UserSettings>(key);
      if (previous) {
        queryClient.setQueryData<UserSettings>(key, {...previous, ...body});
      }
      return {previous};
    },
    onError: (_error, _body, context) => {
      if (context?.previous) {
        queryClient.setQueryData(key, context.previous);
      }
    },
    onSuccess: (data) => {
      queryClient.setQueryData(key, data);
    },
  });
}


/* tags */

export function useMeTagsQuery(query: string) {
  const { token } = useAuth();
  return useInfiniteQuery({
    queryKey: queryKeys.meTagsList(token, query),
    queryFn: ({ pageParam, signal }) => api.fetchMeTags({query, before: pageParam, limit: ME_TAGS_PAGE_SIZE}, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: TagsPage) => {
      return (lastPage.items.length < ME_TAGS_PAGE_SIZE) ? undefined : lastPage.items[lastPage.items.length - 1].id;
    },
    placeholderData: keepPreviousData,
  });
}


// just the total, for the overview
export function useMeTagsCountQuery() {
  const { token } = useAuth();
  return useQuery({
    queryKey: [...queryKeys.meTags(token), 'count'],
    queryFn: ({ signal }) => api.fetchMeTags({limit: 1}, signal),
    select: (page) => page.count,
  });
}


export function useMeTagQuery(tagId: string) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useQuery<Tag, Error, Tag, ReturnType<typeof queryKeys.meTag>>({
    queryKey: queryKeys.meTag(token, tagId),
    queryFn: ({ signal }) => api.fetchMeTag(tagId, signal),
    // show the row from the list immediately when coming from it
    placeholderData: () => {
      const lists = queryClient.getQueriesData<{pages: Array<TagsPage>}>({queryKey: [...queryKeys.meTags(token), 'list']});
      for (const [ , data ] of lists) {
        const found = data?.pages.flatMap((page) => page.items).find((tag) => tag.id === tagId);
        if (found) {
          return found;
        }
      }
      return undefined;
    },
    // don't refetch underneath someone editing
    refetchOnWindowFocus: false,
  });
}


export function usePatchMeTagMutation(tagId: string) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: TagPatch) => api.patchMeTag(tagId, body),
    onSuccess: (tag: Tag) => {
      queryClient.setQueryData(queryKeys.meTag(token, tagId), tag);
      void queryClient.invalidateQueries({queryKey: [...queryKeys.meTags(token), 'list']});
    },
  });
}


export function useMeTagDirectoryQuery(tagId: string) {
  const { token } = useAuth();
  return useQuery({
    queryKey: queryKeys.meTagDirectory(token, tagId),
    queryFn: ({ signal }) => api.fetchMeTagDirectory(tagId, signal),
    enabled: !!token,
  });
}


// publishing moves the tag to the owner's personal tags, so the tag itself and the lists change too
export function usePublishMeTagDirectoryMutation(tagId: string) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: TagDirectoryListingInput) => api.publishMeTagDirectory(tagId, body),
    onSuccess: (directory: TagDirectoryItem) => {
      queryClient.setQueryData(queryKeys.meTagDirectory(token, tagId), directory);
      void queryClient.invalidateQueries({queryKey: queryKeys.meTag(token, tagId), exact: true});
      void queryClient.invalidateQueries({queryKey: [...queryKeys.meTags(token), 'list']});
      // the public directory pages
      void queryClient.invalidateQueries({queryKey: ['tags', 'directory']});
    },
  });
}


export function usePatchMeTagDirectoryMutation(tagId: string) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: TagDirectoryListingInput) => api.patchMeTagDirectory(tagId, body),
    onSuccess: (directory: TagDirectoryItem) => {
      queryClient.setQueryData(queryKeys.meTagDirectory(token, tagId), directory);
      void queryClient.invalidateQueries({queryKey: ['tags', 'directory']});
    },
  });
}


export function useDeleteMeTagMutation(tagId: string) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.deleteMeTag(tagId),
    onSuccess: () => {
      queryClient.removeQueries({queryKey: queryKeys.meTag(token, tagId)});
      void queryClient.invalidateQueries({queryKey: queryKeys.meTags(token)});
    },
  });
}


export function useMeTagVariablesQuery(tagId: string, scope: TagStorageScope, enabled = true) {
  const { token } = useAuth();
  return useQuery({
    queryKey: queryKeys.meTagVariables(token, tagId, scope),
    queryFn: ({ signal }) => api.fetchMeTagVariables(tagId, scope, signal),
    enabled,
    refetchOnWindowFocus: false,
  });
}


export function usePutMeTagVariableMutation(tagId: string, scope: TagStorageScope) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const key = queryKeys.meTagVariables(token, tagId, scope);
  return useMutation({
    mutationFn: ({ storageType, storageId, name, value }: {storageType: TagStorageType, storageId: string, name: string, value: string}) => {
      return api.putMeTagVariable(tagId, storageType, storageId, {name, value});
    },
    onSuccess: (_data, { storageType, name, value }) => {
      queryClient.setQueryData<TagVariables>(key, (previous) => {
        if (!previous) {
          return previous;
        }
        const bucket = {...previous[`${storageType}`], [name]: value};
        return {...previous, [`${storageType}`]: bucket};
      });
    },
  });
}


export function useDeleteMeTagVariableMutation(tagId: string, scope: TagStorageScope) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const key = queryKeys.meTagVariables(token, tagId, scope);
  return useMutation({
    mutationFn: ({ storageType, storageId, name }: {storageType: TagStorageType, storageId: string, name: string}) => {
      return api.deleteMeTagVariable(tagId, storageType, storageId, name);
    },
    onSuccess: (_data, { storageType, name }) => {
      queryClient.setQueryData<TagVariables>(key, (previous) => {
        if (!previous) {
          return previous;
        }
        const bucket = {...previous[`${storageType}`]};
        delete bucket[name];
        return {...previous, [`${storageType}`]: bucket};
      });
    },
  });
}


export function useMeTagBlobsQuery(tagId: string, scope: TagStorageScope, enabled = true) {
  const { token } = useAuth();
  return useQuery({
    queryKey: queryKeys.meTagBlobs(token, tagId, scope),
    queryFn: ({ signal }) => api.fetchMeTagBlobs(tagId, scope, signal),
    enabled,
    refetchOnWindowFocus: false,
  });
}


export function usePutMeTagBlobsMutation(tagId: string, scope: TagStorageScope) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: TagBlobsPut) => api.putMeTagBlobs(tagId, body),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.meTagBlobs(token, tagId, scope), data);
    },
  });
}


/* servers */

// 503 EXTERNAL_SERVICE_TIMEOUT = the API is refreshing the Discord token; that clears up by itself
function retryDiscordRefresh(failureCount: number, error: Error): boolean {
  if (error instanceof ApiRequestError && error.code === ApiErrorCodes.EXTERNAL_SERVICE_TIMEOUT) {
    return failureCount < 3;
  }
  return !(error instanceof ApiRequestError && error.status < 500) && failureCount < 2;
}

export function useMeGuildsQuery() {
  const { token } = useAuth();
  return useQuery({
    queryKey: queryKeys.meGuilds(token),
    queryFn: ({ signal }) => api.fetchMeGuilds(signal),
    staleTime: 60 * 1000,
    retry: retryDiscordRefresh,
  });
}


export function useMeGuildQuery(guildId: string) {
  const { token } = useAuth();
  return useQuery({
    queryKey: queryKeys.meGuild(token, guildId),
    queryFn: ({ signal }) => api.fetchMeGuild(guildId, signal),
    retry: retryDiscordRefresh,
  });
}


export type GuildAction =
  | {kind: 'prefix', prefix: string, present: boolean}
  | {kind: 'list', list: GuildListKind, id: string, type: string, present: boolean}
  | {kind: 'command-list', list: GuildListKind, command: string, id: string, type: string, present: boolean}
  | {kind: 'logger-remove', channelId: string, type: number}
  | {kind: 'settings', patch: UserGuildPatch};


// one mutation for every server edit; each refetches the server afterwards so the page shows
// exactly what the API stored (and what the bot will see)
export function useMeGuildMutation(guildId: string) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (action: GuildAction): Promise<unknown> => {
      switch (action.kind) {
        case 'prefix':
          return (action.present) ? api.addMeGuildPrefix(guildId, action.prefix) : api.removeMeGuildPrefix(guildId, action.prefix);
        case 'list':
          return api.setMeGuildListEntry(guildId, action.list, action.id, action.type, action.present);
        case 'command-list':
          return api.setMeGuildCommandListEntry(guildId, action.list, action.command, action.id, action.type, action.present);
        case 'logger-remove':
          return api.removeMeGuildLogger(guildId, {channel_id: action.channelId, type: action.type});
        case 'settings':
          return api.patchMeGuild(guildId, action.patch);
      }
    },
    onSettled: () => queryClient.invalidateQueries({queryKey: queryKeys.meGuild(token, guildId)}),
  });
}


// a directory tag added to a server or your DMs shows up in your tags
export function useAddMeTagMutation(tagId: string) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: {guild_id?: string, name?: string}) => api.addMeTag(tagId, body),
    onSuccess: () => queryClient.invalidateQueries({queryKey: queryKeys.meTags(token)}),
  });
}


/* data */

// server owners only; the delete refetches the server (and your tags) so the page shows it reset
export function useExportMeGuildDataMutation(guildId: string) {
  return useMutation({mutationFn: () => api.exportMeGuildData(guildId)});
}

export function useDeleteMeGuildDataMutation(guildId: string) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.deleteMeGuildData(guildId),
    onSettled: () => Promise.all([
      queryClient.invalidateQueries({queryKey: queryKeys.meGuild(token, guildId)}),
      // the server's tags show up in your tags list too
      queryClient.invalidateQueries({queryKey: queryKeys.meTags(token)}),
    ]),
  });
}

export function useRequestDataExportMutation() {
  return useMutation({mutationFn: () => api.requestMeDataExport()});
}

export function useDeleteMeMutation() {
  return useMutation({mutationFn: () => api.deleteMe()});
}



/* admin (owner only) */

export const ADMIN_PAGE_SIZE = 25;

export interface AdminTagDirectoryFilters {
  query: string,
  verified: number | null,
  page: number,
}

export function useAdminTagDirectoryQuery(filters: AdminTagDirectoryFilters) {
  const { token } = useAuth();
  return useQuery({
    queryKey: queryKeys.adminTagDirectory(token, filters),
    queryFn: ({ signal }) => api.fetchAdminTagDirectory({
      query: filters.query,
      verified: filters.verified,
      offset: filters.page * ADMIN_PAGE_SIZE,
      limit: ADMIN_PAGE_SIZE,
    }, signal),
    placeholderData: keepPreviousData,
  });
}


// shows the new state in place right away, then refetches since the item may leave the current filter
export function usePatchAdminTagDirectoryMutation() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const listKey = [...queryKeys.admin(token), 'tags'];
  return useMutation({
    mutationFn: ({ tagId, verified }: {tagId: string, verified: number}) => api.patchAdminTagDirectory(tagId, {verified}),
    onSuccess: (item: AdminTagDirectoryItem) => {
      queryClient.setQueriesData<AdminTagDirectoryPage>({queryKey: listKey}, (page) => {
        if (!page) {
          return page;
        }
        return {...page, items: page.items.map((other) => (other.id === item.id) ? item : other)};
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({queryKey: listKey});
      // the public directory shows the badge too
      void queryClient.invalidateQueries({queryKey: ['tags', 'directory']});
    },
  });
}


export interface AdminUsersFilters {
  query: string,
  sortBy: AdminUsersSortBy,
  onlyFlagged: boolean,
  page: number,
}

export function useAdminUsersQuery(filters: AdminUsersFilters) {
  const { token } = useAuth();
  return useQuery({
    queryKey: queryKeys.adminUsers(token, filters),
    queryFn: ({ signal }) => api.fetchAdminUsers({
      query: filters.query,
      sortBy: filters.sortBy,
      onlyFlagged: filters.onlyFlagged,
      offset: filters.page * ADMIN_PAGE_SIZE,
      limit: ADMIN_PAGE_SIZE,
    }, signal),
    placeholderData: keepPreviousData,
  });
}


export interface AdminContentFlagsFilters {
  userId: string,
  status: number | null,
  category: string,
  needsHumanReview: boolean | null,
  page: number,
}

export function useAdminContentFlagsQuery(filters: AdminContentFlagsFilters) {
  const { token } = useAuth();
  return useQuery({
    queryKey: queryKeys.adminContentFlags(token, filters),
    queryFn: ({ signal }) => api.fetchAdminContentFlags({
      userId: filters.userId,
      status: filters.status,
      category: filters.category,
      needsHumanReview: filters.needsHumanReview,
      offset: filters.page * ADMIN_PAGE_SIZE,
      limit: ADMIN_PAGE_SIZE,
    }, signal),
    placeholderData: keepPreviousData,
  });
}


export function usePatchAdminContentFlagMutation() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const listKey = [...queryKeys.admin(token), 'content-flags'];
  return useMutation({
    mutationFn: ({ flagId, patch }: {flagId: string, patch: ContentFlagPatch}) => api.patchAdminContentFlag(flagId, patch),
    onSuccess: (flag: ContentFlag) => {
      queryClient.setQueriesData<ContentFlagsPage>({queryKey: listKey}, (page) => {
        if (!page) {
          return page;
        }
        return {...page, items: page.items.map((other) => (other.id === flag.id) ? flag : other)};
      });
    },
    onSettled: () => Promise.all([
      queryClient.invalidateQueries({queryKey: listKey}),
      // the per-user counts change with the status
      queryClient.invalidateQueries({queryKey: [...queryKeys.admin(token), 'users']}),
    ]),
  });
}


export interface AdminReportsFilters {
  type: number | null,
  status: number | null,
  userId: string,
  targetId: string,
  page: number,
}

export function useAdminReportsQuery(filters: AdminReportsFilters) {
  const { token } = useAuth();
  return useQuery({
    queryKey: queryKeys.adminReports(token, filters),
    queryFn: ({ signal }) => api.fetchAdminReports({
      type: filters.type,
      status: filters.status,
      userId: filters.userId,
      targetId: filters.targetId,
      offset: filters.page * ADMIN_PAGE_SIZE,
      limit: ADMIN_PAGE_SIZE,
    }, signal),
    placeholderData: keepPreviousData,
  });
}


export function usePatchAdminReportMutation() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const listKey = [...queryKeys.admin(token), 'reports'];
  return useMutation({
    mutationFn: ({ reportId, patch }: {reportId: string, patch: ReportPatch}) => api.patchAdminReport(reportId, patch),
    onSuccess: (report: Report) => {
      queryClient.setQueriesData<ReportsPage>({queryKey: listKey}, (page) => {
        if (!page) {
          return page;
        }
        return {...page, items: page.items.map((other) => (other.id === report.id) ? report : other)};
      });
    },
    onSettled: () => queryClient.invalidateQueries({queryKey: listKey}),
  });
}
