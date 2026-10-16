// A command's link, /commands/:commandId(/:commandType), shared by the commands page and the worker's embeds. Keep
// this file free of browser, vite-only and react code (relative imports only) so worker/index.ts can import it.

import { Routes } from '../routes';
import { CommandTypes, type CommandType } from './api/types';


// the `:commandType` in /commands/:commandId/:commandType
const COMMAND_TYPE_SLUGS: Record<CommandType, string> = {
  [CommandTypes.PREFIXED]: 'prefix',
  [CommandTypes.APPLICATION_SLASH]: 'slash',
  [CommandTypes.APPLICATION_MENU_USER]: 'user',
  [CommandTypes.APPLICATION_MENU_MESSAGE]: 'message',
};


// a command's first variant (prefix, then slash, then context menus) is the plain /commands/:commandId
export function defaultCommandType(types: Array<CommandType>): CommandType | undefined {
  return (types.length) ? Math.min(...types) as CommandType : undefined;
}


// `types` are every variant the command has
export function commandPath(commandId: string, type: CommandType, types: Array<CommandType>): string {
  const path = Routes.COMMAND.replace(':commandId', encodeURIComponent(commandId));
  return (defaultCommandType(types) === type) ? path : `${path}/${COMMAND_TYPE_SLUGS[type]}`;
}


// the variant a path points at, undefined when the command doesn't have it (or the slug is unknown)
export function commandTypeFromPath(slug: string | undefined, types: Array<CommandType>): CommandType | undefined {
  if (!slug) {
    return defaultCommandType(types);
  }
  return types.find((type) => COMMAND_TYPE_SLUGS[type] === slug.toLowerCase());
}
