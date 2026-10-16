// Every page's title and description, used by both the client (<title>, via src/router.tsx's route handles) and the
// worker (the html served to crawlers and embeds, which don't run javascript). Keep this file free of browser or
// vite-only code (import.meta.env, DOM, React) so worker/index.ts can import it.

import { Routes } from './routes';


export interface PageMeta {
  // shown as "<title> · NotSoBot", or just "NotSoBot" when left out
  title?: string,
  description: string,
  // only pages marked true are indexed by search engines and listed in /sitemap.xml
  index?: boolean,
}


export const SITE_NAME = 'NotSoBot';

const DASHBOARD_DESCRIPTION = 'Manage your NotSoBot tags, servers and settings.';
const ADMIN_DESCRIPTION = 'NotSoBot staff tools.';

// keyed by Routes, so adding a route without its metadata is a type error
export const PAGES: Readonly<Record<keyof typeof Routes, PageMeta>> = Object.freeze({
  HOME: {
    description: 'NotSoBot is a Discord bot for media manipulation. Distort, deep fry, caption and convert images, gifs, videos and audio, plus search and server tools.',
    index: true,
  },
  AUTH_LOGIN: {title: 'Log in', description: 'Log in with Discord to manage your NotSoBot tags, servers and settings.'},
  AUTH_LOGIN_CALLBACK: {title: 'Log in', description: 'Finishing your Discord login.'},
  AUTH_REDIRECT: {description: 'Thanks for adding NotSoBot to your server.'},
  COMMANDS: {
    title: 'Commands',
    description: 'Browse every NotSoBot command by category, ranked by how often they\'re used this week, with prefix, slash and context menu usage.',
    index: true,
  },
  COMMAND: {title: 'Commands', description: 'A NotSoBot command: what it does, how to use it and how often it\'s used.'},
  COMMAND_TYPE: {title: 'Commands', description: 'A NotSoBot command: what it does, how to use it and how often it\'s used.'},
  DASHBOARD: {title: 'Dashboard', description: DASHBOARD_DESCRIPTION},
  DASHBOARD_APPLICATIONS: {title: 'Applications', description: DASHBOARD_DESCRIPTION},
  DASHBOARD_TAGS: {title: 'Your Tags', description: DASHBOARD_DESCRIPTION},
  DASHBOARD_TAG: {title: 'Tag', description: DASHBOARD_DESCRIPTION},
  DASHBOARD_TAG_EDIT: {title: 'Edit Tag', description: DASHBOARD_DESCRIPTION},
  DASHBOARD_SERVERS: {title: 'Servers', description: DASHBOARD_DESCRIPTION},
  DASHBOARD_SERVER: {title: 'Server', description: DASHBOARD_DESCRIPTION},
  DASHBOARD_SETTINGS: {title: 'Settings', description: DASHBOARD_DESCRIPTION},
  DASHBOARD_PREMIUM: {title: 'Premium', description: DASHBOARD_DESCRIPTION},
  DASHBOARD_FILES: {title: 'Your Files', description: DASHBOARD_DESCRIPTION},
  DASHBOARD_REMINDERS: {title: 'Your Reminders', description: DASHBOARD_DESCRIPTION},
  DASHBOARD_REPORTS: {title: 'Your Reports', description: DASHBOARD_DESCRIPTION},
  DASHBOARD_REPORT: {title: 'Report', description: DASHBOARD_DESCRIPTION},
  DASHBOARD_VOICES: {title: 'Your Voices', description: DASHBOARD_DESCRIPTION},
  DASHBOARD_ADMIN_APPLICATIONS: {title: 'Applications', description: ADMIN_DESCRIPTION},
  DASHBOARD_ADMIN_TAGS: {title: 'Tags', description: ADMIN_DESCRIPTION},
  DASHBOARD_ADMIN_TAG_DIRECTORY: {title: 'Tag Directory', description: ADMIN_DESCRIPTION},
  DASHBOARD_ADMIN_TAG_DIRECTORY_ITEM: {title: 'Directory Tag', description: ADMIN_DESCRIPTION},
  DASHBOARD_ADMIN_USERS: {title: 'Users', description: ADMIN_DESCRIPTION},
  DASHBOARD_ADMIN_USER: {title: 'User', description: ADMIN_DESCRIPTION},
  DASHBOARD_ADMIN_ENTITLEMENTS: {title: 'Entitlements', description: ADMIN_DESCRIPTION},
  DASHBOARD_ADMIN_FLAGS: {title: 'Content Flags', description: ADMIN_DESCRIPTION},
  DASHBOARD_ADMIN_FLAG: {title: 'Content Flag', description: ADMIN_DESCRIPTION},
  DASHBOARD_ADMIN_REPORTS: {title: 'Reports', description: ADMIN_DESCRIPTION},
  DASHBOARD_ADMIN_REPORT: {title: 'Report', description: ADMIN_DESCRIPTION},
  DASHBOARD_ADMIN_SERVERS: {title: 'Servers', description: ADMIN_DESCRIPTION},
  DASHBOARD_ADMIN_SERVER: {title: 'Server', description: ADMIN_DESCRIPTION},
  DASHBOARD_ADMIN_VOICES: {title: 'Voices', description: ADMIN_DESCRIPTION},
  FAQ: {
    title: 'FAQ',
    description: 'Answers to common NotSoBot questions: adding the bot, running commands, changing the prefix, limiting it to certain channels, premium and your data.',
    index: true,
  },
  FOXBOT: {title: 'Foxbot', description: 'Foxbot on Discord.'},
  INVITE: {title: 'Invite', description: 'Add NotSoBot to your Discord server.'},
  LEGAL_PRIVACY: {title: 'Privacy Policy', description: 'How NotSoBot collects, uses and stores your data.', index: true},
  LEGAL_TERMS_OF_SERVICE: {title: 'Terms of Service', description: 'The terms for using NotSoBot and notsobot.com.', index: true},
  STATUS: {title: 'Status', description: 'Live NotSoBot shard and cluster health.', index: true},
  TAG_DIRECTORY: {
    title: 'Tag Directory',
    description: 'Search community-made NotSoBot tags: custom commands you can use in any server.',
    index: true,
  },
  TAG_DIRECTORY_ITEM: {title: 'Tag Directory', description: 'A community-made NotSoBot tag.'},
  TAG_DOCS: {
    title: 'Tag Scripting',
    description: 'Learn to write your own NotSoBot tags: the scripting syntax, every function, and media scripts.',
    index: true,
  },
  SUPPORT: {title: 'Support', description: 'Join the NotSoBot support server on Discord.'},
  SUPPORT_INVITE: {title: 'Support', description: 'Join the NotSoBot support server on Discord.'},
});

// paths src/router.tsx only redirects from, and the page each one lands on
export const PAGE_ALIASES: Readonly<Record<string, keyof typeof Routes>> = Object.freeze({
  '/docs': 'TAG_DOCS',
  '/privacy': 'LEGAL_PRIVACY',
  '/terms': 'LEGAL_TERMS_OF_SERVICE',
  '/dashboard/admin': 'DASHBOARD_ADMIN_TAGS',
});

export const NOT_FOUND_PAGE: PageMeta = {title: 'Not Found', description: 'We couldn\'t find that page.'};


export function pageTitle(page: PageMeta | undefined): string {
  return (page?.title) ? `${page.title} · ${SITE_NAME}` : SITE_NAME;
}
