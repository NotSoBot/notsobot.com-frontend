# Dashboard API contract

The dashboard (notsobot.com-frontend) and the new user-facing endpoints (notsobot.api) are built
against this document. Paths are relative to the API root (the site calls them under `/api`).

## Rules for every endpoint here

- **Auth:** a *user* token (the one from the Discord OAuth login, sent as the raw `Authorization` header).
  Application tokens are not needed and these routes act only on the caller's own data.
- **Errors:** the existing `{code, message, status}` body. `401` = bad/expired session, `403` = missing
  permission, `404` = not found / not yours, `400` = validation.
- **Shapes:** reuse the existing `to_dict()` output of the models wherever one exists, so the bot and the
  dashboard see the same objects. New fields are listed explicitly below.
- **Ownership:** a tag is editable only by its owner (`tag.user_id == caller`). Server settings are
  editable only with the Discord permission the matching bot command requires (see the table below).

## User settings

| Method | Path | Notes |
|---|---|---|
| GET | `/users/@me/settings` | `UserSettings.to_dict()` (defaults if none saved). |
| PATCH | `/users/@me/settings` | Same fields/validation as the existing `PatchUserSettings`, applied to the caller only. Includes `ml_llm_personality` (the AI prompt, max 1024), `ml_llm_model`, `ml_diffusion_model`, `locale`, `timezone`, `units`, `download_quality`, `response_display`, `application_command_response_type`, `fallbacks_media_image`, `file_upload_threshold`, `file_upload_type`, `file_upload_name`, `file_upload_vanity`, `tts_voice`. Premium-only values keep their existing premium checks. Returns the updated settings. |

Also: fix the existing `PATCH /users/<user_id>/settings` so a *user* token can only patch its own id.

## Tags

| Method | Path | Notes |
|---|---|---|
| GET | `/users/@me/tags` | Query: `query?`, `server_id?`, `sort_by?` (`newest` default, `oldest`, `uses`, `name`, `last_used`), `offset?`, `before?`, `after?`, `limit?` (1–100). `before`/`after` only work with `newest` (`400` otherwise), `offset` pages any sort. Returns `{count, items: Tag[]}` where each item is `Tag.to_dict()` **with** `content`. Only tags owned by the caller. |
| GET | `/users/@me/tags/<tag_id>` | One owned tag, with `content`. |
| PATCH | `/users/@me/tags/<tag_id>` | Body (all optional): `name`, `content`, `nsfw`. Same validation/limits as the bot's tag edit (name length, content length, name uniqueness per `server_id`, locked tags can't be edited). Returns the tag. |
| DELETE | `/users/@me/tags/<tag_id>` | 204. |
| GET | `/users/@me/tags/<tag_id>/variables` | Same response shape as the existing `GET /tags/<tag_id>/variables`. |
| PUT | `/users/@me/tags/<tag_id>/variables/<storage_type>/<storage_id>` | Same body/shape as the existing bot endpoint; owner only. |
| DELETE | `/users/@me/tags/<tag_id>/variables/<storage_type>/<storage_id>` | Same as existing; owner only. |
| GET | `/users/@me/tags/<tag_id>/blobs` | Same response shape as the existing `GET /tags/<tag_id>/blobs`. |
| PUT | `/users/@me/tags/<tag_id>/blobs` | Same body/shape as the existing bot endpoint; owner only. |
| GET | `/users/@me/tags/<tag_id>/servers` | Owner only. The servers that have an alias of the tag: `{server_count, other_count, servers: [{id, name, icon, names, added}], truncated}`. `server_count` matches the directory's; `other_count` is the part with no guild row (DMs, personal tags, unknown servers), only counted. `names` is what the alias is called there, `added` when the server first added it. Newest first, capped at 1000 aliases (`truncated`). |
| GET | `/users/@me/tags/<tag_id>/directory` | The tag's directory listing (`TagDirectory.to_dict()`), or 404 `UNKNOWN_TAG_DIRECTORY_ITEM` if it isn't published. |
| PUT | `/users/@me/tags/<tag_id>/directory` | Body `{title?, description?, content_public?}` (≤128 / ≤2000 / bool, defaults to `false`). Publishes the tag, or edits the listing if it's already published. Publishing moves the tag to the owner's personal tags (`server_id = user_id`, same as the bot) and publishes `TAG_UPDATE`. Errors: `TAG_DIRECTORY_CANNOT_PUBLISH_ALIAS`, `TAG_DIRECTORY_NAME_TAKEN` (another personal tag has the name), `MAX_TAG_DIRECTORY`, `TAG_DIRECTORY_PENDING_VERIFICATION`. |
| POST | `/users/@me/tags/<tag_id>/add` | Body `{guild_id?, name?}`. Adds a tag listed on the tag directory (or one of the caller's own personal/DM tags) as an alias owned by the caller, same as the bot's `tag add`: to `guild_id` (caller must be in it, any member can) or, without it, to the caller's DMs with the bot (if the bot never saw that DM channel, the API opens it on Discord with the bot token, saves it to the user and publishes `USER_UPDATE`; nothing is sent to the user. `400 MISSING_ACCESS` only if Discord refuses). `name` defaults to the tag's name. An alias the caller already has with that name is repointed; any other tag with that name is `TAG_NAME_TAKEN`. Same tag limits as `PUT /tags`. Publishes `TAG_UPDATE`, returns the alias. |
| PATCH | `/users/@me/tags/<tag_id>/directory` | Body `{title?, description?, content_public?}`. Edits a published listing and bumps `edited`; changing the title/description is blocked with `TAG_DIRECTORY_PENDING_VERIFICATION` while under review (`content_public` alone isn't). Listings include `content_public`, and when it's `true` the public `tag.content` is filled in instead of `''`. Images/assets aren't editable from the dashboard yet. |

## Voices

Voices cloned with the bot's `voice clone` command. Only the name can be changed from the dashboard for now; cloning,
adding audio and deleting stay with the bot's `voice` commands (they talk to ElevenLabs, renaming doesn't).

| Method | Path | Notes |
|---|---|---|
| GET | `/users/@me/reminders` | `{count, items: Reminder[]}`, soonest first (capped at `MAX_REMINDER_AMOUNT`, 300). Reminders are still made (and their time changed) with the bot's `reminder` commands. `Reminder` is `{id, content, guild_id, channel_id, message_id, position, is_all_day, timestamp_start, timestamp_end}` (ISO strings; `guild_id` is `null` for DM reminders, `message_id` is the message that created it). The owner and their DM channel are left out. Reminder text is run through the content scanner whenever it's created or changed (bot or dashboard): guideline hits are blocked with `400` code `40030` (`TEXT_BLOCKED_GUIDELINES`) and flagged as `blocked`, human-review ones go through and are flagged as `logged`. If the scanner is down nothing is saved: `SAFETY_SCAN_FAILED` (`60004`). |
| PATCH | `/users/@me/reminders/<reminder_id>` | Body `{content?, move_to_dms?}`, at least one. `content` max 512 (empty is allowed, the reminder just pings), scanned like above. `move_to_dms: true` clears `guild_id`/`channel_id`/`message_id` so it's sent in the owner's DMs (same as the bot's `reminder delete server`); there's no moving it back. Only the caller's own reminders; anything else is `404` code `10007` (`UNKNOWN_REMINDER`). Returns the reminder, and the bot reschedules it. |
| DELETE | `/users/@me/reminders/<reminder_id>` | `204`. Same ownership rule and `404` as the `PATCH`. |
| GET | `/users/@me/entitlements` | `{count, items: Entitlement[]}`, the caller's premium entitlements, newest first (capped at 100), read only. `Entitlement` is `{id, provider, sku_id, premium_type, type, active, deleted, consumed, starts_at, ends_at, created_at, updated_at, guild_id, granted_by}`: `provider` is `discord` (a Discord subscription) or `manual` (premium an owner gave from `/admin/users`; replaced or removed grants are kept with `deleted: true`). `premium_type` is the `UserPremiumTypes` the sku gives (`null` for an unknown sku), `active` is `Entitlement.is_valid` (not deleted or consumed, and inside `starts_at`/`ends_at`). `granted_by` is the staff id for manual ones, `null` otherwise. Discord's raw payload is left out. `PREMIUM_FREE` has no entitlement. |
| GET | `/users/@me/voices` | `{count, items: Voice[]}`, newest first (capped at 100; non-owners can only have `MAX_VOICE_CLONE_AMOUNT`). `Voice` is `{id, name, platform_type, created}`: `platform_type` is `VoiceCloneTypes` (`0` ElevenLabs), `created` is an ISO string from the snowflake. The ElevenLabs id is left out. |
| PATCH | `/users/@me/voices/<voice_id>` | Body `{name}` (1–128 chars, trimmed, newlines become spaces). Only the caller's own voices; anything else is `404` code `10003` (`UNKNOWN_VOICE`). Returns the voice. |

## Servers

Login requests the `guilds` OAuth scope in addition to `identify`. The API uses the caller's stored
Discord access token (refreshing it when expired) to read their guilds and permissions (one Discord request,
cached per user for 60s), then keeps only guilds the bot is in with a single query on the `bot_guilds` table.
No per-guild Discord requests are made.

`bot_guilds` is kept up to date by the bot (`notsobot.ts/src/listeners/botguilds.ts`) through two bot-only
endpoints:

| Method | Path | Notes |
|---|---|---|
| PUT | `/info/discord/guilds` | `{shard_count, shard_id, guild_ids}`: the shard's full guild list, sent when the shard connects and every 6 hours. Replaces that shard's rows and drops rows from an older shard count. |
| POST | `/info/discord/guilds/changes` | `{shard_count, added: [{guild_id, shard_id}], removed: [guild_id]}`: joins/leaves, batched every 5 seconds (last event per guild wins). |

| Method | Path | Notes |
|---|---|---|
| GET | `/users/@me/guilds` | `Array<{id, name, icon, owner, permissions, can_manage}>`. `permissions` is Discord's bitfield as a string; `can_manage` = has `MANAGE_GUILD` or `ADMINISTRATOR` or is owner. If the session lacks the `guilds` scope: `403` with code `DISCORD_OAUTH_SCOPE_MISMATCH` and `metadata.scopes`, so the site can ask the user to log in again. |
| GET | `/users/@me/guilds/<guild_id>` | `Guild.to_dict(everything=True)` (prefixes, allowlist, blocklist, commands allow/blocklists, loggers, settings) plus `permissions` (string), `owner` (boolean) and `editable: {prefixes, allowlist, blocklist, commands, loggers, settings}` booleans for the caller. Caller must be a member (from the Discord guild list). |
| PUT | `/users/@me/guilds/<guild_id>/prefixes` | Body `{prefix}`; same rules as the bot's `PUT /guilds/<id>/prefixes`. |
| POST | `/users/@me/guilds/<guild_id>/prefixes/delete` | Body `{prefix}`. |
| PUT / DELETE | `/users/@me/guilds/<guild_id>/allowlist/<id>/<type>` | Same as the bot endpoint. |
| PUT / DELETE | `/users/@me/guilds/<guild_id>/blocklist/<id>/<type>` | Same as the bot endpoint. |
| PUT / DELETE | `/users/@me/guilds/<guild_id>/commands/<command>/allowlist/<id>/<type>` | Same as the bot endpoint. |
| PUT / DELETE | `/users/@me/guilds/<guild_id>/commands/<command>/blocklist/<id>/<type>` | Same as the bot endpoint. |
| POST | `/users/@me/guilds/<guild_id>/loggers/delete` | Same body as the bot endpoint. Also deletes the logger's webhook on Discord unless another logger still uses it (best effort, failures are ignored). Loggers can only be added through the bot's `loggers` command. |
| PATCH | `/users/@me/guilds/<guild_id>` | Server settings the bot exposes through commands (e.g. locale, timezone, AI personality); same validation as the bot's `PATCH /guilds/<id>`. |
| GET | `/users/@me/guilds/<guild_id>/data/export` | **Owner only** (`403 MISSING_ACCESS` for everyone else, admins included). `{guild, tags, notes, timestamp, version}`: the server's settings, prefixes, allow/blocklists and loggers, plus every tag made in the server. Left out, and said so in `notes`: logger webhook URLs (sensitive data, anyone with one can post in the channel), tag variables, tag blobs, and the content of directory tags, including the tag an alias points to when it lives outside the server (aliases can target directory tags and the caller's DM tags). |
| POST | `/users/@me/guilds/<guild_id>/data/delete` | **Owner only.** Deletes the server's tags (their variables, blobs, uses and assets cascade), tag variables/blobs other tags keep under this server's guild storage, tag uses, allow/blocklists, command allow/blocklists, loggers (and their webhooks on Discord, best effort), prefixes, and resets the server settings. Keeps the guild row with staff-set fields (`blocked`, `blocked_reason`, `features`), entitlements, content flags and members' own data (reminders, command history, AI responses). Publishes `GUILD_SETTINGS_UPDATE` and `TAG_DELETE_BULK` for custom commands. Returns `{tags_deleted}`. |

Required permission per area (matches the bot commands):

| Area | Discord permission |
|---|---|
| Prefixes | `MANAGE_GUILD` |
| Allowlist / blocklist (channels, roles, users) | `ADMINISTRATOR` |
| Command allowlist / blocklist | `MANAGE_GUILD` |
| Loggers | same as the `loggers` commands |
| Server settings (locale, timezone, AI personality) | `MANAGE_GUILD` |
| Server data export / delete | server owner only |

Owners always pass. Edits from the dashboard should publish the same redis update events the bot's
endpoints publish, so the running bot picks them up immediately.

Display data the API doesn't store (channel/role names for allowlist entries, channel lists for loggers)
is out of scope for v1; the dashboard shows IDs with mentions-style formatting and accepts IDs as input.

## Admin (NotSoBot staff: owners and moderators)

Every route here needs a user token whose user has the `OWNER` (`flags & 1`) or `MODERATOR` (`flags & 2`) flag; anyone
else gets `403`. The dashboard only shows the **Admin** nav group (`/dashboard/admin/all-tags`, `/dashboard/admin/tags`, `/dashboard/admin/users`,
`/dashboard/admin/flags`, `/dashboard/admin/entitlements`, `/dashboard/admin/reports`, `/dashboard/admin/voices`) to staff, and `<RequireStaff/>` sends everyone else back to `/dashboard`.
Moderators can do everything in the panel except edit user profiles (`flags`/`premium_type`), and can't block other moderators.
Lists page by `limit` (default 25) and `offset` and return `{count, items}`. Bigint ids are strings; timestamps
are ISO strings (the site also accepts epoch numbers).

| Method | Path | Notes |
|---|---|---|
| GET | `/admin/tags` | Every tag (personal, server and aliases), not just the directory. Query: `limit`, `offset`, `query` (tag name; a bare id also matches the tag id, owner id or server id, `id:<tag id>` / `user:<owner id>` match only that), `search_content` (bool, also match `content`; off by default since it scans every tag), `user_id`, `server_id`, `nsfw` (bool), `sort_by` (`newest` (default) \| `oldest` \| `uses` \| `name` \| `last_used`). Items: `{tag, user, directory}`, `tag` is the full `Tag.to_dict()` with `content` and `user_id` (aliases carry their source in `reference_tag`), `user: {id, username, discriminator, avatar, channel_id} \| null` (the owner; `channel_id` is their DM channel with the bot, so a tag in it is a DM tag and any other non-guild channel is a group DM), `directory: {title, verified} \| null` (its listing, if published). |
| GET | `/admin/tags/directory` | Query: `limit`, `offset`, `verified` (`0` unverified, `1` pending, `2` verified; omitted = all), `query` (title/name/content; a bare id also matches the tag id or owner id, `id:<tag id>` / `user:<owner id>` match only that), `nsfw` (bool). Items are the public directory shape `{id, title, description, verified, assets, server_count, tag, ...}` except `tag` is the full `Tag.to_dict()` **with `content`** (`name`, `nsfw`, `uses`, `created`, `user_id`, `server_id`, `locked`, ...), plus `user: {id, username, discriminator, avatar} \| null` (the tag owner). |
| PATCH | `/admin/tags/directory/<tag_id>` | Body `{verified?: 0 \| 1 \| 2, content?: string, title?: string, description?: string}`, all optional. `content` (1–2000 chars) rewrites the tag even though it's locked, doesn't touch `edited`, and publishes `TAG_UPDATE`. `title` (max 128) and `description` (max 2000) rewrite the listing, even while it's pending verification, and bump the listing's `edited`. Returns the same item shape. |
| POST | `/admin/tags/directory/<tag_id>/assets` | Multipart `file`, or `{url}` (downloaded through the usual media fetch, discord links are refreshed). Stores it at `assets/tags/<tag_id>/<asset_id>.<ext>` and returns the asset `{id, filename, metadata, position, urls: {cdn}}`; `cdn` is `https://cdn.nsb.gg/assets/tags/...`. Max 25 per tag (`30017`). The listing's `tag.assets` has them. |
| DELETE | `/admin/tags/directory/<tag_id>/assets/<asset_id>` | Deletes the asset and its file (`10019` if unknown). The content isn't touched. `204`. |
| GET | `/admin/tags/<tag_id>/servers` | Same as `GET /users/@me/tags/<tag_id>/servers`, for any tag. |
| GET | `/admin/users` | Query: `limit`, `offset`, `query` (username or id), `sort_by` (`flags` (default) \| `last_flagged` \| `newest` \| `username`), `only_flagged` (bool), `flagged_within` (hours, 1–8760: only users whose last content flag is that recent). Items: `{user: {id, username, discriminator, avatar, flags, blocked, blocked_reason, premium_type}, content_flags: {total, flagged, pending, confirmed, dismissed, reported, last_flagged_at}}`. |
| PATCH | `/admin/users/<user_id>` | Body (all optional): `blocked`, `blocked_reason` (max 2000, only kept while blocked), and **owner only** `flags` (the full `UserFlags` bitfield; the `OWNER` bit can't be changed here and is kept as is) and `premium_type` (`0`–`4`, `UserPremiumTypes`). Moderators sending `flags`/`premium_type` get `403`. Owners can't be blocked (`400`), moderators can't block other staff (`403`). Publishes `USER_UPDATE` when something changed. Returns the `user` shape from `GET /admin/users`. |
| DELETE | `/admin/users/<user_id>/tags` | Deletes every tag the user owns, everywhere (personal, server, DM and directory). Their listings, variables, blobs, uses and assets go with them, and so do other people's aliases of them. Owners' tags can't be deleted (`400`), and moderators can't delete another moderator's (`403`). Publishes `TAG_DELETE_BULK` for custom commands, grouped per server (or per user for DM ones). Returns `{count}`, the user's own tags deleted. |
| GET | `/admin/content-flags` | Query: `limit`, `offset`, `user_id`, `guild_id`, `channel_id`, `tag_id`, `command_id` (the exact command id or anything under it, case-insensitive: `tag` matches `tag` and `tag.show`; spaces count as dots), `status`, `category`, `needs_human_review` (bool), `type` (`media` \| `text`; text flags have mimetype `text/plain` and the text in `query`), `search` + `search_in` (`content` matches `query`, `url` matches `source_url`, both case-insensitive substring; `hash` matches `sha256`/`pdq`, exact for a full 64-char hash, prefix otherwise). Items: the `ContentFlag` row (`id, user_id, guild_id, channel_id, message_id, command_id, tag_id, query, source_url, sha256, pdq, mimetype, size, category, flagged[], flagged_for_review[], needs_human_review, frames, frames_flagged[], model, scores_worst{}, action, status, created, reviewed_at, reviewed_by, notes`) plus `user: {id, username, discriminator, avatar} \| null`. |
| PATCH | `/admin/content-flags/<flag_id>` | Body `{status?, notes?}`. Returns the same item shape. |
| GET | `/admin/entitlements` | Every entitlement, newest first, read only. Query: `limit`, `offset`, `user_id`, `provider` (`discord` \| `manual`), `premium_type` (`2`–`4`, matches the sku), `active` (bool, same rule as `active` on the item). Items: the `Entitlement` shape from `/users/@me/entitlements` plus `external_id` (Discord's entitlement id, `null` for manual) and `user: {id, username, discriminator, avatar} \| null` (`null` for a guild-only entitlement). |
| GET | `/admin/reports` | Query: `limit` (default 50, max 100; the page sends 25), `offset`, `type`, `status`, `user_id` (reporter), `target_id`. Newest first. Items: the `Report` row (`id, type, target_id, content, guild_id, channel_id, message_id, status, created, reviewed_at, reviewed_by, notes`) plus `user`, the reporter's full user dict (`{id, username, discriminator, avatar, bot, flags, blocked, blocked_on, blocked_reason}`). |
| PATCH | `/admin/reports/<report_id>` | Body `{status?, notes?}` (`notes` max 2000, empty/`null` clears it). Any patch sets `reviewed_at`/`reviewed_by` to now/the caller. Returns the same item shape; unknown id is `404` code `10017`. |
| GET | `/admin/voices` | Every cloned voice, newest first. Query: `limit`, `offset`, `query` (voice name or owner username, case-insensitive; a bare id also matches the voice id or owner id), `user_id`. Items: the `Voice` shape from `/users/@me/voices` plus `platform_id` (the ElevenLabs voice id) and `user: {id, username, discriminator, avatar} \| null` (the owner). |
| PATCH | `/admin/voices/<voice_id>` | Body `{name}`, same rules as `PATCH /users/@me/voices/<voice_id>`, for any voice. Returns the same item shape; unknown id is `404` code `10003`. |

Enums: content flag `status` `0` pending, `1` confirmed, `2` dismissed, `3` reported. `category`: `unsafe`,
`unsafe_child_safety`, `unsafe_nudity`, `review_child_safety`, `review`. `action`: `blocked`, `replaced`,
`logged`, `not_hosted`. Report `type` `0` bug, `1` user, `2` server (`target_id` is the reported user/guild id, `null`
for bugs); report `status` `0` open, `1` resolved, `2` dismissed. Reports come from the bot's `/report`
command; `guild_id` is `null` when it was used in DMs.

The content flags page is **text only**: `source_url` is never loaded, embedded or linked (shown as plain
selectable text at most), and no media from a flag is previewed in any form.

## Not built yet (frontend only)

| Method | Path | Notes |
|---|---|---|
| POST | `/users/@me/data/export` | Planned. Starts an export of everything stored about the caller. |
| DELETE | `/users/@me` | Planned. Deletes the caller's data. |

The dashboard shows both actions with full confirmation UI and treats `404`/`405` as "not available yet".
