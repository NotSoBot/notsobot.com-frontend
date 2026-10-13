// Fixture data for the dev-only dashboard mocks. Shapes follow notsobot.api's `to_dict()` output.

import type { Tag, TagBlobs, TagVariables, User, UserGuild, UserGuildSummary, UserMe, UserSettings } from '@/lib/api/types';


export const MOCK_TOKEN = 'dashboard-mock-token';

export const mockUser: UserMe = {
  avatar: null,
  blocked: false,
  blocked_on: null,
  blocked_reason: null,
  bot: false,
  // the user's one-on-one DM channel with the bot
  channel_id: '1300000000000000001',
  discriminator: '0000',
  flags: 0,
  id: '300505364032389122',
  premium_type: 3,
  username: 'mockuser',
};

const owner: User = {
  avatar: mockUser.avatar,
  blocked: false,
  blocked_on: null,
  blocked_reason: null,
  bot: false,
  discriminator: mockUser.discriminator,
  flags: 0,
  id: mockUser.id,
  username: mockUser.username,
};


export function createSettings(): UserSettings {
  return {
    application_command_response_type: 0,
    download_quality: '720p',
    fallbacks_media_image: 0,
    file_upload_name: null,
    file_upload_threshold: 0,
    file_upload_type: 0,
    file_upload_vanity: null,
    locale: 'en',
    ml_diffusion_model: null,
    ml_llm_model: 'ANTHROPIC_CLAUDE_HAIKU_5_5',
    ml_llm_personality: 'You are a sarcastic but helpful assistant who loves cats.',
    opted_out_content: null,
    response_display: 0,
    timezone: 'America/New_York',
    tts_voice: null,
    units: 'METRIC',
  };
}


function tag(id: string, name: string, content: string, extra: Partial<Tag> = {}): Tag {
  return {
    assets: [],
    content,
    created: new Date(Date.now() - Number(BigInt(id) % 400n) * 86400000).toISOString(),
    edited: null,
    guild_id: null,
    id,
    is_command: false,
    is_on_directory: false,
    last_used: new Date(Date.now() - 3600000).toISOString(),
    locked: false,
    name,
    nsfw: false,
    reference_tag: null,
    scanned: 0,
    server_id: null,
    user: owner,
    uses: Number(BigInt(id) % 5000n),
    ...extra,
  };
}


export function createTags(): Array<Tag> {
  const tags: Array<Tag> = [
    tag('1290000000000000140', 'counter', [
      '{set:count;{math:{get:count;0}+1}}',
      '{setglobal:total;{math:{getglobal:total;0}+1}}',
      'You have run this {get:count} times ({getglobal:total} across Discord).',
    ].join('\n'), {uses: 4821, edited: new Date(Date.now() - 86400000 * 3).toISOString()}),
    tag('1290000000000000130', 'quote', '{choose:Stay hungry.|Talk is cheap.|It works on my machine.}', {uses: 512}),
    tag('1290000000000000120', 'cat', '{image:https://cataas.com/cat}', {uses: 1203}),
    tag('1290000000000000110', 'rules', '1. Be nice\n2. No spam\n3. Have fun', {locked: true, uses: 77}),
    tag('1290000000000000100', 'nsfwjoke', 'A very spicy joke goes here.', {nsfw: true, uses: 3}),
  ];
  const words = ['hello', 'ping', 'weather', 'roll', 'meme', 'shrug', 'flip', 'lenny', 'hug', 'pat', 'dance', 'wave', 'tableflip',
    'unflip', 'thonk', 'yeet', 'bonk', 'poll', 'remind', 'math', 'echo', 'avatar', 'banner', 'emoji', 'say', 'time', 'zalgo', 'owo'];
  words.forEach((word, i) => {
    tags.push(tag((1290000000000000090n - BigInt(i * 10)).toString(), word, `{args} ${word}! (tag #${i + 1})`, {uses: (i * 37) % 300}));
  });

  // spread tags over where they can live: the mock user's servers, a server the dashboard doesn't know about,
  // the user's DM with the bot, a group DM, the user's own id (personal/directory tags) and no server at all
  const GUILD_IDS = ['1100000000000000001', '1100000000000000002', '1100000000000000003', '1100000000000000004', '1100000000000000099'];
  const locations: Array<string | null> = [...GUILD_IDS, mockUser.channel_id, '1300000000000000077', mockUser.id, null];
  tags.forEach((item, i) => {
    item.server_id = locations[i % locations.length];
    // only server tags have a guild id; DMs and group DMs are channels
    item.guild_id = (item.server_id && GUILD_IDS.includes(item.server_id)) ? item.server_id : null;
    item.is_on_directory = item.server_id === mockUser.id;
  });
  return tags;
}


// variables/blobs per tag id; storage key is `${storage_type}:${storage_id}`
export function createVariables(): Map<string, Map<string, Record<string, string>>> {
  const counter = new Map<string, Record<string, string>>([
    [`0:${mockUser.id}`, {count: '42', last_seen: '"2026-10-11"'}],
    ['3:0', {total: '133742', leaderboard: JSON.stringify({top: [{id: mockUser.id, count: 42}], updated: 1760000000000})}],
    ['2:1100000000000000001', {server_count: '17'}],
  ]);
  return new Map([['1290000000000000140', counter]]);
}

export function createBlobs(): Map<string, Map<string, string>> {
  const encode = (value: string) => btoa(String.fromCharCode(...new TextEncoder().encode(value)));
  const quote = new Map<string, string>([
    ['3:0', encode(JSON.stringify(['Stay hungry, stay foolish.', 'Talk is cheap. Show me the code.', 'It works on my machine.'], null, 2))],
    [`0:${mockUser.id}`, encode('my personal favourite quote ✨')],
  ]);
  return new Map([['1290000000000000130', quote]]);
}

export function emptyVariables(): TagVariables {
  return {0: {}, 1: {}, 2: {}, 3: {}};
}

export function emptyBlobs(): TagBlobs {
  return {0: null, 1: null, 2: null, 3: null};
}


const MANAGE_GUILD = 1n << 5n;
const ADMINISTRATOR = 1n << 3n;


export interface MockGuild {
  summary: UserGuildSummary,
  detail: Omit<UserGuild, 'editable' | 'permissions'>,
}

function guild(id: string, name: string, icon: string | null, permissions: bigint, owner = false): MockGuild {
  const added = new Date(Date.now() - 86400000 * 30).toISOString();
  const canManage = owner || !!(permissions & (MANAGE_GUILD | ADMINISTRATOR));
  return {
    summary: {id, name, icon, owner, permissions: permissions.toString(), can_manage: canManage},
    detail: {
      allowlist: [],
      blocked: false,
      blocked_reason: null,
      blocklist: [{added, id: '1200000000000000011', type: 'channel', user_id: mockUser.id}],
      commands_allowlist: [],
      commands_blocklist: [{added, command: 'nsfw', id: id, type: 'guild', user_id: mockUser.id}],
      disabled_logger_events: 0,
      features: [],
      icon,
      id,
      locale: null,
      loggers: [{added, channel_id: '1200000000000000022', disabled_events: 0, guild_id: id, type: 0, user_id: mockUser.id}],
      name,
      prefixes: [{added, guild_id: id, prefix: '.', user_id: mockUser.id}, {added, guild_id: id, prefix: 'nsb ', user_id: mockUser.id}],
      settings: {ml_diffusion_model: null, ml_llm_model: null, ml_llm_personality: null, response_display: null},
      timezone: 'Europe/London',
    },
  };
}


export function createGuilds(): Array<MockGuild> {
  return [
    guild('1100000000000000001', 'NotSoBot Support', null, ADMINISTRATOR | MANAGE_GUILD, true),
    guild('1100000000000000002', 'Cool Gamers Club', null, MANAGE_GUILD),
    guild('1100000000000000003', 'Art & Memes', null, 0n),
    guild('1100000000000000004', 'A server with a really long name that should truncate nicely', null, ADMINISTRATOR),
  ];
}


export function guildEditable(summary: UserGuildSummary): UserGuild['editable'] {
  const permissions = BigInt(summary.permissions);
  const admin = summary.owner || !!(permissions & ADMINISTRATOR);
  const manage = admin || !!(permissions & MANAGE_GUILD);
  return {prefixes: manage, allowlist: admin, blocklist: admin, commands: manage, loggers: manage, settings: manage};
}
