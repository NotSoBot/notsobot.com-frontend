import { TAG_DOC_FUNCTIONS_PART1 } from './functions/part1';
import { TAG_DOC_FUNCTIONS_PART2 } from './functions/part2';
import { TAG_DOC_FUNCTIONS_PART3 } from './functions/part3';
import { TAG_DOC_FUNCTIONS_PART4 } from './functions/part4';
import { TAG_DOC_FUNCTIONS_PART5 } from './functions/part5';
import { TAG_DOC_GUIDE } from './guide';
import { MEDIASCRIPT_CATEGORIES, MEDIASCRIPT_COMMANDS, MEDIASCRIPT_GUIDE } from './mediascript';
import type { TagDocCategoryId, TagDocFunction, TagDocMediaScriptCommand } from './types';

export * from './types';
export { MEDIASCRIPT_CATEGORIES, MEDIASCRIPT_GUIDE, TAG_DOC_GUIDE };


export const TAG_DOC_CATEGORIES: ReadonlyArray<{id: TagDocCategoryId, title: string, description: string}> = [
  {id: 'arguments', title: 'Arguments', description: 'Read what was passed to the tag.'},
  {id: 'user', title: 'Users', description: 'The person running the tag, or anyone else.'},
  {id: 'server', title: 'Servers & Channels', description: 'Information about where the tag is running.'},
  {id: 'message', title: 'Messages', description: 'The invoking message and the one it replies to.'},
  {id: 'variables', title: 'Variables & Storage', description: 'Remember values for this run, or keep them between runs.'},
  {id: 'logic', title: 'Logic & Control Flow', description: 'Conditions, loops, and stopping early.'},
  {id: 'math', title: 'Math', description: 'Arithmetic and number helpers.'},
  {id: 'strings', title: 'Text', description: 'Change, search, and measure text.'},
  {id: 'markup', title: 'Discord Markdown', description: 'Wrap text in Discord formatting.'},
  {id: 'rng', title: 'Randomness', description: 'Random picks, numbers, and IDs.'},
  {id: 'media', title: 'Media', description: 'Find, attach, and edit images, audio, and video.'},
  {id: 'ai', title: 'AI', description: 'Generate text and images, and read what is in them.'},
  {id: 'search', title: 'Search', description: 'Search the web from a tag.'},
  {id: 'network', title: 'Network', description: 'Fetch pages and call APIs.'},
  {id: 'output', title: 'Output', description: 'Embeds, buttons, pages, and files attached to the reply.'},
  {id: 'json', title: 'JSON', description: 'Discord objects as JSON, and reading JSON.'},
  {id: 'tags', title: 'Tags', description: 'Run other tags and read tag info.'},
  {id: 'time', title: 'Time', description: 'Timestamps and dates.'},
  {id: 'meta', title: 'Miscellaneous', description: 'Everything else.'},
];


export const TAG_DOC_FUNCTIONS: ReadonlyArray<TagDocFunction> = [
  ...TAG_DOC_FUNCTIONS_PART1,
  ...TAG_DOC_FUNCTIONS_PART2,
  ...TAG_DOC_FUNCTIONS_PART3,
  ...TAG_DOC_FUNCTIONS_PART4,
  ...TAG_DOC_FUNCTIONS_PART5,
].sort((a, b) => a.names[0].localeCompare(b.names[0]));


export function tagFunctionAnchor(fn: TagDocFunction): string {
  return `fn-${fn.names[0].replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`;
}

export function tagFunctionSearchText(fn: TagDocFunction): string {
  return [
    ...fn.names,
    fn.summary,
    fn.description ?? '',
    fn.syntax,
  ].join(' ').toLowerCase();
}


export const MEDIASCRIPT_COMMANDS_SORTED: ReadonlyArray<TagDocMediaScriptCommand> = [...MEDIASCRIPT_COMMANDS]
  .sort((a, b) => a.name.localeCompare(b.name));


export function mediaScriptCommandAnchor(command: TagDocMediaScriptCommand): string {
  return `ms-${command.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`;
}

export function mediaScriptCommandSearchText(command: TagDocMediaScriptCommand): string {
  return [
    command.name,
    ...(command.aliases ?? []),
    command.summary,
    command.syntax,
  ].join(' ').toLowerCase();
}
