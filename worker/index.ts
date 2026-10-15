// Serves the built site (dist/) through Workers Static Assets.
// /assets/* and other files never reach this code (see run_worker_first in wrangler.jsonc). Everything else is a
// page, so it gets dist/index.html with that page's metatags filled in for Discord/Twitter/search embeds.

import { Routes } from '../src/routes';
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

    // anything else that looks like a file is served as-is
    if (/\.[a-z0-9]+$/i.test(url.pathname) || (request.method !== 'GET' && request.method !== 'HEAD')) {
      return env.ASSETS.fetch(request);
    }

    // "/" rather than "/index.html": static assets redirects the latter to the former
    const shell = await env.ASSETS.fetch(new Request(new URL('/', url)));
    if (!shell.ok) {
      return shell;
    }

    const page = findPage(url.pathname);
    const meta = page?.meta ?? NOT_FOUND_PAGE;
    const indexable = (env.ALLOW_INDEXING === 'true') && Boolean(page?.meta.index);
    // always the main domain (not www.) and the real path (not a redirect like /privacy), so duplicates don't split
    // search ranking. the not-found page gets none
    const canonical = (page) ? `https://${env.SITE_DOMAIN}${page.canonical ?? url.pathname.replace(/\/+$/, '')}` : null;

    // `name` for regular and twitter tags, `property` for open graph ones (facebook/linkedin ignore `name="og:*"`)
    const metatags: Array<['name' | 'property', string, string]> = [
      ['name', 'description', meta.description],
      ['property', 'og:type', 'website'],
      ['property', 'og:site_name', SITE_NAME],
      ['property', 'og:title', meta.title ?? SITE_NAME],
      ['property', 'og:description', meta.description],
      ['name', 'twitter:card', 'summary'],
    ];
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
    if (env.UMAMI_WEBSITE_ID) {
      // src/lib/analytics.ts sees data-website-id and doesn't load a second copy
      head += `<script defer data-website-id="${escapeHtml(env.UMAMI_WEBSITE_ID)}" src="${UMAMI_SCRIPT_URL}"></script>`;
    }

    const response = new HTMLRewriter()
      .on('meta[name="description"]', {element: (element) => { element.remove(); }})
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
