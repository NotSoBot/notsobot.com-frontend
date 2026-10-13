import type { TagDocFunction } from '../types';


const USER_LOOKUP_ARG = {
  name: 'user',
  description: 'Optional. A mention, a user ID, or a name to search the server members for. If left out, the person using the tag is used.',
  optional: true,
};

const USER_LOOKUP_NOTE = 'Looking up another user counts as a network request. If nobody matches, nothing is output.';

const RANDOM_DM_NOTE = 'In DMs it picks between the person using the tag and NotSoBot itself.';

const VARIABLES_STORAGE_NOTES = [
  'Makes a request to fetch the saved variables of the current tag. If the tag is not being run as a saved tag (so there is no tag to look up), it outputs `{}`.',
  'If the tag is an alias of another tag, the variables of the original tag are used.',
];


export const TAG_DOC_FUNCTIONS_PART5: Array<TagDocFunction> = [
  {
    id: 'STRING_UPPER',
    names: ['upper'],
    category: 'strings',
    summary: 'Converts text to UPPERCASE.',
    syntax: '{upper:text}',
    args: [
      {name: 'text', description: 'The text to convert.'},
    ],
    examples: [
      {code: '{upper:hello world}', result: 'HELLO WORLD'},
      {code: '{upper:{user}}', result: 'Your username in uppercase'},
    ],
  },
  {
    id: 'STRING_URL_ENCODE',
    names: ['url', 'urlencode'],
    category: 'strings',
    summary: 'URL-encodes text so it can be safely put inside a link.',
    description: 'Uses standard URI component encoding, so spaces become `%20`, `&` becomes `%26`, and so on.',
    syntax: '{url:text}',
    args: [
      {name: 'text', description: 'The text to encode.'},
    ],
    examples: [
      {code: '{url:cats & dogs}', result: 'cats%20%26%20dogs'},
      {code: 'https://www.google.com/search?q={url:{args}}', result: 'A Google search link for whatever was passed into the tag'},
    ],
  },
  {
    id: 'TAG',
    names: ['tag'],
    category: 'tags',
    summary: 'Runs another tag by its ID and inserts its output.',
    description: 'The first part is the ID of the tag to run, everything after the first `|` is passed to that tag as its arguments (what `{args}` returns inside it).\n\nThe called tag runs as if it were the current tag, so functions like `{tagid}` and `{tagname}` refer to it while it runs, and its output (text, embeds, files, etc.) is merged into the current tag\'s output. Variables you set in your tag are not shared with the called tag and the called tag\'s variables do not leak back, unless the tag calls itself, in which case all variables are shared. Usage limits (network requests, tag executions, etc.) are shared between the two.',
    syntax: '{tag:tag_id|arguments?}',
    args: [
      {name: 'tag_id', description: 'The ID of the tag to run (not its name).'},
      {name: 'arguments', description: 'Text passed to the called tag as its arguments. Defaults to nothing.', optional: true},
    ],
    examples: [
      {code: '{tag:123456789012345678}', result: 'The output of tag 123456789012345678, run with no arguments'},
      {code: '{tag:123456789012345678|hello world}', result: 'The output of that tag, with `{args}` being "hello world" inside it'},
    ],
    notes: [
      'The tag must be on the tag directory, or belong to the same server (or the tag owner\'s DMs). Otherwise it errors.',
      'Errors if the ID is missing or is not a valid ID.',
      'Counts toward the tag execution limit (default 2 per run) and counts as a network request.',
      'Calling the tag also increases its usage count.',
      'It is ignored (outputs nothing) when used inside code/component JSON child parsing.',
      'The called tag always counts as a user\'s tag, even when NotSoAI calls it, so `{isfromai}` is `false` inside it and NotSoAI-only functions do not work there.',
    ],
  },
  {
    id: 'TAG_CONTENT',
    names: ['tagcontent'],
    category: 'tags',
    summary: 'Outputs the raw, unparsed content of the current tag.',
    description: 'If the tag is an alias of another tag, the original tag\'s content is output.',
    syntax: '{tagcontent}',
    examples: [
      {code: '{code:{tagcontent}}', result: 'Shows the tag\'s own source in a code block'},
    ],
    notes: [
      'Outputs nothing if not run from a saved tag.',
    ],
  },
  {
    id: 'TAG_ID',
    names: ['tagid'],
    category: 'tags',
    summary: 'Outputs the ID of the current tag.',
    syntax: '{tagid}',
    examples: [
      {code: '{tagid}', result: '123456789012345678'},
    ],
    notes: [
      'Outputs nothing if not run from a saved tag. Inside a tag called with `{tag}`, this is the called tag\'s ID.',
    ],
  },
  {
    id: 'TAG_NAME',
    names: ['tagname'],
    category: 'tags',
    summary: 'Outputs the name of the current tag.',
    syntax: '{tagname}',
    examples: [
      {code: 'You are using the "{tagname}" tag!', result: 'You are using the "cookie" tag!'},
    ],
    notes: [
      'Outputs nothing if not run from a saved tag. Inside a tag called with `{tag}`, this is the called tag\'s name.',
    ],
  },
  {
    id: 'TAG_OWNER_ID',
    names: ['tagownerid'],
    category: 'tags',
    summary: 'Outputs the user ID of the current tag\'s owner.',
    syntax: '{tagownerid}',
    examples: [
      {code: '{tagownerid}', result: '300505364032389122'},
      {code: '<@{tagownerid}> made this tag', result: 'Mentions the tag owner'},
    ],
    notes: [
      'Outputs nothing if not run from a saved tag.',
    ],
  },
  {
    id: 'TEXT',
    names: ['download', 'text'],
    category: 'network',
    summary: 'Downloads a URL and outputs its contents as text.',
    syntax: '{download:url}',
    args: [
      {name: 'url', description: 'The URL to download.'},
    ],
    examples: [
      {code: '{download:https://example.com/file.txt}', result: 'The contents of file.txt'},
      {code: '{traversejson:name|{download:https://example.com/data.json}}', result: 'The `name` field of a downloaded JSON file'},
    ],
    notes: [
      'Counts as a network request.',
      'Errors if the downloaded text would push the tag\'s output past the max attachment size for the current context.',
    ],
  },
  {
    id: 'TEXT_FROM_HTML',
    names: ['downloadfromhtml', 'textfromhtml'],
    category: 'network',
    summary: 'Downloads a web page and outputs its text with the HTML stripped out.',
    syntax: '{downloadfromhtml:url}',
    args: [
      {name: 'url', description: 'The URL of the page to download.'},
    ],
    examples: [
      {code: '{downloadfromhtml:https://example.com}', result: 'The readable text of the page, without HTML tags'},
    ],
    notes: [
      'Counts as a network request.',
      'Errors if the text would push the tag\'s output past the max attachment size for the current context.',
    ],
  },
  {
    id: 'TIME_UNIX',
    names: ['unix'],
    category: 'time',
    summary: 'Outputs a Unix timestamp in milliseconds, either now or for a time you describe.',
    description: 'With no argument it outputs the current time. With an argument, it reads natural language like "tomorrow at 5pm" or "in 2 hours", relative to when the message was sent and using the user\'s timezone.',
    syntax: '{unix:time?}',
    args: [
      {name: 'time', description: 'A time in plain words, e.g. "in 3 days" or "next friday at noon".', optional: true},
    ],
    examples: [
      {code: '{unix}', result: '1760270400000'},
      {code: '{unix:in 1 hour}', result: 'The timestamp (ms) one hour from now'},
    ],
    notes: [
      'If the time can\'t be understood, nothing is output.',
    ],
  },
  {
    id: 'TIME_UNIX_FROM_SNOWFLAKE',
    names: ['unixsnowflake'],
    category: 'time',
    summary: 'Outputs the creation time (Unix milliseconds) of a Discord ID.',
    description: 'Every Discord ID (users, messages, channels, servers, etc.) has its creation time built in. This pulls it out.',
    syntax: '{unixsnowflake:id}',
    args: [
      {name: 'id', description: 'Any Discord ID.'},
    ],
    examples: [
      {code: '{unixsnowflake:{id}}', result: 'When your account was created, in Unix milliseconds'},
    ],
    notes: [
      'Outputs nothing with an empty argument.',
    ],
  },
  {
    id: 'TIME_UNIX_SECONDS',
    names: ['unixs'],
    category: 'time',
    summary: 'Outputs a Unix timestamp in seconds, either now or for a time you describe.',
    description: 'Same as `{unix}`, but in seconds (rounded down), which is what Discord\'s `<t:...>` timestamps use.',
    syntax: '{unixs:time?}',
    args: [
      {name: 'time', description: 'A time in plain words, e.g. "tomorrow at 9am".', optional: true},
    ],
    examples: [
      {code: '{unixs}', result: '1760270400'},
      {code: 'Event starts <t:{unixs:saturday at 8pm}:R>', result: 'Event starts in 5 days (rendered by Discord)'},
    ],
    notes: [
      'If the time can\'t be understood, nothing is output.',
    ],
  },
  {
    id: 'TRANSCRIBE',
    names: ['transcribe'],
    category: 'media',
    summary: 'Transcribes the speech in an audio or video clip into text.',
    description: 'If no URL is given, the most recent audio/video in the chat (attachments, replies, etc.) is used. If none is found and the `MEDIA_AV_FALLBACK` setting is set (e.g. `{settings:MEDIA_AV_FALLBACK|search.youtube}`), that function is run with the same argument to find a URL instead.',
    syntax: '{transcribe:url?}',
    args: [
      {name: 'url', description: 'A link to an audio or video file. Defaults to the last audio/video found.', optional: true},
    ],
    examples: [
      {code: '{transcribe}', result: 'The spoken text of the last audio/video in the chat'},
      {code: '{transcribe:https://example.com/clip.mp3}', result: 'The spoken text of clip.mp3'},
    ],
    notes: [
      'Counts as a network request.',
      'If no media is found or transcription fails, nothing is output (no error).',
    ],
  },
  {
    id: 'TRAVERSE_JSON',
    names: ['traversejson'],
    category: 'json',
    summary: 'Pulls a value out of JSON using a path like `cake[0].test`.',
    description: 'The path is split into keys:\n\n`a.b` goes into key `a`, then key `b`.\n\n`a[0]` goes into key `a`, then index `0` of the array.\n\n`a["some.key"]` or `a[\'some.key\']` uses a quoted key, so dots and brackets inside it are kept (use `\\` to escape a quote).\n\nIf the value found is an object or array it is output as JSON, otherwise it\'s output as-is.',
    syntax: '{traversejson:path|json}',
    args: [
      {name: 'path', description: 'Where to look, e.g. `data.items[2].name`.'},
      {name: 'json', description: 'The JSON text to search through. Everything after the first `|`.'},
    ],
    examples: [
      {code: '{traversejson:cake[0].test|{"cake":[{"test":"a"}]}}', result: 'a'},
      {code: '{traversejson:cake|{"cake":[1,2,3]}}', result: '[1,2,3]'},
      {code: '{traversejson:["a.b"]|{"a.b":5}}', result: '5'},
    ],
    notes: [
      'If the path doesn\'t exist, nothing is output.',
      'Invalid JSON, an empty path, or a missing `|` makes the function fail.',
    ],
  },
  {
    id: 'TYPE',
    names: ['type'],
    category: 'math',
    summary: 'Converts text into a number, with an optional fallback.',
    description: 'The supported types are `number` (a whole number, read with parseInt) and `float` (a decimal number, read with parseFloat). Reading stops at the first character that isn\'t part of a number, so `12abc` becomes `12`.',
    syntax: '{type:type|value|default?}',
    args: [
      {name: 'type', description: '`number` or `float` (case insensitive).'},
      {name: 'value', description: 'The text to convert.'},
      {name: 'default', description: 'Used if the value isn\'t a number.', optional: true},
    ],
    examples: [
      {code: '{type:number|42.9}', result: '42'},
      {code: '{type:float|3.14abc}', result: '3.14'},
      {code: '{type:number|hello|0}', result: '0'},
    ],
    notes: [
      'If the value isn\'t a number and there is no default, nothing is output.',
      'An unknown type, a non-numeric default, or a missing `|` makes the function fail.',
    ],
  },
  {
    id: 'USER_AVATAR',
    names: ['useravatar'],
    category: 'user',
    summary: 'Outputs a user\'s avatar URL.',
    description: 'Gives the user\'s global (account) avatar at 1024px.',
    syntax: '{useravatar:user?}',
    args: [USER_LOOKUP_ARG],
    examples: [
      {code: '{useravatar}', result: 'https://cdn.discordapp.com/avatars/.../....png?size=1024'},
      {code: '{image:{useravatar:{args}}}', result: 'Shows the avatar of the user given as an argument'},
    ],
    notes: [USER_LOOKUP_NOTE],
  },
  {
    id: 'USER_DISCRIMINATOR',
    names: ['userdiscriminator', 'userdiscrim', 'discrim'],
    category: 'user',
    summary: 'Outputs a user\'s discriminator (the old #0000 number).',
    syntax: '{discrim:user?}',
    args: [USER_LOOKUP_ARG],
    examples: [
      {code: '{discrim}', result: '0'},
      {code: '{discrim:@SomeBot}', result: '1234'},
    ],
    notes: [
      'Users on Discord\'s newer username system have a discriminator of `0`.',
      USER_LOOKUP_NOTE,
    ],
  },
  {
    id: 'USER_ID',
    names: ['userid', 'id'],
    category: 'user',
    summary: 'Outputs a user\'s ID.',
    syntax: '{id:user?}',
    args: [USER_LOOKUP_ARG],
    examples: [
      {code: '{id}', result: '300505364032389122'},
      {code: '{id:{args}}', result: 'The ID of the user given as an argument'},
    ],
    notes: [USER_LOOKUP_NOTE],
  },
  {
    id: 'USER_MENTION',
    names: ['usermention', 'mention'],
    category: 'user',
    summary: 'Outputs a mention of a user.',
    syntax: '{mention:user?}',
    args: [USER_LOOKUP_ARG],
    examples: [
      {code: 'Hey {mention}!', result: 'Hey @you!'},
      {code: '{mention:{randuserid}} got the cookie', result: 'Mentions a random member'},
    ],
    notes: [USER_LOOKUP_NOTE],
  },
  {
    id: 'USER_NAME',
    names: ['username', 'name', 'user'],
    category: 'user',
    summary: 'Outputs a user\'s username.',
    syntax: '{user:user?}',
    args: [USER_LOOKUP_ARG],
    examples: [
      {code: 'Hello {user}!', result: 'Hello cakedan!'},
      {code: '{user:300505364032389122}', result: 'The username of that user'},
    ],
    notes: [
      'This is the account username, not the server nickname. Use `{nick}` for that.',
      USER_LOOKUP_NOTE,
    ],
  },
  {
    id: 'USER_NICK',
    names: ['usernick', 'nick'],
    category: 'user',
    summary: 'Outputs a user\'s display name, using their server nickname if they have one.',
    syntax: '{nick:user?}',
    args: [USER_LOOKUP_ARG],
    examples: [
      {code: 'Welcome, {nick}!', result: 'Welcome, Cake Lover!'},
    ],
    notes: [USER_LOOKUP_NOTE],
  },
  {
    id: 'USER_RANDOM',
    names: ['randomuser', 'randuser'],
    category: 'rng',
    summary: 'Outputs the display name of a random server member.',
    syntax: '{randuser}',
    examples: [
      {code: '{randuser} stole the cookie!', result: 'Some Member stole the cookie!'},
    ],
    notes: [
      'If the server\'s member list isn\'t fully loaded yet, NotSoBot requests it first, which can take a moment on big servers.',
      RANDOM_DM_NOTE,
    ],
  },
  {
    id: 'USER_RANDOM_ID',
    names: ['randomuserid', 'randuserid'],
    category: 'rng',
    summary: 'Outputs the ID of a random server member.',
    syntax: '{randuserid}',
    examples: [
      {code: '{randuserid}', result: '123456789012345678'},
      {code: '{mention:{randuserid}}', result: 'Mentions a random member'},
    ],
    notes: [
      'If the server\'s member list isn\'t fully loaded yet, NotSoBot requests it first, which can take a moment on big servers.',
      RANDOM_DM_NOTE,
    ],
  },
  {
    id: 'USER_RANDOM_ONLINE',
    names: ['randomonline', 'randonline'],
    category: 'rng',
    summary: 'Outputs the display name of a random member that has a presence (online, idle or dnd).',
    syntax: '{randonline}',
    examples: [
      {code: '{randonline} has been chosen!', result: 'Some Online Member has been chosen!'},
    ],
    notes: [
      'Only picks from members NotSoBot has cached with a presence.',
      RANDOM_DM_NOTE,
    ],
  },
  {
    id: 'USER_RANDOM_ONLINE_ID',
    names: ['randomonlineid', 'randonlineid'],
    category: 'rng',
    summary: 'Outputs the ID of a random member that has a presence (online, idle or dnd).',
    syntax: '{randonlineid}',
    examples: [
      {code: '{randonlineid}', result: '123456789012345678'},
    ],
    notes: [
      'Only picks from members NotSoBot has cached with a presence.',
      RANDOM_DM_NOTE,
    ],
  },
  {
    id: 'USER_RANDOM_ONLINE_TAG',
    names: ['randomonlinetag', 'randonlinetag'],
    category: 'rng',
    summary: 'Outputs the full user tag of a random member that has a presence (online, idle or dnd).',
    syntax: '{randonlinetag}',
    examples: [
      {code: '{randonlinetag}', result: 'someone#0'},
    ],
    notes: [
      'Only picks from members NotSoBot has cached with a presence.',
      RANDOM_DM_NOTE,
    ],
  },
  {
    id: 'USER_RANDOM_TAG',
    names: ['randomusertag', 'randusertag'],
    category: 'rng',
    summary: 'Outputs the full user tag of a random server member.',
    syntax: '{randusertag}',
    examples: [
      {code: '{randusertag}', result: 'someone#0'},
    ],
    notes: [
      'If the server\'s member list isn\'t fully loaded yet, NotSoBot requests it first, which can take a moment on big servers.',
      RANDOM_DM_NOTE,
    ],
  },
  {
    id: 'USER_STATUS',
    names: ['userstatus'],
    category: 'user',
    summary: 'Outputs a member\'s status: online, idle, dnd or offline.',
    syntax: '{userstatus:user?}',
    args: [USER_LOOKUP_ARG],
    examples: [
      {code: '{userstatus}', result: 'online'},
      {code: '{user:{args}} is {userstatus:{args}}', result: 'cakedan is idle'},
    ],
    notes: [
      'Only works for members of the current server; outputs nothing in DMs or for users who aren\'t in the server.',
      'Members with no known presence show as `offline`.',
      USER_LOOKUP_NOTE,
    ],
  },
  {
    id: 'USER_TAG',
    names: ['usertag'],
    category: 'user',
    summary: 'Outputs a user\'s full tag (username with discriminator).',
    syntax: '{usertag:user?}',
    args: [USER_LOOKUP_ARG],
    examples: [
      {code: '{usertag}', result: 'cakedan#0'},
    ],
    notes: [USER_LOOKUP_NOTE],
  },
  {
    id: 'VARIABLES',
    names: ['variables'],
    category: 'variables',
    summary: 'Outputs every variable in the current run as a JSON object.',
    description: 'Useful for debugging. The output includes the variables you set with `{set}` as well as internal ones that start with `__` (like `__args` and usage counters).',
    syntax: '{variables}',
    examples: [
      {code: '{set:fruit|apple}{variables}', result: '{"__args":[],...,"fruit":"apple"}'},
    ],
  },
  {
    id: 'VARIABLES_CHANNEL',
    names: ['variableschannel'],
    category: 'variables',
    summary: 'Outputs the tag\'s saved channel variables (for this channel) as a JSON object.',
    syntax: '{variableschannel}',
    examples: [
      {code: '{variableschannel}', result: '{"counter":"5"}'},
    ],
    notes: VARIABLES_STORAGE_NOTES,
  },
  {
    id: 'VARIABLES_GLOBAL',
    names: ['variablesglobal'],
    category: 'variables',
    summary: 'Outputs the tag\'s saved global variables as a JSON object.',
    syntax: '{variablesglobal}',
    examples: [
      {code: '{variablesglobal}', result: '{"total_uses":"1234"}'},
    ],
    notes: VARIABLES_STORAGE_NOTES,
  },
  {
    id: 'VARIABLES_SERVER',
    names: ['variablesserver'],
    category: 'variables',
    summary: 'Outputs the tag\'s saved server variables (for this server) as a JSON object.',
    syntax: '{variablesserver}',
    examples: [
      {code: '{variablesserver}', result: '{"leader":"cakedan"}'},
    ],
    notes: VARIABLES_STORAGE_NOTES,
  },
  {
    id: 'VARIABLES_USER',
    names: ['variablesuser'],
    category: 'variables',
    summary: 'Outputs the tag\'s saved user variables (for the person using the tag) as a JSON object.',
    syntax: '{variablesuser}',
    examples: [
      {code: '{variablesuser}', result: '{"coins":"50"}'},
    ],
    notes: VARIABLES_STORAGE_NOTES,
  },
];
