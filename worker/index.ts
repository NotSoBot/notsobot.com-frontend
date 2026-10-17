// Serves the built site (dist/) through Workers Static Assets.
// /assets/* and other files never reach this code (see run_worker_first in wrangler.jsonc). Everything else is a
// page, so it gets dist/index.html with that page's metatags filled in for Discord/Twitter/search embeds.

import {
  CommandCategories,
  CommandTypes,
  TagDirectoryCategories,
  TagDirectoryVerificationStates,
  type Command,
  type CommandMetadata,
  type CommandType,
  type TagDirectoryCategory,
  type TagDirectoryItem,
  type TagDirectoryPage,
} from '../src/lib/api/types';
import { enabledCommandVariants } from '../src/lib/commandAvailability';
import { commandTypeFromPath } from '../src/lib/commandPaths';
import { Routes, TAG_ADD_PARAM, TAG_ADD_VALUE } from '../src/routes';
import { NOT_FOUND_PAGE, PAGE_ALIASES, PAGES, pageTitle, SITE_NAME, type PageMeta } from '../src/seo';


interface Env {
  ASSETS: Fetcher,
  // hostname used for canonical urls, og:url and the sitemap, e.g. "notsobot.com"
  SITE_DOMAIN: string,
  // "true" lets search engines index the site. anything else (beta) marks every page noindex
  ALLOW_INDEXING: string,
  // from Umami's website settings, one per site. empty leaves analytics off
  UMAMI_WEBSITE_ID: string,
}


// TRACKER_SCRIPT_NAME on notsobot.api's analytics-umami container. it sends events back to the same host
const UMAMI_SCRIPT_URL = 'https://oasis.notsobot.com/drink.js';

interface Page {
  meta: PageMeta,
  // where the page really lives. null for paths with a `:param`, whose canonical url is the request's own path
  canonical: string | null,
  matcher: RegExp,
}

// react router matches case-insensitively and ignores trailing slashes
function matcherFor(path: string): RegExp {
  const source = path.split('/').map((segment) => {
    return (segment.startsWith(':')) ? '[^/]+' : segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }).join('/');
  return new RegExp(`^${(source === '/') ? '' : source}/*$`, 'i');
}

// every path src/router.tsx renders a page (or redirect) for, from the same metadata the client uses.
// anything else gets the not-found page and a 404, like the client-side `*` route
const PAGE_LIST: Array<Page> = [
  ...(Object.keys(PAGES) as Array<keyof typeof Routes>).map((key) => ({
    meta: PAGES[key],
    canonical: (Routes[key].includes(':')) ? null : Routes[key],
    matcher: matcherFor(Routes[key]),
  })),
  ...Object.entries(PAGE_ALIASES).map(([ path, key ]) => ({
    meta: PAGES[key],
    canonical: Routes[key],
    matcher: matcherFor(path),
  })),
];

const SITEMAP_PATHS = (Object.keys(PAGES) as Array<keyof typeof Routes>)
  .filter((key) => PAGES[key].index && !Routes[key].includes(':'))
  .map((key) => Routes[key]);


function findPage(pathname: string): Page | null {
  return PAGE_LIST.find((page) => page.matcher.test(pathname)) ?? null;
}


interface Embed {
  meta: PageMeta,
  siteName: string,
  // a small thumbnail beside the text
  image: string | null,
  // discord's component embed (https://docs.discord.com/developers/link-previews/component-embeds), which it shows
  // instead of the og tags. those stay as the fallback for everything else
  components: DiscordContainer | null,
}


// the logo's gray (public/favicon.svg). every page's `theme-color` (the stripe on a plain discord embed) is set from
// it too, so plain and component embeds always match
const EMBED_ACCENT_COLOR = 0x848484;
const THEME_COLOR = `#${EMBED_ACCENT_COLOR.toString(16).padStart(6, '0')}`;

// the subset of discord's message components a component embed may use
type DiscordTextDisplay = {type: 10, content: string};
type DiscordThumbnail = {type: 11, media: {url: string}};
type DiscordLinkButton = {type: 2, style: 5, label: string, url: string};
// the accessory always sits to the right of the text
type DiscordSection = {type: 9, components: Array<DiscordTextDisplay>, accessory: DiscordThumbnail | DiscordLinkButton};
type DiscordContainer = {type: 17, accent_color: number, components: Array<DiscordTextDisplay | DiscordSection>};

// the bot's ids for `tag get` and `tag show` (Formatter.Commands.TagGet/TagShow.COMMAND_ID in notsobot.ts). their slash
// variants' `external_id` makes the clickable mention, which puts the command in the message box. it can't fill in
// the option, so the embed shows the id to paste into it (`/tag show` also suggests tags linked in the channel)
const TAG_GET_COMMAND_ID = 'tag.add';
const TAG_SHOW_COMMAND_ID = 'tag.show';

// discord drops the whole component embed past this, the og tags are used instead
const COMPONENT_EMBED_MAX_BYTES = 3000;


// user-written text goes into discord markdown as-is otherwise. `<` too, or `<@id>`, `<#id>`, `<t:...>` and
// `<:emoji:id>` render as mentions, timestamps and emojis
function escapeMarkdown(value: string): string {
  return value
    .replace(/[\\*_~`|[\]<]/g, '\\$&')
    .replace(/^(\s*)([#>-])/gm, '$1\\$2')
    // `1. item` is a numbered list
    .replace(/^(\s*\d+)\./gm, '$1\\.');
}

// inside a <script>, `</script>` or `<!--` in user text would end it early
function scriptJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}


// same labels as src/pages/tags/tagDirectory.tsx, which can't be imported here (react)
const TAG_CATEGORY_LABELS: Record<TagDirectoryCategory, string> = {
  [TagDirectoryCategories.OTHER]: 'Other',
  [TagDirectoryCategories.AI]: 'AI',
  [TagDirectoryCategories.CLIPS]: 'Clips',
  [TagDirectoryCategories.FILTERS]: 'Filters',
  [TagDirectoryCategories.GAMES]: 'Games',
  [TagDirectoryCategories.MEMES]: 'Memes',
  [TagDirectoryCategories.UTILITY]: 'Utility',
};

const TAG_VERIFICATION_LABELS: Record<number, string> = {
  [TagDirectoryVerificationStates.VERIFIED]: 'Verified',
  [TagDirectoryVerificationStates.PENDING_VERIFICATION]: 'Pending Verification',
};

// discord cuts embed descriptions off around here anyway, this keeps the stats line after it visible
const EMBED_DESCRIPTION_MAX_LENGTH = 280;


function plural(count: number, word: string): string {
  return `${count.toLocaleString('en-US')} ${word}${(count === 1) ? '' : 's'}`;
}

function truncate(value: string, length: number): string {
  return (value.length <= length) ? value : `${value.slice(0, length - 1).trimEnd()}…`;
}


// a public api GET, null when it fails or doesn't answer in time so the page's generic embed is used instead.
// cached, since discord, twitter etc. often fetch a link several times in a row
async function fetchApi<T>(env: Env, path: string, query: Record<string, string>, cacheTtl: number): Promise<T | null> {
  // notsobot.com/api/* skips workers, so this goes straight to the api origin
  const url = new URL(`https://${env.SITE_DOMAIN}/api${path}`);
  for (const [ key, value ] of Object.entries(query)) {
    url.searchParams.set(key, value);
  }
  try {
    const response = await fetch(url, {
      headers: {accept: 'application/json'},
      signal: AbortSignal.timeout(3000),
      cf: {cacheTtl, cacheEverything: true},
    });
    return (response.ok) ? await response.json<T>() : null;
  } catch {
    return null;
  }
}


// same lookup as the client's api.fetchTagDirectoryItem: there's no single-item endpoint, so ask for the first listing
// before `id + 1`. null when it isn't listed
async function fetchTagDirectoryItem(env: Env, tagId: string): Promise<TagDirectoryItem | null> {
  if (!/^\d{1,21}$/.test(tagId)) {
    return null;
  }
  const page = await fetchApi<TagDirectoryPage>(env, '/tags/directory', {before: (BigInt(tagId) + 1n).toString(), limit: '1'}, 60);
  const item = page?.items[0];
  return (item && item.id === tagId) ? item : null;
}


// a mention is null while the bot hasn't uploaded that command's id, it's plain text then
function tagEmbed(
  env: Env,
  item: TagDirectoryItem,
  mentions: {tagGet: string | null, tagShow: string | null},
): Embed {
  const { tag } = item;
  const stats = [
    TAG_VERIFICATION_LABELS[item.verified] ?? 'Unverified',
    TAG_CATEGORY_LABELS[item.category] ?? TAG_CATEGORY_LABELS[TagDirectoryCategories.OTHER],
    plural(tag.uses, 'use'),
    plural(item.server_count, 'server'),
    `by ${tag.user.username}`,
  ];
  if (tag.nsfw) {
    stats.unshift('NSFW');
  }
  const description = item.description.trim();

  const title = item.title.trim();

  // the directory card's thumbnail, or the cover when it's a picture. nothing for nsfw tags, discord would show it
  // to everyone in the channel
  let image: string | null = null;
  if (!tag.nsfw) {
    const cover = item.assets[0];
    image = item.thumbnail?.urls.cdn ?? ((cover?.metadata.mimetype.startsWith('image/')) ? cover.urls.cdn : null);
  }

  const text: Array<DiscordTextDisplay> = [
    {type: 10, content: `## ${escapeMarkdown(tag.name)}${(title) ? `\n${escapeMarkdown(title)}` : ''}`},
  ];
  if (description) {
    text.push({type: 10, content: escapeMarkdown(truncate(description, EMBED_DESCRIPTION_MAX_LENGTH))});
  }
  text.push({type: 10, content: `-# ${escapeMarkdown(stats.join(' · '))}`});

  const addUrl = new URL(Routes.TAG_DIRECTORY_ITEM.replace(':tagId', item.id), `https://${env.SITE_DOMAIN}`);
  addUrl.searchParams.set(TAG_ADD_PARAM, TAG_ADD_VALUE);

  const components: DiscordContainer = {
    type: 17,
    accent_color: EMBED_ACCENT_COLOR,
    components: [
      // a section needs an accessory, without a thumbnail the text goes in the container directly
      ...((image) ? [{type: 9, components: text, accessory: {type: 11, media: {url: image}}} as const] : text),
      // the button on the same line as the command, discord has no way to put it on the left
      {
        type: 9,
        components: [{
          type: 10,
          content: `-# Run ${mentions.tagShow ?? '`/tag show`'} to try it or ${mentions.tagGet ?? '`/tag get`'} to add it with \`${item.id}\`, or`,
        }],
        accessory: {type: 2, style: 5, label: 'Add to Server', url: addUrl.toString()},
      },
    ],
  };
  return {
    meta: {
      title: (title) ? `${tag.name} — ${title}` : tag.name,
      description: [ (description) ? truncate(description, EMBED_DESCRIPTION_MAX_LENGTH) : null, stats.join(' · ') ].filter(Boolean).join('\n\n'),
    },
    siteName: `${SITE_NAME} Tag Directory`,
    image,
    components,
  };
}


// how a variant is written on the site (src/pages/commands/commandMeta.ts PREFIXES, which can't be imported here)
const COMMAND_NAME_PREFIXES: Record<CommandType, string> = {
  [CommandTypes.PREFIXED]: '.',
  [CommandTypes.APPLICATION_SLASH]: '/',
  [CommandTypes.APPLICATION_MENU_USER]: '',
  [CommandTypes.APPLICATION_MENU_MESSAGE]: '',
};

const COMMAND_TYPE_LABELS: Record<CommandType, string> = {
  [CommandTypes.PREFIXED]: 'Prefix command',
  [CommandTypes.APPLICATION_SLASH]: 'Slash command',
  [CommandTypes.APPLICATION_MENU_USER]: 'User context menu',
  [CommandTypes.APPLICATION_MENU_MESSAGE]: 'Message context menu',
};


// the list only changes when the bot uploads its commands
const COMMANDS_CACHE_TTL = 5 * 60;

// the edge cache (cacheTtl) saves the trip to the api, this saves downloading and parsing the whole list again on
// every request this isolate handles. the parsed value rather than the promise: workers don't like one request
// waiting on another's
let cachedCommands: {commands: Array<Command>, expires: number} | null = null;

// the whole list, there's no single-command endpoint
async function fetchCommands(env: Env): Promise<Array<Command> | null> {
  if (cachedCommands && Date.now() < cachedCommands.expires) {
    return cachedCommands.commands;
  }
  const commands = await fetchApi<Array<Command>>(env, '/commands', {}, COMMANDS_CACHE_TTL);
  // a failure isn't kept, the next request tries again
  if (!Array.isArray(commands)) {
    return null;
  }
  cachedCommands = {commands, expires: Date.now() + COMMANDS_CACHE_TTL * 1000};
  return commands;
}


// a slash variant as a clickable `</name:id>`, null until the bot has uploaded its `external_id`
function mentionFor(slash: CommandMetadata | undefined): string | null {
  return (slash?.external_id) ? `</${slash.name}:${slash.external_id}>` : null;
}

function slashCommandMention(command: Command | undefined): string | null {
  return mentionFor((command) ? enabledCommandVariants(command).find((item) => item.type === CommandTypes.APPLICATION_SLASH) : undefined);
}


// how to run one variant, labelled so it's clear they're all the same command under different names
function commandUsage(metadata: CommandMetadata): string {
  const name = escapeMarkdown(metadata.name);
  switch (metadata.type) {
    // with its arguments, like `.caption ?<emoji,user:id|mention,url> <...text>`. usage never has a backtick in it
    case CommandTypes.PREFIXED: return `**Prefix** \`${[ `.${metadata.name}`, metadata.usage.trim() ].filter(Boolean).join(' ')}\``;
    case CommandTypes.APPLICATION_SLASH: return `**Slash** ${mentionFor(metadata) ?? `\`/${metadata.name}\``}`;
    case CommandTypes.APPLICATION_MENU_USER: return `**User app** right-click a user → Apps → ${name}`;
    case CommandTypes.APPLICATION_MENU_MESSAGE: return `**Message app** right-click a message → Apps → ${name}`;
  }
}


// the variant /commands/:commandId(/:commandType) shows, null for an unknown, hidden (owner) or disabled command
async function fetchCommandMetadata(env: Env, commandId: string, slug: string | undefined): Promise<[Command, CommandMetadata] | null> {
  const commands = await fetchCommands(env);
  const command = commands?.find((item) => item.id === commandId);
  if (!command) {
    return null;
  }
  const variants = enabledCommandVariants(command);
  const type = commandTypeFromPath(slug, variants.map((metadata) => metadata.type));
  const metadata = variants.find((item) => item.type === type);
  return (metadata && metadata.category !== CommandCategories.OWNER) ? [command, metadata] : null;
}


function commandEmbed(command: Command, metadata: CommandMetadata): Embed {
  const name = `${COMMAND_NAME_PREFIXES[metadata.type]}${metadata.name}`;
  const description = metadata.description?.trim() || '';

  const text: Array<DiscordTextDisplay> = [{type: 10, content: `## ${escapeMarkdown(name)}`}];
  if (description) {
    text.push({type: 10, content: truncate(description, EMBED_DESCRIPTION_MAX_LENGTH)});
  }
  // every way to run it, whichever variant the link is for: prefix, then slash, then the context menus
  const variants = enabledCommandVariants(command).sort((x, y) => x.type - y.type);
  text.push({type: 10, content: variants.map((variant) => `-# ${commandUsage(variant)}`).join('\n')});

  return {
    meta: {title: name, description: description || `A NotSoBot ${COMMAND_TYPE_LABELS[metadata.type].toLowerCase()}.`},
    siteName: `${SITE_NAME} Commands`,
    image: null,
    components: {type: 17, accent_color: EMBED_ACCENT_COLOR, components: text},
  };
}


function renderRobots(env: Env): string {
  if (env.ALLOW_INDEXING !== 'true') {
    return 'User-agent: *\nDisallow: /\n';
  }
  return `User-agent: *\nAllow: /\n\nSitemap: https://${env.SITE_DOMAIN}/sitemap.xml\n`;
}


function renderSitemap(env: Env): string {
  const urls = SITEMAP_PATHS.map((path) => `<url><loc>${escapeHtml(`https://${env.SITE_DOMAIN}${path}`)}</loc></url>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>\n`;
}


// enforced: nothing may frame the site (the admin pages have one-click actions). frame-ancestors only works when
// enforced, so it lives here rather than in the report-only policy below
const FRAME_POLICY = 'frame-ancestors \'none\'; object-src \'none\'; base-uri \'self\'';
// report-only for now: command previews come from the API and can point at any image host, so this can't be
// enforced until it's been watched in production for a while. once the browser console stays quiet, move it
// into Content-Security-Policy (and add a report endpoint to hear about breakage)
const CONTENT_POLICY = [
  'default-src \'self\'',
  `script-src 'self' ${new URL(UMAMI_SCRIPT_URL).origin}`,
  'style-src \'self\' https://fonts.googleapis.com',
  'font-src \'self\' https://fonts.gstatic.com',
  'img-src \'self\' data: https://cdn.discordapp.com https://media.discordapp.net https://cdn.nsb.gg',
  `connect-src 'self' ${new URL(UMAMI_SCRIPT_URL).origin}`,
  'frame-src \'none\'',
  'form-action \'self\'',
].join('; ');


function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}


export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);

    // normally the zone's notsobot.com/api/* route skips workers entirely, this is just in case
    if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
      return fetch(request);
    }

    if ((request.method === 'GET' || request.method === 'HEAD') && url.pathname === '/robots.txt') {
      return new Response(renderRobots(env), {headers: {'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=3600'}});
    }
    if ((request.method === 'GET' || request.method === 'HEAD') && url.pathname === '/sitemap.xml') {
      return new Response(renderSitemap(env), {headers: {'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=3600'}});
    }

    // anything else that looks like a file is served as-is, unless it's a page: command ids have dots in them
    // (/commands/media.iv.manipulation.caption)
    const page = findPage(url.pathname);
    if ((!page && /\.[a-z0-9]+$/i.test(url.pathname)) || (request.method !== 'GET' && request.method !== 'HEAD')) {
      return env.ASSETS.fetch(request);
    }

    // "/" rather than "/index.html": static assets redirects the latter to the former
    const shell = await env.ASSETS.fetch(new Request(new URL('/', url)));
    if (!shell.ok) {
      return shell;
    }

    const fallback: Embed = {meta: page?.meta ?? NOT_FOUND_PAGE, siteName: SITE_NAME, image: null, components: null};
    let embed = fallback;
    // the path's segments after the page's own, like the tag id in /tags/directory/:tagId
    const segments = url.pathname.replace(/\/+$/, '').split('/');
    // api responses aren't validated, so one in an unexpected shape throws here. the page still renders, with the
    // generic embed
    try {
      if (page?.meta === PAGES.TAG_DIRECTORY_ITEM) {
        const [ item, commands ] = await Promise.all([ fetchTagDirectoryItem(env, segments[3] ?? ''), fetchCommands(env) ]);
        if (item) {
          embed = tagEmbed(env, item, {
            tagGet: slashCommandMention(commands?.find((command) => command.id === TAG_GET_COMMAND_ID)),
            tagShow: slashCommandMention(commands?.find((command) => command.id === TAG_SHOW_COMMAND_ID)),
          });
        }
      } else if (page?.meta === PAGES.COMMAND || page?.meta === PAGES.COMMAND_TYPE) {
        let commandId = segments[2] ?? '';
        try {
          commandId = decodeURIComponent(commandId);
        } catch {
          // left as-is, it won't match a command
        }
        const found = await fetchCommandMetadata(env, commandId, segments[3]);
        if (found) {
          embed = commandEmbed(...found);
        }
      }
    } catch (error) {
      console.error('embed failed', url.pathname, error);
      embed = fallback;
    }
    const { meta, image } = embed;
    const indexable = (env.ALLOW_INDEXING === 'true') && Boolean(page?.meta.index);
    // always the main domain (not www.) and the real path (not a redirect like /privacy), so duplicates don't split
    // search ranking. the not-found page gets none
    const canonical = (page) ? `https://${env.SITE_DOMAIN}${page.canonical ?? url.pathname.replace(/\/+$/, '')}` : null;

    // `name` for regular and twitter tags, `property` for open graph ones (facebook/linkedin ignore `name="og:*"`)
    const metatags: Array<['name' | 'property', string, string]> = [
      ['name', 'description', meta.description],
      ['property', 'og:type', 'website'],
      ['property', 'og:site_name', embed.siteName],
      ['property', 'og:title', meta.title ?? SITE_NAME],
      ['property', 'og:description', meta.description],
      ['name', 'twitter:card', 'summary'],
    ];
    if (image) {
      metatags.push(['property', 'og:image', image]);
    }
    if (canonical) {
      metatags.push(['property', 'og:url', canonical]);
    }
    if (!indexable) {
      metatags.push(['name', 'robots', 'noindex']);
    }

    let head = metatags.map(([ attribute, key, content ]) => {
      return `<meta ${attribute}="${escapeHtml(key)}" content="${escapeHtml(content)}"/>`;
    }).join('');
    if (canonical) {
      head += `<link rel="canonical" href="${escapeHtml(canonical)}"/>`;
    }
    // discord would drop an oversized one anyway, the og tags are used instead
    const componentEmbed = (embed.components) ? scriptJson({component: embed.components}) : null;
    if (componentEmbed && new TextEncoder().encode(componentEmbed).length <= COMPONENT_EMBED_MAX_BYTES) {
      head += `<script id="discord:component-embed" type="application/json">${componentEmbed}</script>`;
    }
    if (env.UMAMI_WEBSITE_ID) {
      // src/lib/analytics.ts sees data-website-id and doesn't load a second copy
      head += `<script defer data-website-id="${escapeHtml(env.UMAMI_WEBSITE_ID)}" src="${UMAMI_SCRIPT_URL}"></script>`;
    }

    const response = new HTMLRewriter()
      .on('meta[name="description"]', {element: (element) => { element.remove(); }})
      .on('meta[name="theme-color"]', {element: (element) => { element.setAttribute('content', THEME_COLOR); }})
      // setInnerContent escapes text by default
      .on('title', {element: (element) => { element.setInnerContent(pageTitle(meta)); }})
      .on('head', {element: (element) => { element.append(head, {html: true}); }})
      .transform(shell);

    const headers = new Headers(response.headers);
    headers.set('cache-control', 'no-cache');
    // the html now depends on the path, the shell's etag no longer describes it
    headers.delete('etag');
    headers.set('content-security-policy', FRAME_POLICY);
    headers.set('content-security-policy-report-only', CONTENT_POLICY);
    headers.set('x-frame-options', 'DENY');
    headers.set('x-content-type-options', 'nosniff');
    headers.set('referrer-policy', 'strict-origin-when-cross-origin');
    // unknown paths still get the app, so its not-found page renders, but as a real 404
    return new Response(response.body, {headers, status: (page === null) ? 404 : 200});
  },
} satisfies ExportedHandler<Env>;
