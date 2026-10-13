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

const PAGE_DESCRIPTIONS: Record<string, string> = {
  '/': DEFAULT_DESCRIPTION,
  '/auth/login': 'Login here to view your dashboard',
  '/auth/login/callback': 'Authentication Callback',
  '/auth/logout': 'NotSoLogout',
  '/auth/redirect': 'Authentication Redirect',
  '/commands': 'So many commands here',
  '/dashboard': 'NotSoDashboard',
  '/directory/tags': 'Tags made by the community',
  '/faq': 'Frequently Asked Questions',
  '/foxbot': 'Foxbot',
  '/invite': 'NotSoBot\'s Discord Invite',
  '/legal/privacy': 'Our Privacy Policy',
  '/legal/tos': 'Our Terms of Service',
  '/privacy': 'Our Privacy Policy',
  '/status': 'Shard Status',
  '/support': 'Something about support',
  '/support/invite': 'NotSoBot\'s Discord Support Server Invite',
  '/terms': 'Our Terms of Service',
};

const NOT_FOUND_DESCRIPTION = 'We couldn\'t find that page, stop that';


function describe(pathname: string): string {
  const path = (pathname.length > 1) ? pathname.replace(/\/+$/, '') : pathname;
  if (path in PAGE_DESCRIPTIONS) {
    return PAGE_DESCRIPTIONS[path];
  }
  if (path.startsWith('/directory/tags/')) {
    return PAGE_DESCRIPTIONS['/directory/tags'];
  }
  return NOT_FOUND_DESCRIPTION;
}

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

    const description = describe(url.pathname);
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
    return new Response(response.body, {headers, status: 200});
  },
} satisfies ExportedHandler<Env>;
