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
  SERVERS: 5,
} as const;

export type TagDirectorySortBy = typeof TagDirectorySortByFilters[keyof typeof TagDirectorySortByFilters];

export interface TagDirectoryFilters {
  query: string,
  category: TagDirectoryCategory | null,
  sortBy: TagDirectorySortBy,
  verified: number | null,
  nsfw: boolean | null,
}

// `TagDirectoryCategories`, a listing has exactly one (`OTHER` by default)
export const TagDirectoryCategories = {
  OTHER: 0,
  AI: 1,
  CLIPS: 2,
  FILTERS: 3,
  GAMES: 4,
  MEMES: 5,
  UTILITY: 6,
} as const;

export type TagDirectoryCategory = typeof TagDirectoryCategories[keyof typeof TagDirectoryCategories];

const TAG_DIRECTORY_CATEGORY_VALUES: ReadonlySet<number> = new Set(Object.values(TagDirectoryCategories));

// a category the frontend doesn't know (retired, or added to the api first) is treated as `OTHER`
export function toTagDirectoryCategory(value: unknown): TagDirectoryCategory {
  return (typeof value === 'number' && TAG_DIRECTORY_CATEGORY_VALUES.has(value)) ? value as TagDirectoryCategory : TagDirectoryCategories.OTHER;
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

// `TagAssets.to_dict()`, same shape as a directory listing's assets
export type TagAsset = TagDirectoryAsset;

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
  // in order, the first is the cover. Public responses only have them once the listing is verified,
  // the owner's (`/users/@me/tags/:id/directory`) and staff's have them at every stage
  assets: Array<TagDirectoryAsset>,
  category: TagDirectoryCategory,
  // the owner shows `tag.content` publicly, it's '' otherwise
  content_public: boolean,
  created: string,
  description: string,
  edited: string | null,
  id: string,
  server_count: number,
  tag: DirectoryTag,
  title: string,
  verified: number,
}

// `GET /users/@me/tags/:id/servers` (owner): how widely the tag has been added, counts only, which servers is staff only
export interface TagServerCounts {
  // every alias of the tag, a server can have it under more than one name
  alias_count: number,
  // servers, DMs and personal tags alike, the same as the listing's
  server_count: number,
}

// `GET /admin/tags/:id/servers` (staff): where the tag has been added
export interface TagServer {
  // when the server first added the tag
  added: string,
  icon: string | null,
  id: string,
  name: string,
  // what the tag is called there, usually just one
  names: Array<string>,
}

export interface TagServers extends TagServerCounts {
  // DMs, personal tags and servers NotSoBot has no record of, only counted
  other_count: number,
  servers: Array<TagServer>,
  // more servers than the API lists (it caps the list, newest first)
  truncated: boolean,
}

export interface TagDirectoryPage {
  count: number,
  items: Array<TagDirectoryItem>,
}


// --- Dashboard (`/users/@me/...`, see docs/dashboard-api.md) ---

// notsobot.api `ApiErrorCodes` the dashboard reacts to
export const ApiErrorCodes = {
  UNKNOWN_JOB: 10006,
  UNKNOWN_TAG: 10009,
  UNKNOWN_TAG_DIRECTORY_ITEM: 10011,
  UNKNOWN_TAG_ASSET: 10019,
  UNKNOWN_TAG_DIRECTORY_ASSET: 10020,
  UNKNOWN_SERVER: 10012,
  UNKNOWN_REPORT: 10017,
  UNKNOWN_REMINDER: 10007,
  UNKNOWN_VOICE: 10003,
  MISSING_ACCESS: 20004,
  TEXT_BLOCKED_GUIDELINES: 40030,
  INVALID_FILE_TYPE: 40001,
  FILE_TOO_LARGE: 40004,
  UNSUPPORTED_UPLOAD_TYPE: 40005,
  SAFETY_SCAN_FAILED: 60004,
  INVALID_FORM_BODY: 50001,
  TAG_LOCKED: 50011,
  TAG_NAME_TAKEN: 50015,
  TAG_DIRECTORY_CANNOT_PUBLISH_ALIAS: 50016,
  TAG_DIRECTORY_PENDING_VERIFICATION: 50017,
  TAG_DIRECTORY_NAME_TAKEN: 50018,
  TAG_DIRECTORY_ALREADY_PENDING: 50019,
  TAG_DIRECTORY_ALREADY_VERIFIED: 50020,
  TAG_DIRECTORY_ALREADY_UNVERIFIED: 50021,
  TAG_DIRECTORY_CANNOT_UNVERIFY_VERIFIED: 50022,
  TAG_DIRECTORY_VERIFICATION_REQUIRES_DESCRIPTION: 50032,
  TAG_DIRECTORY_VERIFICATION_REQUIRES_CATEGORY: 50033,
  TAG_DIRECTORY_ASSETS_REQUIRE_PENDING: 50034,
  MAX_TAG_DIRECTORY: 30013,
  MAX_TAG_DIRECTORY_ASSETS: 30018,
  // the session's Discord grant was revoked/expired (not the site session itself)
  DISCORD_OAUTH_ERROR: 60001,
  DISCORD_OAUTH_SCOPE_MISMATCH: 60002,
  DISCORD_FETCH_FAILED: 60003,
  EXTERNAL_SERVICE_TIMEOUT: 60008,
  DISCORD_RATELIMITED: 60011,
  // our own rate limits (`app_limiter`), e.g. one listing upload per 2 seconds
  RATELIMITED: 30016,
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
  // only on `GET /users/@me/tags` items: the tag's directory listing, if it has one
  directory?: {title: string, verified: number} | null,
}

export interface TagsPage {
  count: number,
  items: Array<Tag>,
}

export type MeTagsSortBy = 'newest' | 'oldest' | 'uses' | 'name' | 'last_used';

// `listed`: only tags listed on the tag directory (`verified` narrows it to one `TagDirectoryVerificationStates`), false: only the rest
export type MeTagsDirectoryFilter = {listed: true, verified: number | null} | {listed: false} | null;

export interface TagPatch {
  name?: string,
  content?: string,
  nsfw?: boolean,
}


// `VoiceCloneTypes`: where the cloned voice lives
export const VoiceCloneTypes = {
  ELEVENLABS: 0,
} as const;

// a reminder made with the bot's `reminder` commands, read-only on the dashboard
export interface Reminder {
  // the channel it gets sent in, null when it goes to the user's dms
  channel_id: string | null,
  content: string,
  guild_id: string | null,
  id: string,
  is_all_day: boolean,
  // the message that created it (for the jump link), null when it wasn't made from a message
  message_id: string | null,
  // the number the bot's `reminder delete <position>` uses
  position: number,
  timestamp_end: string | null,
  timestamp_start: string,
}

export interface RemindersPage {
  count: number,
  items: Array<Reminder>,
}

// `content` max 512; `move_to_dms` moves a server reminder to the owner's dms (it can't be moved back from here)
export interface ReminderPatch {
  content?: string,
  move_to_dms?: boolean,
}

// a voice cloned with the bot's `voice clone` command
export interface Voice {
  created: ApiTimestamp,
  id: string,
  name: string,
  platform_type: number,
}

export interface VoicesPage {
  count: number,
  items: Array<Voice>,
}

// only the name can be changed from the dashboard (max 128)
export interface VoicePatch {
  name: string,
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


// `/admin/guilds`: a server NotSoBot knows, from its `guilds` row and/or `bot_guilds`
export interface AdminGuildBot {
  shard_id: number,
  // when the bot last reported it (a shard's full sync or the join)
  updated: ApiTimestamp | null,
}

export interface AdminGuildSummary {
  blocked: boolean,
  blocked_reason: string | null,
  // null when the bot isn't in it
  bot: AdminGuildBot | null,
  icon: string | null,
  id: string,
  // null when the bot is in it but it was never saved (no settings yet)
  name: string | null,
}

export interface AdminGuildsPage {
  count: number,
  items: Array<AdminGuildSummary>,
}

export type AdminGuildsSortBy = 'newest' | 'oldest' | 'name';

// `/admin/guilds/<id>`: the `UserGuild` shape (every area editable) plus where the bot is and what's linked to it
export interface AdminGuild extends UserGuild {
  bot: AdminGuildBot | null,
  counts: {content_flags: number, reminders: number, reports: number, tags: number},
}

// unblocking is owner only
export interface AdminGuildPatch extends UserGuildPatch {
  blocked?: boolean,
  blocked_reason?: string | null,
}



// title/description/category of a tag's directory listing (images aren't editable from the dashboard yet)
export interface TagDirectoryListingInput {
  title?: string,
  description?: string,
  category?: TagDirectoryCategory,
  content_public?: boolean,
}

export const TAG_DIRECTORY_TITLE_MAX = 128;
export const TAG_DIRECTORY_DESCRIPTION_MAX = 2000;
// `MAX_TAG_DIRECTORY_ASSETS_AMOUNT`/`MAX_TAG_DIRECTORY_ASSET_SIZE`, the first asset is the listing's cover
export const TAG_DIRECTORY_ASSETS_MAX = 6;
export const TAG_DIRECTORY_ASSET_SIZE_MAX = 10 * 1024 * 1024;


// --- Admin (`/admin/...`, owners and moderators, see docs/dashboard-api.md) ---

// `UserFlags` bits on `User.flags`
export const UserFlags = {
  OWNER: 1 << 0,
  MODERATOR: 1 << 1,
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
  // files staff archived for the tag (`TagAssets`), served from `cdn.nsb.gg/assets/tags/...`
  assets?: Array<TagAsset>,
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
  category: TagDirectoryCategory,
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
  // owner only; the OWNER bit can't be changed from the dashboard
  flags?: number,
  premium_type?: number,
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

export type AdminUsersSortBy = 'confirmed' | 'flags' | 'last_flagged' | 'newest' | 'username';
export type AdminTagsSortBy = 'newest' | 'oldest' | 'uses' | 'name' | 'last_used';

// `GET /admin/tags`, every tag (personal, server and aliases), not just directory listings
export interface AdminTagItem {
  // the tag's directory listing, if it has one
  directory: {title: string, verified: number} | null,
  tag: AdminDirectoryTag,
  // `channel_id` is the owner's DM channel with the bot, so a DM tag can be told apart from a group DM one
  user: (AdminUserRef & {channel_id: string | null}) | null,
}

export interface AdminTagsPage {
  count: number,
  items: Array<AdminTagItem>,
}

// a tag's variables/blobs across every storage, read-only; `counts` is per storage type over the whole tag
export interface AdminTagVariable {
  name: string,
  storage_id: string,
  storage_type: TagStorageType,
  value: string,
}

export interface AdminTagBlob {
  // bytes, the whole blob
  size: number,
  storage_id: string,
  storage_type: TagStorageType,
  // only the first 16kb are sent
  truncated: boolean,
  // base64
  value: string,
}

export interface AdminTagStoragePage<T> {
  count: number,
  counts: Partial<Record<`${TagStorageType}`, number>>,
  items: Array<T>,
}
export type AdminTagDirectorySortBy = 'newest' | 'oldest' | 'uses' | 'servers' | 'name' | 'title';

export const ContentFlagStatuses = {
  PENDING: 0,
  CONFIRMED: 1,
  DISMISSED: 2,
  REPORTED: 3,
} as const;
export type ContentFlagStatus = (typeof ContentFlagStatuses)[keyof typeof ContentFlagStatuses];

export const ContentFlagCategories = ['unsafe', 'unsafe_child_safety', 'unsafe_nudity', 'review_child_safety', 'review'] as const;
export const ContentFlagTypes = ['media', 'text'] as const;
export type ContentFlagType = (typeof ContentFlagTypes)[number];
// text flags (filtered tag outputs, prompts) are stored with this mimetype, the text itself is in `query`
export const CONTENT_FLAG_TEXT_MIMETYPE = 'text/plain';
export const ContentFlagActions = ['blocked', 'replaced', 'logged', 'not_hosted'] as const;

export interface ContentFlag {
  action: string | null,
  // the confirmed flag this one was auto-confirmed from (same sha256 or a close pdq), cleared once a reviewer sets a status
  auto_confirmed_from?: string | null,
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
  // english translation of `query` from `POST /admin/content-flags/<id>/translate`, `translation_language` is the detected
  // source language (`en` with no `translation` means it was already english)
  translation?: string | null,
  translation_language?: string | null,
  user: ContentFlagUser | null,
  user_id: string | null,
}

// the flag's user, with what the page needs to block them: `flags` (`UserFlags`) since owners can't be blocked and
// moderators can only be blocked by owners
export interface ContentFlagUser extends AdminUserRef {
  blocked: boolean,
  blocked_reason: string | null,
  flags: number,
}

export interface ContentFlagsPage {
  count: number,
  items: Array<ContentFlag>,
}

export interface ContentFlagPatch {
  status?: ContentFlagStatus,
  notes?: string | null,
  // also set `status` on the other pending flags `ContentFlagMatches` counted
  match_sha256?: boolean,
  match_pdq?: boolean,
}

export interface ContentFlagMatchCounts {
  pending: number,
  confirmed: number,
  dismissed: number,
  reported: number,
}

// `GET /admin/content-flags/<id>/matches`: the other flags of the same media, per status. `sha256` is the exact same
// file, `pdq` is visually similar media (within `pdq_distance` bits) that isn't a sha256 match too; null when the flag
// has no hash of that kind (text has no pdq)
export interface ContentFlagMatches {
  sha256: ContentFlagMatchCounts | null,
  pdq: ContentFlagMatchCounts | null,
  pdq_distance: number,
}

// `GET /jobs/<id>`, also what endpoints that start a job return (only the fields the dashboard reads). `status` is rq's
// ('queued', 'started', 'finished', 'failed', ...), a failed job has `result.error`
export interface JobResponse {
  id: string,
  status: string,
  result: {
    error: string | null,
    error_code: number | null,
    response: {
      file: {value: string | null, metadata: {mimetype: string}},
      // content flag media jobs only: the flag's `frames_flagged` (at most 8) as base64 jpegs, extracted like the
      // scanner did, with where each one is in the media (seconds, null if unknown). Empty for single frame media
      flagged_frames?: Array<{frame: number, mimetype: string, timestamp: number | null, value: string}>,
    } | null,
  },
}

// what users send with the bot's `/report` command
export const ReportTypes = {
  BUG: 0,
  USER: 1,
  SERVER: 2,
  MESSAGE: 3,
  TAG: 4,
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
  // message reports of a tag's output have the tag here (the tag the alias points to for an alias)
  tag_id: string | null,
  // the reported user (USER), guild (SERVER), whoever used the command for a bot response (MESSAGE) or tag (TAG); null for bugs
  // message reports have the reported message in channel_id/message_id instead of where the report was sent from
  target_id: string | null,
  type: number,
  // the reporter
  user: User,
}

export interface ReportsPage {
  count: number,
  items: Array<Report>,
}

// the caller's own reports, without the reporter (it's them) or the staff-only notes and reviewer
export type MeReport = Omit<Report, 'notes' | 'reviewed_by' | 'user'>;

export interface MeReportsPage {
  count: number,
  items: Array<MeReport>,
}

export interface ReportPatch {
  status?: ReportStatus,
  notes?: string | null,
}


// `/admin/voices`: every cloned voice, with the platform's own id and the owner
export interface AdminVoice extends Voice {
  platform_id: string,
  user: AdminUserRef | null,
}

export interface AdminVoicesPage {
  count: number,
  items: Array<AdminVoice>,
}


// where an entitlement came from: a Discord subscription, or premium given from the admin dashboard
export const EntitlementProviders = {
  DISCORD: 'discord',
  MANUAL: 'manual',
} as const;
export type EntitlementProvider = (typeof EntitlementProviders)[keyof typeof EntitlementProviders];

// `/users/@me/entitlements`: the caller's premium subscriptions and grants, newest first
export interface Entitlement {
  // counts right now: not deleted, consumed, expired or not started yet
  active: boolean,
  consumed: boolean,
  created_at: ApiTimestamp | null,
  // cancelled on Discord, or a manual grant that was replaced or removed
  deleted: boolean,
  ends_at: ApiTimestamp | null,
  // the staff member who gave a manual one
  granted_by: string | null,
  guild_id: string | null,
  id: string,
  // the `UserPremiumTypes` the sku gives, null for a sku NotSoBot doesn't sell
  premium_type: number | null,
  provider: string,
  sku_id: string,
  starts_at: ApiTimestamp | null,
  type: number,
  updated_at: ApiTimestamp | null,
}

export interface EntitlementsPage {
  count: number,
  items: Array<Entitlement>,
}

// `/admin/entitlements`: everyone's, with Discord's own id and the owner (null for guild-only ones)
export interface AdminEntitlement extends Entitlement {
  external_id: string | null,
  user: AdminUserRef | null,
}

export interface AdminEntitlementsPage {
  count: number,
  items: Array<AdminEntitlement>,
}
