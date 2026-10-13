# notsobot.com-frontend

The `notsobot.com` website. It was rewritten from the earlier webpack/SCSS version of this repo (see git history) onto a newer stack, with Discord OAuth login and a user dashboard.

| | Before the rewrite | Now |
|---|---|---|
| Build | webpack 5, babel, ts-loader, node-sass | **Vite 6** |
| UI | React 18, SCSS modules, MUI icons | **React 19**, **Tailwind CSS 4**, lucide icons |
| Routing | react-router-dom 6 (`BrowserRouter`) | **React Router 7** data router |
| Data | react-query 3, zustand | **TanStack Query 5** |
| Auth | token in localStorage, half-finished | `AuthProvider`, `useAuth()`, `RequireAuth`, typed API client |

## Getting started

Requires Node 20.19+.

```bash
npm install
cp .env.example .env.local   # optional
npm run dev                  # http://localhost:5173
```

`npm run build` type-checks the code and writes static files to `dist/`. In production it's served by the Cloudflare Worker below; `/api` stays on the notsobot.api origin.

### Deploying

The site runs on its own Cloudflare Worker (`notsobot-com-frontend`) with [Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/). The config is in `wrangler.jsonc` and the code in `worker/index.ts`.

```bash
npx wrangler login       # once (on a server without a browser, put CLOUDFLARE_API_TOKEN/CLOUDFLARE_ACCOUNT_ID in .env instead, see .env.example)
npm run deploy           # notsobot.com + www.notsobot.com
npm run deploy:beta      # beta.notsobot.com
npm run preview:worker   # run the production build + worker locally
```

- `/assets/*` and `/favicon.svg` come straight from static assets and never run the worker. Hashed files are cached for a year (`public/_headers`).
- Every other path runs the worker, which returns `dist/index.html` with that page's description and `og:*` tags (the `PAGE_DESCRIPTIONS` table) and the Umami script (`UMAMI_WEBSITE_ID` in `wrangler.jsonc`, skipped when empty).
- `notsobot.com/api/*` keeps its "no worker" route on the zone, so API requests still go to the origin.
- `../notsobot.cf-worker` still handles cdn, proxy, umami, emojis and the other subdomains. Its `*notsobot.com/*` route is less specific than this worker's routes, so Cloudflare sends the website here.

### Environment

| Variable | Default | Purpose |
|---|---|---|
| `VITE_API_BASE` | `/api` | Where notsobot.api is mounted (same origin in production) |
| `VITE_AUTH_ENABLED` | `true` in dev, `false` in prod builds | Shows the login/user menu in the navbar. The old site only showed it on beta. |
| `VITE_UMAMI_SCRIPT_URL`, `VITE_UMAMI_WEBSITE_ID` | *(empty)* | Loads Umami when both are set. Only needed without the worker, which adds the script in production. |
| `VITE_DEV_API_PROXY` | `https://notsobot.com` | Dev server only: where `/api/*` is proxied |

## Pages

The visual design follows the Figma export in `../Discord Bot Command Page` (Discord dark palette, card layout). Everything runs on live API data, not that export's mock JSON.

| Route | Page |
|---|---|
| `/` | Home: hero, feature cards, live server/user/command counts, CTA |
| `/commands` | Ranked by real usage: weekly counts come from `GET /commands/stats?since=<7 days ago, floored to the hour>`. A "Trending this week" row, a color-coded category sidebar, Prefix/Slash/Context toggle, Popular/A–Z sort, DM-only, and a grid of cards that open a slide-over detail panel (`?cmd=<command id>:<type>`, so commands are linkable). Filters are kept in the URL and remembered between visits. Code lives in `src/pages/commands/`. |
| `/directory/tags`, `/directory/tags/:id` | Tag directory from `GET /tags/directory` with server-side search, filters (verification status, NSFW) and sorting (verified first by default, newest, oldest, most used, A–Z), all kept in the URL (`?q=&status=&nsfw=&sort=`). "Load more" pages by `before` for Newest and by `offset` for the other sorts. A tag opens as a large modal over the directory (child route, so the list, search and scroll stay put). It opens instantly from the card's data, ← → / Previous–Next step through loaded tags, and Back or Escape closes it. Shared `/directory/tags/:id` links open the directory with that modal on top. There is no single-item endpoint, so direct links ask for `before=<id+1>&limit=1`. The "Add" button is disabled because the API has no user-facing endpoint for it yet. |
| `/dashboard/*` | Logged-in dashboard (code-split, behind `RequireAuth`): Overview; Tags (edit name/content/NSFW, delete, plus Variables and Blobs editors); Servers (mutual servers via the `guilds` OAuth scope; prefixes, allow/blocklists, command lists, loggers and server settings, editable per Discord permission); Settings (AI personality prompt, models, language/region, media, display); Your Data (export/delete UI; endpoints not built yet). Endpoints: `docs/dashboard-api.md`. Dev mocks: `VITE_DASHBOARD_MOCKS=true npm run dev -- --port 5174`. |
| `/faq` | Help center: 21 questions in 5 sections (content in `src/content/faq.ts`, with light markup for `code`, **bold**, links and lists). Includes a section sidebar, search that opens and highlights matches, animated answers, a "Copy link" on every answer, and deep links like `/faq#change-prefix`. |
| `/status` | Live shard and cluster health, polled every 2s. A collapsible "Show all totals" panel lists all 18 per-shard counters summed across shards (labels and notes in `src/lib/shardCounts.ts`). statistics, and a centered shard grid where each cluster shows its healthy count and RAM and each shard has a hover card with live counts. The lookup box takes a server ID, a channel link, `shard 12` or `cluster 5` (kept in the URL as `?lookup=`). It shows the full cluster: health, shard range, RAM, last report, that cluster's shards with the target highlighted, its counts, and a "Show in grid" jump. |
| `/legal/privacy`, `/legal/tos` (`/privacy` and `/terms` redirect here) | Legal pages. The text was copied over unchanged and lives in `src/content/`. |
| `/auth/login`, `/auth/login/callback` | Discord OAuth (see below) |
| `/auth/redirect` | Landing page after adding the bot. Sends the Umami `BotAdded` event, then redirects to `/commands`. |
| `/invite`, `/support`, `/support/invite`, `/foxbot` | Redirects to external sites |

## Authentication

The flow follows `notsobot.api/api/views/auth.py`:

```
user clicks "Log in"
  └─ useAuth().login(returnTo)        saves returnTo in sessionStorage
      └─ GET /api/auth/login          API redirects to Discord with a signed `state`
          └─ discord.com/oauth2/authorize
              └─ GET /api/auth/login/callback?code&state
                  │  API exchanges the code, creates or updates the User, ConnectedAccount and UserSession
                  └─ 302 /auth/login/callback#<token>
                      └─ LoginCallbackPage
                          ├─ reads the token from the URL fragment (the fragment is never sent to a server)
                          ├─ removes the fragment from history
                          ├─ tokenStorage.set(token)
                          └─ navigates to returnTo
```

Main files in `src/auth/`:

- **`tokenStorage.ts`**: the one place the token is stored, outside React so the API client can read it without a hook. Components subscribe to it with `useSyncExternalStore`. It listens for the `storage` event, so logging in or out in one tab updates every tab. It uses the old key and format (`localStorage.token`, JSON string), so people who are already logged in stay logged in.
- **`AuthProvider.tsx`**: loads `GET /users/@me` whenever a token exists and exposes `useAuth()`:
  ```ts
  const { status, user, isAuthenticated, login, logout, retry } = useAuth();
  // status: 'anonymous' | 'loading' | 'authenticated' | 'error'
  ```
  A token that the API rejects (401/403) is deleted. Network and 5xx errors keep the token and report `status: 'error'`, so a short API outage does not log anyone out.
- **`RequireAuth.tsx`**: route guard for future authenticated pages. Visitors who are not logged in go to `/auth/login?next=…` and come back after Discord.
  ```tsx
  { element: <RequireAuth/>, children: [{ path: '/dashboard', element: <DashboardPage/> }] }
  ```
- **`returnTo.ts`**: only allows same-origin paths for the post-login redirect, to prevent open redirects.
- **`logout()`**: calls `GET /api/auth/logout`, which deletes the `UserSession` on the server, then clears local state.

`src/lib/api/client.ts` (`apiRequest`) sends the token as the raw `Authorization` header (the API treats a token with no prefix as a user token). It throws `ApiRequestError` with the API's `{code, message, status}` body, and clears the token on any authenticated 401.

### Testing login locally

The API's callback redirect is relative (`/auth/login/callback#…`), so the frontend and the API must share an origin. Run notsobot.api with docker compose and set `VITE_DEV_API_PROXY=http://localhost`. Point `DISCORD_CLIENT_REDIRECT_URI` at `http://localhost:5173/api/auth/login/callback`, and add that URL to the Discord application's OAuth redirects.

### Backend notes (not done here)

- `TagDirectoryAssets.to_dict` builds its CDN URL with a stray `$` (`f'.../tags-directory/${self.directory_id}/...'`), so directory asset URLs come out as `/tags-directory/$123/...`. No live directory entries have assets yet, so nothing visible is broken today.
- `server_count` in `TagDirectory.to_dict` is hardcoded to `0`.

- The OAuth `state` is signed and expires, but it is not tied to the browser that started the login. Setting it in an HttpOnly cookie during `/auth/login` and comparing it on callback would close the login-CSRF gap.
- If the API ever moves to HttpOnly session cookies, only `tokenStorage` and `apiRequest` need to change. Nothing else reads the token.

## Layout

```
src/
  auth/          token storage, AuthProvider/useAuth, RequireAuth, returnTo
  components/
    layout/      SiteLayout, Navbar, AuthControls (login button / user menu), Footer
    ui/          SearchInput, Spinner, PageHeader, FullPageMessage, DiscordLogo
  content/       legal text as typed data
  lib/
    api/         client, endpoints, response types, TanStack Query hooks
    analytics.ts Umami
    discord.ts   avatar URLs, user tags
    utils.ts
  pages/         one file per route
  config.ts      env config, route paths, external URLs
  router.tsx     route table (`handle.title` sets document.title)
```
