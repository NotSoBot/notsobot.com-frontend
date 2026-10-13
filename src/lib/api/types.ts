// Raw response shapes from notsobot.api (see `models/pg.py` `to_dict` methods).

export const CommandTypes = {
  PREFIXED: 0,
  APPLICATION_SLASH: 1,
  APPLICATION_MENU_USER: 2,
  APPLICATION_MENU_MESSAGE: 3,
} as const;
export type CommandType = (typeof CommandTypes)[keyof typeof CommandTypes];

// Mirrors `CommandCategories` in notsobot.ts (src/constants.ts).
export const CommandCategories = {
  AI: 'AI',
  AUDIO: 'AUDIO',
  CONVERSION: 'CONVERSION',
  EFFECTS: 'EFFECTS',
  FUN: 'FUN',
  INFO: 'INFO',
  MODERATION: 'MODERATION',
  OWNER: 'OWNER',
  PERSONAL: 'PERSONAL',
  SEARCH: 'SEARCH',
  SERVER: 'SERVER',
  TAGS: 'TAGS',
  UTILITY: 'UTILITY',
} as const;

// What the API returns until the bot re-uploads its commands with the new set above.
export const LegacyCommandCategories = {
  IMAGE: 'IMAGE',
  SAY: 'SAY',
  SETTINGS: 'SETTINGS',
  TOOLS: 'TOOLS',
  UTILS: 'UTILS',
} as const;
export type CommandCategory = (typeof CommandCategories)[keyof typeof CommandCategories];

export const ShardStatuses = {
  CLOSED: 'CLOSED',
  CONNECTING: 'CONNECTING',
  IDENTIFYING: 'IDENTIFYING',
  OPEN: 'OPEN',
  READY: 'READY',
  RESUMING: 'RESUMING',
} as const;
export type ShardStatus = (typeof ShardStatuses)[keyof typeof ShardStatuses];


export interface ApiErrorBody {
  code: number,
  message: string,
  status: number,
  [key: string]: unknown,
}


export const CommandMediaTypes = {
  AFTER: 0,
  BEFORE: 1,
} as const;

export interface CommandMedia {
  type: (typeof CommandMediaTypes)[keyof typeof CommandMediaTypes],
  url: string,
}

export interface Command {
  enabled: boolean,
  id: string,
  media: Array<CommandMedia>,
  metadata: Array<CommandMetadata>,
}

export interface CommandArg {
  aliases: Array<string>,
  description: string,
  name: string,
  prefix: string,
}

export interface CommandMetadata {
  aliases: Array<string>,
  args: Array<CommandArg>,
  category: CommandCategory | string,
  description: string | null,
  dmable: boolean,
  enabled: boolean,
  examples: Array<string>,
  name: string,
  ratelimits: Array<{duration: number, key: string | null, limit: number, type: string}>,
  type: CommandType,
  usage: string,
}


// `GET /commands/stats`: usage per (command id, command type), optionally since a timestamp
export interface CommandStat {
  count: number,
  id: string,
  name: string,
  since: number,
  type: CommandType,
}


export interface InfoDiscord {
  clusters: Array<InfoDiscordCluster>,
  shard_count: number,
  shards_per_cluster: number,
}

export interface InfoDiscordCluster {
  cluster_id: number,
  last_refresh: string,
  ram_usage: number,
  shards: Array<InfoDiscordShard>,
}

export interface InfoDiscordShard {
  cluster_id: number,
  counts: {
    applications: number,
    channel_threads: number,
    channels: number,
    emojis: number,
    events: number,
    guild_scheduled_events: number,
    guilds: number,
    member_count: number,
    members: number,
    messages: number,
    permission_overwrites: number,
    presence_activities: number,
    presences: number,
    roles: number,
    stage_instances: number,
    typings: number,
    users: number,
    voice_states: number,
  },
  shard_id: number,
  status: ShardStatus,
}


export interface User {
  avatar: string | null,
  blocked: boolean,
  blocked_on: string | null,
  blocked_reason: string | null,
  bot: boolean,
  discriminator: string,
  flags: number,
  id: string,
  username: string,
}

export interface UserMe extends User {
  channel_id: string | null,
  premium_type: number,
}

export interface UserSession {
  id: string,
  user_agent: string,
}


// `TagDirectorySortByFilters`; everything but NEWEST pages by `offset`
export const TagDirectorySortByFilters = {
  NEWEST: 0,
  OLDEST: 1,
  VERIFIED: 2,
  USES: 3,
  NAME: 4,
} as const;

export type TagDirectorySortBy = typeof TagDirectorySortByFilters[keyof typeof TagDirectorySortByFilters];

export interface TagDirectoryFilters {
  query: string,
  sortBy: TagDirectorySortBy,
  verified: number | null,
  nsfw: boolean | null,
}

export const TagDirectoryVerificationStates = {
  NOT_VERIFIED: 0,
  PENDING_VERIFICATION: 1,
  VERIFIED: 2,
} as const;

export interface TagDirectoryAsset {
  filename: string,
  filename_base: string,
  id: string,
  metadata: {
    duration: number,
    extension: string,
    framecount: number,
    height: number,
    mimetype: string,
    size: number,
    width: number,
  },
  position: number,
  urls: {cdn: string},
}

// `Tag.to_dict(directory_view=True)` — content/guild_id are always blanked out
export interface DirectoryTag {
  assets: Array<unknown>,
  content: string,
  created: string,
  edited: string | null,
  guild_id: string | null,
  id: string,
  is_command: boolean,
  is_on_directory: boolean,
  last_used: string | null,
  locked: boolean,
  name: string,
  nsfw: boolean,
  reference_tag: DirectoryTag | null,
  scanned: number,
  server_id: string | null,
  user: User,
  uses: number,
}

export interface TagDirectoryItem {
  assets: Array<TagDirectoryAsset>,
  created: string,
  description: string,
  edited: string | null,
  id: string,
  server_count: number,
  tag: DirectoryTag,
  title: string,
  verified: number,
}

export interface TagDirectoryPage {
  count: number,
  items: Array<TagDirectoryItem>,
}


// --- Dashboard (`/users/@me/...`, see docs/dashboard-api.md) ---

// notsobot.api `ApiErrorCodes` the dashboard reacts to
export const ApiErrorCodes = {
  UNKNOWN_TAG: 10009,
  UNKNOWN_TAG_DIRECTORY_ITEM: 10011,
  UNKNOWN_SERVER: 10012,
  UNKNOWN_REPORT: 10017,
  MISSING_ACCESS: 20004,
  INVALID_FORM_BODY: 50001,
  TAG_LOCKED: 50011,
  TAG_NAME_TAKEN: 50015,
  TAG_DIRECTORY_CANNOT_PUBLISH_ALIAS: 50016,
  TAG_DIRECTORY_PENDING_VERIFICATION: 50017,
  TAG_DIRECTORY_NAME_TAKEN: 50018,
  MAX_TAG_DIRECTORY: 30013,
  // the session's Discord grant was revoked/expired (not the site session itself)
  DISCORD_OAUTH_ERROR: 60001,
  DISCORD_OAUTH_SCOPE_MISMATCH: 60002,
  DISCORD_FETCH_FAILED: 60003,
  EXTERNAL_SERVICE_TIMEOUT: 60008,
  DISCORD_RATELIMITED: 60011,
  DISCORD_API_ERROR: 60012,
} as const;


export const UserPremiumTypes = {
  NONE: 0,
  PREMIUM_FREE: 1,
  PREMIUM: 2,
  PREMIUM_PLUS: 3,
  PREMIUM_PLUS_AI: 4,
} as const;


// `UserSettings.to_dict()`
export interface UserSettings {
  application_command_response_type: number,
  download_quality: string | null,
  fallbacks_media_image: number,
  file_upload_name: string | null,
  file_upload_threshold: number,
  file_upload_type: number,
  file_upload_vanity: string | null,
  locale: string | null,
  ml_diffusion_model: string | null,
  ml_llm_model: string | null,
  ml_llm_personality: string | null,
  opted_out_content: string | null,
  response_display: number | null,
  timezone: string | null,
  tts_voice: string | null,
  units: string | null,
}

// `file_upload_name` and `opted_out_content` are read-only
export type UserSettingsPatch = Partial<Omit<UserSettings, 'opted_out_content' | 'file_upload_name'>>;


// `Tag.to_dict()` (with content)
export interface Tag {
  assets: Array<unknown>,
  content: string,
  created: string,
  edited: string | null,
  guild_id: string | null,
  id: string,
  is_command: boolean,
  is_on_directory: boolean,
  last_used: string | null,
  locked: boolean,
  name: string,
  nsfw: boolean,
  reference_tag: Tag | null,
  scanned: number,
  server_id: string | null,
  user: User,
  uses: number,
}

export interface TagsPage {
  count: number,
  items: Array<Tag>,
}

export interface TagPatch {
  name?: string,
  content?: string,
  nsfw?: boolean,
}


// `TagVariableStorageTypes` / `TagBlobStorageTypes` (same values)
export const TagStorageTypes = {
  USER: 0,
  CHANNEL: 1,
  GUILD: 2,
  GLOBAL: 3,
} as const;
export type TagStorageType = (typeof TagStorageTypes)[keyof typeof TagStorageTypes];

// which storage ids to read/write besides global; omitted ids leave those buckets empty
export interface TagStorageScope {
  user_id?: string,
  channel_id?: string,
  guild_id?: string,
}

// `GET .../variables`: storage type -> {name: value}
export type TagVariables = Record<`${TagStorageType}`, Record<string, string>>;

export interface TagVariable {
  name: string,
  storage_id: string,
  storage_type: TagStorageType,
  value: string,
}

// `GET .../blobs`: storage type -> base64 blob (or null)
export type TagBlobs = Record<`${TagStorageType}`, string | null>;

export interface TagBlobsPut extends TagStorageScope {
  blobs: Array<{storage_id: string, storage_type: TagStorageType, value: string}>,
}


export interface UserGuildSummary {
  can_manage: boolean,
  icon: string | null,
  id: string,
  name: string,
  owner: boolean,
  permissions: string,
}

export interface GuildListEntry {
  added: string,
  id: string,
  type: string,
  user_id: string | null,
}

export interface GuildCommandListEntry extends GuildListEntry {
  command: string,
}

// `GuildLogger.to_dict()` (the dashboard never gets the webhook)
export interface GuildLogger {
  added: string,
  channel_id: string,
  disabled_events: number,
  guild_id: string,
  type: number,
  user_id: string | null,
}

export interface GuildPrefix {
  added: string,
  guild_id: string,
  prefix: string,
  user_id: string | null,
}

export interface GuildSettings {
  ml_diffusion_model: string | null,
  ml_llm_model: string | null,
  ml_llm_personality: string | null,
  response_display: number | null,
}

export type GuildEditableArea = 'prefixes' | 'allowlist' | 'blocklist' | 'commands' | 'loggers' | 'settings';

// `Guild.to_dict()` + the caller's permissions and what they may edit
export interface UserGuild {
  allowlist: Array<GuildListEntry>,
  blocked: boolean,
  blocked_reason: string | null,
  blocklist: Array<GuildListEntry>,
  commands_allowlist: Array<GuildCommandListEntry>,
  commands_blocklist: Array<GuildCommandListEntry>,
  disabled_logger_events: number,
  editable: Record<GuildEditableArea, boolean>,
  features: Array<string>,
  icon: string | null,
  id: string,
  locale: string | null,
  loggers: Array<GuildLogger>,
  name: string,
  owner: boolean,
  permissions: string,
  prefixes: Array<GuildPrefix>,
  settings: GuildSettings,
  timezone: string | null,
}

// owner only: the server's settings and its tags. Logger webhook URLs, tag variables/blobs and the content of
// directory tags (including what aliases here point to outside the server) are left out, `notes` says so inside the file
export interface UserGuildDataExport {
  guild: Omit<UserGuild, 'editable' | 'owner' | 'permissions'>,
  notes: Array<string>,
  tags: Array<Tag>,
  timestamp: number,
  version: number,
}

export interface UserGuildDataDelete {
  tags_deleted: number,
}

export interface UserGuildPatch {
  locale?: string | null,
  timezone?: string | null,
  ml_llm_personality?: string | null,
  ml_llm_model?: string | null,
  ml_diffusion_model?: string | null,
  response_display?: number | null,
}

export type GuildListKind = 'allowlist' | 'blocklist';


// title/description of a tag's directory listing (images aren't editable from the dashboard yet)
export interface TagDirectoryListingInput {
  title?: string,
  description?: string,
}

export const TAG_DIRECTORY_TITLE_MAX = 128;
export const TAG_DIRECTORY_DESCRIPTION_MAX = 2000;


// --- Admin (`/admin/...`, owner only, see docs/dashboard-api.md) ---

// `UserFlags` bits on `User.flags`
export const UserFlags = {
  OWNER: 1 << 0,
} as const;

// bigint ids come back as strings, timestamps as ISO strings (be tolerant of epoch numbers too)
export type ApiTimestamp = string | number;

export interface AdminUserRef {
  avatar: string | null,
  discriminator: string,
  id: string,
  username: string,
}

// `Tag.to_dict()` with content, as the admin directory returns it
export interface AdminDirectoryTag {
  assets?: Array<unknown>,
  content: string,
  created: ApiTimestamp,
  edited?: ApiTimestamp | null,
  guild_id?: string | null,
  id: string,
  is_command?: boolean,
  last_used?: ApiTimestamp | null,
  locked: boolean,
  name: string,
  nsfw: boolean,
  reference_tag?: unknown,
  server_id: string | null,
  user_id?: string | null,
  uses: number,
  [key: string]: unknown,
}

export interface AdminTagDirectoryItem {
  assets: Array<TagDirectoryAsset>,
  created?: ApiTimestamp,
  description: string,
  edited?: ApiTimestamp | null,
  id: string,
  server_count: number,
  tag: AdminDirectoryTag,
  title: string,
  user: AdminUserRef | null,
  verified: number,
}

export interface AdminTagDirectoryPage {
  count: number,
  items: Array<AdminTagDirectoryItem>,
}

export interface AdminUser extends AdminUserRef {
  blocked: boolean,
  blocked_reason: string | null,
  flags: number,
  premium_type: number | null,
}

export interface AdminUserPatch {
  blocked?: boolean,
  blocked_reason?: string | null,
}

export interface AdminUserContentFlags {
  confirmed: number,
  dismissed: number,
  flagged: number,
  last_flagged_at: ApiTimestamp | null,
  pending: number,
  reported: number,
  total: number,
}

export interface AdminUserEntry {
  content_flags: AdminUserContentFlags,
  user: AdminUser,
}

export interface AdminUsersPage {
  count: number,
  items: Array<AdminUserEntry>,
}

export type AdminUsersSortBy = 'flags' | 'newest' | 'username';
export type AdminTagDirectorySortBy = 'newest' | 'oldest' | 'uses' | 'name' | 'title';

export const ContentFlagStatuses = {
  PENDING: 0,
  CONFIRMED: 1,
  DISMISSED: 2,
  REPORTED: 3,
} as const;
export type ContentFlagStatus = (typeof ContentFlagStatuses)[keyof typeof ContentFlagStatuses];

export const ContentFlagCategories = ['unsafe', 'unsafe_child_safety', 'unsafe_nudity', 'review_child_safety', 'review'] as const;
export const ContentFlagActions = ['blocked', 'replaced', 'logged', 'not_hosted'] as const;

export interface ContentFlag {
  action: string | null,
  category: string | null,
  channel_id: string | null,
  command_id: string | null,
  created: ApiTimestamp,
  flagged: Array<string> | null,
  flagged_for_review: Array<string> | null,
  frames: number | null,
  frames_flagged: Array<number> | null,
  guild_id: string | null,
  id: string,
  message_id: string | null,
  mimetype: string | null,
  model: string | null,
  needs_human_review: boolean,
  notes: string | null,
  pdq: string | null,
  query: string | null,
  reviewed_at: ApiTimestamp | null,
  reviewed_by: string | null,
  scores_worst: Record<string, unknown> | null,
  sha256: string | null,
  size: number | null,
  // never rendered as media or a link, see AdminContentFlagsPage
  source_url: string | null,
  status: number,
  tag_id: string | null,
  user: AdminUserRef | null,
  user_id: string | null,
}

export interface ContentFlagsPage {
  count: number,
  items: Array<ContentFlag>,
}

export interface ContentFlagPatch {
  status?: ContentFlagStatus,
  notes?: string | null,
}

// what users send with the bot's `report bug|user|server` command
export const ReportTypes = {
  BUG: 0,
  USER: 1,
  SERVER: 2,
} as const;
export type ReportType = (typeof ReportTypes)[keyof typeof ReportTypes];

export const ReportStatuses = {
  OPEN: 0,
  RESOLVED: 1,
  DISMISSED: 2,
} as const;
export type ReportStatus = (typeof ReportStatuses)[keyof typeof ReportStatuses];

export interface Report {
  channel_id: string | null,
  content: string,
  created: ApiTimestamp,
  guild_id: string | null,
  id: string,
  message_id: string | null,
  notes: string | null,
  reviewed_at: ApiTimestamp | null,
  reviewed_by: string | null,
  status: number,
  // the reported user (USER) or guild (SERVER); null for bugs
  target_id: string | null,
  type: number,
  // the reporter
  user: User,
}

export interface ReportsPage {
  count: number,
  items: Array<Report>,
}

export interface ReportPatch {
  status?: ReportStatus,
  notes?: string | null,
}
