// Serves the built site (dist/) through Workers Static Assets.
// /assets/* and other files never reach this code (see run_worker_first in wrangler.jsonc). Everything else is a
// page, so it gets dist/index.html with that page's metatags filled in for Discord/Twitter/search embeds.

interface Env {
  ASSETS: Fetcher,
  // hostname used for og:site_name, e.g. "notsobot.com"
  SITE_DOMAIN: string,
  // from Umami's website settings, one per site. empty leaves analytics off
  UMAMI_WEBSITE_ID: string,
}


// TRACKER_SCRIPT_NAME on notsobot.api's analytics-umami container. it sends events back to the same host
const UMAMI_SCRIPT_URL = 'https://oasis.notsobot.com/drink.js';

const DEFAULT_TITLE = 'NotSoBot';
const DEFAULT_DESCRIPTION = 'Coolest bot on Discord';

// every path src/router.tsx renders a page (or redirect) for, `:param` being any single segment.
// anything else gets the not-found description and a 404, like the client-side `*` route
const PAGES: Array<[string, string]> = [
  ['/', DEFAULT_DESCRIPTION],
  ['/auth/login', 'Login here to view your dashboard'],
  ['/auth/login/callback', 'Authentication Callback'],
  ['/auth/redirect', 'Authentication Redirect'],
  ['/commands', 'So many commands here'],
  ['/dashboard', 'NotSoDashboard'],
  ['/dashboard/tags', 'NotSoDashboard'],
  ['/dashboard/tags/:tagId', 'NotSoDashboard'],
  ['/dashboard/servers', 'NotSoDashboard'],
  ['/dashboard/servers/:guildId', 'NotSoDashboard'],
  ['/dashboard/settings', 'NotSoDashboard'],
  ['/dashboard/data', 'NotSoDashboard'],
  ['/dashboard/admin', 'NotSoDashboard'],
  ['/dashboard/admin/tags', 'NotSoDashboard'],
  ['/dashboard/admin/users', 'NotSoDashboard'],
  ['/dashboard/admin/flags', 'NotSoDashboard'],
  ['/dashboard/admin/reports', 'NotSoDashboard'],
  ['/directory/tags', 'Tags made by the community'],
  ['/directory/tags/:tagId', 'Tags made by the community'],
  ['/docs', 'How to write your own NotSoBot tags'],
  ['/docs/tags', 'How to write your own NotSoBot tags'],
  ['/faq', 'Frequently Asked Questions'],
  ['/foxbot', 'Foxbot'],
  ['/invite', 'NotSoBot\'s Discord Invite'],
  ['/legal/privacy', 'Our Privacy Policy'],
  ['/legal/tos', 'Our Terms of Service'],
  ['/privacy', 'Our Privacy Policy'],
  ['/status', 'Shard Status'],
  ['/support', 'Something about support'],
  ['/support/invite', 'NotSoBot\'s Discord Support Server Invite'],
  ['/terms', 'Our Terms of Service'],
];

// react router matches case-insensitively and ignores trailing slashes
const PAGE_MATCHERS = PAGES.map(([ path, description ]): [RegExp, string] => {
  const source = path.split('/').map((segment) => {
    return (segment.startsWith(':')) ? '[^/]+' : segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }).join('/');
  return [new RegExp(`^${(source === '/') ? '' : source}/*$`, 'i'), description];
});

const NOT_FOUND_DESCRIPTION = 'We couldn\'t find that page, stop that';


function describe(pathname: string): string | null {
  for (const [ matcher, description ] of PAGE_MATCHERS) {
    if (matcher.test(pathname)) {
      return description;
    }
  }
  return null;
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

    // anything that looks like a file (robots.txt, etc.) is served as-is
    if (/\.[a-z0-9]+$/i.test(url.pathname) || (request.method !== 'GET' && request.method !== 'HEAD')) {
      return env.ASSETS.fetch(request);
    }

    // "/" rather than "/index.html": static assets redirects the latter to the former
    const shell = await env.ASSETS.fetch(new Request(new URL('/', url)));
    if (!shell.ok) {
      return shell;
    }

    const page = describe(url.pathname);
    const description = page ?? NOT_FOUND_DESCRIPTION;
    const metatags: Array<[string, string]> = [
      ['description', description],
      ['og:title', DEFAULT_TITLE],
      ['og:description', description],
      ['og:site_name', env.SITE_DOMAIN],
      ['og:url', `https://${env.SITE_DOMAIN}${url.pathname}`],
      ['twitter:card', 'summary'],
    ];

    let head = metatags.map(([name, content]) => {
      return `<meta name="${escapeHtml(name)}" content="${escapeHtml(content)}"/>`;
    }).join('');
    if (env.UMAMI_WEBSITE_ID) {
      // src/lib/analytics.ts sees data-website-id and doesn't load a second copy
      head += `<script defer data-website-id="${escapeHtml(env.UMAMI_WEBSITE_ID)}" src="${UMAMI_SCRIPT_URL}"></script>`;
    }

    const response = new HTMLRewriter()
      .on('meta[name="description"]', {element: (element) => { element.remove(); }})
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
