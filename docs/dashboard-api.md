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
| GET | `/users/@me/guilds/<guild_id>` | `Guild.to_dict(everything=True)` (prefixes, allowlist, blocklist, commands allow/blocklists, loggers, settings) plus `permissions` (string) and `editable: {prefixes, allowlist, blocklist, commands, loggers, settings}` booleans for the caller. Caller must be a member (from the Discord guild list). |
| PUT | `/users/@me/guilds/<guild_id>/prefixes` | Body `{prefix}`; same rules as the bot's `PUT /guilds/<id>/prefixes`. |
| POST | `/users/@me/guilds/<guild_id>/prefixes/delete` | Body `{prefix}`. |
| PUT / DELETE | `/users/@me/guilds/<guild_id>/allowlist/<id>/<type>` | Same as the bot endpoint. |
| PUT / DELETE | `/users/@me/guilds/<guild_id>/blocklist/<id>/<type>` | Same as the bot endpoint. |
| PUT / DELETE | `/users/@me/guilds/<guild_id>/commands/<command>/allowlist/<id>/<type>` | Same as the bot endpoint. |
| PUT / DELETE | `/users/@me/guilds/<guild_id>/commands/<command>/blocklist/<id>/<type>` | Same as the bot endpoint. |
| POST | `/users/@me/guilds/<guild_id>/loggers/delete` | Same body as the bot endpoint. Also deletes the logger's webhook on Discord unless another logger still uses it (best effort, failures are ignored). Loggers can only be added through the bot's `loggers` command. |
| PATCH | `/users/@me/guilds/<guild_id>` | Server settings the bot exposes through commands (e.g. locale, timezone, AI personality); same validation as the bot's `PATCH /guilds/<id>`. |

Required permission per area (matches the bot commands):

| Area | Discord permission |
|---|---|
| Prefixes | `MANAGE_GUILD` |
| Allowlist / blocklist (channels, roles, users) | `ADMINISTRATOR` |
| Command allowlist / blocklist | `MANAGE_GUILD` |
| Loggers | same as the `loggers` commands |
| Server settings (locale, timezone, AI personality) | `MANAGE_GUILD` |

Owners always pass. Edits from the dashboard should publish the same redis update events the bot's
endpoints publish, so the running bot picks them up immediately.

Display data the API doesn't store (channel/role names for allowlist entries, channel lists for loggers)
is out of scope for v1; the dashboard shows IDs with mentions-style formatting and accepts IDs as input.

## Not built yet (frontend only)

| Method | Path | Notes |
|---|---|---|
| POST | `/users/@me/data/export` | Planned. Starts an export of everything stored about the caller. |
| DELETE | `/users/@me` | Planned. Deletes the caller's data. |

The dashboard shows both actions with full confirmation UI and treats `404`/`405` as "not available yet".
