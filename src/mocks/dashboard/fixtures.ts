// Fixture data for the dev-only dashboard mocks. Shapes follow notsobot.api's `to_dict()` output.

import type {
  AdminEntitlement,
  AdminTagDirectoryItem,
  AdminUser,
  AdminUserEntry,
  AdminVoice,
  ContentFlag,
  Reminder,
  Report,
  Tag,
  TagBlobs,
  TagDirectoryAsset,
  TagDirectoryCategory,
  TagVariables,
  User,
  UserGuild,
  UserGuildSummary,
  UserMe,
  UserSettings,
} from '@/lib/api/types';
import { TagDirectoryCategories } from '@/lib/api/types';


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
  // owner, so the admin section is reachable (`__dashboardMocks.owner(false)` to see the dashboard as everyone else)
  flags: 1,
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
  // an alias has no content of its own and shares its parent's variables and blobs
  tags.push(tag('1290000000000000095', 'count', '', {reference_tag: tags[0], uses: 41}));
  // and an alias of someone else's directory tag (directory tags live under their owner's id)
  const author: User = {...owner, id: '1200000000000000042', username: 'tagauthor'};
  const washing = tag('1290000000000000500', 'wash', '', {is_on_directory: true, server_id: author.id, user: author, uses: 9000});
  tags.push(tag('1290000000000000094', 'washing', '', {reference_tag: washing, uses: 1}));
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
  detail: Omit<UserGuild, 'editable' | 'owner' | 'permissions'>,
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


// every server NotSoBot knows (`/admin/guilds`): the mock user's (sharing their detail objects, so edits show on both
// sides) plus servers they aren't in, some the bot left, some blocked, and a few the bot is in that never saved settings
export interface MockAdminGuild {
  entry: MockGuild,
  bot: {shard_id: number, updated: string} | null,
  // false: only in `bot_guilds`, no `guilds` row (no name until it's opened)
  saved: boolean,
}

const ADMIN_GUILD_NAMES = ['Pixel Plaza', 'The Lounge', 'Speedrunners United', 'Anime Corner', 'Study Hall', 'Meme Factory', 'Cozy Campfire',
  'Retro Arcade', 'Night Owls', 'Dev Den', 'Music Makers', 'Book Club', 'Garden Gnomes', 'Space Cadets', 'Tea Time', 'Ocean Breeze',
  'Map Makers', 'Puzzle Hunters', 'Chess Club', 'Film Buffs', 'Pet Pals', 'Bread Bakers', 'Cloud Watchers', 'Late Night Radio'];

export function createAdminGuilds(guilds: Array<MockGuild>): Array<MockAdminGuild> {
  const updated = new Date(Date.now() - 3600000 * 5).toISOString();
  const extras = ADMIN_GUILD_NAMES.map((name, i): MockAdminGuild => {
    const id = (1150000000000000000n + BigInt(i) * 4194304n * 997n).toString();
    const entry = guild(id, name, null, 0n);
    if (i % 6 === 2) {
      entry.detail.blocked = true;
      entry.detail.blocked_reason = (i % 12 === 2) ? 'Raiding other servers with the bot' : null;
    }
    // every 4th one the bot left; unsaved ones only come from `bot_guilds`, so the bot is always in those
    const left = i % 4 === 3;
    return {entry, bot: (left) ? null : {shard_id: i % 8, updated}, saved: left || i % 7 !== 5};
  });
  return [
    ...guilds.map((entry, i) => ({entry, bot: {shard_id: i, updated}, saved: true})),
    ...extras,
  ];
}


export function guildEditable(summary: UserGuildSummary): UserGuild['editable'] {
  const permissions = BigInt(summary.permissions);
  const admin = summary.owner || !!(permissions & ADMINISTRATOR);
  const manage = admin || !!(permissions & MANAGE_GUILD);
  return {prefixes: manage, allowlist: admin, blocklist: admin, commands: manage, loggers: manage, settings: manage};
}


/* admin (owner only) */

const ADMIN_NAMES = ['cake', 'foxbot', 'pixelpanda', 'nightowl', 'tagwizard', 'memelord', 'quietcat', 'bytebard', 'lumen', 'rustacean',
  'saltyspoon', 'gearhead', 'mossy', 'zephyr', 'kettle', 'orbit', 'pebble', 'velvet', 'wren', 'yonder', 'ziggy', 'acorn', 'blip', 'cobalt',
  'dune', 'ember', 'fable', 'gully', 'harbor', 'inkwell'];

export function createAdminUsers(): Array<AdminUser> {
  return ADMIN_NAMES.map((name, i) => ({
    avatar: null,
    blocked: i % 11 === 4,
    blocked_reason: (i === 15)
      ? 'Repeatedly uploaded unsafe images through tags after two warnings in the support server, then made alt accounts to keep doing it. See the mod log thread from March for the full history and the screenshots.'
      : (i % 11 === 4) ? 'Repeated unsafe uploads' : null,
    discriminator: (i % 7 === 3) ? String(1000 + i * 37).padStart(4, '0') : '0',
    flags: (i === 0) ? 1 : (i === 5) ? 4 : 0,
    id: (400000000000000000n + BigInt(i) * 7919n).toString(),
    premium_type: [0, 0, 2, 0, 3, 0, 1][i % 7],
    username: name,
  }));
}


const CATEGORIES = ['unsafe', 'unsafe_child_safety', 'unsafe_nudity', 'review_child_safety', 'review'];
const ACTIONS = ['blocked', 'replaced', 'logged', 'not_hosted'];
const LABELS = ['nudity', 'sexual', 'violence', 'gore', 'self_harm', 'hate', 'minor'];

export function createContentFlags(users: Array<AdminUser>): Array<ContentFlag> {
  const flags: Array<ContentFlag> = [];
  // a handful of users carry most of the flags, like real data
  const owners = [1, 1, 1, 1, 2, 2, 2, 5, 5, 7, 9, 12, 12, 12, 12, 12, 15, 18, 21, 21];
  for (let i = 0; i < 64; i++) {
    const user = users[owners[i % owners.length]];
    const category = CATEGORIES[i % CATEGORIES.length];
    const status = [0, 0, 1, 2, 0, 3, 2][i % 7];
    // filtered text (tag outputs, prompts): no media, the text lives in `query`
    const text = i % 8 === 5;
    const video = !text && i % 4 === 0;
    const frames = (text) ? 0 : (video) ? 12 + (i % 30) : 1;
    const flagged = [LABELS[i % LABELS.length], ...((i % 3 === 0) ? [LABELS[(i + 2) % LABELS.length]] : [])];
    const created = new Date(Date.now() - i * 5 * 3600000).toISOString();
    // some confirmed ones came in already matching an earlier confirmed flag (the hashes repeat every 16)
    const autoConfirmed = status === 1 && i >= 16 && i % 2 === 0;
    flags.push({
      action: ACTIONS[i % ACTIONS.length],
      auto_confirmed_from: (autoConfirmed) ? String(9000 + 64 - (i - 16)) : null,
      category,
      channel_id: (i % 5) ? (1200000000000000000n + BigInt(i)).toString() : null,
      command_id: ['imagine', 'mirror', 'deepfry', 'caption', 'tag'][i % 5],
      created,
      flagged: (category.startsWith('unsafe')) ? flagged : [],
      flagged_for_review: (category.startsWith('review')) ? flagged : [],
      frames,
      frames_flagged: (text) ? [] : (video) ? [2, 3, 7].filter((frame) => frame < frames) : [0],
      guild_id: (i % 5) ? '1100000000000000001' : null,
      id: String(9000 + 64 - i),
      message_id: (i % 5) ? (1310000000000000000n + BigInt(i) * 13n).toString() : null,
      mimetype: (text) ? 'text/plain' : (video) ? 'video/mp4' : ['image/png', 'image/gif', 'image/jpeg', 'image/webp'][i % 4],
      model: (i % 2) ? 'safety-scan-v3' : 'safety-scan-v2',
      needs_human_review: category.startsWith('review') || i % 9 === 0,
      notes: (i % 6 === 0) ? 'Checked hash against known list, no match.' : null,
      pdq: (text) ? null : Array.from({length: 64}, (_, j) => ((i * 31 + j * 7) % 16).toString(16)).join(''),
      query: (text) ? ((i % 16 === 5) ? `フィルターに引っかかったタグの出力 #${i}` : `{tag output that tripped the filter #${i}}`) : (i % 3 === 0) ? `a picture of something weird #${i}` : null,
      reviewed_at: (status) ? new Date(Date.parse(created) + 3600000).toISOString() : null,
      reviewed_by: (status) ? mockUser.id : null,
      scores_worst: {nudity: (i % 10) / 10 + 0.05, violence: ((i * 3) % 10) / 10, minor: (i % 4) / 7},
      // the hashes repeat every 16 flags (the same media flagged again), and the sha256 shifts halfway through so those
      // halves only match by pdq (visually similar), for the "confirm the matches too?" dialog
      sha256: Array.from({length: 64}, (_, j) => ((i * 13 + j * 5 + Math.floor(i / 32)) % 16).toString(16)).join(''),
      size: 40000 + i * 12345,
      // never rendered as media; it's only here so the page has something to (not) show
      source_url: (text) ? null : `https://media.invalid/attachments/${1300000000000000000n + BigInt(i)}/upload_${i}.${(video) ? 'mp4' : 'png'}`,
      status,
      tag_id: (i % 5 === 4) ? '1290000000000000140' : null,
      user: {
        avatar: user.avatar,
        blocked: user.blocked,
        blocked_reason: user.blocked_reason,
        discriminator: user.discriminator,
        flags: user.flags,
        id: user.id,
        username: user.username,
      },
      user_id: user.id,
    });
  }
  return flags;
}


export function adminUserEntries(users: Array<AdminUser>, flags: Array<ContentFlag>): Array<AdminUserEntry> {
  return users.map((user) => {
    const own = flags.filter((flag) => flag.user_id === user.id);
    const last = own.map((flag) => String(flag.created)).sort().pop() ?? null;
    return {
      content_flags: {
        confirmed: own.filter((flag) => flag.status === 1).length,
        dismissed: own.filter((flag) => flag.status === 2).length,
        flagged: own.filter((flag) => flag.status !== 2).length,
        last_flagged_at: last,
        pending: own.filter((flag) => flag.status === 0).length,
        reported: own.filter((flag) => flag.status === 3).length,
        total: own.length,
      },
      user,
    };
  });
}


const DIRECTORY_SAMPLES: Array<[string, string, string]> = [
  ['weather', 'Weather lookup', '{js:\nconst city = args.join(" ") || "London";\nconst res = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=3`);\nreturn res.text();\n}'],
  ['8ball', 'Magic 8-ball', '{choose:It is certain.|Ask again later.|Very doubtful.|Without a doubt.|My sources say no.}'],
  ['hug', 'Hug someone', '{user} hugs {args}! {image:https://example.invalid/hug.gif}'],
  ['roll', 'Dice roller', '{set:sides;{if:{args}|=|;6;{args}}}You rolled a {random:1;{get:sides}} on a d{get:sides}'],
  ['counter', 'Global counter', '{setglobal:n;{math:{getglobal:n;0}+1}}This tag has run {getglobal:n} times.'],
  ['spam', 'Totally normal tag', ('@everyone free nitro https://not-a-scam.invalid\n').repeat(40)],
];

const CATEGORY_VALUES: Array<TagDirectoryCategory> = Object.values(TagDirectoryCategories);

// placeholder listing media (inline svgs, so there's nothing to host), `TagDirectoryAssets.to_dict()` shaped
export function sampleDirectoryAssets(directoryId: string, name: string, count: number): Array<TagDirectoryAsset> {
  return Array.from({length: count}, (_, i) => {
    const id = `${directoryId}${i}`;
    const hue = (Number(BigInt(directoryId) % 360n) + i * 70) % 360;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">` +
      `<rect width="640" height="360" fill="hsl(${hue} 45% 28%)"/><circle cx="520" cy="80" r="140" fill="hsl(${hue} 55% 38%)"/>` +
      `<text x="40" y="200" font-family="sans-serif" font-size="64" font-weight="700" fill="#fff">.${name}</text>` +
      `<text x="40" y="250" font-family="sans-serif" font-size="28" fill="#ffffffb0">example ${i + 1}</text></svg>`;
    return {
      filename: `${id}.svg`,
      filename_base: id,
      id,
      metadata: {duration: 0, extension: 'svg', framecount: 1, height: 360, mimetype: 'image/svg+xml', size: svg.length, width: 640},
      position: i,
      urls: {cdn: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`},
    };
  });
}

export function createAdminDirectory(users: Array<AdminUser>): Array<AdminTagDirectoryItem> {
  const items: Array<AdminTagDirectoryItem> = [];
  for (let i = 0; i < 34; i++) {
    const [ name, title, content ] = DIRECTORY_SAMPLES[i % DIRECTORY_SAMPLES.length];
    const user = users[(i * 3) % users.length];
    const id = (1280000000000000000n + BigInt(i) * 101n).toString();
    const created = new Date(Date.now() - (i + 1) * 86400000).toISOString();
    const verified = [1, 1, 0, 2, 1, 0, 2][i % 7];
    const tagName = (i < DIRECTORY_SAMPLES.length) ? name : `${name}${i}`;
    // most verified listings have media (public), a few pending ones too (only staff and the owner see those)
    const assetCount = (verified === 2) ? [0, 1, 3][i % 3] : (verified === 1 && i % 5 === 2) ? 2 : 0;
    items.push({
      // every category shows up, `Other` included
      category: CATEGORY_VALUES[i % CATEGORY_VALUES.length],
      assets: sampleDirectoryAssets(id, tagName, assetCount),
      created,
      description: (i % 4 === 3) ? '' : `${title} tag. Example description that explains what this tag does and how to use it.`,
      edited: null,
      id,
      server_count: (i * 17) % 90,
      tag: {
        content,
        created,
        edited: null,
        guild_id: null,
        id,
        locked: i % 2 === 1,
        name: tagName,
        nsfw: i % 8 === 5,
        server_id: user.id,
        user_id: user.id,
        uses: (i * 211) % 5000,
      },
      title: (i < DIRECTORY_SAMPLES.length) ? title : `${title} ${i}`,
      user: (i === 7) ? null : {avatar: user.avatar, discriminator: user.discriminator, id: user.id, username: user.username},
      verified,
    });
  }
  return items;
}


const REPORT_CONTENT = [
  ['`.imagine` hangs forever on large prompts and never replies, no error either', 'mirror does nothing on gifs with transparency, output is a black box',
    'tag `weather` throws "Unknown Variable" since yesterday\nworked fine before the update', 'slash `/caption` says the interaction failed but the image still posts'],
  ['spamming the same tag in every channel and pinging @everyone through it', 'keeps using `.tag` to post slurs after being asked to stop',
    'impersonating a NotSoBot dev in DMs and asking people for their tokens'],
  ['whole server is built around abusing the image commands to post gore', 'server advertises selling stolen accounts, bot is in their #shop channel'],
  ['used `.imagine` to make this and posted it in a sfw channel', 'this caption has someone\'s home address in it'],
  ['tag posts a different nsfw image every time it\'s used', 'tag is just a mass ping of every role in the server'],
];

export function createReports(users: Array<AdminUser>): Array<Report> {
  const reports: Array<Report> = [];
  for (let i = 0; i < 37; i++) {
    const reporter = users[(i * 7) % users.length];
    const type = [0, 1, 3, 2, 4, 0][i % 6];
    const status = [0, 0, 1, 0, 2, 1, 0][i % 7];
    const contents = REPORT_CONTENT[type];
    const dm = i % 4 === 3;
    const created = new Date(Date.now() - i * 7 * 3600000).toISOString();
    reports.push({
      channel_id: (dm) ? (1300000000000000000n + BigInt(i)).toString() : (1200000000000000000n + BigInt(i % 3)).toString(),
      content: contents[Math.floor(i / 6) % contents.length],
      created,
      guild_id: (dm) ? null : '1100000000000000001',
      id: String(7000 + 37 - i),
      message_id: (1320000000000000000n + BigInt(i) * 17n).toString(),
      notes: (status && i % 3 === 0) ? 'Fixed in the last deploy.' : null,
      reviewed_at: (status) ? new Date(Date.parse(created) + 2 * 3600000).toISOString() : null,
      reviewed_by: (status) ? mockUser.id : null,
      status,
      // some message reports are of a tag's output
      tag_id: (type === 3 && i % 12 === 2) ? ['1400000000000000007', '1400000000000000013'][Math.floor(i / 12) % 2] : null,
      // a couple of targets get reported more than once
      target_id: (type === 1 || type === 3) ? users[[4, 12, 4, 21][Math.floor(i / 6) % 4]].id
        : (type === 2) ? ['1100000000000000099', '1100000000000000042'][i % 2]
        : (type === 4) ? ['1400000000000000007', '1400000000000000013'][i % 2]
        : null,
      type,
      user: {
        avatar: reporter.avatar,
        blocked: reporter.blocked,
        blocked_on: null,
        blocked_reason: reporter.blocked_reason,
        bot: false,
        discriminator: reporter.discriminator,
        flags: reporter.flags,
        id: reporter.id,
        username: reporter.username,
      },
    });
  }
  return reports;
}


// the mock user's own reminders (`/users/@me/reminders`), soonest first
export function createReminders(): Array<Reminder> {
  const hour = 3600000;
  const rows: Array<[number, string, string | null, boolean, number | null]> = [
    // [hours from now, content, guild id, all day, length in hours]
    [0.5, 'take the pizza out', '1100000000000000002', false, null],
    [5, '', '1100000000000000001', false, null],
    [26, 'dentist appointment\nbring the insurance card', null, true, null],
    [72, 'stream with the club', '1100000000000000002', false, 3],
    [24 * 30, 'renew the domain before it expires!! '.repeat(4).trim(), '1100000000000000004', false, null],
  ];
  return rows.map(([ hours, content, guildId, isAllDay, length ], i) => {
    const start = Date.now() + hours * hour;
    return {
      channel_id: (guildId) ? (1200000000000000000n + BigInt(i)).toString() : mockUser.channel_id,
      content,
      guild_id: guildId,
      id: (1320000000000000000n + BigInt(i) * 4194304n).toString(),
      is_all_day: isAllDay,
      message_id: (i % 2 === 0) ? (1330000000000000000n + BigInt(i)).toString() : null,
      position: i + 1,
      timestamp_end: (length) ? new Date(start + length * hour).toISOString() : null,
      timestamp_start: new Date(start).toISOString(),
    };
  });
}


const VOICE_NAMES = ['narrator', 'gravelly old man', 'chipmunk', 'radio host', 'whisper', 'announcer', 'my cat (allegedly)', 'robot',
  'pirate captain', 'sports commentator', 'sleepy', 'news anchor'];

// every cloned voice (`/admin/voices`); the mock user owns the first two, which `/users/@me/voices` returns
export function createVoices(users: Array<AdminUser>): Array<AdminVoice> {
  const owners = [mockUser, mockUser, ...users];
  return Array.from({length: 31}, (_, i) => {
    const owner = owners[i % owners.length];
    return {
      created: new Date(Date.now() - i * 29 * 3600000).toISOString(),
      id: (1310000000000000000n + BigInt(31 - i) * 4194304n).toString(),
      name: VOICE_NAMES[i % VOICE_NAMES.length],
      platform_id: `mockEl${(i * 2654435761 % 0xffffffff).toString(36).padStart(14, 'x')}`,
      platform_type: 0,
      user: {avatar: owner.avatar, discriminator: owner.discriminator, id: owner.id, username: owner.username},
    };
  });
}


// SKU ids from notsobot.api's `DiscordSkus`, keyed by the premium type they give
const PREMIUM_SKUS: Record<number, string> = {
  2: '1182569865735831582',
  3: '1318864356179710044',
  4: '1492322196146618429',
};

// the mock user has an active Premium+ subscription, an older cancelled Premium one and a replaced staff grant;
// everyone else gets a mix of active, expired, cancelled and staff-given ones
export function createEntitlements(users: Array<AdminUser>): Array<AdminEntitlement> {
  const day = 24 * 3600000;
  const now = Date.now();
  const ref = (user: {avatar: string | null, discriminator: string, id: string, username: string}) => {
    return {avatar: user.avatar, discriminator: user.discriminator, id: user.id, username: user.username};
  };
  const base = {consumed: false, deleted: false, granted_by: null, guild_id: null, type: 1};
  const iso = (offset: number) => new Date(now + offset).toISOString();

  const entitlements: Array<AdminEntitlement> = [
    {
      ...base, active: true, created_at: iso(-40 * day), ends_at: iso(20 * day), external_id: '1350000000000000101',
      id: '1350000000000000901', premium_type: 3, provider: 'discord', sku_id: PREMIUM_SKUS[3], starts_at: iso(-40 * day),
      updated_at: iso(-10 * day), user: ref(mockUser),
    },
    {
      ...base, active: false, created_at: iso(-200 * day), deleted: true, ends_at: iso(-50 * day), external_id: '1350000000000000102',
      id: '1350000000000000801', premium_type: 2, provider: 'discord', sku_id: PREMIUM_SKUS[2], starts_at: iso(-200 * day),
      updated_at: iso(-50 * day), user: ref(mockUser),
    },
    {
      ...base, active: false, created_at: iso(-300 * day), deleted: true, ends_at: null, external_id: null, granted_by: owner.id,
      id: '1350000000000000701', premium_type: 4, provider: 'manual', sku_id: PREMIUM_SKUS[4], starts_at: null,
      updated_at: iso(-200 * day), user: ref(mockUser),
    },
  ];

  for (let i = 0; i < 40; i++) {
    const user = users[(i * 5) % users.length];
    const premiumType = [2, 3, 4, 3, 2][i % 5];
    const manual = i % 6 === 5;
    const kind = i % 4; // 0 active, 1 expired, 2 cancelled, 3 active with no end
    const started = now - (i + 3) * 9 * day;
    entitlements.push({
      ...base,
      active: kind === 0 || kind === 3,
      created_at: new Date(started).toISOString(),
      deleted: kind === 2,
      ends_at: (manual || kind === 3) ? null : (kind === 1) ? iso(-(i + 1) * day) : new Date(started + 30 * day + (i + 3) * 9 * day).toISOString(),
      external_id: (manual) ? null : (1350000000000001000n + BigInt(i)).toString(),
      granted_by: (manual) ? owner.id : null,
      id: (1350000000000000600n - BigInt(i) * 4194304n).toString(),
      premium_type: premiumType,
      provider: (manual) ? 'manual' : 'discord',
      sku_id: PREMIUM_SKUS[premiumType],
      starts_at: (manual) ? null : new Date(started).toISOString(),
      updated_at: new Date(started).toISOString(),
      user: ref(user),
    });
  }
  return entitlements;
}
