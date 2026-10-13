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
| GET | `/users/@me/tags` | Query: `query?`, `server_id?`, `before?`, `after?`, `limit?` (1–100). Returns `{count, items: Tag[]}` where each item is `Tag.to_dict()` **with** `content`. Only tags owned by the caller. |
| GET | `/users/@me/tags/<tag_id>` | One owned tag, with `content`. |
| PATCH | `/users/@me/tags/<tag_id>` | Body (all optional): `name`, `content`, `nsfw`. Same validation/limits as the bot's tag edit (name length, content length, name uniqueness per `server_id`, locked tags can't be edited). Returns the tag. |
| DELETE | `/users/@me/tags/<tag_id>` | 204. |
| GET | `/users/@me/tags/<tag_id>/variables` | Same response shape as the existing `GET /tags/<tag_id>/variables`. |
| PUT | `/users/@me/tags/<tag_id>/variables/<storage_type>/<storage_id>` | Same body/shape as the existing bot endpoint; owner only. |
| DELETE | `/users/@me/tags/<tag_id>/variables/<storage_type>/<storage_id>` | Same as existing; owner only. |
| GET | `/users/@me/tags/<tag_id>/blobs` | Same response shape as the existing `GET /tags/<tag_id>/blobs`. |
| PUT | `/users/@me/tags/<tag_id>/blobs` | Same body/shape as the existing bot endpoint; owner only. |
| GET | `/users/@me/tags/<tag_id>/directory` | The tag's directory listing (`TagDirectory.to_dict()`), or 404 `UNKNOWN_TAG_DIRECTORY_ITEM` if it isn't published. |
| PUT | `/users/@me/tags/<tag_id>/directory` | Body `{title?, description?}` (≤128 / ≤2000). Publishes the tag, or edits the listing if it's already published. Publishing moves the tag to the owner's personal tags (`server_id = user_id`, same as the bot) and publishes `TAG_UPDATE`. Errors: `TAG_DIRECTORY_CANNOT_PUBLISH_ALIAS`, `TAG_DIRECTORY_NAME_TAKEN` (another personal tag has the name), `MAX_TAG_DIRECTORY`, `TAG_DIRECTORY_PENDING_VERIFICATION`. |
| POST | `/users/@me/tags/<tag_id>/add` | Body `{guild_id?, name?}`. Adds a tag listed on the tag directory (or one of the caller's own personal/DM tags) as an alias owned by the caller, same as the bot's `tag add`: to `guild_id` (caller must be in it, any member can) or, without it, to the caller's DMs with the bot (if the bot never saw that DM channel, the API opens it on Discord with the bot token, saves it to the user and publishes `USER_UPDATE`; nothing is sent to the user. `400 MISSING_ACCESS` only if Discord refuses). `name` defaults to the tag's name. An alias the caller already has with that name is repointed; any other tag with that name is `TAG_NAME_TAKEN`. Same tag limits as `PUT /tags`. Publishes `TAG_UPDATE`, returns the alias. |
| PATCH | `/users/@me/tags/<tag_id>/directory` | Body `{title?, description?}`. Edits a published listing and bumps `edited`; blocked with `TAG_DIRECTORY_PENDING_VERIFICATION` while under review. Images/assets aren't editable from the dashboard yet. |

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

## Admin (NotSoBot owners only)

Every route here needs a user token whose user has the `OWNER` flag (`flags & 1`); anyone else gets `403`.
The dashboard only shows the **Admin** nav group (`/dashboard/admin/tags`, `/dashboard/admin/users`,
`/dashboard/admin/flags`, `/dashboard/admin/reports`) to owners, and `<RequireOwner/>` sends everyone else back to `/dashboard`.
Lists page by `limit` (default 25) and `offset` and return `{count, items}`. Bigint ids are strings; timestamps
are ISO strings (the site also accepts epoch numbers).

| Method | Path | Notes |
|---|---|---|
| GET | `/admin/tags/directory` | Query: `limit`, `offset`, `verified` (`0` unverified, `1` pending, `2` verified; omitted = all), `query` (title/name/content; a bare id also matches the tag id or owner id, `id:<tag id>` / `user:<owner id>` match only that), `nsfw` (bool). Items are the public directory shape `{id, title, description, verified, assets, server_count, tag, ...}` except `tag` is the full `Tag.to_dict()` **with `content`** (`name`, `nsfw`, `uses`, `created`, `user_id`, `server_id`, `locked`, ...), plus `user: {id, username, discriminator, avatar} \| null` (the tag owner). |
| PATCH | `/admin/tags/directory/<tag_id>` | Body `{verified: 0 \| 1 \| 2}`. Returns the same item shape. |
| GET | `/admin/users` | Query: `limit`, `offset`, `query` (username or id), `sort_by` (`flags` (default) \| `newest` \| `username`), `only_flagged` (bool). Items: `{user: {id, username, discriminator, avatar, flags, blocked, blocked_reason, premium_type}, content_flags: {total, flagged, pending, confirmed, dismissed, reported, last_flagged_at}}`. |
| GET | `/admin/content-flags` | Query: `limit`, `offset`, `user_id`, `status`, `category`, `needs_human_review` (bool). Items: the `ContentFlag` row (`id, user_id, guild_id, channel_id, message_id, command_id, tag_id, query, source_url, sha256, pdq, mimetype, size, category, flagged[], flagged_for_review[], needs_human_review, frames, frames_flagged[], model, scores_worst{}, action, status, created, reviewed_at, reviewed_by, notes`) plus `user: {id, username, discriminator, avatar} \| null`. |
| PATCH | `/admin/content-flags/<flag_id>` | Body `{status?, notes?}`. Returns the same item shape. |
| GET | `/admin/reports` | Query: `limit` (default 50, max 100; the page sends 25), `offset`, `type`, `status`, `user_id` (reporter), `target_id`. Newest first. Items: the `Report` row (`id, type, target_id, content, guild_id, channel_id, message_id, status, created, reviewed_at, reviewed_by, notes`) plus `user`, the reporter's full user dict (`{id, username, discriminator, avatar, bot, flags, blocked, blocked_on, blocked_reason}`). |
| PATCH | `/admin/reports/<report_id>` | Body `{status?, notes?}` (`notes` max 2000, empty/`null` clears it). Any patch sets `reviewed_at`/`reviewed_by` to now/the caller. Returns the same item shape; unknown id is `404` code `10017`. |

Enums: content flag `status` `0` pending, `1` confirmed, `2` dismissed, `3` reported. `category`: `unsafe`,
`unsafe_child_safety`, `unsafe_nudity`, `review_child_safety`, `review`. `action`: `blocked`, `replaced`,
`logged`, `not_hosted`. Report `type` `0` bug, `1` user, `2` server (`target_id` is the reported user/guild id, `null`
for bugs); report `status` `0` open, `1` resolved, `2` dismissed. Reports come from the bot's `report bug|user|server`
command (prefixed and slash); `guild_id` is `null` when it was used in DMs.

The content flags page is **text only**: `source_url` is never loaded, embedded or linked (shown as plain
selectable text at most), and no media from a flag is previewed in any form.

## Not built yet (frontend only)

| Method | Path | Notes |
|---|---|---|
| POST | `/users/@me/data/export` | Planned. Starts an export of everything stored about the caller. |
| DELETE | `/users/@me` | Planned. Deletes the caller's data. |

The dashboard shows both actions with full confirmation UI and treats `404`/`405` as "not available yet".
