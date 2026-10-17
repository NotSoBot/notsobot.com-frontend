// Which commands (and which of their variants) the bot still offers. Commands removed from the bot stay in
// `GET /commands` with `enabled: false` so their usage stats and history keep their names; they're hidden anywhere a
// command is offered as available (the commands page, counts, pickers, embeds) but still used to name things in
// history. Like commandPaths.ts, keep this free of browser, vite-only and react code so worker/index.ts can import it.

import type { Command, CommandMetadata } from './api/types';


export function isCommandEnabled(command: Command): boolean {
  return command.enabled !== false;
}

// a single variant (prefix, slash, context menu) is offered only if it and its command are both enabled
export function isCommandVariantEnabled(command: Command, metadata: CommandMetadata): boolean {
  return isCommandEnabled(command) && metadata.enabled !== false;
}

// the variants still offered, empty for a disabled command
export function enabledCommandVariants(command: Command): Array<CommandMetadata> {
  return command.metadata.filter((metadata) => isCommandVariantEnabled(command, metadata));
}
