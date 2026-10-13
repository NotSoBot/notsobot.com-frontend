// Dev-only fake backend for the dashboard routes in docs/dashboard-api.md, used until notsobot.api
// ships them. Loaded from main.tsx only when `import.meta.env.DEV && VITE_DASHBOARD_MOCKS === 'true'`,
// so none of this ends up in production bundles.
//
// It wraps `window.fetch`: requests to the routes below get an in-memory answer, everything else
// (commands, status, ...) goes to the real API as usual. Writes persist until the page reloads.
//
// In the console: `__dashboardMocks.guildsError('scope' | 'grant' | 'ratelimit' | 'refreshing' | null)` makes
// `/users/@me/guilds*` fail like the real API does (missing `guilds` scope, revoked Discord grant, Discord 429,
// token refresh in progress); `__dashboardMocks.latency(ms)` changes the fake delay.
// A logger webhook URL whose token contains "invalid" is rejected like a webhook from another channel.

import { tokenStorage } from '@/auth/tokenStorage';
import { config } from '@/config';
import { ApiErrorCodes, TagDirectoryVerificationStates, type Tag, type TagDirectoryItem, type TagStorageType } from '@/lib/api/types';

import {
  createBlobs,
  createGuilds,
  createSettings,
  createTags,
  createVariables,
  emptyBlobs,
  emptyVariables,
  guildEditable,
  MOCK_TOKEN,
  mockUser,
} from './fixtures';


const state = {
  settings: createSettings(),
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

route('GET', '/users/@me', () => mockUser);
route('POST', '/auth/logout', () => undefined);
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

function directoryItem(tag: Tag, fields: {title?: string, description?: string}, verified: number = TagDirectoryVerificationStates.NOT_VERIFIED): TagDirectoryItem {
  return {
    assets: [],
    created: new Date().toISOString(),
    description: fields.description ?? '',
    edited: null,
    id: tag.id,
    server_count: 0,
    tag: {...tag, content: '', guild_id: null},
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
  const fields: {title?: string, description?: string} = {};
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

function editDirectory(item: TagDirectoryItem, fields: {title?: string, description?: string}) {
  if (item.verified === TagDirectoryVerificationStates.PENDING_VERIFICATION) {
    throw new MockError(400, ApiErrorCodes.TAG_DIRECTORY_PENDING_VERIFICATION, 'Cannot edit a tag that is currently undergoing verification');
  }
  const changed = (fields.title !== undefined && fields.title !== item.title) || (fields.description !== undefined && fields.description !== item.description);
  Object.assign(item, fields);
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
  const name = String(body.name || '');
  const value = String(body.value ?? '');
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
  return {...entry.detail, permissions: entry.summary.permissions, editable: guildEditable(entry.summary)};
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
  const prefix = String(body.prefix || '');
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


/* install */

declare global {
  interface Window {
    __dashboardMocks?: {guildsError: (value: GuildsError) => void, latency: (ms: number) => void},
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
      if (headers.get('authorization') !== MOCK_TOKEN) {
        return json(401, {code: 0, message: '401: Unauthorized', status: 401});
      }
      let body: Record<string, unknown> = {};
      if (typeof init?.body === 'string') {
        body = JSON.parse(init.body);
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
  };

  console.info('[dashboard mocks] enabled: /users/@me/* is served from in-memory fixtures');
}
