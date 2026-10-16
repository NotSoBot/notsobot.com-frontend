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
import {
  ApiErrorCodes,
  CONTENT_FLAG_TEXT_MIMETYPE,
  TAG_DIRECTORY_ASSET_SIZE_MAX,
  TAG_DIRECTORY_ASSETS_MAX,
  TagDirectoryCategories,
  TagDirectoryVerificationStates,
  type AdminDirectoryTag,
  type AdminTagDirectoryItem,
  type AdminUserRef,
  type ContentFlag,
  type Tag,
  type TagDirectoryCategory,
  type TagDirectoryEditRequest,
  type TagDirectoryItem,
  type TagStorageType,
  type UserGuild,
} from '@/lib/api/types';
import { toDate } from '@/lib/utils';

import {
  adminUserEntries,
  createApplications,
  createAdminDirectory,
  createAdminGuilds,
  createAdminUsers,
  createBlobs,
  createContentFlags,
  createEntitlements,
  createFiles,
  createReminders,
  createReports,
  createGuilds,
  createSettings,
  createTags,
  createVoices,
  createVariables,
  emptyBlobs,
  emptyVariables,
  createGuildSettings,
  guildEditable,
  MOCK_TOKEN,
  mockUser,
  sampleDirectoryAssets,
} from './fixtures';


const adminUsers = createAdminUsers();
const guilds = createGuilds();

const state = {
  settings: createSettings(),
  adminUsers,
  adminDirectory: createAdminDirectory(adminUsers),
  contentFlags: createContentFlags(adminUsers),
  files: createFiles(),
  reminders: createReminders(),
  reports: createReports(adminUsers),
  voices: createVoices(adminUsers),
  applications: createApplications(adminUsers),
  entitlements: createEntitlements(adminUsers),
  // the mock user is a NotSoBot owner unless turned off (kept across reloads like guildsError)
  owner: sessionStorage.getItem('dashboardMocks:notOwner') !== '1',
  tags: createTags(),
  variables: createVariables(),
  blobs: createBlobs(),
  guilds,
  adminGuilds: createAdminGuilds(guilds),
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
  const offset = Math.max(0, Number(query.get('offset')) || 0);
  const limit = Math.min(100, Math.max(1, Number(query.get('limit')) || 100));
  const newest = (a: Tag, b: Tag) => (BigInt(b.id) > BigInt(a.id)) ? 1 : -1;
  const sorters: Record<string, (a: Tag, b: Tag) => number> = {
    newest,
    oldest: (a, b) => newest(b, a),
    uses: (a, b) => b.uses - a.uses || newest(a, b),
    name: (a, b) => a.name.localeCompare(b.name) || newest(b, a),
    last_used: (a, b) => (b.last_used ? Date.parse(b.last_used) : -Infinity) - (a.last_used ? Date.parse(a.last_used) : -Infinity) || newest(a, b),
  };
  const directory = query.get('directory');
  const verified = query.get('directory_verified');
  const serverId = query.get('server_id');
  const matching = state.tags
    .filter((tag) => !serverId || tag.server_id === serverId)
    .filter((tag) => !needle || tag.name.includes(needle) || tag.content.toLowerCase().includes(needle))
    .filter((tag) => {
      const listing = state.directory.get(tag.id);
      if (verified !== null) {
        return listing?.verified === Number(verified);
      }
      return directory === null || !!listing === (directory === 'true');
    })
    .sort(sorters[query.get('sort_by') || 'newest'] ?? newest);
  const items = matching
    .filter((tag) => !before || BigInt(tag.id) < BigInt(before))
    .slice(offset, offset + limit)
    .map((tag) => {
      const listing = state.directory.get(tag.id);
      return {...tag, directory: (listing) ? {title: listing.title, verified: listing.verified} : null};
    });
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

type DirectoryFields = {title?: string, description?: string, category?: TagDirectoryCategory, content_public?: boolean};

const CATEGORY_VALUES: ReadonlyArray<number> = Object.values(TagDirectoryCategories);

// `null`/missing is no filter, anything else has to be a known category like the api's enum validator
function parseCategory(value: unknown): TagDirectoryCategory | undefined {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }
  const category = Number(value);
  if (!CATEGORY_VALUES.includes(category)) {
    throw new MockError(400, ApiErrorCodes.INVALID_FORM_BODY, `category must be one of ${CATEGORY_VALUES.join(', ')}`, {field: 'category'});
  }
  return category as TagDirectoryCategory;
}

function directoryItem(tag: Tag, fields: DirectoryFields, verified: number = TagDirectoryVerificationStates.NOT_VERIFIED): TagDirectoryItem {
  const contentPublic = !!fields.content_public;
  return {
    assets: [],
    category: fields.category ?? TagDirectoryCategories.OTHER,
    content_public: contentPublic,
    created: new Date().toISOString(),
    description: fields.description ?? '',
    edited: null,
    id: tag.id,
    server_count: 0,
    tag: {...tag, content: (contentPublic) ? tag.content : '', guild_id: null},
    thumbnail: null,
    title: fields.title ?? '',
    verified,
  };
}

// a few of the personal tags start out listed: one unverified, one under review and one verified (for change requests)
const SEED_LISTINGS = [
  {title: 'Says hello back', description: 'Replies with a friendly hello. Pass text to add it after the greeting.', category: TagDirectoryCategories.GAMES, verified: TagDirectoryVerificationStates.NOT_VERIFIED},
  {title: 'Pong, but slower', description: '', category: TagDirectoryCategories.UTILITY, verified: TagDirectoryVerificationStates.PENDING_VERIFICATION},
  {title: 'Rolls the dice', description: 'Rolls dice with modifiers, like 2d6+3.', category: TagDirectoryCategories.GAMES, verified: TagDirectoryVerificationStates.VERIFIED},
];
state.tags.filter((tag) => tag.server_id === mockUser.id).slice(0, SEED_LISTINGS.length).forEach((tag, i) => {
  const { verified, ...fields } = SEED_LISTINGS[i];
  state.directory.set(tag.id, directoryItem(tag, fields, verified));
  if (verified !== TagDirectoryVerificationStates.NOT_VERIFIED) {
    tag.locked = true;
  }
});
// the ones under review (or verified) already have a file, so the media editor has something to move around
[...state.directory.values()].filter((item) => item.verified !== TagDirectoryVerificationStates.NOT_VERIFIED).forEach((item) => {
  item.assets = sampleDirectoryAssets(item.id, item.tag.name, 1);
});

function directoryFields(body: Record<string, unknown>) {
  const fields: DirectoryFields = {};
  if (typeof body.content_public === 'boolean') {
    fields.content_public = body.content_public;
  }
  fields.category = parseCategory(body.category);
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

// mirrors `check_can_verify_tag_directory`
function checkCanVerify(description: string | null, category: number | null) {
  if (!description?.trim()) {
    throw new MockError(400, ApiErrorCodes.TAG_DIRECTORY_VERIFICATION_REQUIRES_DESCRIPTION, 'A description is required for verification');
  }
  if (!category || category === TagDirectoryCategories.OTHER) {
    throw new MockError(400, ApiErrorCodes.TAG_DIRECTORY_VERIFICATION_REQUIRES_CATEGORY, 'A category is required for verification');
  }
}

function editDirectory(item: TagDirectoryItem, fields: DirectoryFields) {
  if ((fields.title !== undefined || fields.description !== undefined || fields.category !== undefined) && item.verified === TagDirectoryVerificationStates.PENDING_VERIFICATION) {
    throw new MockError(400, ApiErrorCodes.TAG_DIRECTORY_PENDING_VERIFICATION, 'Cannot edit a tag that is currently undergoing verification');
  }
  if ((fields.description !== undefined || fields.category !== undefined) && item.verified === TagDirectoryVerificationStates.VERIFIED) {
    checkCanVerify(fields.description ?? item.description, fields.category ?? item.category);
  }
  // showing/hiding the content is allowed while under review, the listing's text isn't
  if (fields.content_public !== undefined) {
    item.content_public = fields.content_public;
    const source = state.tags.find((tag) => tag.id === item.id);
    item.tag.content = (item.content_public && source) ? source.content : '';
  }
  const changed = (fields.title !== undefined && fields.title !== item.title) || (fields.description !== undefined && fields.description !== item.description) ||
    (fields.category !== undefined && fields.category !== item.category);
  const { title, description, category } = fields;
  Object.assign(item, Object.fromEntries(Object.entries({title, description, category}).filter(([ , value ]) => value !== undefined)));
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

// mirrors `utilities/tools/tag_assets.py`: the owner changes the listing's media only while it's pending, each call answers
// with the listing. Uploads are served from an object url so they show up.
function findOwnPendingListing(tagId: string): TagDirectoryItem {
  findTag(tagId);
  const item = state.directory.get(tagId);
  if (!item) {
    throw new MockError(404, ApiErrorCodes.UNKNOWN_TAG_DIRECTORY_ITEM, 'Unknown Tag Directory Item');
  }
  if (item.verified !== TagDirectoryVerificationStates.PENDING_VERIFICATION) {
    throw new MockError(400, ApiErrorCodes.TAG_DIRECTORY_ASSETS_REQUIRE_PENDING, 'Assets can only be changed while the listing is pending verification');
  }
  return item;
}

function findListingAsset(item: TagDirectoryItem, assetId: string) {
  const asset = item.assets.find((other) => other.id === assetId);
  if (!asset) {
    throw new MockError(404, ApiErrorCodes.UNKNOWN_TAG_DIRECTORY_ASSET, 'Unknown Tag Directory Asset');
  }
  return asset;
}

function renumberAssets(item: TagDirectoryItem) {
  item.assets = item.assets.map((asset, position) => ({...asset, position}));
}

route('POST', '/users/@me/tags/(\\d+)/directory/assets', ([ , tagId ], { body }) => {
  const item = findOwnPendingListing(tagId);
  if (TAG_DIRECTORY_ASSETS_MAX <= item.assets.length) {
    throw new MockError(400, ApiErrorCodes.MAX_TAG_DIRECTORY_ASSETS, `Tag directory listing has reached the asset limit (${TAG_DIRECTORY_ASSETS_MAX})`, {limit: TAG_DIRECTORY_ASSETS_MAX});
  }
  const file = (body.file instanceof File) ? body.file : null;
  if (!file || !/^(image|video|audio)\//.test(file.type)) {
    throw new MockError(400, ApiErrorCodes.INVALID_FILE_TYPE, 'File must be an image, video, or audio', {mimetype: file?.type});
  }
  if (TAG_DIRECTORY_ASSET_SIZE_MAX < file.size) {
    throw new MockError(400, ApiErrorCodes.FILE_TOO_LARGE, 'File too large');
  }
  const extension = (/\.([a-z0-9]{1,12})$/i.exec(file.name)?.[1] ?? 'bin').toLowerCase();
  const id = String(Date.now() * 1000 + Math.floor(Math.random() * 1000));
  item.assets.push({
    filename: `${id}.${extension}`,
    filename_base: id,
    id,
    metadata: {duration: 0, extension, framecount: 1, height: 0, mimetype: file.type, size: file.size, width: 0},
    position: item.assets.length,
    urls: {cdn: URL.createObjectURL(file)},
  });
  return item;
});

route('PATCH', '/users/@me/tags/(\\d+)/directory/assets/(\\d+)', ([ , tagId, assetId ], { body }) => {
  const item = findOwnPendingListing(tagId);
  const asset = findListingAsset(item, assetId);
  const position = Number(body.position);
  if (!Number.isInteger(position) || position < 0 || TAG_DIRECTORY_ASSETS_MAX <= position) {
    throw new MockError(400, ApiErrorCodes.INVALID_FORM_BODY, 'Invalid Form Body', {field: 'position'});
  }
  const rest = item.assets.filter((other) => other.id !== assetId);
  rest.splice(Math.min(position, rest.length), 0, asset);
  item.assets = rest;
  renumberAssets(item);
  return item;
});

route('DELETE', '/users/@me/tags/(\\d+)/directory/assets/(\\d+)', ([ , tagId, assetId ]) => {
  const item = findOwnPendingListing(tagId);
  findListingAsset(item, assetId);
  item.assets = item.assets.filter((other) => other.id !== assetId);
  renumberAssets(item);
  return item;
});

// the real api shrinks it to a png (a video's first frame), the mock just shows the file
route('PUT', '/users/@me/tags/(\\d+)/directory/thumbnail', ([ , tagId ], { body }) => {
  const item = findOwnPendingListing(tagId);
  const file = (body.file instanceof File) ? body.file : null;
  if (!file || !/^(image|video)\//.test(file.type)) {
    throw new MockError(400, ApiErrorCodes.INVALID_FILE_TYPE, 'Thumbnail must be an image or video', {mimetype: file?.type});
  }
  if (TAG_DIRECTORY_ASSET_SIZE_MAX < file.size) {
    throw new MockError(400, ApiErrorCodes.FILE_TOO_LARGE, 'File too large');
  }
  const id = String(Date.now() * 1000 + Math.floor(Math.random() * 1000));
  item.thumbnail = {id, urls: {cdn: URL.createObjectURL(file)}};
  return item;
});

route('DELETE', '/users/@me/tags/(\\d+)/directory/thumbnail', ([ , tagId ]) => {
  const item = findOwnPendingListing(tagId);
  item.thumbnail = null;
  return item;
});

// mirrors `utilities/tools/tag_directory_edit_requests.py`: a verified listing's change request, each call answers with
// the listing (`edit_request` included). Uploads are served from an object url so they show up.
const EDIT_DRAFT = 0;
const EDIT_PENDING = 1;
const EDIT_APPROVED = 2;
const EDIT_REJECTED = 3;

function mockId() {
  return String(Date.now() * 1000 + Math.floor(Math.random() * 1000));
}

function findOwnListing(tagId: string): TagDirectoryItem {
  findTag(tagId);
  const item = state.directory.get(tagId);
  if (!item) {
    throw new MockError(404, ApiErrorCodes.UNKNOWN_TAG_DIRECTORY_ITEM, 'Unknown Tag Directory Item');
  }
  return item;
}

function openEditRequest(item: TagDirectoryItem, draftOnly = false): TagDirectoryEditRequest {
  const request = item.edit_request;
  if (!request || (request.status !== EDIT_DRAFT && request.status !== EDIT_PENDING)) {
    throw new MockError(404, ApiErrorCodes.UNKNOWN_TAG_DIRECTORY_EDIT_REQUEST, 'Unknown Change Request');
  }
  if (draftOnly && request.status !== EDIT_DRAFT) {
    throw new MockError(400, ApiErrorCodes.TAG_DIRECTORY_EDIT_REQUEST_NOT_DRAFT, 'The change request can only be changed while it\'s a draft');
  }
  return request;
}

function touchEditRequest(request: TagDirectoryEditRequest) {
  request.edited = new Date().toISOString();
  request.assets = request.assets.map((asset, position) => ({...asset, position}));
}

route('PUT', '/users/@me/tags/(\\d+)/directory/edit-request', ([ , tagId ]) => {
  const item = findOwnListing(tagId);
  if (item.verified !== TagDirectoryVerificationStates.VERIFIED) {
    throw new MockError(400, ApiErrorCodes.TAG_DIRECTORY_EDIT_REQUEST_REQUIRES_VERIFIED, 'Only verified listings can request changes');
  }
  const current = item.edit_request;
  if (!current || (current.status !== EDIT_DRAFT && current.status !== EDIT_PENDING)) {
    item.edit_request = {
      assets: item.assets.map((asset) => ({...asset, is_new: false})),
      content: null,
      created: new Date().toISOString(),
      edited: null,
      id: mockId(),
      note: '',
      reason: null,
      reviewed: null,
      status: EDIT_DRAFT,
      submitted: null,
      thumbnail: null,
      thumbnail_mode: 0,
    };
  }
  return item;
});

route('PATCH', '/users/@me/tags/(\\d+)/directory/edit-request', ([ , tagId ], { body }) => {
  const item = findOwnListing(tagId);
  const request = openEditRequest(item, true);
  if ('content' in body) {
    const content = (typeof body.content === 'string') ? body.content : null;
    request.content = (content === null || content === findTag(tagId).content) ? null : content;
  }
  if (typeof body.note === 'string') {
    request.note = body.note;
  }
  if (body.thumbnail_mode !== undefined && body.thumbnail_mode !== null) {
    request.thumbnail_mode = Number(body.thumbnail_mode);
    request.thumbnail = null;
  }
  touchEditRequest(request);
  return item;
});

route('DELETE', '/users/@me/tags/(\\d+)/directory/edit-request', ([ , tagId ]) => {
  const item = findOwnListing(tagId);
  openEditRequest(item);
  item.edit_request = null;
  return item;
});

route('POST', '/users/@me/tags/(\\d+)/directory/edit-request/submit', ([ , tagId ]) => {
  const item = findOwnListing(tagId);
  const request = openEditRequest(item, true);
  const mediaChanged = request.assets.map((asset) => asset.id).join() !== item.assets.map((asset) => asset.id).join();
  if (request.content === null && request.thumbnail_mode === 0 && !mediaChanged) {
    throw new MockError(400, ApiErrorCodes.TAG_DIRECTORY_EDIT_REQUEST_NO_CHANGES, 'The change request doesn\'t change anything yet');
  }
  request.status = EDIT_PENDING;
  request.submitted = new Date().toISOString();
  return item;
});

route('POST', '/users/@me/tags/(\\d+)/directory/edit-request/withdraw', ([ , tagId ]) => {
  const item = findOwnListing(tagId);
  const request = openEditRequest(item);
  if (request.status !== EDIT_PENDING) {
    throw new MockError(400, ApiErrorCodes.TAG_DIRECTORY_EDIT_REQUEST_NOT_PENDING, 'The change request isn\'t waiting for review');
  }
  request.status = EDIT_DRAFT;
  request.submitted = null;
  return item;
});

route('POST', '/users/@me/tags/(\\d+)/directory/edit-request/assets', ([ , tagId ], { body }) => {
  const item = findOwnListing(tagId);
  const request = openEditRequest(item, true);
  if (TAG_DIRECTORY_ASSETS_MAX <= request.assets.length) {
    throw new MockError(400, ApiErrorCodes.MAX_TAG_DIRECTORY_ASSETS, `Tag directory listing has reached the asset limit (${TAG_DIRECTORY_ASSETS_MAX})`, {limit: TAG_DIRECTORY_ASSETS_MAX});
  }
  const file = (body.file instanceof File) ? body.file : null;
  if (!file || !/^(image|video|audio)\//.test(file.type)) {
    throw new MockError(400, ApiErrorCodes.INVALID_FILE_TYPE, 'File must be an image, video, or audio', {mimetype: file?.type});
  }
  const extension = (/\.([a-z0-9]{1,12})$/i.exec(file.name)?.[1] ?? 'bin').toLowerCase();
  const id = mockId();
  request.assets.push({
    filename: `${id}.${extension}`,
    filename_base: id,
    id,
    is_new: true,
    metadata: {duration: 0, extension, framecount: 1, height: 0, mimetype: file.type, size: file.size, width: 0},
    position: request.assets.length,
    urls: {cdn: URL.createObjectURL(file)},
  });
  touchEditRequest(request);
  return item;
});

route('PATCH', '/users/@me/tags/(\\d+)/directory/edit-request/assets/(\\d+)', ([ , tagId, assetId ], { body }) => {
  const item = findOwnListing(tagId);
  const request = openEditRequest(item, true);
  const asset = request.assets.find((other) => other.id === assetId);
  if (!asset) {
    throw new MockError(404, ApiErrorCodes.UNKNOWN_TAG_DIRECTORY_ASSET, 'Unknown Tag Directory Asset');
  }
  const rest = request.assets.filter((other) => other.id !== assetId);
  rest.splice(Math.min(Number(body.position), rest.length), 0, asset);
  request.assets = rest;
  touchEditRequest(request);
  return item;
});

route('DELETE', '/users/@me/tags/(\\d+)/directory/edit-request/assets/(\\d+)', ([ , tagId, assetId ]) => {
  const item = findOwnListing(tagId);
  const request = openEditRequest(item, true);
  if (!request.assets.some((other) => other.id === assetId)) {
    throw new MockError(404, ApiErrorCodes.UNKNOWN_TAG_DIRECTORY_ASSET, 'Unknown Tag Directory Asset');
  }
  request.assets = request.assets.filter((other) => other.id !== assetId);
  touchEditRequest(request);
  return item;
});

route('PUT', '/users/@me/tags/(\\d+)/directory/edit-request/thumbnail', ([ , tagId ], { body }) => {
  const item = findOwnListing(tagId);
  const request = openEditRequest(item, true);
  const file = (body.file instanceof File) ? body.file : null;
  if (!file || !/^(image|video)\//.test(file.type)) {
    throw new MockError(400, ApiErrorCodes.INVALID_FILE_TYPE, 'Thumbnail must be an image or video', {mimetype: file?.type});
  }
  request.thumbnail = {id: mockId(), urls: {cdn: URL.createObjectURL(file)}};
  request.thumbnail_mode = 1;
  touchEditRequest(request);
  return item;
});

function pendingEditRequest(tagId: string): [TagDirectoryItem, TagDirectoryEditRequest] {
  const item = state.directory.get(tagId);
  const request = item?.edit_request;
  if (!item || !request || request.status !== EDIT_PENDING) {
    throw new MockError(404, ApiErrorCodes.UNKNOWN_TAG_DIRECTORY_EDIT_REQUEST, 'Unknown Change Request');
  }
  return [item, request];
}

route('POST', '/admin/tags/directory/(\\d+)/edit-request/approve', ([ , tagId ]) => {
  requireBotOwner();
  const [ item, request ] = pendingEditRequest(tagId);
  if (request.content !== null) {
    const source = findTag(tagId);
    source.content = request.content;
    item.tag.content = (item.content_public) ? request.content : '';
  }
  item.assets = request.assets.map(({ is_new: _isNew, ...asset }, position) => ({...asset, position}));
  if (request.thumbnail_mode === 1) {
    item.thumbnail = request.thumbnail;
  } else if (request.thumbnail_mode === 2) {
    item.thumbnail = null;
  }
  item.edited = new Date().toISOString();
  item.edit_request = {...request, assets: [], status: EDIT_APPROVED, reviewed: new Date().toISOString(), thumbnail: null};
  return ownListingAsAdmin(item);
});

route('POST', '/admin/tags/directory/(\\d+)/edit-request/reject', ([ , tagId ], { body }) => {
  requireBotOwner();
  const [ item, request ] = pendingEditRequest(tagId);
  const reason = (typeof body.reason === 'string' && body.reason) ? body.reason : null;
  item.edit_request = {...request, assets: [], status: EDIT_REJECTED, reason, reviewed: new Date().toISOString(), thumbnail: null};
  return ownListingAsAdmin(item);
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
  checkCanVerify(item.description, item.category);
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

// `/admin/guilds/<id>/...` reuse the routes below: any server, every area editable (staff only)
function findAdminGuild(guildId: string) {
  requireBotOwner();
  const item = state.adminGuilds.find((other) => other.entry.summary.id === guildId);
  if (!item) {
    throw new MockError(404, ApiErrorCodes.UNKNOWN_SERVER, 'Unknown Server');
  }
  return item;
}

function scopedGuild(scope: string, guildId: string, area: keyof ReturnType<typeof guildEditable>) {
  return (scope === 'admin') ? findAdminGuild(guildId).entry : requireEditable(guildId, area);
}

route('GET', '/users/@me/guilds', () => {
  throwGuildsError();
  return state.guilds.map((entry) => entry.summary);
});

route('GET', '/users/@me/guilds/(\\d+)', ([ , guildId ]) => {
  throwGuildsError();
  return guildDetail(guildId);
});

const ADMIN_BYPASS_SETTINGS = ['allowlist_admin_bypass', 'blocklist_admin_bypass', 'commands_allowlist_admin_bypass', 'commands_blocklist_admin_bypass'] as const;

// null resets one to true
function applyAdminBypassSettings(detail: {settings: UserGuild['settings']}, body: Record<string, unknown>) {
  for (const key of ADMIN_BYPASS_SETTINGS) {
    if (key in body) {
      detail.settings[key] = (body[key] === null) ? true : !!body[key];
    }
  }
}

route('PATCH', '/users/@me/guilds/(\\d+)', ([ , guildId ], { body }) => {
  const { detail } = requireEditable(guildId, 'settings');
  if (ADMIN_BYPASS_SETTINGS.some((key) => key in body)) {
    requireEditable(guildId, 'admin_bypass');
  }
  const settingsKeys = ['ml_diffusion_model', 'ml_llm_model', 'ml_llm_personality', 'response_display'] as const;
  for (const key of settingsKeys) {
    if (key in body) {
      (detail.settings as unknown as Record<string, unknown>)[key] = body[key];
    }
  }
  applyAdminBypassSettings(detail, body);
  if ('locale' in body) {
    detail.locale = (body.locale as string | null) || null;
  }
  if ('timezone' in body) {
    detail.timezone = (body.timezone as string | null) || null;
  }
  return guildDetail(guildId);
});

route('PUT', '/(users/@me|admin)/guilds/(\\d+)/prefixes', ([ , scope, guildId ], { body }) => {
  const { detail } = scopedGuild(scope, guildId, 'prefixes');
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

route('POST', '/(users/@me|admin)/guilds/(\\d+)/prefixes/delete', ([ , scope, guildId ], { body }) => {
  const { detail } = scopedGuild(scope, guildId, 'prefixes');
  detail.prefixes = detail.prefixes.filter((item) => item.prefix !== body.prefix);
  return detail.prefixes;
});

route('(PUT|DELETE)', '/(users/@me|admin)/guilds/(\\d+)/(allowlist|blocklist)/(\\d+)/(channel|role|user)', ([ , scope, guildId, list, id, type ], { method }) => {
  const { detail } = scopedGuild(scope, guildId, list as 'allowlist' | 'blocklist');
  const key = list as 'allowlist' | 'blocklist';
  detail[key] = detail[key].filter((item) => !(item.id === id && item.type === type));
  if (method === 'PUT') {
    detail[key].push({added: new Date().toISOString(), admin_bypass: null, id, type, user_id: mockUser.id});
  }
  return undefined;
});

route('PATCH', '/(users/@me|admin)/guilds/(\\d+)/(allowlist|blocklist)/(\\d+)/(channel|role|user)', ([ , scope, guildId, list, id, type ], { body }) => {
  const { detail } = scopedGuild(scope, guildId, 'admin_bypass');
  const entry = detail[list as 'allowlist' | 'blocklist'].find((item) => item.id === id && item.type === type);
  if (!entry) {
    throw new MockError(404, ApiErrorCodes.UNKNOWN_GUILD_LIST_ITEM, 'Unknown List Item');
  }
  entry.admin_bypass = (typeof body.admin_bypass === 'boolean') ? body.admin_bypass : null;
  return undefined;
});

route('(PUT|DELETE)', '/(users/@me|admin)/guilds/(\\d+)/commands/([^/]+)/(allowlist|blocklist)/(\\d+)/(channel|guild|role|user)', ([ , scope, guildId, rawCommand, list, id, type ], { method }) => {
  const { detail } = scopedGuild(scope, guildId, 'commands');
  const command = decodeURIComponent(rawCommand);
  if (command === 'notacommand') {
    throw new MockError(404, 10011, 'Unknown Command');
  }
  const key = (list === 'allowlist') ? 'commands_allowlist' : 'commands_blocklist';
  detail[key] = detail[key].filter((item) => !(item.command === command && item.id === id && item.type === type));
  if (method === 'PUT') {
    detail[key].push({added: new Date().toISOString(), admin_bypass: null, command, id, type, user_id: mockUser.id});
  }
  return undefined;
});

route('PATCH', '/(users/@me|admin)/guilds/(\\d+)/commands/([^/]+)/(allowlist|blocklist)/(\\d+)/(channel|guild|role|user)', ([ , scope, guildId, rawCommand, list, id, type ], { body }) => {
  const { detail } = scopedGuild(scope, guildId, 'admin_bypass');
  const command = decodeURIComponent(rawCommand);
  const key = (list === 'allowlist') ? 'commands_allowlist' : 'commands_blocklist';
  const entry = detail[key].find((item) => item.command === command && item.id === id && item.type === type);
  if (!entry) {
    throw new MockError(404, ApiErrorCodes.UNKNOWN_GUILD_LIST_ITEM, 'Unknown List Item');
  }
  entry.admin_bypass = (typeof body.admin_bypass === 'boolean') ? body.admin_bypass : null;
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

route('POST', '/(users/@me|admin)/guilds/(\\d+)/loggers/delete', ([ , scope, guildId ], { body }) => {
  const { detail } = scopedGuild(scope, guildId, 'loggers');
  detail.loggers = detail.loggers.filter((item) => !(item.channel_id === String(body.channel_id) && item.type === Number(body.type)));
  return undefined;
});


route('GET', '/(users/@me|admin)/guilds/(\\d+)/data/export', ([ , scope, guildId ]) => {
  const { detail } = (scope === 'admin') ? findAdminGuild(guildId).entry : requireOwner(guildId);
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

route('POST', '/(users/@me|admin)/guilds/(\\d+)/data/delete', ([ , scope, guildId ]) => {
  const { detail } = (scope === 'admin') ? findAdminGuild(guildId).entry : requireOwner(guildId);
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
    settings: createGuildSettings(),
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
    // staff only see a request once it's submitted
    edit_request: (item.edit_request?.status === 1) ? item.edit_request : null,
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
    category: item.category,
    thumbnail: item.thumbnail ?? null,
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
  const editRequest = parseBool(query.get('edit_request'));
  const category = parseCategory(query.get('category'));
  const matching = [...state.adminDirectory, ...[...state.directory.values()].map(ownListingAsAdmin)]
    .filter((item) => category === undefined || item.category === category)
    .filter((item) => verified === null || verified === '' || item.verified === Number(verified))
    .filter((item) => nsfw === null || item.tag.nsfw === nsfw)
    .filter((item) => editRequest === null || !!item.edit_request === editRequest)
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
  const serverId = query.get('server_id');
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
    .filter((item) => !serverId || item.tag.server_id === serverId)
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
  // checked against the listing as it'll be after this request, same as the api
  const current = state.directory.get(tagId) ?? state.adminDirectory.find((other) => other.id === tagId);
  if (current) {
    const verified = (body.verified !== undefined) ? Number(body.verified) : current.verified;
    if (verified === TagDirectoryVerificationStates.VERIFIED && (body.verified !== undefined || typeof body.description === 'string' || body.category !== undefined)) {
      checkCanVerify((typeof body.description === 'string') ? body.description : current.description, (body.category !== undefined) ? Number(body.category) : current.category);
    }
  }
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
    if (typeof body.title === 'string' || typeof body.description === 'string' || body.category !== undefined) {
      const fields = directoryFields({title: body.title, description: body.description, category: body.category});
      Object.assign(own, Object.fromEntries(Object.entries(fields).filter(([ , value ]) => value !== undefined)));
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
  const category = parseCategory(body.category);
  if (category !== undefined) {
    item.category = category;
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

// mirror `/admin/tags/<tag_id>/servers` (and the counts of `GET /users/@me/tags/<tag_id>/servers`): made-up servers that added the tag,
// as many as the listing's `server_count` (a few of them are only counted, like DMs)
const MOCK_SERVER_WORDS = ['Pixel', 'Meme', 'Cozy', 'Gamer', 'Art', 'Late Night', 'Study', 'Anime', 'Retro', 'Chill', 'Bot Testing', 'Music'];

function tagServers(tagId: string) {
  const listing = state.directory.get(tagId) ?? state.adminDirectory.find((item) => item.id === tagId);
  const total = listing?.server_count ?? 0;
  const otherCount = Math.min(total, total % 3);
  const name = listing?.tag.name ?? 'tag';
  const servers = Array.from({length: total - otherCount}, (_, i) => {
    const known = state.guilds[i]?.summary;
    return {
      added: new Date(Date.now() - (i + 1) * 36e5 * 31).toISOString(),
      icon: null,
      id: known?.id ?? String(1200000000000000000n + BigInt(tagId.slice(-6)) * 1000n + BigInt(i)),
      name: known?.name ?? `${MOCK_SERVER_WORDS[i % MOCK_SERVER_WORDS.length]} Club ${i + 1}`,
      names: (i % 5 === 2) ? [name, `${name}2`] : [name],
    };
  });
  const aliasCount = otherCount + servers.reduce((sum, server) => sum + server.names.length, 0);
  return {alias_count: aliasCount, other_count: otherCount, server_count: total, servers, truncated: false};
}

route('GET', '/users/@me/tags/(\\d+)/servers', ([ , tagId ]) => {
  findTag(tagId);
  const { alias_count, server_count } = tagServers(tagId);
  return {alias_count, server_count};
});

route('GET', '/admin/tags/(\\d+)/servers', ([ , tagId ]) => {
  requireBotOwner();
  return tagServers(tagId);
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
  const mimetype = file?.type || `image/${extension}`;
  const asset = {
    filename: `${id}.${extension}`,
    filename_base: id,
    id,
    // roughly `Mimetyper.is_text`
    is_text: /^text\/|^application\/(json|javascript|xml)$|^application\/(?!lottie).*\+(json|xml)$/.test(mimetype),
    metadata: {duration: 0, extension, framecount: 1, height: 0, mimetype, size: file?.size ?? 0, width: 0},
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
// mirrors `POST /admin/tags/<tag_id>/merge`: the tag's uses go onto `target_id`, its aliases point there, its directory
// listing moves there when the target isn't listed, then it's deleted
route('POST', '/admin/tags/(\\d+)/merge', ([ , tagId ], { body }) => {
  requireBotOwner();
  const find = (id: string) => {
    const mine = state.tags.find((tag) => tag.id === id);
    if (mine) {
      return {tag: mine as unknown as AdminDirectoryTag, user: mockUser as AdminUserRef};
    }
    const listed = state.adminDirectory.find((item) => item.tag.id === id);
    return (listed) ? {tag: listed.tag, user: listed.user} : null;
  };
  const source = find(tagId);
  const target = find(String(body.target_id ?? ''));
  if (!source) {
    throw new MockError(404, ApiErrorCodes.UNKNOWN_TAG, 'Unknown Tag');
  }
  if (!target) {
    throw new MockError(404, ApiErrorCodes.UNKNOWN_TAG, 'Unknown Target Tag');
  }
  if (source.tag.id === target.tag.id) {
    throw new MockError(400, 50012, 'Cannot replace a tag with itself');
  }
  if (target.tag.reference_tag) {
    throw new MockError(400, 50014, 'Cannot replace a tag with a Tag Alias, use the tag it points at');
  }
  const aliases = state.tags.filter((tag) => (tag.reference_tag as {id?: string} | null | undefined)?.id === source.tag.id);
  const isListed = (id: string) => state.directory.has(id) || state.adminDirectory.some((item) => item.tag.id === id);
  const directoryOutcome = () => {
    if (!isListed(source.tag.id)) {
      return null;
    }
    return (isListed(target.tag.id)) ? 'dropped' as const : 'moved' as const;
  };
  const summary = {
    aliases: aliases.length,
    assets: source.tag.assets?.length ?? 0,
    blobs: {dropped: 0, moved: state.blobs.get(source.tag.id)?.size ?? 0},
    directory: directoryOutcome(),
    directory_moves_target: directoryOutcome() === 'moved' && target.tag.server_id !== target.tag.user_id,
    use_records: source.tag.uses,
    uses: source.tag.uses,
    variables: {dropped: 0, moved: state.variables.get(source.tag.id)?.size ?? 0},
  };
  const payload = (entry: NonNullable<ReturnType<typeof find>>) => ({...entry.tag, user: entry.user});
  if (body.dry_run) {
    return {...summary, source: payload(source), target: payload(target)};
  }
  target.tag.uses += source.tag.uses;
  for (const alias of aliases) {
    alias.reference_tag = {...alias.reference_tag!, id: target.tag.id, name: target.tag.name, content: target.tag.content};
  }
  if (summary.directory === 'moved') {
    const listing = state.directory.get(source.tag.id);
    if (listing) {
      state.directory.set(target.tag.id, {...listing, id: target.tag.id, tag: {...listing.tag, id: target.tag.id, name: target.tag.name}});
    }
    state.adminDirectory = state.adminDirectory.map((item) => (item.tag.id === source.tag.id) ? {...item, tag: target.tag, user: target.user} : item);
  }
  state.tags = state.tags.filter((tag) => tag.id !== source.tag.id);
  state.adminDirectory = state.adminDirectory.filter((item) => item.tag.id !== source.tag.id);
  state.directory.delete(source.tag.id);
  return {...summary, source: payload(source), target: payload(target)};
});

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
  let entries = adminUserEntries(state.adminUsers, state.contentFlags, state.reports)
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
    if (sortBy === 'confirmed') {
      return (b.content_flags.confirmed - a.content_flags.confirmed) || (b.content_flags.flagged - a.content_flags.flagged);
    }
    if (sortBy === 'last_flagged') {
      return (lastFlagged(b) - lastFlagged(a)) || ((BigInt(b.user.id) > BigInt(a.user.id)) ? 1 : -1);
    }
    return (b.content_flags.flagged - a.content_flags.flagged) || (b.content_flags.total - a.content_flags.total);
  });
  return pageOf(entries, query);
});

// the flag with its user as they are now, like the api's join (blocking happens after the fixtures are made)
function withUser(flag: ContentFlag): ContentFlag {
  const user = state.adminUsers.find((other) => other.id === flag.user_id);
  return (user && flag.user) ? {...flag, user: {...flag.user, blocked: user.blocked, blocked_reason: user.blocked_reason, flags: user.flags}} : flag;
}

route('GET', '/admin/content-flags/(\\d+)', ([ , flagId ]) => {
  requireBotOwner();
  const flag = state.contentFlags.find((other) => other.id === flagId);
  if (!flag) {
    throw new MockError(404, ApiErrorCodes.UNKNOWN_CONTENT_FLAG, 'Unknown Content Flag');
  }
  return flag;
});

route('GET', '/admin/content-flags', (_match, { query }) => {
  requireBotOwner();
  const userId = query.get('user_id');
  const status = query.get('status');
  const category = query.get('category');
  const needsReview = parseBool(query.get('needs_human_review'));
  const autoConfirmed = parseBool(query.get('auto_confirmed'));
  const type = query.get('type');
  const guildId = query.get('guild_id');
  const channelId = query.get('channel_id');
  const tagId = query.get('tag_id');
  const includeBlocked = parseBool(query.get('include_blocked')) ?? false;
  // mirrors `_content_flag_command_condition`
  const commandId = (query.get('command_id') || '').trim().toLowerCase().split(/\s+/).join('.');
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
    if (/^\d+$/.test(caseId) && (flag.id === caseId || flag.message_id === caseId || flag.tag_id === caseId)) {
      return true;
    }
    if ([flag.query, flag.source_url, flag.command_id].some((value) => value && value.toLowerCase().includes(search))) {
      return true;
    }
    if (search.length >= 6 && /^[0-9a-f]+$/.test(search)) {
      return [flag.sha256, flag.pdq].some((hash) => hash && ((search.length === 64) ? hash === search : hash.startsWith(search)));
    }
    return false;
  };
  const matching = state.contentFlags
    .map(withUser)
    .filter((flag) => includeBlocked || !flag.user?.blocked)
    .filter((flag) => !userId || flag.user_id === userId)
    .filter((flag) => !guildId || flag.guild_id === guildId)
    .filter((flag) => !channelId || flag.channel_id === channelId)
    .filter((flag) => !tagId || flag.tag_id === tagId)
    .filter((flag) => {
      const value = (flag.command_id || '').toLowerCase();
      return !commandId || value === commandId || value.startsWith(`${commandId}.`);
    })
    .filter((flag) => status === null || status === '' || flag.status === Number(status))
    .filter((flag) => !category || flag.category === category)
    .filter((flag) => needsReview === null || flag.needs_human_review === needsReview)
    .filter((flag) => autoConfirmed === null || !!flag.auto_confirmed_from === autoConfirmed)
    .filter((flag) => !type || (flag.mimetype === 'text/plain') === (type === 'text'))
    .filter(matchesSearch);
  return pageOf(matching, query);
});

// mirrors `_content_flag_match_condition`
const PDQ_MATCH_DISTANCE = 31;

function hexDistance(a: string, b: string): number {
  let bits = 0;
  for (let i = 0; i < a.length; i++) {
    let xor = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    for (; xor; xor &= xor - 1) {
      bits++;
    }
  }
  return bits;
}

function contentFlagMatches(flag: ContentFlag, sha256: boolean, pdq: boolean): Array<ContentFlag> {
  return state.contentFlags.filter((other) => other.id !== flag.id && (
    (sha256 && other.sha256 === flag.sha256) ||
    (pdq && !!flag.pdq && !!other.pdq && other.sha256 !== flag.sha256 && hexDistance(other.pdq, flag.pdq) <= PDQ_MATCH_DISTANCE)
  ));
}

function statusCounts(flags: Array<ContentFlag>) {
  const count = (status: number) => flags.filter((flag) => flag.status === status).length;
  return {pending: count(0), confirmed: count(1), dismissed: count(2), reported: count(3)};
}

route('GET', '/admin/content-flags/(\\d+)/matches', ([ , flagId ]) => {
  requireBotOwner();
  const flag = state.contentFlags.find((other) => other.id === flagId);
  if (!flag) {
    throw new MockError(404, 10000, 'Unknown Content Flag');
  }
  return {
    sha256: (flag.sha256) ? statusCounts(contentFlagMatches(flag, true, false)) : null,
    pdq: (flag.pdq) ? statusCounts(contentFlagMatches(flag, false, true)) : null,
    pdq_distance: PDQ_MATCH_DISTANCE,
  };
});

// a placeholder image instead of the source media, so its sha256 never matches (shows the "not the same file" warning)
// the media viewer's jobs: queued when started, then started on the first `GET /jobs/<id>` and finished on the second,
// which hands over the file once and deletes the job (like the api)
const mediaJobs = new Map<string, {flagId: string, polls: number}>();

function mockJobResponse(id: string, status: string, response: unknown = null) {
  return {id, position: 0, status, user_id: null, result: {error: null, error_code: null, response, took: 0}};
}

route('POST', '/admin/content-flags/(\\d+)/media', ([ , flagId ]) => {
  requireBotOwner();
  const flag = state.contentFlags.find((other) => other.id === flagId);
  if (!flag) {
    throw new MockError(404, 10000, 'Unknown Content Flag');
  }
  if (['unsafe_child_safety', 'review_child_safety'].includes(flag.category ?? '') || (flag.flagged ?? []).includes('child_safety') || (flag.flagged_for_review ?? []).includes('child_safety')) {
    throw new MockError(403, ApiErrorCodes.MISSING_ACCESS, 'Media flagged for child safety can\'t be viewed');
  }
  if (!flag.source_url) {
    throw new MockError(404, 40008, 'Content flag has no source url');
  }
  const jobId = crypto.randomUUID();
  mediaJobs.set(jobId, {flagId, polls: 0});
  return mockJobResponse(jobId, 'queued');
});

// a placeholder image instead of the source media, so its sha256 never matches (shows the "not the same file" warning)
route('GET', '/jobs/([0-9a-f-]+)', ([ , jobId ]) => {
  const job = mediaJobs.get(jobId);
  if (!job) {
    throw new MockError(404, ApiErrorCodes.UNKNOWN_JOB, 'Unknown Job');
  }
  job.polls += 1;
  if (job.polls < 2) {
    return mockJobResponse(jobId, 'started');
  }
  mediaJobs.delete(jobId);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="#5865f2"/>` +
    `<text x="320" y="190" font-family="sans-serif" font-size="32" fill="#fff" text-anchor="middle">mock media #${job.flagId}</text></svg>`;
  // the api only extracts frames for multi-frame media
  const flag = state.contentFlags.find((other) => other.id === job.flagId);
  const flaggedFrames = ((flag && 1 < (flag.frames ?? 0)) ? (flag.frames_flagged ?? []) : []).slice(0, 8).map((frame) => ({
    frame,
    mimetype: 'image/svg+xml',
    timestamp: frame * 2,
    value: btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="#eb459e"/>` +
      `<text x="320" y="190" font-family="sans-serif" font-size="32" fill="#fff" text-anchor="middle">frame ${frame}</text></svg>`),
  }));
  return mockJobResponse(jobId, 'finished', {file: {value: btoa(svg), metadata: {mimetype: 'image/svg+xml'}}, flagged_frames: flaggedFrames});
});

route('DELETE', '/jobs/([0-9a-f-]+)', ([ , jobId ]) => {
  if (!mediaJobs.delete(jobId)) {
    throw new MockError(404, ApiErrorCodes.UNKNOWN_JOB, 'Unknown Job');
  }
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
    const others = contentFlagMatches(flag, !!body.match_sha256, !!body.match_pdq).filter((other) => other.status === 0);
    // a reviewer set it, so it isn't an auto-confirm anymore
    flag.auto_confirmed_from = null;
    for (const target of [flag, ...others]) {
      target.status = status;
      target.reviewed_at = (status) ? new Date().toISOString() : null;
      target.reviewed_by = (status) ? mockUser.id : null;
    }
  }
  if (body.notes !== undefined) {
    flag.notes = (typeof body.notes === 'string' && body.notes) ? body.notes : null;
  }
  return withUser(flag);
});

// mirrors `admin_post_content_flag_prompt`
route('POST', '/admin/content-flags/(\\d+)/prompt', ([ , flagId ]) => {
  requireBotOwner();
  const flag = state.contentFlags.find((other) => other.id === flagId);
  if (!flag) {
    throw new MockError(404, 10000, 'Unknown Content Flag');
  }
  if (flag.mimetype === CONTENT_FLAG_TEXT_MIMETYPE) {
    throw new MockError(400, ApiErrorCodes.INVALID_FORM_BODY, 'Content flag is already a text flag');
  }
  if (!flag.query) {
    throw new MockError(400, ApiErrorCodes.INVALID_FORM_BODY, 'Content flag has no prompt to flag');
  }
  // not a real sha256, the mock only needs it to differ from the media's
  flag.sha256 = Array.from(flag.query).reduce((hash, char) => ((hash * 31) + char.charCodeAt(0)) >>> 0, 7).toString(16).padStart(64, '0');
  flag.pdq = null;
  flag.mimetype = CONTENT_FLAG_TEXT_MIMETYPE;
  flag.size = new TextEncoder().encode(flag.query).length;
  flag.frames = 0;
  flag.frames_flagged = [];
  flag.source_url = null;
  return withUser(flag);
});

route('POST', '/admin/content-flags/(\\d+)/translate', ([ , flagId ]) => {
  requireBotOwner();
  const flag = state.contentFlags.find((other) => other.id === flagId);
  if (!flag) {
    throw new MockError(404, 10000, 'Unknown Content Flag');
  }
  if (!flag.query) {
    throw new MockError(400, ApiErrorCodes.INVALID_FORM_BODY, 'Content flag has no text to translate');
  }
  // anything ascii counts as english already
  const english = !/[^\x00-\x7f]/.test(flag.query);
  flag.translation = (english) ? null : `[mock english] ${flag.query}`;
  flag.translation_language = (english) ? 'en' : 'ja';
  return withUser(flag);
});

route('GET', '/admin/reports/(\\d+)', ([ , reportId ]) => {
  requireBotOwner();
  const report = state.reports.find((other) => other.id === reportId);
  if (!report) {
    throw new MockError(404, ApiErrorCodes.UNKNOWN_REPORT, 'Unknown Report');
  }
  return report;
});

route('GET', '/admin/reports', (_match, { query }) => {
  requireBotOwner();
  const type = query.get('type');
  const status = query.get('status');
  const userId = query.get('user_id');
  const targetId = query.get('target_id');
  const guildId = query.get('guild_id');
  const matching = state.reports
    .filter((report) => !guildId || reportInGuild(report, guildId))
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


// sent from the server, or a server report about it (same as the api's `guild_id` filter)
function reportInGuild(report: {guild_id: string | null, target_id: string | null, type: number}, guildId: string) {
  return report.guild_id === guildId || (report.type === 2 && report.target_id === guildId);
}


/* admin servers */

function adminGuildCounts(guildId: string) {
  return {
    content_flags: state.contentFlags.filter((flag) => flag.guild_id === guildId).length,
    reports: state.reports.filter((report) => reportInGuild(report, guildId)).length,
    tags: state.tags.filter((tag) => tag.server_id === guildId).length,
  };
}

function adminGuildDetail(guildId: string) {
  const item = findAdminGuild(guildId);
  // opening one the bot never saved creates its row from Discord, like the api
  item.saved = true;
  const { entry } = item;
  return {
    ...entry.detail,
    bot: item.bot,
    counts: {
      ...adminGuildCounts(guildId),
      reminders: state.reminders.filter((reminder) => reminder.guild_id === guildId).length,
    },
    editable: {allowlist: true, blocklist: true, commands: true, loggers: true, prefixes: true, settings: true, admin_bypass: true},
    owner: false,
    permissions: '0',
  };
}

route('GET', '/admin/guilds', (_match, { query }) => {
  requireBotOwner();
  const search = (query.get('query') || '').trim().toLowerCase();
  const inBot = parseBool(query.get('in_bot'));
  const blocked = parseBool(query.get('blocked'));
  const byId = (a: string, b: string) => (BigInt(a) > BigInt(b)) ? 1 : (BigInt(a) < BigInt(b)) ? -1 : 0;
  const items = state.adminGuilds
    .map(({ entry, bot, saved }) => ({
      blocked: entry.detail.blocked,
      blocked_reason: entry.detail.blocked_reason,
      bot,
      counts: adminGuildCounts(entry.detail.id),
      icon: (saved) ? entry.detail.icon : null,
      id: entry.detail.id,
      name: (saved) ? entry.detail.name : null,
    }))
    .filter((item) => !search || (item.name ?? '').toLowerCase().includes(search) || item.id === search)
    .filter((item) => inBot === null || !!item.bot === inBot)
    .filter((item) => blocked === null || item.blocked === blocked)
    .filter((item) => {
      // mirrors `flagged_within`: the server's last content flag is that recent
      const hours = Number(query.get('flagged_within')) || 0;
      if (!hours) {
        return true;
      }
      const since = Date.now() - hours * 3600000;
      return state.contentFlags.some((flag) => flag.guild_id === item.id && since <= toDate(flag.created).getTime());
    });
  const sortBy = query.get('sort_by');
  items.sort((a, b) => {
    if (sortBy === 'name') {
      return (a.name === null) ? 1 : (b.name === null) ? -1 : a.name.localeCompare(b.name) || byId(a.id, b.id);
    }
    if (sortBy === 'flags_most' || sortBy === 'flags_least') {
      const difference = a.counts.content_flags - b.counts.content_flags;
      return ((sortBy === 'flags_most') ? -difference : difference) || byId(b.id, a.id);
    }
    if (sortBy === 'reports_most' || sortBy === 'reports_least') {
      const difference = a.counts.reports - b.counts.reports;
      return ((sortBy === 'reports_most') ? -difference : difference) || byId(b.id, a.id);
    }
    return (sortBy === 'oldest') ? byId(a.id, b.id) : byId(b.id, a.id);
  });
  return pageOf(items, query);
});

route('GET', '/admin/guilds/(\\d+)', ([ , guildId ]) => adminGuildDetail(guildId));

route('PATCH', '/admin/guilds/(\\d+)', ([ , guildId ], { body }) => {
  const { detail } = findAdminGuild(guildId).entry;
  const settingsKeys = ['ml_diffusion_model', 'ml_llm_model', 'ml_llm_personality', 'response_display'] as const;
  for (const key of settingsKeys) {
    if (key in body) {
      (detail.settings as unknown as Record<string, unknown>)[key] = body[key];
    }
  }
  applyAdminBypassSettings(detail, body);
  if ('locale' in body) {
    detail.locale = (body.locale as string | null) || null;
  }
  if ('timezone' in body) {
    detail.timezone = (body.timezone as string | null) || null;
  }
  if (typeof body.blocked === 'boolean' && body.blocked !== detail.blocked) {
    detail.blocked = body.blocked;
    if (!body.blocked) {
      detail.blocked_reason = null;
    }
  }
  if (detail.blocked && 'blocked_reason' in body) {
    detail.blocked_reason = (typeof body.blocked_reason === 'string' && body.blocked_reason) ? body.blocked_reason : null;
  }
  return adminGuildDetail(guildId);
});


// entitlements: read only, newest first like the api
route('GET', '/users/@me/entitlements', () => {
  const items = state.entitlements
    .filter((entitlement) => entitlement.user?.id === mockUser.id)
    .map(({ external_id: _externalId, user: _user, ...entitlement }) => entitlement);
  return {count: items.length, items};
});

route('GET', '/admin/entitlements', (_match, { query }) => {
  requireBotOwner();
  const userId = query.get('user_id');
  const provider = query.get('provider');
  const premiumType = query.get('premium_type');
  const active = parseBool(query.get('active'));
  const matching = state.entitlements
    .filter((entitlement) => !userId || entitlement.user?.id === userId)
    .filter((entitlement) => !provider || entitlement.provider === provider)
    .filter((entitlement) => !premiumType || entitlement.premium_type === Number(premiumType))
    .filter((entitlement) => active === null || entitlement.active === active)
    .sort((a, b) => (BigInt(b.id) > BigInt(a.id)) ? 1 : -1);
  return pageOf(matching, query);
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

route('GET', '/users/@me/reports/(\\d+)', ([ , reportId ]) => {
  // the same every-other fixture report the list treats as the mock user's own
  const report = state.reports.filter((_report, index) => index % 2 === 0).find((other) => other.id === reportId);
  if (!report) {
    throw new MockError(404, ApiErrorCodes.UNKNOWN_REPORT, 'Unknown Report');
  }
  const { notes: _notes, reviewed_by: _reviewedBy, user: _user, ...rest } = report;
  return rest;
});

route('GET', '/users/@me/reports', (_match, { query }) => {
  // every other fixture report stands in for the mock user's own (bug, message and tag ones), staff fields left out like the api does
  const status = query.get('status');
  const matching = state.reports
    .filter((_report, index) => index % 2 === 0)
    .filter((report) => status === null || status === '' || report.status === Number(status))
    .map(({ notes: _notes, reviewed_by: _reviewedBy, user: _user, ...report }) => report);
  return pageOf(matching, query);
});

// mirrors `views/me_files.py`
route('GET', '/users/@me/files', (_match, { query }) => {
  const search = (query.get('query') ?? '').toLowerCase();
  const sortBy = query.get('sort_by') ?? 'newest';
  const matching = state.files.filter((file) => !search || file.filename_base.toLowerCase().includes(search) || file.vanity.toLowerCase().includes(search));
  const byId = (a: (typeof state.files)[number], b: (typeof state.files)[number]) => a.id.length - b.id.length || a.id.localeCompare(b.id);
  matching.sort((a, b) => {
    switch (sortBy) {
      case 'oldest': return byId(a, b);
      case 'largest': return b.metadata.size - a.metadata.size || byId(b, a);
      case 'name': return a.filename_base.toLowerCase().localeCompare(b.filename_base.toLowerCase()) || byId(a, b);
      default: return byId(b, a);
    }
  });
  const sizeOf = (files: typeof state.files) => files.reduce((sum, file) => sum + file.metadata.size, 0);
  return {
    ...pageOf(matching, query),
    size: sizeOf(matching),
    total: {count: state.files.length, size: sizeOf(state.files)},
  };
});

route('DELETE', '/users/@me/files/(\\d+)', ([ , fileId ]) => {
  if (!state.files.some((file) => file.id === fileId)) {
    throw new MockError(404, ApiErrorCodes.UNKNOWN_FILE, 'Unknown File');
  }
  state.files = state.files.filter((file) => file.id !== fileId);
});

route('POST', '/users/@me/files/delete', (_match, { body }) => {
  const fileIds = new Set((Array.isArray(body.file_ids)) ? body.file_ids.map(String) : []);
  if (!fileIds.size || 100 < fileIds.size) {
    throw new MockError(400, ApiErrorCodes.INVALID_FORM_BODY, 'file_ids needs 1 to 100 ids');
  }
  const before = state.files.length;
  state.files = state.files.filter((file) => !fileIds.has(file.id));
  return {deleted: before - state.files.length};
});

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

// applications: mirrors `views/me_applications.py` and the applications part of `views/admin.py`
const MAX_APPLICATIONS = 5;
const API_ACCESS = 1 << 2;

function mockHasApiAccess() {
  return state.owner || (mockUser.flags & API_ACCESS) === API_ACCESS;
}

function findApplication(applicationId: string) {
  const application = state.applications.find((other) => other.id === applicationId);
  if (!application) {
    throw new MockError(404, ApiErrorCodes.UNKNOWN_APPLICATION, 'Unknown Application');
  }
  return application;
}

function findMeApplication(applicationId: string) {
  const application = findApplication(applicationId);
  if (application.owner_id !== mockUser.id) {
    throw new MockError(404, ApiErrorCodes.UNKNOWN_APPLICATION, 'Unknown Application');
  }
  return application;
}

function requireMockApiAccess() {
  if (!mockHasApiAccess()) {
    throw new MockError(403, ApiErrorCodes.MISSING_ACCESS, 'Missing API Access');
  }
}

function applicationName(body: Record<string, unknown>) {
  const name = (typeof body.name === 'string') ? body.name.replace(/[\r\n]+/g, ' ').trim() : '';
  if (name.length < 3 || 32 < name.length) {
    throw new MockError(400, ApiErrorCodes.INVALID_FORM_BODY, 'name must be 3-32 characters', {field: 'name'});
  }
  return name;
}

function mockToken(application: {id: string}) {
  return `${btoa(JSON.stringify({alg: 'HS512'}))}.${btoa(JSON.stringify({id: application.id}))}.${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
}

// the dashboard shape leaves out the owner
function meApplication({ user: _user, ...application }: (typeof state.applications)[number]) {
  return application;
}

function requireNotNotSoBot(application: {flags: number}) {
  if (application.flags & 1) {
    throw new MockError(400, ApiErrorCodes.INVALID_FORM_BODY, 'NotSoBot\'s own applications can only be changed in the database');
  }
}

route('GET', '/users/@me/applications', () => {
  const items = state.applications.filter((application) => application.owner_id === mockUser.id).map(meApplication);
  return {can_create: mockHasApiAccess(), count: items.length, items, limit: MAX_APPLICATIONS};
});

route('POST', '/users/@me/applications', (_match, { body }) => {
  requireMockApiAccess();
  const name = applicationName(body);
  if (MAX_APPLICATIONS <= state.applications.filter((application) => application.owner_id === mockUser.id).length) {
    throw new MockError(400, ApiErrorCodes.MAX_APPLICATIONS, `Exceeded Max Applications (${MAX_APPLICATIONS})`, {limit: MAX_APPLICATIONS});
  }
  const application = {
    created: new Date().toISOString(),
    flags: 0,
    id: (BigInt(Date.now() - 1420070400000) << 22n).toString(),
    name,
    owner_id: mockUser.id,
    user: {avatar: mockUser.avatar, discriminator: mockUser.discriminator, id: mockUser.id, username: mockUser.username},
  };
  state.applications.unshift(application);
  return {...meApplication(application), token: mockToken(application)};
});

route('PATCH', '/users/@me/applications/(\\d+)', ([ , applicationId ], { body }) => {
  const application = findMeApplication(applicationId);
  application.name = applicationName(body);
  return meApplication(application);
});

route('DELETE', '/users/@me/applications/(\\d+)', ([ , applicationId ]) => {
  findMeApplication(applicationId);
  state.applications = state.applications.filter((other) => other.id !== applicationId);
});

route('GET', '/users/@me/applications/(\\d+)/token', ([ , applicationId ]) => {
  requireMockApiAccess();
  const application = findMeApplication(applicationId);
  return {...meApplication(application), token: mockToken(application)};
});

route('POST', '/users/@me/applications/(\\d+)/token-reset', ([ , applicationId ]) => {
  requireMockApiAccess();
  const application = findMeApplication(applicationId);
  return {...meApplication(application), token: mockToken(application)};
});

route('GET', '/admin/applications', (_match, { query }) => {
  requireBotOwner();
  const text = (query.get('query') || '').trim().toLowerCase();
  const userId = query.get('user_id');
  const disabled = query.get('disabled');
  const matching = state.applications
    .filter((application) => !userId || application.owner_id === userId)
    .filter((application) => disabled === null || ((application.flags & 2) === 2) === (disabled === 'true'))
    .filter((application) => !text || application.name.toLowerCase().includes(text) || !!application.user?.username.toLowerCase().includes(text)
      || application.id === text || application.owner_id === text);
  return pageOf(matching, query);
});

route('PATCH', '/admin/applications/(\\d+)', ([ , applicationId ], { body }) => {
  requireBotOwner();
  const application = findApplication(applicationId);
  if (typeof body.disabled === 'boolean') {
    requireNotNotSoBot(application);
    application.flags = (body.disabled) ? (application.flags | 2) : (application.flags & ~2);
  }
  if (body.name !== undefined) {
    application.name = applicationName(body);
  }
  return application;
});

route('POST', '/admin/applications/(\\d+)/token-reset', ([ , applicationId ]) => {
  requireBotOwner();
  const application = findApplication(applicationId);
  requireNotNotSoBot(application);
  return application;
});

route('DELETE', '/admin/applications/(\\d+)', ([ , applicationId ]) => {
  requireBotOwner();
  requireNotNotSoBot(findApplication(applicationId));
  state.applications = state.applications.filter((other) => other.id !== applicationId);
});

function applicationAccessItem(user: (typeof state.adminUsers)[number]) {
  return {
    applications: state.applications.filter((application) => application.owner_id === user.id).length,
    user: {avatar: user.avatar, discriminator: user.discriminator, flags: user.flags, id: user.id, username: user.username},
  };
}

route('GET', '/admin/applications/access', (_match, { query }) => {
  requireBotOwner();
  const text = (query.get('query') || '').trim().toLowerCase();
  const matching = state.adminUsers
    .filter((user) => (user.flags & API_ACCESS) === API_ACCESS)
    .filter((user) => !text || user.username.toLowerCase().includes(text) || user.id === text)
    .sort((a, b) => a.username.localeCompare(b.username))
    .map(applicationAccessItem);
  return pageOf(matching, query);
});

route('PUT', '/admin/applications/access/(\\d+)', ([ , userId ]) => {
  requireBotOwner();
  const user = state.adminUsers.find((other) => other.id === userId);
  if (!user) {
    throw new MockError(404, 10008, 'Unknown User');
  }
  if (user.blocked) {
    throw new MockError(400, ApiErrorCodes.INVALID_FORM_BODY, 'Blocked users can\'t have API access');
  }
  user.flags |= API_ACCESS;
  return applicationAccessItem(user);
});

route('DELETE', '/admin/applications/access/(\\d+)', ([ , userId ]) => {
  requireBotOwner();
  const user = state.adminUsers.find((other) => other.id === userId);
  if (!user) {
    throw new MockError(404, 10008, 'Unknown User');
  }
  if (user.flags & 1) {
    throw new MockError(400, ApiErrorCodes.INVALID_FORM_BODY, 'Bot owners always have API access');
  }
  user.flags &= ~API_ACCESS;
  return applicationAccessItem(user);
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
  const category = parseCategory(query.get('category'));
  const items = [...state.directory.values(), ...state.adminDirectory.map(adminListingAsPublic)]
    .sort((a, b) => (BigInt(b.id) > BigInt(a.id)) ? 1 : -1)
    .filter((item) => category === undefined || item.category === category)
    .filter((item) => matchesDirectorySearch(search, item.tag, [item.title, item.tag.name, item.description]))
    .filter((item) => !before || BigInt(item.id) < BigInt(before))
    // `TagDirectory.to_dict()`: the media only goes public once the listing is verified
    .map((item) => (item.verified === TagDirectoryVerificationStates.VERIFIED) ? item : {...item, assets: []});
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
