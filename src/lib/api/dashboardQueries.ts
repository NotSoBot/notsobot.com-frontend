// Query/mutation hooks for the user dashboard (`/users/@me/...`, see docs/dashboard-api.md).
// Every key is scoped to the session token, so switching accounts never shows someone else's data.

import { keepPreviousData, useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { createContext, useContext } from 'react';

import { useAuth } from '@/auth';

import { ApiRequestError } from './client';
import type { GuildScope } from './endpoints';
import { api } from './index';
import { queryKeys } from './queries';
import type {
  AdminGuildPatch,
  AdminGuildsSortBy,
  AdminTagBlob,
  AdminTagStoragePage,
  AdminTagVariable,
  AdminTagDirectoryItem,
  AdminTagDirectoryPage,
  AdminUser,
  AdminUserPatch,
  AdminUsersPage,
  AdminTagDirectorySortBy,
  AdminTagsSortBy,
  AdminUsersSortBy,
  AdminVoice,
  AdminVoicesPage,
  ContentFlag,
  ContentFlagMatches,
  ContentFlagPatch,
  ContentFlagType,
  ContentFlagsPage,
  GuildListKind,
  MeTagsDirectoryFilter,
  MeTagsSortBy,
  Reminder,
  ReminderPatch,
  RemindersPage,
  Report,
  ReportPatch,
  ReportsPage,
  Tag,
  TagBlobsPut,
  TagDirectoryItem,
  TagDirectoryListingInput,
  TagPatch,
  TagServerCounts,
  TagServers,
  TagsPage,
  TagStorageScope,
  TagStorageType,
  TagVariables,
  UserGuildPatch,
  UserSettings,
  UserSettingsPatch,
  Voice,
  VoicesPage,
} from './types';
import { ApiErrorCodes, TAG_DIRECTORY_ASSETS_MAX } from './types';


export const ME_TAGS_PAGE_SIZE = 50;


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
      case ApiErrorCodes.RATELIMITED:
        return 'You’re doing that too fast. Wait a couple of seconds and try again.';
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
      case ApiErrorCodes.TAG_DIRECTORY_ALREADY_PENDING:
        return 'Verification has already been requested for this listing.';
      case ApiErrorCodes.TAG_DIRECTORY_ALREADY_VERIFIED:
        return 'This listing is already verified.';
      case ApiErrorCodes.TAG_DIRECTORY_ALREADY_UNVERIFIED:
        return 'This listing doesn’t have a pending verification request.';
      case ApiErrorCodes.TAG_DIRECTORY_CANNOT_UNVERIFY_VERIFIED:
        return 'This listing has already been verified, so the request can’t be canceled.';
      case ApiErrorCodes.TAG_DIRECTORY_VERIFICATION_REQUIRES_DESCRIPTION:
        return 'Verified listings need a description.';
      case ApiErrorCodes.TAG_DIRECTORY_VERIFICATION_REQUIRES_CATEGORY:
        return 'Verified listings need a category other than Other.';
      case ApiErrorCodes.MAX_TAG_DIRECTORY:
        return 'You’ve reached the limit of tags you can publish.';
      case ApiErrorCodes.TAG_DIRECTORY_ASSETS_REQUIRE_PENDING:
        return 'Media can only be changed while the listing is pending verification.';
      case ApiErrorCodes.MAX_TAG_DIRECTORY_ASSETS:
        return `Listings can have up to ${TAG_DIRECTORY_ASSETS_MAX} images, videos or audio files.`;
      case ApiErrorCodes.UNKNOWN_TAG_DIRECTORY_ASSET:
        return 'That file was already removed.';
      case ApiErrorCodes.UNKNOWN_TAG_DIRECTORY_EDIT_REQUEST:
        return 'That change request doesn’t exist anymore.';
      case ApiErrorCodes.TAG_DIRECTORY_EDIT_REQUEST_REQUIRES_VERIFIED:
        return 'Only verified listings need a change request, edit this one directly.';
      case ApiErrorCodes.TAG_DIRECTORY_EDIT_REQUEST_NOT_DRAFT:
        return 'Withdraw the change request before changing it.';
      case ApiErrorCodes.TAG_DIRECTORY_EDIT_REQUEST_NOT_PENDING:
        return 'That change request isn’t waiting for review anymore.';
      case ApiErrorCodes.TAG_DIRECTORY_EDIT_REQUEST_NO_CHANGES:
        return 'The change request doesn’t change anything yet.';
      case ApiErrorCodes.FILE_TOO_LARGE:
        return 'That file is too big.';
      case ApiErrorCodes.INVALID_FILE_TYPE:
      case ApiErrorCodes.UNSUPPORTED_UPLOAD_TYPE:
        return 'That file type isn’t supported. Use an image, video or audio file.';
      case ApiErrorCodes.UNKNOWN_VOICE:
        return 'That voice doesn’t exist anymore. It may have been deleted with the bot.';
      case ApiErrorCodes.UNKNOWN_REMINDER:
        return 'That reminder doesn’t exist anymore. It may have already been sent or deleted with the bot.';
      case ApiErrorCodes.TEXT_BLOCKED_GUIDELINES:
        return 'That text was blocked because it may violate Discord’s Community Guidelines.';
      case ApiErrorCodes.SAFETY_SCAN_FAILED:
        return 'We couldn’t check that text right now, so it wasn’t saved. Try again in a moment.';
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


// optimistic: the form shows the new values right away and rolls back if the API refuses.
// every section saves on its own, so each one only ever writes (or rolls back) the fields it sent;
// restoring a whole snapshot would undo another section's save that finished in the meantime
export function usePatchMeSettingsMutation() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const key = queryKeys.meSettings(token);
  const pick = (source: UserSettings, body: UserSettingsPatch): UserSettingsPatch => {
    return Object.fromEntries(Object.keys(body).map((field) => [field, source[field as keyof UserSettingsPatch]]));
  };
  return useMutation({
    mutationFn: (body: UserSettingsPatch) => api.patchMeSettings(body),
    onMutate: async (body) => {
      await queryClient.cancelQueries({queryKey: key});
      const current = queryClient.getQueryData<UserSettings>(key);
      if (current) {
        queryClient.setQueryData<UserSettings>(key, {...current, ...body});
      }
      return {previous: (current) ? pick(current, body) : undefined};
    },
    onError: (_error, _body, context) => {
      const previous = context?.previous;
      if (previous) {
        queryClient.setQueryData<UserSettings>(key, (current) => (current) ? {...current, ...previous} : current);
      }
    },
    onSuccess: (data, body) => {
      queryClient.setQueryData<UserSettings>(key, (current) => (current) ? {...current, ...pick(data, body)} : data);
    },
  });
}


/* tags */

// `serverId`: only the tags in that server
// one page (0-based) of `ME_TAGS_PAGE_SIZE`, the list pages with arrows
export function useMeTagsQuery(query: string, sortBy: MeTagsSortBy = 'newest', directory: MeTagsDirectoryFilter = null, serverId: string | null = null, page = 0) {
  const { token } = useAuth();
  return useQuery({
    queryKey: queryKeys.meTagsList(token, query, sortBy, directory, serverId, page),
    queryFn: ({ signal }) => api.fetchMeTags({query, sortBy, directory, serverId, offset: page * ME_TAGS_PAGE_SIZE, limit: ME_TAGS_PAGE_SIZE}, signal),
    placeholderData: keepPreviousData,
  });
}


// just the total, for the overview (or one server's, for its modal)
export function useMeTagsCountQuery(serverId: string | null = null) {
  const { token } = useAuth();
  return useQuery({
    queryKey: [...queryKeys.meTags(token), 'count', serverId],
    queryFn: ({ signal }) => api.fetchMeTags({serverId, limit: 1}, signal),
    select: (page) => page.count,
  });
}


export function useMeTagQuery(tagId: string, { enabled = true }: {enabled?: boolean} = {}) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useQuery<Tag, Error, Tag, ReturnType<typeof queryKeys.meTag>>({
    queryKey: queryKeys.meTag(token, tagId),
    queryFn: ({ signal }) => api.fetchMeTag(tagId, signal),
    enabled,
    // show the row from the list immediately when coming from it
    placeholderData: () => {
      const lists = queryClient.getQueriesData<TagsPage>({queryKey: [...queryKeys.meTags(token), 'list']});
      for (const [ , data ] of lists) {
        const found = data?.items.find((tag) => tag.id === tagId);
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


export function useMeTagDirectoryQuery(tagId: string, { enabled = true }: {enabled?: boolean} = {}) {
  const { token } = useAuth();
  return useQuery({
    queryKey: queryKeys.meTagDirectory(token, tagId),
    queryFn: ({ signal }) => api.fetchMeTagDirectory(tagId, signal),
    enabled: !!token && enabled,
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


// requesting (or cancelling) verification locks (or unlocks) the tag, so the tag and the lists change too
function useMeTagDirectoryVerificationMutation(tagId: string, mutationFn: () => Promise<TagDirectoryItem>) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (directory: TagDirectoryItem) => {
      queryClient.setQueryData(queryKeys.meTagDirectory(token, tagId), directory);
      void queryClient.invalidateQueries({queryKey: queryKeys.meTag(token, tagId), exact: true});
      void queryClient.invalidateQueries({queryKey: [...queryKeys.meTags(token), 'list']});
      void queryClient.invalidateQueries({queryKey: ['tags', 'directory']});
    },
  });
}

// uploading, moving or removing one of the listing's assets; every call answers with the whole listing
export function useMeTagDirectoryAssetMutation(tagId: string) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (action: {upload: File} | {move: string, position: number} | {remove: string}): Promise<TagDirectoryItem> => {
      if ('upload' in action) {
        return api.uploadMeTagDirectoryAsset(tagId, action.upload);
      }
      if ('move' in action) {
        return api.moveMeTagDirectoryAsset(tagId, action.move, action.position);
      }
      return api.deleteMeTagDirectoryAsset(tagId, action.remove);
    },
    onSuccess: (directory: TagDirectoryItem) => {
      queryClient.setQueryData(queryKeys.meTagDirectory(token, tagId), directory);
      void queryClient.invalidateQueries({queryKey: ['tags', 'directory']});
    },
  });
}


export function useMeTagDirectoryThumbnailMutation(tagId: string) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (action: {upload: File} | {remove: true}): Promise<TagDirectoryItem> => {
      if ('upload' in action) {
        return api.uploadMeTagDirectoryThumbnail(tagId, action.upload);
      }
      return api.deleteMeTagDirectoryThumbnail(tagId);
    },
    onSuccess: (directory: TagDirectoryItem) => {
      queryClient.setQueryData(queryKeys.meTagDirectory(token, tagId), directory);
      void queryClient.invalidateQueries({queryKey: ['tags', 'directory']});
    },
  });
}


export type EditRequestAction =
  {start: true} |
  {patch: {content?: string | null, note?: string, thumbnail_mode?: number}} |
  {discard: true} |
  {submit: true} |
  {withdraw: true} |
  {upload: File} |
  {move: string, position: number} |
  {remove: string} |
  {uploadThumbnail: File};

// everything on the owner's change request, each answers with the listing (`edit_request` included)
export function useMeTagDirectoryEditRequestMutation(tagId: string) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (action: EditRequestAction): Promise<TagDirectoryItem> => {
      if ('start' in action) {
        return api.startMeTagDirectoryEditRequest(tagId);
      }
      if ('patch' in action) {
        return api.patchMeTagDirectoryEditRequest(tagId, action.patch);
      }
      if ('discard' in action) {
        return api.discardMeTagDirectoryEditRequest(tagId);
      }
      if ('submit' in action) {
        return api.submitMeTagDirectoryEditRequest(tagId);
      }
      if ('withdraw' in action) {
        return api.withdrawMeTagDirectoryEditRequest(tagId);
      }
      if ('upload' in action) {
        return api.uploadMeTagDirectoryEditRequestAsset(tagId, action.upload);
      }
      if ('move' in action) {
        return api.moveMeTagDirectoryEditRequestAsset(tagId, action.move, action.position);
      }
      if ('remove' in action) {
        return api.deleteMeTagDirectoryEditRequestAsset(tagId, action.remove);
      }
      return api.uploadMeTagDirectoryEditRequestThumbnail(tagId, action.uploadThumbnail);
    },
    onSuccess: (directory: TagDirectoryItem) => {
      queryClient.setQueryData(queryKeys.meTagDirectory(token, tagId), directory);
    },
  });
}


export function useRequestMeTagDirectoryVerificationMutation(tagId: string) {
  return useMeTagDirectoryVerificationMutation(tagId, () => api.requestMeTagDirectoryVerification(tagId));
}

export function useCancelMeTagDirectoryVerificationMutation(tagId: string) {
  return useMeTagDirectoryVerificationMutation(tagId, () => api.cancelMeTagDirectoryVerification(tagId));
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
    // the API strips whitespace and deletes on an empty value, so store what it actually saved
    onSuccess: (variable, { storageType, name }) => {
      queryClient.setQueryData<TagVariables>(key, (previous) => {
        if (!previous) {
          return previous;
        }
        const bucket = {...previous[`${storageType}`]};
        delete bucket[name];
        if (variable.value) {
          bucket[variable.name] = variable.value;
        } else {
          delete bucket[variable.name];
        }
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


/* voices */

export interface VoiceRename {
  voiceId: string,
  name: string,
}

export function useMeRemindersQuery() {
  const { token } = useAuth();
  return useQuery({
    queryKey: queryKeys.meReminders(token),
    queryFn: ({ signal }) => api.fetchMeReminders(signal),
  });
}


export function useMeEntitlementsQuery() {
  const { token } = useAuth();
  return useQuery({
    queryKey: queryKeys.meEntitlements(token),
    queryFn: ({ signal }) => api.fetchMeEntitlements(signal),
  });
}


export const ME_REPORTS_PAGE_SIZE = 25;

export function useMeReportQuery(reportId: string | null) {
  const { token } = useAuth();
  return useQuery({
    queryKey: ['users', '@me', token, 'report', reportId],
    queryFn: ({ signal }) => api.fetchMeReport(reportId!, signal),
    enabled: !!reportId,
  });
}

export function useMeReportsQuery(filters: {status: number | null, page: number}) {
  const { token } = useAuth();
  return useQuery({
    queryKey: queryKeys.meReports(token, filters),
    queryFn: ({ signal }) => api.fetchMeReports({
      status: filters.status,
      offset: filters.page * ME_REPORTS_PAGE_SIZE,
      limit: ME_REPORTS_PAGE_SIZE,
    }, signal),
    placeholderData: keepPreviousData,
  });
}


export interface ReminderEdit extends ReminderPatch {
  reminderId: string,
}

export function usePatchMeReminderMutation() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const key = queryKeys.meReminders(token);
  return useMutation({
    mutationFn: ({ reminderId, ...body }: ReminderEdit) => api.patchMeReminder(reminderId, body),
    onSuccess: (reminder: Reminder) => {
      queryClient.setQueryData<RemindersPage>(key, (page) => {
        return (page) ? {...page, items: page.items.map((other) => (other.id === reminder.id) ? reminder : other)} : page;
      });
    },
  });
}


export function useDeleteMeReminderMutation() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const key = queryKeys.meReminders(token);
  return useMutation({
    mutationFn: (reminderId: string) => api.deleteMeReminder(reminderId),
    onSuccess: (_result, reminderId) => {
      queryClient.setQueryData<RemindersPage>(key, (page) => {
        return (page) ? {count: Math.max(0, page.count - 1), items: page.items.filter((other) => other.id !== reminderId)} : page;
      });
    },
  });
}


export function useMeVoicesQuery() {
  const { token } = useAuth();
  return useQuery({
    queryKey: queryKeys.meVoices(token),
    queryFn: ({ signal }) => api.fetchMeVoices(signal),
  });
}


export function usePatchMeVoiceMutation() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const key = queryKeys.meVoices(token);
  return useMutation({
    mutationFn: ({ voiceId, name }: VoiceRename) => api.patchMeVoice(voiceId, {name}),
    onSuccess: (voice: Voice) => {
      queryClient.setQueryData<VoicesPage>(key, (page) => {
        return (page) ? {...page, items: page.items.map((other) => (other.id === voice.id) ? voice : other)} : page;
      });
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
  | {kind: 'list-admin-bypass', list: GuildListKind, id: string, type: string, adminBypass: boolean | null}
  | {kind: 'command-list-admin-bypass', list: GuildListKind, command: string, id: string, type: string, adminBypass: boolean | null}
  | {kind: 'logger-remove', channelId: string, type: number}
  | {kind: 'settings', patch: UserGuildPatch};


// Which routes the server sections (prefixes, settings, lists, loggers, data) edit through: yours (`/users/@me/guilds`,
// the default) or staff's (`/admin/guilds`, the admin server modal provides it).
export const GuildScopeContext = createContext<GuildScope>('me');

export function useGuildScope(): GuildScope {
  return useContext(GuildScopeContext);
}

// what to refetch after a server edit, so the page shows exactly what the API stored (and what the bot will see)
function guildQueryKey(scope: GuildScope, token: string | null, guildId: string) {
  // staff edits also refresh the admin server list (blocked, name)
  return (scope === 'admin') ? [...queryKeys.admin(token), 'guilds'] : queryKeys.meGuild(token, guildId);
}


// one mutation for every server edit; each refetches the server afterwards
export function useGuildMutation(guildId: string) {
  const { token } = useAuth();
  const scope = useGuildScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (action: GuildAction): Promise<unknown> => {
      switch (action.kind) {
        case 'prefix':
          return (action.present) ? api.addGuildPrefix(scope, guildId, action.prefix) : api.removeGuildPrefix(scope, guildId, action.prefix);
        case 'list':
          return api.setGuildListEntry(scope, guildId, action.list, action.id, action.type, action.present);
        case 'command-list':
          return api.setGuildCommandListEntry(scope, guildId, action.list, action.command, action.id, action.type, action.present);
        case 'list-admin-bypass':
          return api.setGuildListEntryAdminBypass(scope, guildId, action.list, action.id, action.type, action.adminBypass);
        case 'command-list-admin-bypass':
          return api.setGuildCommandListEntryAdminBypass(scope, guildId, action.list, action.command, action.id, action.type, action.adminBypass);
        case 'logger-remove':
          return api.removeGuildLogger(scope, guildId, {channel_id: action.channelId, type: action.type});
        case 'settings':
          return api.patchGuild(scope, guildId, action.patch);
      }
    },
    onSettled: () => queryClient.invalidateQueries({queryKey: guildQueryKey(scope, token, guildId)}),
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

// server owners only (bot owners from the admin panel); the delete refetches the server (and the tags lists) so the page
// shows it reset
export function useExportGuildDataMutation(guildId: string) {
  const scope = useGuildScope();
  return useMutation({mutationFn: () => api.exportGuildData(scope, guildId)});
}

export function useDeleteGuildDataMutation(guildId: string) {
  const { token } = useAuth();
  const scope = useGuildScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.deleteGuildData(scope, guildId),
    onSettled: () => Promise.all([
      queryClient.invalidateQueries({queryKey: guildQueryKey(scope, token, guildId)}),
      // the server's tags show up in your tags list too
      queryClient.invalidateQueries({queryKey: queryKeys.meTags(token)}),
      queryClient.invalidateQueries({queryKey: [...queryKeys.admin(token), 'all-tags']}),
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
// the tags and tag directory pages show more at once (the api allows up to 100)
export const ADMIN_TAGS_PAGE_SIZE = 50;
export const ADMIN_CONTENT_FLAGS_PAGE_SIZE = 50;

export interface AdminTagsFilters {
  query: string,
  // only tags made in this server
  serverId?: string,
  searchContent: boolean,
  sortBy: AdminTagsSortBy,
  nsfw: boolean | null,
  page: number,
}

// read-only staff view of a tag's variables/blobs, one page at a time
export const ADMIN_TAG_VARIABLES_PAGE_SIZE = 50;
export const ADMIN_TAG_BLOBS_PAGE_SIZE = 10;

export interface AdminTagStorageFilters {
  storageType: number | null,
  // part of a storage id; variables also match their name/value
  query: string,
  page: number,
}

export function useAdminTagStorageQuery(tagId: string, kind: 'variables', filters: AdminTagStorageFilters): UseQueryResult<AdminTagStoragePage<AdminTagVariable>>;
export function useAdminTagStorageQuery(tagId: string, kind: 'blobs', filters: AdminTagStorageFilters): UseQueryResult<AdminTagStoragePage<AdminTagBlob>>;
export function useAdminTagStorageQuery(tagId: string, kind: 'variables' | 'blobs', filters: AdminTagStorageFilters) {
  const { token } = useAuth();
  const pageSize = (kind === 'variables') ? ADMIN_TAG_VARIABLES_PAGE_SIZE : ADMIN_TAG_BLOBS_PAGE_SIZE;
  return useQuery<AdminTagStoragePage<AdminTagVariable> | AdminTagStoragePage<AdminTagBlob>>({
    queryKey: queryKeys.adminTagStorage(token, tagId, kind, filters),
    queryFn: ({ signal }) => {
      const params = {storageType: filters.storageType, query: filters.query, offset: filters.page * pageSize, limit: pageSize};
      return (kind === 'variables') ? api.fetchAdminTagVariables(tagId, params, signal) : api.fetchAdminTagBlobs(tagId, params, signal);
    },
    placeholderData: keepPreviousData,
    enabled: !!token,
  });
}


export function useAdminTagsQuery(filters: AdminTagsFilters) {
  const { token } = useAuth();
  return useQuery({
    queryKey: queryKeys.adminTags(token, filters),
    queryFn: ({ signal }) => api.fetchAdminTags({
      query: filters.query,
      serverId: filters.serverId,
      searchContent: filters.searchContent,
      sortBy: filters.sortBy,
      nsfw: filters.nsfw,
      offset: filters.page * ADMIN_TAGS_PAGE_SIZE,
      limit: ADMIN_TAGS_PAGE_SIZE,
    }, signal),
    placeholderData: keepPreviousData,
  });
}


export interface AdminTagDirectoryFilters {
  query: string,
  category: number | null,
  sortBy: AdminTagDirectorySortBy,
  verified: number | null,
  nsfw: boolean | null,
  // only listings with a change request waiting for review
  editRequest?: boolean | null,
  page: number,
}

export function useAdminTagDirectoryQuery(filters: AdminTagDirectoryFilters) {
  const { token } = useAuth();
  return useQuery({
    queryKey: queryKeys.adminTagDirectory(token, filters),
    queryFn: ({ signal }) => api.fetchAdminTagDirectory({
      query: filters.query,
      category: filters.category,
      sortBy: filters.sortBy,
      verified: filters.verified,
      nsfw: filters.nsfw,
      editRequest: filters.editRequest,
      offset: filters.page * ADMIN_TAGS_PAGE_SIZE,
      limit: ADMIN_TAGS_PAGE_SIZE,
    }, signal),
    placeholderData: keepPreviousData,
  });
}


// one listing (with its content) by tag id, for staff editing it from the public directory; null if it isn't listed.
// Lives under the admin list keys so `usePatchAdminTagDirectoryMutation` updates and refetches it too.
// How widely the owner's tag has been added, counts only. Which servers is staff only, see `useAdminTagServersQuery`.
export function useTagServerCountsQuery(tagId: string) {
  const { token } = useAuth();
  return useQuery<TagServerCounts>({
    queryKey: queryKeys.meTagServers(token, tagId),
    queryFn: ({ signal }) => api.fetchMeTagServers(tagId, signal),
    enabled: !!token,
  });
}


// Which servers added the tag, staff only (their own tags too).
export function useAdminTagServersQuery(tagId: string) {
  const { token } = useAuth();
  return useQuery<TagServers>({
    queryKey: queryKeys.adminTagServers(token, tagId),
    queryFn: ({ signal }) => api.fetchAdminTagServers(tagId, signal),
    enabled: !!token,
  });
}


export function useAdminTagDirectoryItemQuery(tagId: string, { enabled = true }: {enabled?: boolean} = {}) {
  const { token } = useAuth();
  return useQuery({
    queryKey: queryKeys.adminTagDirectory(token, {id: tagId}),
    queryFn: ({ signal }) => api.fetchAdminTagDirectory({query: `id:${tagId}`, limit: 1}, signal),
    select: (page) => page.items.find((item) => item.id === tagId) ?? null,
    enabled: enabled && !!token,
  });
}


// shows the new state in place right away, then refetches since the item may leave the current filter
// (`content` edits go through here too, use a separate instance so their pending state doesn't mix with verifying)
export function usePatchAdminTagDirectoryMutation() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const listKey = [...queryKeys.admin(token), 'tags'];
  return useMutation({
    mutationFn: ({ tagId, ...body }: {tagId: string, verified?: number, content?: string, name?: string, title?: string, description?: string, category?: number}) => api.patchAdminTagDirectory(tagId, body),
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


// staff changing a listing's media or thumbnail, whatever its verification state; each answers with the whole listing
function useAdminTagDirectoryListingMutation<Action>(tagId: string, mutationFn: (action: Action) => Promise<AdminTagDirectoryItem>) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const listKey = [...queryKeys.admin(token), 'tags'];
  return useMutation({
    mutationFn,
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
      // the owner's copy too, for staff editing their own listing
      void queryClient.invalidateQueries({queryKey: queryKeys.meTagDirectory(token, tagId)});
      void queryClient.invalidateQueries({queryKey: ['tags', 'directory']});
    },
  });
}

export function useAdminTagDirectoryMediaMutation(tagId: string) {
  return useAdminTagDirectoryListingMutation(tagId, (action: {upload: File} | {move: string, position: number} | {remove: string}) => {
    if ('upload' in action) {
      return api.uploadAdminTagDirectoryMedia(tagId, action.upload);
    }
    if ('move' in action) {
      return api.moveAdminTagDirectoryMedia(tagId, action.move, action.position);
    }
    return api.deleteAdminTagDirectoryMedia(tagId, action.remove);
  });
}

export function useAdminTagDirectoryThumbnailMutation(tagId: string) {
  return useAdminTagDirectoryListingMutation(tagId, (action: {upload: File} | {remove: true}) => {
    if ('upload' in action) {
      return api.uploadAdminTagDirectoryThumbnail(tagId, action.upload);
    }
    return api.deleteAdminTagDirectoryThumbnail(tagId);
  });
}


// approving changes the live listing (and maybe the tag's content), rejecting only closes the request
export function useAdminTagDirectoryEditRequestMutation() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const listKey = [...queryKeys.admin(token), 'tags'];
  return useMutation({
    mutationFn: (action: {tagId: string, approve: true} | {tagId: string, reject: string}): Promise<AdminTagDirectoryItem> => {
      if ('approve' in action) {
        return api.approveAdminTagDirectoryEditRequest(action.tagId);
      }
      return api.rejectAdminTagDirectoryEditRequest(action.tagId, action.reject);
    },
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
      void queryClient.invalidateQueries({queryKey: ['tags', 'directory']});
    },
  });
}


// tag assets only show up on the admin listing, refetch it so the card picks up the change
export function useUploadAdminTagAssetMutation() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ tagId, source }: {tagId: string, source: {file: File} | {url: string}}) => api.uploadAdminTagAsset(tagId, source),
    onSettled: () => queryClient.invalidateQueries({queryKey: [...queryKeys.admin(token), 'tags']}),
  });
}


export function useDeleteAdminTagAssetMutation() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ tagId, assetId }: {tagId: string, assetId: string}) => api.deleteAdminTagAsset(tagId, assetId),
    onSettled: () => queryClient.invalidateQueries({queryKey: [...queryKeys.admin(token), 'tags']}),
  });
}


// the listing leaves every page (and the public directory), so just refetch
export function useDeleteAdminTagDirectoryMutation() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const listKey = [...queryKeys.admin(token), 'tags'];
  return useMutation({
    mutationFn: ({ tagId, deleteTag }: {tagId: string, deleteTag: boolean}) => api.deleteAdminTagDirectory(tagId, {deleteTag}),
    onSettled: () => Promise.all([
      queryClient.invalidateQueries({queryKey: listKey}),
      queryClient.invalidateQueries({queryKey: ['tags', 'directory']}),
    ]),
  });
}


export interface AdminUsersFilters {
  query: string,
  sortBy: AdminUsersSortBy,
  onlyFlagged: boolean,
  // hours, null for any time
  flaggedWithin: number | null,
  page: number,
}

// one user's row by id (the search matches ids), for a link to one that isn't on the loaded page. Lives under the list
// keys, so blocking/editing them refreshes it too
export function useAdminUserEntryQuery(userId: string | null, enabled = true) {
  const { token } = useAuth();
  return useQuery({
    queryKey: queryKeys.adminUsers(token, {id: userId}),
    queryFn: ({ signal }) => api.fetchAdminUsers({query: userId!, limit: 10}, signal),
    select: (page) => page.items.find((entry) => entry.user.id === userId) ?? null,
    enabled: enabled && !!userId,
  });
}

export function useAdminUsersQuery(filters: AdminUsersFilters) {
  const { token } = useAuth();
  return useQuery({
    queryKey: queryKeys.adminUsers(token, filters),
    queryFn: ({ signal }) => api.fetchAdminUsers({
      query: filters.query,
      sortBy: filters.sortBy,
      onlyFlagged: filters.onlyFlagged,
      flaggedWithin: filters.flaggedWithin,
      offset: filters.page * ADMIN_PAGE_SIZE,
      limit: ADMIN_PAGE_SIZE,
    }, signal),
    placeholderData: keepPreviousData,
  });
}


export function usePatchAdminUserMutation() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const listKey = [...queryKeys.admin(token), 'users'];
  const flagsKey = [...queryKeys.admin(token), 'content-flags'];
  return useMutation({
    mutationFn: ({ userId, patch }: {userId: string, patch: AdminUserPatch}) => api.patchAdminUser(userId, patch),
    onSuccess: (user: AdminUser) => {
      queryClient.setQueriesData<AdminUsersPage>({queryKey: listKey}, (page) => {
        if (!page) {
          return page;
        }
        return {...page, items: page.items.map((entry) => (entry.user.id === user.id) ? {...entry, user} : entry)};
      });
      queryClient.setQueriesData<ContentFlagsPage>({queryKey: flagsKey}, (page) => {
        if (!page) {
          return page;
        }
        const blocked = {blocked: user.blocked, blocked_reason: user.blocked_reason, flags: user.flags};
        return {...page, items: page.items.map((flag) => (flag.user?.id === user.id) ? {...flag, user: {...flag.user, ...blocked}} : flag)};
      });
    },
    // the flags list hides blocked users by default
    onSettled: () => Promise.all([
      queryClient.invalidateQueries({queryKey: listKey}),
      queryClient.invalidateQueries({queryKey: flagsKey}),
    ]),
  });
}


// what replacing `tagId` with `targetId` would move, a dry run of `useMergeAdminTagMutation`
export function useAdminTagMergePreviewQuery(tagId: string, targetId: string | null) {
  const { token } = useAuth();
  return useQuery({
    queryKey: [...queryKeys.admin(token), 'tag-merge', tagId, targetId],
    queryFn: ({ signal }) => api.mergeAdminTag(tagId, targetId!, {dryRun: true}, signal),
    enabled: !!token && !!targetId,
    retry: false,
    // it's what's about to be confirmed, so never an old count
    gcTime: 0,
  });
}


export function useMergeAdminTagMutation() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ tagId, targetId }: {tagId: string, targetId: string}) => api.mergeAdminTag(tagId, targetId),
    // both admin tag lists (and their storage/servers), and the public directory if either was listed
    onSettled: () => Promise.all([
      queryClient.invalidateQueries({queryKey: [...queryKeys.admin(token), 'all-tags']}),
      queryClient.invalidateQueries({queryKey: [...queryKeys.admin(token), 'tags']}),
      queryClient.invalidateQueries({queryKey: [...queryKeys.admin(token), 'tag-storage']}),
      queryClient.invalidateQueries({queryKey: [...queryKeys.admin(token), 'tag-servers']}),
      queryClient.invalidateQueries({queryKey: ['tags', 'directory']}),
    ]),
  });
}


export function useDeleteAdminUserTagsMutation() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId }: {userId: string}) => api.deleteAdminUserTags(userId),
    // both admin tag lists, and the public directory if any of them were listed
    onSettled: () => Promise.all([
      queryClient.invalidateQueries({queryKey: [...queryKeys.admin(token), 'all-tags']}),
      queryClient.invalidateQueries({queryKey: [...queryKeys.admin(token), 'tags']}),
      queryClient.invalidateQueries({queryKey: ['tags', 'directory']}),
    ]),
  });
}


export interface AdminContentFlagsFilters {
  userId: string,
  guildId: string,
  channelId: string,
  tagId: string,
  commandId: string,
  status: number | null,
  category: string,
  needsHumanReview: boolean | null,
  autoConfirmed: boolean | null,
  type: ContentFlagType | null,
  includeBlocked: boolean,
  search: string,
  page: number,
}

// one flag by id, for a link to one that isn't on the loaded page (`enabled` is false when it is)
export function useAdminContentFlagQuery(flagId: string | null, enabled = true) {
  const { token } = useAuth();
  return useQuery({
    queryKey: [...queryKeys.admin(token), 'content-flag', flagId],
    queryFn: ({ signal }) => api.fetchAdminContentFlag(flagId!, signal),
    enabled: enabled && !!flagId,
  });
}

export function useAdminContentFlagsQuery(filters: AdminContentFlagsFilters) {
  const { token } = useAuth();
  return useQuery({
    queryKey: queryKeys.adminContentFlags(token, filters),
    queryFn: ({ signal }) => api.fetchAdminContentFlags({
      userId: filters.userId,
      guildId: filters.guildId,
      channelId: filters.channelId,
      tagId: filters.tagId,
      commandId: filters.commandId,
      status: filters.status,
      category: filters.category,
      needsHumanReview: filters.needsHumanReview,
      autoConfirmed: filters.autoConfirmed,
      type: filters.type,
      includeBlocked: filters.includeBlocked,
      search: filters.search,
      offset: filters.page * ADMIN_CONTENT_FLAGS_PAGE_SIZE,
      limit: ADMIN_CONTENT_FLAGS_PAGE_SIZE,
    }, signal),
    placeholderData: keepPreviousData,
  });
}


// the other flags of the same media, fetched fresh each time it's called (right before confirming one)
export function useFetchContentFlagMatches() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return (flagId: string): Promise<ContentFlagMatches> => queryClient.fetchQuery({
    queryKey: [...queryKeys.admin(token), 'content-flag-matches', flagId],
    queryFn: ({ signal }) => api.fetchAdminContentFlagMatches(flagId, signal),
    staleTime: 0,
  });
}


export function usePatchAdminContentFlagMutation() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const listKey = [...queryKeys.admin(token), 'content-flags'];
  return useMutation({
    mutationFn: ({ flagId, patch }: {flagId: string, patch: ContentFlagPatch}) => api.patchAdminContentFlag(flagId, patch),
    onSuccess: (flag: ContentFlag) => {
      queryClient.setQueryData([...queryKeys.admin(token), 'content-flag', flag.id], flag);
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


export function useFlagAdminContentFlagPromptMutation() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const listKey = [...queryKeys.admin(token), 'content-flags'];
  return useMutation({
    mutationFn: ({ flagId }: {flagId: string}) => api.flagAdminContentFlagPrompt(flagId),
    onSuccess: (flag: ContentFlag) => {
      queryClient.setQueryData([...queryKeys.admin(token), 'content-flag', flag.id], flag);
      queryClient.setQueriesData<ContentFlagsPage>({queryKey: listKey}, (page) => {
        if (!page) {
          return page;
        }
        return {...page, items: page.items.map((other) => (other.id === flag.id) ? flag : other)};
      });
    },
    onSettled: () => queryClient.invalidateQueries({queryKey: listKey}),
  });
}


export function useTranslateAdminContentFlagMutation() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const listKey = [...queryKeys.admin(token), 'content-flags'];
  return useMutation({
    mutationFn: ({ flagId }: {flagId: string}) => api.translateAdminContentFlag(flagId),
    onSuccess: (flag: ContentFlag) => {
      queryClient.setQueryData([...queryKeys.admin(token), 'content-flag', flag.id], flag);
      queryClient.setQueriesData<ContentFlagsPage>({queryKey: listKey}, (page) => {
        if (!page) {
          return page;
        }
        return {...page, items: page.items.map((other) => (other.id === flag.id) ? flag : other)};
      });
    },
    onSettled: () => queryClient.invalidateQueries({queryKey: listKey}),
  });
}


export interface AdminReportsFilters {
  type: number | null,
  status: number | null,
  userId: string,
  targetId: string,
  guildId: string,
  page: number,
}

// one report by id, for a link to one that isn't on the loaded page
export function useAdminReportQuery(reportId: string | null, enabled = true) {
  const { token } = useAuth();
  return useQuery({
    queryKey: [...queryKeys.admin(token), 'report', reportId],
    queryFn: ({ signal }) => api.fetchAdminReport(reportId!, signal),
    enabled: enabled && !!reportId,
  });
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
      guildId: filters.guildId,
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
      queryClient.setQueryData([...queryKeys.admin(token), 'report', report.id], report);
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


export interface AdminEntitlementsFilters {
  userId: string,
  provider: string | null,
  premiumType: number | null,
  active: boolean | null,
  page: number,
}

export function useAdminEntitlementsQuery(filters: AdminEntitlementsFilters) {
  const { token } = useAuth();
  return useQuery({
    queryKey: queryKeys.adminEntitlements(token, filters),
    queryFn: ({ signal }) => api.fetchAdminEntitlements({
      userId: filters.userId,
      provider: filters.provider,
      premiumType: filters.premiumType,
      active: filters.active,
      offset: filters.page * ADMIN_PAGE_SIZE,
      limit: ADMIN_PAGE_SIZE,
    }, signal),
    placeholderData: keepPreviousData,
  });
}


export interface AdminVoicesFilters {
  query: string,
  userId: string,
  page: number,
}

export function useAdminVoicesQuery(filters: AdminVoicesFilters) {
  const { token } = useAuth();
  return useQuery({
    queryKey: queryKeys.adminVoices(token, filters),
    queryFn: ({ signal }) => api.fetchAdminVoices({
      query: filters.query,
      userId: filters.userId,
      offset: filters.page * ADMIN_PAGE_SIZE,
      limit: ADMIN_PAGE_SIZE,
    }, signal),
    placeholderData: keepPreviousData,
  });
}


export function usePatchAdminVoiceMutation() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const listKey = [...queryKeys.admin(token), 'voices'];
  return useMutation({
    mutationFn: ({ voiceId, name }: VoiceRename) => api.patchAdminVoice(voiceId, {name}),
    onSuccess: (voice: AdminVoice) => {
      queryClient.setQueriesData<AdminVoicesPage>({queryKey: listKey}, (page) => {
        return (page) ? {...page, items: page.items.map((other) => (other.id === voice.id) ? voice : other)} : page;
      });
      // a staff member renaming one of their own voices
      void queryClient.invalidateQueries({queryKey: queryKeys.meVoices(token)});
    },
    onSettled: () => queryClient.invalidateQueries({queryKey: listKey}),
  });
}


export interface AdminGuildsFilters {
  query: string,
  inBot: boolean | null,
  blocked: boolean | null,
  // hours, null for any time
  flaggedWithin: number | null,
  sortBy: AdminGuildsSortBy,
  page: number,
}

export function useAdminGuildsQuery(filters: AdminGuildsFilters) {
  const { token } = useAuth();
  return useQuery({
    queryKey: queryKeys.adminGuilds(token, filters),
    queryFn: ({ signal }) => api.fetchAdminGuilds({
      query: filters.query,
      inBot: filters.inBot,
      blocked: filters.blocked,
      flaggedWithin: filters.flaggedWithin,
      sortBy: filters.sortBy,
      offset: filters.page * ADMIN_PAGE_SIZE,
      limit: ADMIN_PAGE_SIZE,
    }, signal),
    placeholderData: keepPreviousData,
  });
}


export function useAdminGuildQuery(guildId: string) {
  const { token } = useAuth();
  return useQuery({
    queryKey: queryKeys.adminGuild(token, guildId),
    queryFn: ({ signal }) => api.fetchAdminGuild(guildId, signal),
  });
}


// blocking/unblocking a server (unblocking is owner only); the settings go through `useGuildMutation` like everywhere else
export function usePatchAdminGuildMutation(guildId: string) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: AdminGuildPatch) => api.patchAdminGuild(guildId, patch),
    onSuccess: (guild) => queryClient.setQueryData(queryKeys.adminGuild(token, guildId), guild),
    onSettled: () => queryClient.invalidateQueries({queryKey: [...queryKeys.admin(token), 'guilds']}),
  });
}
