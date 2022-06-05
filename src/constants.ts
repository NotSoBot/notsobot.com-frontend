declare const __ENVIRONMENT__: EnvironmentTypes;

export const ENVIRONMENT = __ENVIRONMENT__;


export enum EnvironmentTypes {
  BETA = 'beta',
  STABLE = 'stable',
}


export enum ClassGlobalKeys {
  APP_DESKTOP = 'app-desktop',
  APP_MOBILE = 'app-mobile',
}


export enum CommandCategories {
  ALL = 'ALL',
  FUN = 'FUN',
  IMAGE = 'IMAGE',
  INFO = 'INFO',
  MODERATION = 'MODERATION',
  OWNER = 'OWNER',
  SAY = 'SAY',
  SEARCH = 'SEARCH',
  SETTINGS = 'SETTINGS',
  TOOLS = 'TOOLS',
  UTILS = 'UTILS',
}


export enum CommandTypes {
  PREFIXED = 0,
  APPLICATION_SLASH = 1,
  APPLICATION_MENU_USER = 2,
  APPLICATION_MENU_MESSAGE = 3,
}


export enum DispatchEvents {
  AUTHENTICATION_UPDATE = 'AUTHENTICATION_UPDATE',
  COMMANDS_FETCHING = 'COMMANDS_FETCHING',
  COMMANDS_SEARCH = 'COMMANDS_SEARCH',
  COMMANDS_UPDATE = 'COMMANDS_UPDATE',
  DEVICE_STATE_UPDATE = 'DEVICE_STATE_UPDATE',
  INFO_DISCORD_FETCHING = 'INFO_DISCORD_FETCHING',
  INFO_DISCORD_SEARCH = 'INFO_DISCORD_SEARCH',
  INFO_DISCORD_UPDATE = 'INFO_DISCORD_UPDATE',
  USER_ME_FETCHING = 'USER_ME_FETCHING',
  USER_ME_TOKEN_UPDATE = 'USER_ME_TOKEN_UPDATE',
  USER_ME_UPDATE = 'USER_ME_UPDATE',
}


export enum InfoDiscordShardStates {
  CLOSED = 'CLOSED',
  CONNECTING = 'CONNECTING',
  IDENTIFYING = 'IDENTIFYING',
  OPEN = 'OPEN',
  READY = 'READY',
  RESUMING = 'RESUMING',
}


export enum LocalStorageKeys {
  TOKEN = 'token',
}


export enum ReactQueryKeys {
  COMMANDS = 'commands',
  INFO_DISCORD = 'info-discord',
  USER_ME_FETCH = 'user-me-fetch',
}


export enum Routes {
  AUTH_LOGIN = '/auth/login',
  AUTH_LOGIN_CALLBACK = '/auth/login/callback',
  AUTH_REDIRECT = '/auth/redirect',
  COMMANDS = '/commands',
  DASHBOARD = '/dashboard',
  FREQUENTLY_ASKED_QUESTIONS = '/faq',
  FOXBOT = '/foxbot',
  HOME = '/',
  INVITE = '/invite',
  LEGAL_PRIVACY = '/legal/privacy',
  SUPPORT = '/support',
  SUPPORT_INVITE = '/support/invite',
  STATUS = '/status',
}
