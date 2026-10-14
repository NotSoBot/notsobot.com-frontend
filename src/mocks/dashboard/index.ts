// Dev-only fake backend for the dashboard routes in docs/dashboard-api.md, used until notsobot.api
// ships them. Loaded from main.tsx only when `import.meta.env.DEV && VITE_DASHBOARD_MOCKS === 'true'`,
// so none of this ends up in production bundles.
//
// It wraps `window.fetch`: requests to the routes below get an in-memory answer, everything else
// (commands, status, ...) goes to the real API as usual. Writes persist until the page reloads.
//
// In the console: `__dashboardMocks.guildsError('scope' | 'grant' | 'ratelimit' | 'refreshing' | null)` makes
// `/users/@me/guilds*` fail like the real API does (missing `guilds` scope, revoked Discord grant, Discord 429,
// token refresh in progress); `__dashboardMocks.latency(ms)` changes the fake delay; `__dashboardMocks.owner(false)`
// (then reload) drops the owner flag so the admin section disappears and `/admin/*` answers 403.
// A logger webhook URL whose token contains "invalid" is rejected like a webhook from another channel.

import { tokenStorage } from '@/auth/tokenStorage';
import { config } from '@/config';
import { ApiErrorCodes, TagDirectoryVerificationStates, type AdminTagDirectoryItem, type ContentFlag, type Tag, type TagDirectoryItem, type TagStorageType } from '@/lib/api/types';
import { toDate } from '@/lib/utils';

import {
  adminUserEntries,
  createAdminDirectory,
  createAdminUsers,
  createBlobs,
  createContentFlags,
  createReminders,
  createReports,
  createGuilds,
  createSettings,
  createTags,
  createVoices,
  createVariables,
  emptyBlobs,
  emptyVariables,
  guildEditable,
  MOCK_TOKEN,
  mockUser,
} from './fixtures';


const adminUsers = createAdminUsers();

const state = {
  settings: createSettings(),
  adminUsers,
  adminDirectory: createAdminDirectory(adminUsers),
  contentFlags: createContentFlags(adminUsers),
  reminders: createReminders(),
  reports: createReports(adminUsers),
  voices: createVoices(adminUsers),
  // the mock user is a NotSoBot owner unless turned off (kept across reloads like guildsError)
  owner: sessionStorage.getItem('dashboardMocks:notOwner') !== '1',
  tags: createTags(),
  variables: createVariables(),
  blobs: createBlobs(),
  guilds: createGuilds(),
  directory: new Map<string, TagDirectoryItem>(),
  // kept in sessionStorage so it survives the reload needed to see it
  guildsError: (sessionStorage.getItem('dashboardMocks:guildsError') || null) as GuildsError,
  latency: 350,
};


type GuildsError = 'scope' | 'grant' | 'ratelimit' | 'refreshing' | null;


// errors carry their extra fields flat in the body, like notsobot.api's `ApiError(metadata=...)`
class MockError extends Error {
  constructor(readonly status: number, readonly code: number, message: string, readonly metadata?: Record<string, unknown>) {
    super(message);
  }
}


function json(status: number, body?: unknown): Response {
  if (status === 204 || body === undefined) {
    return new Response(null, {status});
  }
  return new Response(JSON.stringify(body), {status, headers: {'content-type': 'application/json'}});
}


type Handler = (match: RegExpMatchArray, request: {method: string, query: URLSearchParams, body: Record<string, unknown>}) => unknown;

interface Route {
  method: string,
  pattern: RegExp,
  handler: Handler,
}

const routes: Array<Route> = [];
function route(method: string, pattern: string, handler: Handler) {
  routes.push({method, pattern: new RegExp(`^${pattern}$`), handler});
}


function findTag(tagId: string): Tag {
  const tag = state.tags.find((item) => item.id === tagId);
  if (!tag) {
    throw new MockError(404, ApiErrorCodes.UNKNOWN_TAG, 'Unknown Tag');
  }
  return tag;
}

function findGuild(guildId: string) {
  const entry = state.guilds.find((item) => item.summary.id === guildId);
  if (!entry) {
    throw new MockError(404, ApiErrorCodes.UNKNOWN_SERVER, 'Unknown Server');
  }
  return entry;
}

function requireEditable(guildId: string, area: keyof ReturnType<typeof guildEditable>) {
  const entry = findGuild(guildId);
  if (!guildEditable(entry.summary)[area]) {
    throw new MockError(403, ApiErrorCodes.MISSING_ACCESS, 'Missing Access');
  }
  return entry;
}

function scopeIds(query: URLSearchParams | Record<string, unknown>): Record<TagStorageType, string | null> {
  const get = (key: string) => {
    const value = (query instanceof URLSearchParams) ? query.get(key) : query[key];
    return (value) ? String(value) : null;
  };
  const guildId = get('guild_id') || get('channel_id');
  return {0: get('user_id'), 1: get('channel_id'), 2: guildId, 3: '0'};
}


/* user */

route('GET', '/users/@me', () => ({...mockUser, flags: (state.owner) ? (mockUser.flags | 1) : (mockUser.flags & ~1)}));
route('GET', '/auth/logout', () => undefined);
route('GET', '/users/@me/settings', () => state.settings);
route('PATCH', '/users/@me/settings', (_match, { body }) => {
  const personality = body.ml_llm_personality;
  if (typeof personality === 'string' && 1024 < personality.length) {
    throw new MockError(400, 50001, 'Invalid Form Body', {errors: {ml_llm_personality: 'Too long'}});
  }
  if (body.file_upload_vanity === 'error') {
    throw new MockError(400, 50030, 'Invalid Vanity');
  }
  const { file_upload_name: _readOnly, opted_out_content: _alsoReadOnly, ...writable } = body;
  state.settings = {...state.settings, ...writable};
  return state.settings;
});

// planned endpoints, not built yet
route('POST', '/users/@me/data/export', () => {
  throw new MockError(404, 0, '404: Not Found');
});
route('DELETE', '/users/@me', () => {
  throw new MockError(405, 0, '405: Method Not Allowed');
});


/* tags */

route('GET', '/users/@me/tags', (_match, { query }) => {
  const needle = (query.get('query') || '').toLowerCase();
  const before = query.get('before');
  const limit = Math.min(100, Math.max(1, Number(query.get('limit')) || 100));
  const matching = state.tags
    .filter((tag) => !needle || tag.name.includes(needle) || tag.content.toLowerCase().includes(needle))
    .sort((a, b) => (BigInt(b.id) > BigInt(a.id)) ? 1 : -1);
  const items = matching.filter((tag) => !before || BigInt(tag.id) < BigInt(before)).slice(0, limit);
  return {count: matching.length, items};
});

route('GET', '/users/@me/tags/(\\d+)', ([ , tagId ]) => findTag(tagId));

route('PATCH', '/users/@me/tags/(\\d+)', ([ , tagId ], { body }) => {
  const tag = findTag(tagId);
  if (tag.locked) {
    throw new MockError(400, ApiErrorCodes.TAG_LOCKED, 'Tag cannot be updated currently');
  }
  if (typeof body.name === 'string') {
    const name = body.name.toLowerCase().replace(/[\r\n]/g, '');
    if (!name || 64 < name.length) {
      throw new MockError(400, 50001, 'Tag name must be between 1 and 64 characters');
    }
    if (state.tags.some((other) => other.id !== tag.id && other.name === name && other.server_id === tag.server_id)) {
      throw new MockError(400, ApiErrorCodes.TAG_NAME_TAKEN, 'Tag name is already taken here');
    }
    tag.name = name;
  }
  if (typeof body.content === 'string') {
    if (2000 < body.content.length) {
      throw new MockError(400, 50001, 'Tag content must be 2000 characters or fewer');
    }
    if (body.content !== tag.content) {
      tag.content = body.content;
      tag.edited = new Date().toISOString();
    }
  }
  if (typeof body.nsfw === 'boolean') {
    tag.nsfw = body.nsfw;
  }
  return tag;
});

// ---- directory listing (mirrors utilities/tools/tags.py publish/edit rules) ----

type DirectoryFields = {title?: string, description?: string, content_public?: boolean};

function directoryItem(tag: Tag, fields: DirectoryFields, verified: number = TagDirectoryVerificationStates.NOT_VERIFIED): TagDirectoryItem {
  const contentPublic = !!fields.content_public;
  return {
    assets: [],
    content_public: contentPublic,
    created: new Date().toISOString(),
    description: fields.description ?? '',
    edited: null,
    id: tag.id,
    server_count: 0,
    tag: {...tag, content: (contentPublic) ? tag.content : '', guild_id: null},
    title: fields.title ?? '',
    verified,
  };
}

// a couple of the personal tags start out listed, one of them under review
state.tags.filter((tag) => tag.server_id === mockUser.id).slice(0, 2).forEach((tag, i) => {
  state.directory.set(tag.id, directoryItem(tag, {
    title: (i === 0) ? 'Says hello back' : 'Pong, but slower',
    description: (i === 0) ? 'Replies with a friendly hello. Pass text to add it after the greeting.' : '',
  }, (i === 0) ? TagDirectoryVerificationStates.NOT_VERIFIED : TagDirectoryVerificationStates.PENDING_VERIFICATION));
});

function directoryFields(body: Record<string, unknown>) {
  const fields: DirectoryFields = {};
  if (typeof body.content_public === 'boolean') {
    fields.content_public = body.content_public;
  }
  if (typeof body.title === 'string') {
    if (128 < body.title.length) {
      throw new MockError(400, 50001, 'Title must be 128 characters or fewer');
    }
    fields.title = body.title;
  }
  if (typeof body.description === 'string') {
    if (2000 < body.description.length) {
      throw new MockError(400, 50001, 'Description must be 2000 characters or fewer');
    }
    fields.description = body.description;
  }
  return fields;
}

function editDirectory(item: TagDirectoryItem, fields: DirectoryFields) {
  if ((fields.title !== undefined || fields.description !== undefined) && item.verified === TagDirectoryVerificationStates.PENDING_VERIFICATION) {
    throw new MockError(400, ApiErrorCodes.TAG_DIRECTORY_PENDING_VERIFICATION, 'Cannot edit a tag that is currently undergoing verification');
  }
  // showing/hiding the content is allowed while under review, the listing's text isn't
  if (fields.content_public !== undefined) {
    item.content_public = fields.content_public;
    const source = state.tags.find((tag) => tag.id === item.id);
    item.tag.content = (item.content_public && source) ? source.content : '';
  }
  const changed = (fields.title !== undefined && fields.title !== item.title) || (fields.description !== undefined && fields.description !== item.description);
  const { title, description } = fields;
  Object.assign(item, Object.fromEntries(Object.entries({title, description}).filter(([ , value ]) => value !== undefined)));
  if (changed) {
    item.edited = new Date().toISOString();
  }
  return item;
}

route('GET', '/users/@me/tags/(\\d+)/directory', ([ , tagId ]) => {
  findTag(tagId);
  const item = state.directory.get(tagId);
  if (!item) {
    throw new MockError(404, ApiErrorCodes.UNKNOWN_TAG_DIRECTORY_ITEM, 'Unknown Tag Directory Item');
  }
  return item;
});

route('PUT', '/users/@me/tags/(\\d+)/directory', ([ , tagId ], { body }) => {
  const tag = findTag(tagId);
  const fields = directoryFields(body);
  const existing = state.directory.get(tagId);
  if (existing) {
    return editDirectory(existing, fields);
  }
  if (tag.reference_tag) {
    throw new MockError(400, ApiErrorCodes.TAG_DIRECTORY_CANNOT_PUBLISH_ALIAS, 'Cannot publish a tag alias or a tag from the tag directory');
  }
  if (state.tags.some((other) => other.id !== tag.id && other.server_id === mockUser.id && other.name === tag.name)) {
    throw new MockError(400, ApiErrorCodes.TAG_DIRECTORY_NAME_TAKEN, 'Already have a tag in the directory with that name');
  }
  // publishing moves the tag into the owner's personal tags
  tag.server_id = mockUser.id;
  tag.guild_id = null;
  tag.is_on_directory = true;
  const item = directoryItem(tag, fields);
  state.directory.set(tagId, item);
  return item;
});

route('PATCH', '/users/@me/tags/(\\d+)/directory', ([ , tagId ], { body }) => {
  findTag(tagId);
  const item = state.directory.get(tagId);
  if (!item) {
    throw new MockError(404, ApiErrorCodes.UNKNOWN_TAG_DIRECTORY_ITEM, 'Unknown Tag Directory Item');
  }
  return editDirectory(item, directoryFields(body));
});

// mirrors `request_tag_directory_verification`/`cancel_tag_directory_verification`, the tag is locked while pending
route('POST', '/users/@me/tags/(\\d+)/directory/verify', ([ , tagId ]) => {
  const tag = findTag(tagId);
  const item = state.directory.get(tagId);
  if (!item) {
    throw new MockError(404, ApiErrorCodes.UNKNOWN_TAG_DIRECTORY_ITEM, 'Unknown Tag Directory Item');
  }
  if (item.verified === TagDirectoryVerificationStates.PENDING_VERIFICATION) {
    throw new MockError(400, ApiErrorCodes.TAG_DIRECTORY_ALREADY_PENDING, 'Already Pending Verification');
  }
  if (item.verified === TagDirectoryVerificationStates.VERIFIED) {
    throw new MockError(400, ApiErrorCodes.TAG_DIRECTORY_ALREADY_VERIFIED, 'Already Verified');
  }
  item.verified = TagDirectoryVerificationStates.PENDING_VERIFICATION;
  tag.locked = true;
  return item;
});

route('DELETE', '/users/@me/tags/(\\d+)/directory/verify', ([ , tagId ]) => {
  const tag = findTag(tagId);
  const item = state.directory.get(tagId);
  if (!item) {
    throw new MockError(404, ApiErrorCodes.UNKNOWN_TAG_DIRECTORY_ITEM, 'Unknown Tag Directory Item');
  }
  if (item.verified === TagDirectoryVerificationStates.VERIFIED) {
    throw new MockError(400, ApiErrorCodes.TAG_DIRECTORY_CANNOT_UNVERIFY_VERIFIED, 'Cannot unverify a verified tag directory item');
  }
  if (item.verified !== TagDirectoryVerificationStates.PENDING_VERIFICATION) {
    throw new MockError(400, ApiErrorCodes.TAG_DIRECTORY_ALREADY_UNVERIFIED, 'Already Unverified');
  }
  item.verified = TagDirectoryVerificationStates.NOT_VERIFIED;
  tag.locked = false;
  return item;
});

route('DELETE', '/users/@me/tags/(\\d+)', ([ , tagId ]) => {
  findTag(tagId);
  state.tags = state.tags.filter((tag) => tag.id !== tagId);
  return undefined;
});

route('GET', '/users/@me/tags/(\\d+)/variables', ([ , tagId ], { query }) => {
  findTag(tagId);
  const stored = state.variables.get(tagId);
  const ids = scopeIds(query);
  const response = emptyVariables();
  for (const type of [0, 1, 2, 3] as const) {
    const id = ids[type];
    if (id && stored?.has(`${type}:${id}`)) {
      response[type] = {...stored.get(`${type}:${id}`)};
    }
  }
  return response;
});

route('PUT', '/users/@me/tags/(\\d+)/variables/(\\d)/(\\d+)', ([ , tagId, type, id ], { body }) => {
  findTag(tagId);
  const storageId = (type === '3') ? '0' : id;
  // like the API's pydantic models (str_strip_whitespace)
  const name = String(body.name || '').trim();
  const value = String(body.value ?? '').trim();
  if (!name || 128 < name.length) {
    throw new MockError(400, 50001, 'Variable name must be between 1 and 128 characters');
  }
  if (16 * 1024 < value.length) {
    throw new MockError(400, 50001, 'Variable value must be 16384 characters or fewer');
  }
  const stored = state.variables.get(tagId) ?? new Map<string, Record<string, string>>();
  state.variables.set(tagId, stored);
  const bucket = stored.get(`${type}:${storageId}`) ?? {};
  if (value) {
    if (!(name in bucket) && 5 <= Object.keys(bucket).length) {
      throw new MockError(400, 30010, 'Variables exceeded max amount (5)', {limit: 5});
    }
    bucket[name] = value;
  } else {
    delete bucket[name];
  }
  stored.set(`${type}:${storageId}`, bucket);
  return {name, storage_id: storageId, storage_type: Number(type), value};
});

route('DELETE', '/users/@me/tags/(\\d+)/variables/(\\d)/(\\d+)', ([ , tagId, type, id ], { query }) => {
  findTag(tagId);
  const storageId = (type === '3') ? '0' : id;
  const bucket = state.variables.get(tagId)?.get(`${type}:${storageId}`);
  if (bucket) {
    delete bucket[query.get('name') || ''];
  }
  return undefined;
});

route('GET', '/users/@me/tags/(\\d+)/blobs', ([ , tagId ], { query }) => {
  findTag(tagId);
  const stored = state.blobs.get(tagId);
  const ids = scopeIds(query);
  const response = emptyBlobs();
  for (const type of [0, 1, 2, 3] as const) {
    const id = ids[type];
    if (id) {
      response[type] = stored?.get(`${type}:${id}`) ?? null;
    }
  }
  return response;
});

route('PUT', '/users/@me/tags/(\\d+)/blobs', ([ , tagId ], { body }) => {
  findTag(tagId);
  const ids = scopeIds(body);
  const stored = state.blobs.get(tagId) ?? new Map<string, string>();
  state.blobs.set(tagId, stored);
  const response = emptyBlobs();
  for (const type of [0, 1, 2, 3] as const) {
    if (ids[type]) {
      stored.delete(`${type}:${ids[type]}`);
    }
  }
  for (const blob of (body.blobs as Array<{storage_id: string, storage_type: TagStorageType, value: string}>) || []) {
    if (!blob.value) {
      continue;
    }
    if (256 * 1024 < atob(blob.value).length) {
      throw new MockError(400, 50010, 'Blob exceeded 256kb', {max_size: 256 * 1024});
    }
    const storageId = (blob.storage_type === 3) ? '0' : String(blob.storage_id);
    stored.set(`${blob.storage_type}:${storageId}`, blob.value);
    response[blob.storage_type] = blob.value;
  }
  return response;
});


/* servers */

function throwGuildsError() {
  switch (state.guildsError) {
    case 'scope':
      throw new MockError(403, ApiErrorCodes.DISCORD_OAUTH_SCOPE_MISMATCH, 'Scope Mismatch, required (identify, guilds)', {scopes: ['identify', 'guilds']});
    case 'grant':
      throw new MockError(401, ApiErrorCodes.DISCORD_OAUTH_ERROR, 'Discord OAuth grant is invalid');
    case 'ratelimit':
      throw new MockError(429, ApiErrorCodes.DISCORD_RATELIMITED, 'Discord is rate limiting requests');
    case 'refreshing':
      throw new MockError(503, ApiErrorCodes.EXTERNAL_SERVICE_TIMEOUT, 'Token refresh in progress');
  }
}

function guildDetail(guildId: string) {
  const entry = findGuild(guildId);
  return {...entry.detail, owner: entry.summary.owner, permissions: entry.summary.permissions, editable: guildEditable(entry.summary)};
}

function requireOwner(guildId: string) {
  const entry = findGuild(guildId);
  if (!entry.summary.owner) {
    throw new MockError(403, ApiErrorCodes.MISSING_ACCESS, 'Only the server owner can do this');
  }
  return entry;
}

route('GET', '/users/@me/guilds', () => {
  throwGuildsError();
  return state.guilds.map((entry) => entry.summary);
});

route('GET', '/users/@me/guilds/(\\d+)', ([ , guildId ]) => {
  throwGuildsError();
  return guildDetail(guildId);
});

route('PATCH', '/users/@me/guilds/(\\d+)', ([ , guildId ], { body }) => {
  const { detail } = requireEditable(guildId, 'settings');
  const settingsKeys = ['ml_diffusion_model', 'ml_llm_model', 'ml_llm_personality', 'response_display'] as const;
  for (const key of settingsKeys) {
    if (key in body) {
      (detail.settings as unknown as Record<string, unknown>)[key] = body[key];
    }
  }
  if ('locale' in body) {
    detail.locale = (body.locale as string | null) || null;
  }
  if ('timezone' in body) {
    detail.timezone = (body.timezone as string | null) || null;
  }
  return guildDetail(guildId);
});

route('PUT', '/users/@me/guilds/(\\d+)/prefixes', ([ , guildId ], { body }) => {
  const { detail } = requireEditable(guildId, 'prefixes');
  const prefix = String(body.prefix || '').trim();
  if (!prefix || 128 < prefix.length) {
    throw new MockError(400, 50001, 'Prefix must be between 1 and 128 characters');
  }
  if (5 <= detail.prefixes.length) {
    throw new MockError(400, 30006, 'Guild has reached the prefix limit (5)', {limit: 5});
  }
  if (!detail.prefixes.some((item) => item.prefix === prefix)) {
    detail.prefixes.push({added: new Date().toISOString(), guild_id: guildId, prefix, user_id: mockUser.id});
  }
  return detail.prefixes;
});

route('POST', '/users/@me/guilds/(\\d+)/prefixes/delete', ([ , guildId ], { body }) => {
  const { detail } = requireEditable(guildId, 'prefixes');
  detail.prefixes = detail.prefixes.filter((item) => item.prefix !== body.prefix);
  return detail.prefixes;
});

route('(PUT|DELETE)', '/users/@me/guilds/(\\d+)/(allowlist|blocklist)/(\\d+)/(channel|role|user)', ([ , guildId, list, id, type ], { method }) => {
  const { detail } = requireEditable(guildId, list as 'allowlist' | 'blocklist');
  const key = list as 'allowlist' | 'blocklist';
  detail[key] = detail[key].filter((item) => !(item.id === id && item.type === type));
  if (method === 'PUT') {
    detail[key].push({added: new Date().toISOString(), id, type, user_id: mockUser.id});
  }
  return undefined;
});

route('(PUT|DELETE)', '/users/@me/guilds/(\\d+)/commands/([^/]+)/(allowlist|blocklist)/(\\d+)/(channel|guild|role|user)', ([ , guildId, rawCommand, list, id, type ], { method }) => {
  const { detail } = requireEditable(guildId, 'commands');
  const command = decodeURIComponent(rawCommand);
  if (command === 'notacommand') {
    throw new MockError(404, 10011, 'Unknown Command');
  }
  const key = (list === 'allowlist') ? 'commands_allowlist' : 'commands_blocklist';
  detail[key] = detail[key].filter((item) => !(item.command === command && item.id === id && item.type === type));
  if (method === 'PUT') {
    detail[key].push({added: new Date().toISOString(), command, id, type, user_id: mockUser.id});
  }
  return undefined;
});

route('PUT', '/users/@me/guilds/(\\d+)/loggers', ([ , guildId ], { body }) => {
  const { detail } = requireEditable(guildId, 'loggers');
  const channelId = String(body.channel_id);
  const type = Number(body.type);
  if (String(body.webhook_token).includes('invalid')) {
    throw new MockError(400, ApiErrorCodes.INVALID_FORM_BODY, 'Unknown Webhook', {field: 'webhook_id'});
  }
  if (detail.loggers.some((item) => item.type === type && item.channel_id !== channelId)) {
    throw new MockError(400, 50019, 'Channels cannot share the same logging type');
  }
  detail.loggers = detail.loggers.filter((item) => !(item.channel_id === channelId && item.type === type));
  detail.loggers.push({
    added: new Date().toISOString(),
    channel_id: channelId,
    disabled_events: Number(body.disabled_events) || 0,
    guild_id: guildId,
    type,
    user_id: mockUser.id,
  });
  return detail.loggers;
});

route('POST', '/users/@me/guilds/(\\d+)/loggers/delete', ([ , guildId ], { body }) => {
  const { detail } = requireEditable(guildId, 'loggers');
  detail.loggers = detail.loggers.filter((item) => !(item.channel_id === String(body.channel_id) && item.type === Number(body.type)));
  return undefined;
});


route('GET', '/users/@me/guilds/(\\d+)/data/export', ([ , guildId ]) => {
  const { detail } = requireOwner(guildId);
  // loggers never carry webhook urls here, same as the real api
  const tags = state.tags.filter((tag) => tag.server_id === guildId).map((tag) => ({
    ...tag,
    reference_tag: (tag.reference_tag && tag.reference_tag.server_id !== guildId) ? {...tag.reference_tag, content: ''} : tag.reference_tag,
  }));
  return {
    guild: detail,
    notes: [
      'Logger webhook URLs (webhook id and token) are left out because they are sensitive data: anyone with a webhook URL can post messages in that channel.',
      'Content of directory tags is left out, including the directory or DM tags that aliases in this server point to.',
      'Tag variables and tag blobs are left out.',
    ],
    tags,
    timestamp: Date.now(),
    version: 1,
  };
});

route('POST', '/users/@me/guilds/(\\d+)/data/delete', ([ , guildId ]) => {
  const { detail } = requireOwner(guildId);
  const before = state.tags.length;
  state.tags = state.tags.filter((tag) => tag.server_id !== guildId);
  Object.assign(detail, {
    allowlist: [],
    blocklist: [],
    commands_allowlist: [],
    commands_blocklist: [],
    disabled_logger_events: 0,
    locale: null,
    loggers: [],
    prefixes: [],
    settings: {ml_diffusion_model: null, ml_llm_model: null, ml_llm_personality: null, response_display: null},
    timezone: null,
  });
  return {tags_deleted: before - state.tags.length};
});


/* admin (owner only) */

function requireBotOwner() {
  if (!state.owner) {
    throw new MockError(403, ApiErrorCodes.MISSING_ACCESS, 'Missing Access');
  }
}

function pageOf<T>(items: Array<T>, query: URLSearchParams) {
  const limit = Math.min(100, Math.max(1, Number(query.get('limit')) || 25));
  const offset = Math.max(0, Number(query.get('offset')) || 0);
  return {count: items.length, items: items.slice(offset, offset + limit)};
}

function parseBool(value: string | null): boolean | null {
  return (value === 'true' || value === '1') ? true : (value === 'false' || value === '0') ? false : null;
}

// mirrors `utilities/tools/tags.py` `tag_directory_search_condition`
function matchesDirectorySearch(query: string, tag: {id: string, user_id?: string | null, user?: {id: string}}, texts: Array<string>): boolean {
  const text = query.trim();
  if (!text) {
    return true;
  }
  const ownerId = tag.user_id ?? tag.user?.id;
  const prefixed = /^(id|tag|user|owner):(\d+)$/i.exec(text);
  if (prefixed) {
    return (['id', 'tag'].includes(prefixed[1].toLowerCase())) ? tag.id === prefixed[2] : ownerId === prefixed[2];
  }
  if (/^\d+$/.test(text) && (tag.id === text || ownerId === text)) {
    return true;
  }
  const needle = text.toLowerCase();
  return texts.some((value) => value.toLowerCase().includes(needle));
}

// The real directory is one table: staff see the mock user's own listings too, and the public directory shows everyone's.
// The mock user's listings live in `state.directory`, everyone else's in `state.adminDirectory`; these convert between them.
function ownListingAsAdmin(item: TagDirectoryItem): AdminTagDirectoryItem {
  const source = state.tags.find((tag) => tag.id === item.id);
  return {
    ...item,
    tag: {...item.tag, assets: [], content: source?.content ?? '', locked: source?.locked ?? false, user_id: mockUser.id},
    user: {avatar: mockUser.avatar, discriminator: mockUser.discriminator, id: mockUser.id, username: mockUser.username},
  };
}

function adminListingAsPublic(item: AdminTagDirectoryItem): TagDirectoryItem {
  const { tag } = item;
  const user = item.user ?? {avatar: null, discriminator: '0', id: tag.user_id ?? '0', username: 'Deleted User'};
  const timestamp = (value: unknown) => (value === undefined || value === null) ? null : toDate(value as string).toISOString();
  return {
    assets: item.assets,
    // fixtures never show their content publicly
    content_public: false,
    created: timestamp(item.created) ?? new Date(0).toISOString(),
    description: item.description,
    edited: timestamp(item.edited),
    id: item.id,
    server_count: item.server_count,
    tag: {
      assets: [],
      content: '',
      created: timestamp(tag.created)!,
      edited: timestamp(tag.edited),
      guild_id: null,
      id: tag.id,
      is_command: !!tag.is_command,
      is_on_directory: true,
      last_used: timestamp(tag.last_used),
      locked: tag.locked,
      name: tag.name,
      nsfw: tag.nsfw,
      reference_tag: null,
      scanned: 0,
      server_id: tag.server_id,
      user: {...user, blocked: false, blocked_on: null, blocked_reason: null, bot: false, flags: 0},
      uses: tag.uses,
    },
    title: item.title,
    verified: item.verified,
  };
}

route('GET', '/admin/tags/directory', (_match, { query }) => {
  requireBotOwner();
  const search = query.get('query') || '';
  const verified = query.get('verified');
  const nsfw = parseBool(query.get('nsfw'));
  const matching = [...state.adminDirectory, ...[...state.directory.values()].map(ownListingAsAdmin)]
    .filter((item) => verified === null || verified === '' || item.verified === Number(verified))
    .filter((item) => nsfw === null || item.tag.nsfw === nsfw)
    .filter((item) => matchesDirectorySearch(search, item.tag, [item.title, item.tag.name, item.tag.content ?? '', item.description]));
  const createdMs = (item: typeof matching[number]) => (item.created === undefined) ? 0 : toDate(item.created).getTime();
  const byCreated = (a: typeof matching[number], b: typeof matching[number]) => createdMs(b) - createdMs(a);
  const sorters: Record<string, (a: typeof matching[number], b: typeof matching[number]) => number> = {
    oldest: (a, b) => byCreated(b, a),
    uses: (a, b) => b.tag.uses - a.tag.uses,
    servers: (a, b) => b.server_count - a.server_count,
    name: (a, b) => a.tag.name.localeCompare(b.tag.name),
    title: (a, b) => a.title.localeCompare(b.title),
  };
  const pendingFirst = (a: typeof matching[number], b: typeof matching[number]) => Number(b.verified === 1) - Number(a.verified === 1) || byCreated(a, b);
  matching.sort(sorters[query.get('sort_by') || ''] ?? pendingFirst);
  return pageOf(matching, query);
});

// mirrors `GET /admin/tags`: the mock user's tags plus every directory tag
route('GET', '/admin/tags', (_match, { query }) => {
  requireBotOwner();
  const search = query.get('query') || '';
  const searchContent = parseBool(query.get('search_content')) === true;
  const nsfw = parseBool(query.get('nsfw'));
  const ref = (user: {id: string, username: string, discriminator: string, avatar: string | null}) => ({avatar: user.avatar, discriminator: user.discriminator, id: user.id, username: user.username});
  const items = [
    ...state.tags.map((tag) => ({
      directory: (state.directory.get(tag.id)) ? {title: state.directory.get(tag.id)!.title, verified: state.directory.get(tag.id)!.verified} : null,
      tag: {...tag, user_id: mockUser.id},
      user: {...ref(mockUser), channel_id: mockUser.channel_id},
    })),
    ...state.adminDirectory.map((item) => ({
      directory: {title: item.title, verified: item.verified},
      tag: item.tag,
      user: (item.user) ? {...item.user, channel_id: null} : null,
    })),
  ]
    .filter((item) => nsfw === null || item.tag.nsfw === nsfw)
    .filter((item) => {
      // a bare id also matches the server id here
      if (/^\d+$/.test(search.trim()) && item.tag.server_id === search.trim()) {
        return true;
      }
      return matchesDirectorySearch(search, item.tag, [item.tag.name, ...(searchContent ? [item.tag.content ?? ''] : [])]);
    });
  const time = (value: unknown) => (value) ? toDate(value as string).getTime() : 0;
  const byId = (a: typeof items[number], b: typeof items[number]) => (BigInt(b.tag.id) > BigInt(a.tag.id)) ? 1 : -1;
  const sorters: Record<string, (a: typeof items[number], b: typeof items[number]) => number> = {
    oldest: (a, b) => byId(b, a),
    uses: (a, b) => (b.tag.uses - a.tag.uses) || byId(a, b),
    name: (a, b) => a.tag.name.localeCompare(b.tag.name),
    last_used: (a, b) => (time(b.tag.last_used) - time(a.tag.last_used)) || byId(a, b),
  };
  items.sort(sorters[query.get('sort_by') || ''] ?? byId);
  return pageOf(items, query);
});

route('PATCH', '/admin/tags/directory/(\\d+)', ([ , tagId ], { body }) => {
  requireBotOwner();
  // the mock user's own listing: apply the same edits to `state.directory` and its source tag
  const own = state.directory.get(tagId);
  if (own) {
    const source = findTag(tagId);
    if (body.verified !== undefined) {
      own.verified = Number(body.verified);
      source.locked = own.verified !== TagDirectoryVerificationStates.NOT_VERIFIED;
    }
    if (typeof body.content === 'string') {
      if (!body.content || 2000 < body.content.length) {
        throw new MockError(400, ApiErrorCodes.INVALID_FORM_BODY, 'content must be 1 to 2000 characters', {field: 'content'});
      }
      source.content = body.content;
      own.tag.content = (own.content_public) ? body.content : '';
    }
    if (typeof body.name === 'string') {
      source.name = body.name.trim().toLowerCase();
      own.tag.name = source.name;
    }
    if (typeof body.title === 'string' || typeof body.description === 'string') {
      Object.assign(own, directoryFields({title: body.title, description: body.description}));
      own.edited = new Date().toISOString();
    }
    return ownListingAsAdmin(own);
  }
  const item = state.adminDirectory.find((other) => other.id === tagId);
  if (!item) {
    throw new MockError(404, ApiErrorCodes.UNKNOWN_TAG_DIRECTORY_ITEM, 'Unknown Tag Directory Item');
  }
  if (body.verified !== undefined) {
    const verified = Number(body.verified);
    if (![0, 1, 2].includes(verified)) {
      throw new MockError(400, ApiErrorCodes.INVALID_FORM_BODY, 'verified must be 0, 1 or 2', {field: 'verified'});
    }
    item.verified = verified;
  }
  if (typeof body.content === 'string') {
    if (!body.content || 2000 < body.content.length) {
      throw new MockError(400, ApiErrorCodes.INVALID_FORM_BODY, 'content must be 1 to 2000 characters', {field: 'content'});
    }
    item.tag.content = body.content;
  }
  if (typeof body.name === 'string') {
    const name = body.name.trim().toLowerCase();
    if (!name || 64 < name.length) {
      throw new MockError(400, ApiErrorCodes.INVALID_FORM_BODY, 'name must be 1 to 64 characters', {field: 'name'});
    }
    item.tag.name = name;
  }
  if (typeof body.title === 'string') {
    if (128 < body.title.length) {
      throw new MockError(400, ApiErrorCodes.INVALID_FORM_BODY, 'title must be at most 128 characters', {field: 'title'});
    }
    item.title = body.title;
  }
  if (typeof body.description === 'string') {
    if (2000 < body.description.length) {
      throw new MockError(400, ApiErrorCodes.INVALID_FORM_BODY, 'description must be at most 2000 characters', {field: 'description'});
    }
    item.description = body.description;
  }
  return item;
});

// mirror `GET /admin/tags/<tag_id>/variables|blobs`: every storage the tag has, read-only, paged
function adminStoragePage<T extends {storage_type: number}>(entries: Array<T>, query: URLSearchParams) {
  const counts: Record<string, number> = {};
  for (const entry of entries) {
    counts[entry.storage_type] = (counts[entry.storage_type] ?? 0) + 1;
  }
  const type = query.get('storage_type');
  const filtered = (type === null) ? entries : entries.filter((entry) => `${entry.storage_type}` === type);
  const offset = Number(query.get('offset') ?? 0);
  const limit = Number(query.get('limit') ?? 50);
  return {count: filtered.length, counts, items: filtered.slice(offset, offset + limit)};
}

route('GET', '/admin/tags/(\\d+)/variables', ([ , tagId ], { query }) => {
  requireBotOwner();
  const entries = [...(state.variables.get(tagId) ?? new Map<string, Record<string, string>>()).entries()]
    .flatMap(([ key, values ]) => {
      const [ type, id ] = key.split(':');
      return Object.entries(values).map(([ name, value ]) => ({name, storage_id: id, storage_type: Number(type) as TagStorageType, value}));
    })
    .sort((a, b) => a.storage_type - b.storage_type || a.storage_id.localeCompare(b.storage_id) || a.name.localeCompare(b.name));
  return adminStoragePage(entries, query);
});

route('GET', '/admin/tags/(\\d+)/blobs', ([ , tagId ], { query }) => {
  requireBotOwner();
  const entries = [...(state.blobs.get(tagId) ?? new Map<string, string>()).entries()]
    .map(([ key, value ]) => {
      const [ type, id ] = key.split(':');
      return {size: atob(value).length, storage_id: id, storage_type: Number(type) as TagStorageType, truncated: false, value};
    })
    .sort((a, b) => a.storage_type - b.storage_type || a.storage_id.localeCompare(b.storage_id));
  return adminStoragePage(entries, query);
});

// mirrors `POST /admin/tags/directory/<tag_id>/assets`, nothing is stored so the cdn url won't load
route('POST', '/admin/tags/directory/(\\d+)/assets', ([ , tagId ], { body }) => {
  requireBotOwner();
  const item = state.adminDirectory.find((other) => other.id === tagId);
  if (!item) {
    throw new MockError(404, ApiErrorCodes.UNKNOWN_TAG_DIRECTORY_ITEM, 'Unknown Tag Directory Item');
  }
  const file = (body.file instanceof File) ? body.file : null;
  const name = file?.name ?? String(body.url || '').split(/[?#]/)[0].split('/').pop() ?? '';
  const extension = (/\.([a-z0-9]{1,12})$/i.exec(name)?.[1] ?? 'png').toLowerCase();
  const id = String(Date.now() * 1000 + Math.floor(Math.random() * 1000));
  const asset = {
    filename: `${id}.${extension}`,
    filename_base: id,
    id,
    metadata: {duration: 0, extension, framecount: 1, height: 0, mimetype: file?.type || `image/${extension}`, size: file?.size ?? 0, width: 0},
    position: item.tag.assets?.length ?? 0,
    urls: {cdn: `https://cdn.nsb.gg/assets/tags/${tagId}/${id}.${extension}`},
  };
  item.tag.assets = [...(item.tag.assets ?? []), asset];
  return asset;
});

route('DELETE', '/admin/tags/directory/(\\d+)/assets/(\\d+)', ([ , tagId, assetId ]) => {
  requireBotOwner();
  const item = state.adminDirectory.find((other) => other.id === tagId);
  if (!item?.tag.assets?.some((asset) => asset.id === assetId)) {
    throw new MockError(404, ApiErrorCodes.UNKNOWN_TAG_ASSET, 'Unknown Tag Asset');
  }
  item.tag.assets = item.tag.assets.filter((asset) => asset.id !== assetId);
  return undefined;
});

route('DELETE', '/admin/tags/directory/(\\d+)', ([ , tagId ], { query }) => {
  requireBotOwner();
  // the mock user's own listings live in `state.directory`, everyone else's in `state.adminDirectory`
  if (!state.adminDirectory.some((other) => other.id === tagId) && !state.directory.has(tagId)) {
    throw new MockError(404, ApiErrorCodes.UNKNOWN_TAG_DIRECTORY_ITEM, 'Unknown Tag Directory Item');
  }
  state.adminDirectory = state.adminDirectory.filter((other) => other.id !== tagId);
  state.directory.delete(tagId);
  if (parseBool(query.get('delete_tag'))) {
    state.tags = state.tags.filter((tag) => tag.id !== tagId);
  }
  return undefined;
});

route('PATCH', '/admin/users/(\\d+)', ([ , userId ], { body }) => {
  requireBotOwner();
  const user = state.adminUsers.find((other) => other.id === userId);
  if (!user) {
    throw new MockError(404, 10013, 'Unknown User');
  }
  if (body.blocked !== undefined) {
    user.blocked = !!body.blocked;
  }
  if (body.blocked_reason !== undefined) {
    user.blocked_reason = (body.blocked_reason as string | null) || null;
  }
  // the OWNER bit can't be changed from the dashboard
  if (typeof body.flags === 'number') {
    user.flags = (body.flags & ~1) | (user.flags & 1);
  }
  if (typeof body.premium_type === 'number') {
    user.premium_type = body.premium_type;
  }
  return user;
});

// mirrors `DELETE /admin/users/<user_id>/tags`: the mock user's tags and every directory tag they own
route('DELETE', '/admin/users/(\\d+)/tags', ([ , userId ]) => {
  requireBotOwner();
  const user = state.adminUsers.find((other) => other.id === userId);
  if (user && (user.flags & 1)) {
    throw new MockError(400, 50035, 'Bot owners\' tags can\'t be deleted');
  }
  const owned = state.adminDirectory.filter((item) => item.tag.user_id === userId || item.user?.id === userId);
  state.adminDirectory = state.adminDirectory.filter((item) => !owned.includes(item));
  let count = owned.length;
  if (userId === mockUser.id) {
    count += state.tags.length;
    state.tags = [];
    state.directory.clear();
  }
  return {count};
});

route('GET', '/admin/users', (_match, { query }) => {
  requireBotOwner();
  const needle = (query.get('query') || '').toLowerCase();
  const sortBy = query.get('sort_by') || 'flags';
  let entries = adminUserEntries(state.adminUsers, state.contentFlags)
    .filter((entry) => !needle || entry.user.username.toLowerCase().includes(needle) || entry.user.id === needle);
  if (parseBool(query.get('only_flagged'))) {
    entries = entries.filter((entry) => entry.content_flags.total);
  }
  const flaggedWithin = Number(query.get('flagged_within')) || 0;
  if (flaggedWithin) {
    const since = Date.now() - flaggedWithin * 3600000;
    entries = entries.filter((entry) => entry.content_flags.last_flagged_at && since <= toDate(entry.content_flags.last_flagged_at).getTime());
  }
  const lastFlagged = (entry: typeof entries[number]) => (entry.content_flags.last_flagged_at) ? toDate(entry.content_flags.last_flagged_at).getTime() : -Infinity;
  entries.sort((a, b) => {
    if (sortBy === 'username') {
      return a.user.username.localeCompare(b.user.username);
    }
    if (sortBy === 'newest') {
      return (BigInt(b.user.id) > BigInt(a.user.id)) ? 1 : -1;
    }
    if (sortBy === 'last_flagged') {
      return (lastFlagged(b) - lastFlagged(a)) || ((BigInt(b.user.id) > BigInt(a.user.id)) ? 1 : -1);
    }
    return (b.content_flags.flagged - a.content_flags.flagged) || (b.content_flags.total - a.content_flags.total);
  });
  return pageOf(entries, query);
});

route('GET', '/admin/content-flags', (_match, { query }) => {
  requireBotOwner();
  const userId = query.get('user_id');
  const status = query.get('status');
  const category = query.get('category');
  const needsReview = parseBool(query.get('needs_human_review'));
  const type = query.get('type');
  const guildId = query.get('guild_id');
  const channelId = query.get('channel_id');
  const search = (query.get('search') || '').trim().toLowerCase();
  // mirrors `_content_flag_search_condition`
  const matchesSearch = (flag: ContentFlag) => {
    if (!search) {
      return true;
    }
    const caseId = (search.startsWith('#')) ? search.slice(1) : search;
    if (search.startsWith('#') && /^\d+$/.test(caseId)) {
      return flag.id === caseId;
    }
    if (/^\d+$/.test(caseId) && (flag.id === caseId || flag.message_id === caseId)) {
      return true;
    }
    if ([flag.query, flag.source_url].some((value) => value && value.toLowerCase().includes(search))) {
      return true;
    }
    if (search.length >= 6 && /^[0-9a-f]+$/.test(search)) {
      return [flag.sha256, flag.pdq].some((hash) => hash && ((search.length === 64) ? hash === search : hash.startsWith(search)));
    }
    return false;
  };
  const matching = state.contentFlags
    .filter((flag) => !userId || flag.user_id === userId)
    .filter((flag) => !guildId || flag.guild_id === guildId)
    .filter((flag) => !channelId || flag.channel_id === channelId)
    .filter((flag) => status === null || status === '' || flag.status === Number(status))
    .filter((flag) => !category || flag.category === category)
    .filter((flag) => needsReview === null || flag.needs_human_review === needsReview)
    .filter((flag) => !type || (flag.mimetype === 'text/plain') === (type === 'text'))
    .filter(matchesSearch);
  return pageOf(matching, query);
});

route('PATCH', '/admin/content-flags/(\\d+)', ([ , flagId ], { body }) => {
  requireBotOwner();
  const flag = state.contentFlags.find((other) => other.id === flagId);
  if (!flag) {
    throw new MockError(404, 10000, 'Unknown Content Flag');
  }
  if (body.status !== undefined) {
    const status = Number(body.status);
    if (![0, 1, 2, 3].includes(status)) {
      throw new MockError(400, ApiErrorCodes.INVALID_FORM_BODY, 'status must be 0-3', {field: 'status'});
    }
    flag.status = status;
    flag.reviewed_at = (status) ? new Date().toISOString() : null;
    flag.reviewed_by = (status) ? mockUser.id : null;
  }
  if (body.notes !== undefined) {
    flag.notes = (typeof body.notes === 'string' && body.notes) ? body.notes : null;
  }
  return flag;
});

route('GET', '/admin/reports', (_match, { query }) => {
  requireBotOwner();
  const type = query.get('type');
  const status = query.get('status');
  const userId = query.get('user_id');
  const targetId = query.get('target_id');
  const matching = state.reports
    .filter((report) => type === null || type === '' || report.type === Number(type))
    .filter((report) => status === null || status === '' || report.status === Number(status))
    .filter((report) => !userId || report.user.id === userId)
    .filter((report) => !targetId || report.target_id === targetId);
  return pageOf(matching, query);
});

// like the api, any patch stamps reviewed_at/reviewed_by
route('PATCH', '/admin/reports/(\\d+)', ([ , reportId ], { body }) => {
  requireBotOwner();
  const report = state.reports.find((other) => other.id === reportId);
  if (!report) {
    throw new MockError(404, ApiErrorCodes.UNKNOWN_REPORT, 'Unknown Report');
  }
  if (body.status !== undefined && body.status !== null) {
    const status = Number(body.status);
    if (![0, 1, 2].includes(status)) {
      throw new MockError(400, ApiErrorCodes.INVALID_FORM_BODY, 'status must be 0-2', {field: 'status'});
    }
    report.status = status;
  }
  if (body.notes !== undefined) {
    report.notes = (typeof body.notes === 'string' && body.notes) ? body.notes : null;
  }
  report.reviewed_at = new Date().toISOString();
  report.reviewed_by = mockUser.id;
  return report;
});


// voices: only the name can be changed, from either side
function findVoice(voiceId: string) {
  const voice = state.voices.find((other) => other.id === voiceId);
  if (!voice) {
    throw new MockError(404, ApiErrorCodes.UNKNOWN_VOICE, 'Unknown Voice Clone');
  }
  return voice;
}

function renameVoice(voiceId: string, body: Record<string, unknown>) {
  const voice = findVoice(voiceId);
  const name = (typeof body.name === 'string') ? body.name.replace(/[\r\n]+/g, ' ').trim() : '';
  if (!name || 128 < name.length) {
    throw new MockError(400, ApiErrorCodes.INVALID_FORM_BODY, 'name must be 1-128 characters', {field: 'name'});
  }
  voice.name = name;
  return voice;
}

route('GET', '/users/@me/reminders', () => {
  return {count: state.reminders.length, items: state.reminders};
});

function findReminder(reminderId: string) {
  const reminder = state.reminders.find((other) => other.id === reminderId);
  if (!reminder) {
    throw new MockError(404, ApiErrorCodes.UNKNOWN_REMINDER, 'Unknown Reminder');
  }
  return reminder;
}

route('PATCH', '/users/@me/reminders/(\\d+)', ([ , reminderId ], { body }) => {
  const reminder = findReminder(reminderId);
  const content = body.content;
  if (content === undefined && !body.move_to_dms) {
    throw new MockError(400, ApiErrorCodes.INVALID_FORM_BODY, 'Nothing to change');
  }
  if (typeof content === 'string' && content !== reminder.content) {
    if (512 < content.length) {
      throw new MockError(400, ApiErrorCodes.INVALID_FORM_BODY, 'Content is too long');
    }
    // stands in for the content scanner: "scanfail" acts like the scanner being down, "blockme" gets blocked
    if (content.toLowerCase().includes('scanfail')) {
      throw new MockError(400, ApiErrorCodes.SAFETY_SCAN_FAILED, 'The safety scan failed, try again in a moment');
    }
    if (content.toLowerCase().includes('blockme')) {
      throw new MockError(400, ApiErrorCodes.TEXT_BLOCKED_GUIDELINES, 'The text was blocked because it may violate Discord\'s Community Guidelines');
    }
    reminder.content = content;
  }
  if (body.move_to_dms) {
    reminder.channel_id = mockUser.channel_id;
    reminder.guild_id = null;
    reminder.message_id = null;
  }
  return reminder;
});

route('DELETE', '/users/@me/reminders/(\\d+)', ([ , reminderId ]) => {
  findReminder(reminderId);
  state.reminders = state.reminders.filter((other) => other.id !== reminderId);
});

// the dashboard shape leaves out the platform id and the owner
function meVoice({ created, id, name, platform_type }: (typeof state.voices)[number]) {
  return {created, id, name, platform_type};
}

route('GET', '/users/@me/voices', () => {
  const items = state.voices.filter((voice) => voice.user?.id === mockUser.id).map(meVoice);
  return {count: items.length, items};
});

route('PATCH', '/users/@me/voices/(\\d+)', ([ , voiceId ], { body }) => {
  if (findVoice(voiceId).user?.id !== mockUser.id) {
    throw new MockError(404, ApiErrorCodes.UNKNOWN_VOICE, 'Unknown Voice Clone');
  }
  return meVoice(renameVoice(voiceId, body));
});

route('GET', '/admin/voices', (_match, { query }) => {
  requireBotOwner();
  const text = (query.get('query') || '').trim().toLowerCase();
  const userId = query.get('user_id');
  const matching = state.voices
    .filter((voice) => !userId || voice.user?.id === userId)
    .filter((voice) => !text || voice.name.toLowerCase().includes(text) || !!voice.user?.username.toLowerCase().includes(text)
      || voice.id === text || voice.user?.id === text);
  return pageOf(matching, query);
});

route('PATCH', '/admin/voices/(\\d+)', ([ , voiceId ], { body }) => {
  requireBotOwner();
  return renameVoice(voiceId, body);
});


// public tag directory (the real one is `GET /tags/directory`), newest first, `before` + `limit` like the api
route('GET', '/tags/directory', (_match, { query }) => {
  const search = query.get('query') || '';
  const before = query.get('before');
  const limit = Number(query.get('limit')) || 50;
  const items = [...state.directory.values(), ...state.adminDirectory.map(adminListingAsPublic)]
    .sort((a, b) => (BigInt(b.id) > BigInt(a.id)) ? 1 : -1)
    .filter((item) => matchesDirectorySearch(search, item.tag, [item.title, item.tag.name, item.description]))
    .filter((item) => !before || BigInt(item.id) < BigInt(before));
  return {count: items.length, items: items.slice(0, limit)};
});

// mirrors `utilities/tools/tags.py` `add_tag_alias`
route('POST', '/users/@me/tags/(\\d+)/add', ([ , tagId ], { body }) => {
  const source = state.tags.find((item) => item.id === tagId);
  if (!source || !state.directory.has(tagId)) {
    throw new MockError(404, ApiErrorCodes.UNKNOWN_TAG, 'Unknown Tag');
  }
  const guildId = (body.guild_id) ? String(body.guild_id) : null;
  if (guildId) {
    findGuild(guildId);
  }
  const serverId = guildId || mockUser.channel_id;
  const name = String(body.name || source.name).toLowerCase();
  const existing = state.tags.find((item) => item.name === name && item.server_id === serverId);
  if (existing) {
    if (existing.user.id !== mockUser.id) {
      throw new MockError(400, ApiErrorCodes.TAG_NAME_TAKEN, 'A tag with that name already exists here and you don\'t own it');
    }
    if (!existing.reference_tag) {
      throw new MockError(400, ApiErrorCodes.TAG_NAME_TAKEN, 'Cannot turn a regular tag into an alias');
    }
    existing.reference_tag = source;
    return existing;
  }
  const created: Tag = {
    ...source,
    content: '',
    created: new Date().toISOString(),
    edited: null,
    guild_id: guildId,
    id: (BigInt(Date.now()) << 22n).toString(),
    is_command: false,
    is_on_directory: false,
    last_used: null,
    name,
    reference_tag: source,
    server_id: serverId,
    user: {...source.user, id: mockUser.id, username: mockUser.username},
    uses: 0,
  };
  state.tags.unshift(created);
  return created;
});


/* install */

declare global {
  interface Window {
    __dashboardMocks?: {guildsError: (value: GuildsError) => void, latency: (ms: number) => void, owner: (value: boolean) => void},
  }
}


export function installDashboardMocks(): void {
  const realFetch = window.fetch.bind(window);
  const prefix = new URL(config.apiBase, window.location.origin).pathname.replace(/\/+$/, '');

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL((input instanceof Request) ? input.url : String(input), window.location.origin);
    const method = (init?.method || ((input instanceof Request) ? input.method : 'GET')).toUpperCase();
    if (url.origin !== window.location.origin || !url.pathname.startsWith(prefix + '/')) {
      return realFetch(input, init);
    }
    const path = url.pathname.slice(prefix.length);
    for (const { method: routeMethod, pattern, handler } of routes) {
      const match = path.match(pattern);
      if (!match || !new RegExp(`^${routeMethod}$`).test(method)) {
        continue;
      }
      await new Promise((resolve) => window.setTimeout(resolve, state.latency));
      init?.signal?.throwIfAborted();
      const headers = new Headers(init?.headers);
      // the public tag directory is fetched without a token
      if (path !== '/tags/directory' && headers.get('authorization') !== MOCK_TOKEN) {
        return json(401, {code: 0, message: '401: Unauthorized', status: 401});
      }
      let body: Record<string, unknown> = {};
      if (typeof init?.body === 'string') {
        body = JSON.parse(init.body);
      } else if (init?.body instanceof FormData) {
        body = Object.fromEntries(init.body.entries());
      }
      try {
        const result = handler(match, {method, query: url.searchParams, body});
        // hand out copies so the app can't mutate the fake database through the query cache
        return json((result === undefined) ? 204 : 200, (result === undefined) ? undefined : structuredClone(result));
      } catch (error) {
        if (error instanceof MockError) {
          return json(error.status, {...error.metadata, code: error.code, message: error.message, status: error.status});
        }
        throw error;
      }
    }
    return realFetch(input, init);
  };

  // pretend we're logged in
  if (tokenStorage.get() !== MOCK_TOKEN) {
    tokenStorage.set(MOCK_TOKEN);
  }

  window.__dashboardMocks = {
    guildsError: (value) => {
      state.guildsError = value;
      if (value) {
        sessionStorage.setItem('dashboardMocks:guildsError', value);
      } else {
        sessionStorage.removeItem('dashboardMocks:guildsError');
      }
    },
    latency: (ms) => {
      state.latency = ms;
    },
    // takes effect after a reload (the user is fetched once)
    owner: (value) => {
      state.owner = value;
      if (value) {
        sessionStorage.removeItem('dashboardMocks:notOwner');
      } else {
        sessionStorage.setItem('dashboardMocks:notOwner', '1');
      }
    },
  };

  console.info('[dashboard mocks] enabled: /users/@me/* is served from in-memory fixtures');
}
