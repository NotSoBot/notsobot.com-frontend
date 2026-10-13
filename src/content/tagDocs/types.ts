// Tag scripting docs, written against notsobot.ts/src/utils/tags/index.ts


export type TagDocCategoryId =
  | 'arguments'
  | 'user'
  | 'server'
  | 'message'
  | 'variables'
  | 'logic'
  | 'math'
  | 'strings'
  | 'markup'
  | 'rng'
  | 'media'
  | 'ai'
  | 'search'
  | 'network'
  | 'output'
  | 'json'
  | 'tags'
  | 'time'
  | 'meta';


export interface TagDocArgument {
  name: string,
  description: string,
  optional?: boolean,
}

export interface TagDocExample {
  code: string,
  // what the example outputs/does, in plain words (or literal output)
  result?: string,
}

export interface TagDocFunction {
  // the TagFunctions enum key, e.g. 'STRING_UPPER'; unique
  id: string,
  // every name it can be called by, first one is the main name, e.g. ['upper']
  names: Array<string>,
  category: TagDocCategoryId,
  // one-line summary
  summary: string,
  // optional longer explanation, plain text, paragraphs split by '\n\n'
  description?: string,
  // full usage, e.g. '{upper:text}'
  syntax: string,
  args?: Array<TagDocArgument>,
  examples?: Array<TagDocExample>,
  // caveats: limits it counts against, permissions, nsfw, premium, etc.
  notes?: Array<string>,
}


export interface TagDocGuideSection {
  // anchor id, kebab-case
  id: string,
  title: string,
  // plain text paragraphs split by '\n\n'; `inline code` with backticks is rendered as code
  body: string,
  examples?: Array<TagDocExample>,
  // optional key/value table (e.g. limits, settings, comparison operators)
  table?: {
    columns: [string, string] | [string, string, string],
    rows: Array<Array<string>>,
  },
}


export type TagDocMediaScriptCategoryId =
  | 'io'
  | 'audio'
  | 'color'
  | 'distort'
  | 'filters'
  | 'text'
  | 'generate'
  | 'size'
  | 'time'
  | 'compose'
  | 'flow';

export interface TagDocMediaScriptArgument {
  name: string,
  // e.g. '2.0', 'false', 'ISNET_GENERAL_USE'; omitted when the argument is required
  default?: string,
  // allowed range or values, e.g. '0.17..2.0' or 'down, left, right, up'
  range?: string,
  description?: string,
  // `...TEXT` style, takes the rest of the line
  rest?: boolean,
}

export interface TagDocMediaScriptCommand {
  // main command name, e.g. 'audiopitch'; unique
  name: string,
  aliases?: Array<string>,
  category: TagDocMediaScriptCategoryId,
  summary: string,
  // full usage line, e.g. 'audiopitch MEDIA_KEY SCALE=2.0'
  syntax: string,
  args?: Array<TagDocMediaScriptArgument>,
  examples?: Array<TagDocExample>,
  notes?: Array<string>,
}
