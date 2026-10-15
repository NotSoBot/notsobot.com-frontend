import type { TagDocFunction } from '../types';


const REPEAT_AMOUNT_ARG = {
  name: 'amount',
  description: 'Optional. How many times to insert it. Must be a whole number above 0.',
  optional: true,
};

const REPEAT_AMOUNT_NOTES = [
  'If the amount is not a number, the function is left as plain text.',
  'An amount of 0 or less (or an absurdly large one) causes an error.',
];

const STORAGE_TAG_NOTE = 'Only works when running a saved tag. If the tag is an alias, the original tag\'s storage is used.';

const STORAGE_KEY_NOTE = 'The variable name can be at most 128 characters, otherwise an error is thrown.';

const IMAGE_ARG = {
  name: 'image',
  description: 'Optional. An image URL, or something that points to an image (like a user or emoji). If left out, the most recent image in the chat is used.',
  optional: true,
};

const IMAGE_FALLBACK_NOTE = 'If no image is found and the `MEDIA_IV_FALLBACK` setting is set (see `{settings}`), that fallback function is run with the same argument to find an image instead.';

const GET_DEFAULT_ARG = {
  name: 'default',
  description: 'Optional. Output if the variable does not exist. Only evaluated when it is needed.',
  optional: true,
};


export const TAG_DOC_FUNCTIONS_PART2: Array<TagDocFunction> = [
  {
    id: 'IGNORE',
    names: ['ignore'],
    category: 'meta',
    summary: 'Outputs its content as-is, without running any functions inside it.',
    description: 'Handy for showing tagscript code literally, or for passing code somewhere that will run it later (like a component `run` script).',
    syntax: '{ignore:text}',
    args: [
      {name: 'text', description: 'The text to output untouched. Curly brackets inside must still be balanced.'},
    ],
    examples: [
      {code: '{ignore:{user}}', result: '{user}'},
      {code: 'Type {ignore:{args}} to see your arguments', result: 'Type {args} to see your arguments'},
    ],
  },
  {
    id: 'NOTE',
    names: ['note'],
    category: 'meta',
    summary: 'A comment. Outputs nothing and runs nothing inside it.',
    syntax: '{note:text}',
    args: [
      {name: 'text', description: 'Anything you want, it is ignored completely.'},
    ],
    examples: [
      {code: '{note:this part greets the user}Hello {user}!', result: 'Hello Cake!'},
    ],
  },
  {
    id: 'CHANNEL_RANDOM_ID',
    names: ['randchannelid'],
    category: 'server',
    summary: 'Outputs the ID of a random channel in the server.',
    syntax: '{randchannelid}',
    examples: [
      {code: '{randchannelid}', result: '560595518129045504'},
    ],
    notes: [
      'Picks from every channel in the server (including categories and voice channels).',
      'In DMs it outputs the current channel\'s ID.',
    ],
  },
  {
    id: 'CHANNEL_RANDOM_MENTION',
    names: ['randchannelmention'],
    category: 'server',
    summary: 'Mentions a random channel in the server.',
    syntax: '{randchannelmention}',
    examples: [
      {code: 'Go check out {randchannelmention}!', result: 'Go check out #general!'},
    ],
    notes: [
      'Picks from every channel in the server (including categories and voice channels).',
      'In DMs it mentions the current channel.',
    ],
  },
  {
    id: 'DISCORD',
    names: ['discord'],
    category: 'meta',
    summary: 'Not implemented yet. It is always left as plain text.',
    syntax: '{discord:path}',
    examples: [
      {code: '{discord:user.id}', result: '{discord:user.id}'},
    ],
  },
  {
    id: 'EMBED_JSON',
    names: ['embedjson'],
    category: 'output',
    summary: 'Adds an embed to the tag\'s response.',
    description: 'Takes a Discord embed object as JSON, e.g. `title`, `description`, `url`, `color` (a number), `timestamp`, `fields` (objects with `name`, `value` and `inline`), `author`, `footer`, `image` and `thumbnail` (objects with a `url`).',
    syntax: '{embedjson:json}',
    args: [
      {name: 'json', description: 'An embed object as JSON. Functions inside it are evaluated first.'},
    ],
    examples: [
      {
        code: '{embedjson:{"title": "Hello {user}!", "description": "Welcome to {guild}", "color": 16750592}}',
        result: 'Adds an orange embed greeting the user.',
      },
      {
        code: '{embedjson:{"image": {"url": "{avatar}"}}}',
        result: 'Adds an embed showing your avatar.',
      },
    ],
    notes: [
      'If the JSON is invalid, or the embed has no text and no image/thumbnail/video url, the function is left as plain text.',
      '{newline} inside a JSON string becomes a real line break.',
      'A tag can have at most 10 embeds, going over causes an error.',
    ],
  },
  {
    id: 'EVAL',
    names: ['eval'],
    category: 'meta',
    summary: 'Evaluates its argument a second time.',
    description: 'The argument is evaluated like any other function argument, then the result is evaluated again as tagscript. This lets you build code out of text, for example with `{bracketleft}` and `{bracketright}`.',
    syntax: '{eval:code}',
    args: [
      {name: 'code', description: 'The text to evaluate.'},
    ],
    examples: [
      {code: '{eval:{bracketleft}user{bracketright}}', result: 'Your username'},
      {code: '{set:code|{ignore:{range:1|10}}}{eval:{get:code}}', result: 'A random number from 1 to 10'},
    ],
  },
  {
    id: 'EVAL_SILENT',
    names: ['evalsilent'],
    category: 'meta',
    summary: 'Evaluates its argument and swallows any error.',
    description: 'Unlike `{eval}`, the argument is only evaluated once. If anything inside throws an error, the output of the whole block is dropped and the tag keeps going.',
    syntax: '{evalsilent:code}',
    args: [
      {name: 'code', description: 'The tagscript to run.'},
    ],
    examples: [
      {code: '{evalsilent:{getfilename:5}}Done', result: 'Done (even if there is no 5th file)'},
    ],
    notes: [
      'An `{exit}` or `{exitsilent}` inside is not swallowed, it still stops the whole tag.',
    ],
  },
  {
    id: 'EXIT',
    names: ['exit'],
    category: 'logic',
    summary: 'Stops the tag immediately and replaces the whole output with a message.',
    description: 'Everything produced so far (text, embeds, files, pages and components) is thrown away and the response becomes the given message.',
    syntax: '{exit:message?}',
    args: [
      {name: 'message', description: 'Optional. The text to respond with. Defaults to `Tag Exited`.', optional: true},
    ],
    examples: [
      {code: '{if:{args}|=||then:{exit:Please give me some text!}}You said {args}', result: 'Please give me some text! (when no arguments are given)'},
      {code: 'Hello{exit}', result: 'Tag Exited'},
    ],
    notes: [
      'Also stops the main tag when used inside a tag called with `{tag}`.',
      'It is not caught by `{iferror}` or `{evalsilent}`, it still stops the whole tag.',
    ],
  },
  {
    id: 'EXIT_SILENT',
    names: ['exitsilent'],
    category: 'logic',
    summary: 'Stops the tag immediately, keeping everything output so far.',
    syntax: '{exitsilent:message?}',
    args: [
      {name: 'message', description: 'Optional. Text added to the end of the output before stopping.', optional: true},
    ],
    examples: [
      {code: 'Hello{exitsilent: world} this is never shown', result: 'Hello world'},
    ],
    notes: [
      'Also stops the main tag when used inside a tag called with `{tag}`.',
      'It is not caught by `{iferror}` or `{evalsilent}`, it still stops the whole tag.',
    ],
  },
  {
    id: 'GUILD',
    names: ['guild', 'server'],
    category: 'server',
    summary: 'Outputs the server\'s name.',
    syntax: '{guild}',
    examples: [
      {code: 'Welcome to {guild}!', result: 'Welcome to NotSoServer!'},
    ],
    notes: [
      'In DMs it outputs `Direct Message`.',
    ],
  },
  {
    id: 'GUILD_COUNT',
    names: ['guildcount', 'membercount', 'servercount'],
    category: 'server',
    summary: 'Outputs how many members the server has.',
    syntax: '{guildcount}',
    examples: [
      {code: 'We have {membercount} members!', result: 'We have 1234 members!'},
    ],
    notes: [
      'In DMs it outputs `2`.',
    ],
  },
  {
    id: 'GUILD_ID',
    names: ['guildid', 'serverid', 'sid', 'gid'],
    category: 'server',
    summary: 'Outputs the server\'s ID.',
    syntax: '{guildid}',
    examples: [
      {code: '{guildid}', result: '178313653177548800'},
    ],
    notes: [
      'In DMs it outputs `0`.',
    ],
  },
  {
    id: 'HASTEBIN',
    names: ['hastebin', 'haste'],
    category: 'network',
    summary: 'Not implemented yet. It is always left as plain text.',
    syntax: '{hastebin:text}',
    examples: [
      {code: '{hastebin:hello}', result: '{hastebin:hello}'},
    ],
  },
  {
    id: 'IMAGE_INTERROGATE',
    names: ['identify', 'interrogate'],
    category: 'ai',
    summary: 'Describes an image with AI, outputting a short text prompt of what it shows.',
    syntax: '{identify:image?}',
    args: [IMAGE_ARG],
    examples: [
      {code: '{identify}', result: 'A description of the last image in chat, e.g. "a cat sitting on a laptop keyboard"'},
      {code: '{identify:{avatar}}', result: 'A description of your avatar'},
    ],
    notes: [
      'Counts as a network request.',
      'If no image is found or the request fails, nothing is output.',
      IMAGE_FALLBACK_NOTE,
    ],
  },
  {
    id: 'IMAGE_OCR',
    names: ['ocr'],
    category: 'media',
    summary: 'Reads the text in an image (OCR) and outputs it.',
    syntax: '{ocr:image?}',
    args: [IMAGE_ARG],
    examples: [
      {code: '{ocr}', result: 'The text found in the last image in chat'},
      {code: '{ocr:https://example.com/sign.png}', result: 'The text on the sign'},
    ],
    notes: [
      'Counts as a network request.',
      'If no image is found, no text is detected or the request fails, nothing is output.',
      IMAGE_FALLBACK_NOTE,
    ],
  },
  {
    id: 'INSERT_BRACKET_LEFT',
    names: ['bracketleft'],
    category: 'strings',
    summary: 'Outputs a literal `{`.',
    syntax: '{bracketleft:amount?}',
    args: [REPEAT_AMOUNT_ARG],
    examples: [
      {code: '{bracketleft}', result: '{'},
      {code: '{bracketleft:3}', result: '{{{'},
    ],
    notes: REPEAT_AMOUNT_NOTES,
  },
  {
    id: 'INSERT_BRACKET_RIGHT',
    names: ['bracketright'],
    category: 'strings',
    summary: 'Outputs a literal `}`.',
    syntax: '{bracketright:amount?}',
    args: [REPEAT_AMOUNT_ARG],
    examples: [
      {code: '{bracketright}', result: '}'},
      {code: '{bracketleft}user{bracketright}', result: '{user}'},
    ],
    notes: REPEAT_AMOUNT_NOTES,
  },
  {
    id: 'INSERT_NEWLINE',
    names: ['newline'],
    category: 'strings',
    summary: 'Outputs a line break.',
    description: 'Useful where a normal line break would get trimmed away, like at the start or end of a function argument.',
    syntax: '{newline:amount?}',
    args: [REPEAT_AMOUNT_ARG],
    examples: [
      {code: 'Line one{newline}Line two', result: 'Line one\nLine two'},
      {code: 'Top{newline:3}Bottom', result: 'Top, three line breaks, then Bottom'},
    ],
    notes: [
      ...REPEAT_AMOUNT_NOTES,
      'It is inserted as an internal placeholder character that becomes a line break once the tag finishes, so it survives trimming in between. Inside the JSON strings of {embedjson}, {pagejson} and {componentjson} it becomes a line break too.',
    ],
  },
  {
    id: 'INSERT_SPLITTER_ARGUMENT',
    names: ['splitterargument'],
    category: 'strings',
    summary: 'Outputs a literal `|` (the argument splitter).',
    syntax: '{splitterargument:amount?}',
    args: [REPEAT_AMOUNT_ARG],
    examples: [
      {code: 'a{splitterargument}b', result: 'a|b'},
      {code: '{splitterargument:2}', result: '||'},
    ],
    notes: REPEAT_AMOUNT_NOTES,
  },
  {
    id: 'INSERT_SPLITTER_FUNCTION',
    names: ['splitterfunction'],
    category: 'strings',
    summary: 'Outputs a literal `:` (the function splitter).',
    syntax: '{splitterfunction:amount?}',
    args: [REPEAT_AMOUNT_ARG],
    examples: [
      {code: '12{splitterfunction}30', result: '12:30'},
    ],
    notes: REPEAT_AMOUNT_NOTES,
  },
  {
    id: 'JSON_CHANNEL',
    names: ['json.channel', 'channeljson'],
    category: 'json',
    summary: 'Outputs a channel as a JSON object.',
    description: 'The object uses Discord\'s field names, such as `id`, `name`, `type`, `guild_id`, `parent_id`, `position`, `nsfw`, `permission_overwrites` and (for text channels) `topic`.',
    syntax: '{json.channel:channel?}',
    args: [
      {name: 'channel', description: 'Optional. A channel in this server, by mention, ID or name. Defaults to the current channel.', optional: true},
    ],
    examples: [
      {code: '{traversejson:name|{json.channel}}', result: 'general'},
      {code: '{json.channel:560595518129045504}', result: '{"id":"560595518129045504","name":"general","type":0,...}'},
    ],
    notes: [
      'If no channel matches, nothing is output.',
      'If the current channel is not cached it is fetched, which counts as a network request.',
    ],
  },
  {
    id: 'JSON_GUILD',
    names: ['json.guild'],
    category: 'json',
    summary: 'Outputs the current server as a JSON object.',
    description: 'Includes the server\'s details (such as `id`, `name`, `owner_id`), along with its members and a `presences` list built from the members\' presences.',
    syntax: '{json.guild}',
    examples: [
      {code: '{traversejson:name|{json.guild}}', result: 'NotSoServer'},
    ],
    notes: [
      'In very large servers (over 10,000 members) only you, the bot and members in voice channels are included in `members`.',
      'In DMs nothing is output.',
    ],
  },
  {
    id: 'JSON_MEMBER',
    names: ['json.member'],
    category: 'json',
    summary: 'Outputs a server member as a JSON object.',
    description: 'The object uses Discord\'s field names, such as `user`, `nick`, `joined_at`, `premium_since`, `roles` (full role objects), `hoisted_role`, `communication_disabled_until`, `avatar` and `permissions`.',
    syntax: '{json.member:user?}',
    args: [
      {name: 'user', description: 'Optional. A mention, user ID or name. Defaults to you.', optional: true},
    ],
    examples: [
      {code: '{traversejson:nick|{json.member}}', result: 'Your nickname'},
      {code: '{json.member:@Cake}', result: 'Cake\'s member object'},
    ],
    notes: [
      'Looking up another user counts as a network request.',
      'If the user is not a member of this server (or you are in DMs), nothing is output.',
    ],
  },
  {
    id: 'JSON_MEMBER_OR_USER',
    names: ['json.memberoruser'],
    category: 'json',
    summary: 'Outputs a member as JSON, or a user if they are not in the server.',
    description: 'Gives the same object as `{json.member}` when possible, and falls back to the user object from `{json.user}` otherwise (for example in DMs).',
    syntax: '{json.memberoruser:user?}',
    args: [
      {name: 'user', description: 'Optional. A mention, user ID or name. Defaults to you.', optional: true},
    ],
    examples: [
      {code: '{json.memberoruser}', result: 'Your member object, or your user object in DMs'},
    ],
    notes: [
      'Looking up another user counts as a network request.',
      'If nobody matches, nothing is output.',
    ],
  },
  {
    id: 'JSON_MESSAGE',
    names: ['json.message'],
    category: 'json',
    summary: 'Outputs a message as a JSON object.',
    description: 'The object uses Discord\'s field names, such as `id`, `content`, `author`, `member`, `attachments`, `embeds`, `components`, `mentions`, `reactions`, `timestamp`, `edited_timestamp` and `referenced_message`.',
    syntax: '{json.message:messageId?}',
    args: [
      {name: 'messageId', description: 'Optional. The ID of a message in the current channel. Defaults to the message that ran the tag.', optional: true},
    ],
    examples: [
      {code: '{traversejson:content|{json.message}}', result: 'The content of the message that ran the tag'},
      {code: '{json.message:{messagelastid}}', result: 'The last message in the channel as JSON'},
    ],
    notes: [
      'Only messages in the current channel can be fetched.',
      'When an ID is given, you need View Channel and Read Message History in the channel, and so does the bot, otherwise an error is thrown.',
      'Fetching a message that is not cached counts as a network request. If it cannot be found, nothing is output.',
      'With no ID, nothing is output when the tag was run with a slash command.',
    ],
  },
  {
    id: 'JSON_MESSAGE_REPLY',
    names: ['json.messagereply'],
    category: 'json',
    summary: 'Outputs the message being replied to as a JSON object.',
    description: 'Same shape as `{json.message}`, but for the message the tag\'s message replied to.',
    syntax: '{json.messagereply}',
    examples: [
      {code: '{traversejson:author.username|{json.messagereply}}', result: 'The username of whoever wrote the replied-to message'},
    ],
    notes: [
      'Outputs nothing if the message is not a reply, or when the tag was run with a slash command.',
    ],
  },
  {
    id: 'JSON_USER',
    names: ['json.user', 'userjson'],
    category: 'json',
    summary: 'Outputs a user as a JSON object.',
    description: 'The object uses Discord\'s field names, such as `id`, `username`, `global_name`, `discriminator`, `avatar`, `bot`, `system` and `public_flags`.',
    syntax: '{json.user:user?}',
    args: [
      {name: 'user', description: 'Optional. A mention, user ID or name. Defaults to you.', optional: true},
    ],
    examples: [
      {code: '{traversejson:global_name|{json.user}}', result: 'Your display name'},
      {code: '{json.user:@Cake}', result: '{"avatar":"...","bot":false,"id":"...","username":"cake",...}'},
    ],
    notes: [
      'Looking up another user counts as a network request.',
      'If nobody matches, nothing is output.',
    ],
  },
  {
    id: 'LOGICAL_AND',
    names: ['and'],
    category: 'logic',
    summary: 'Outputs the last value only if every value is non-empty.',
    description: 'Each value is evaluated in order. As soon as one comes out empty it stops and outputs nothing. If they are all non-empty, the last one is output.',
    syntax: '{and:value1|value2|...}',
    args: [
      {name: 'value1|value2|...', description: 'Two or more values, split by `|`. Evaluated left to right, only as far as needed.'},
    ],
    examples: [
      {code: '{and:{args}|You said {args}}', result: 'You said hi (or nothing if no arguments were given)'},
      {code: '{and:a||c}', result: '(nothing)'},
    ],
    notes: [
      'Without a `|` the function is left as plain text.',
    ],
  },
  {
    id: 'LOGICAL_DELETE',
    names: ['delete'],
    category: 'variables',
    summary: 'Deletes a variable set with `{set}`.',
    syntax: '{delete:name}',
    args: [
      {name: 'name', description: 'The name of the variable to delete.'},
    ],
    examples: [
      {code: '{set:count|5}{delete:count}{get:count|gone}', result: 'gone'},
    ],
    notes: [
      'Outputs nothing.',
      'Names starting with `__` are private and cannot be deleted. Names longer than 64 characters cause an error.',
    ],
  },
  {
    id: 'LOGICAL_DELETE_CHANNEL',
    names: ['deletechannel'],
    category: 'variables',
    summary: 'Deletes a variable saved for this channel with `{setchannel}`.',
    syntax: '{deletechannel:name}',
    args: [
      {name: 'name', description: 'The name of the stored variable to delete.'},
    ],
    examples: [
      {code: '{deletechannel:highscore}', result: 'Removes this channel\'s saved "highscore".'},
    ],
    notes: [
      'Outputs nothing, and failures are ignored silently.',
      STORAGE_TAG_NOTE,
      STORAGE_KEY_NOTE,
    ],
  },
  {
    id: 'LOGICAL_DELETE_SERVER',
    names: ['deleteserver'],
    category: 'variables',
    summary: 'Deletes a variable saved for this server with `{setserver}`.',
    syntax: '{deleteserver:name}',
    args: [
      {name: 'name', description: 'The name of the stored variable to delete.'},
    ],
    examples: [
      {code: '{deleteserver:counter}', result: 'Removes this server\'s saved "counter".'},
    ],
    notes: [
      'Outputs nothing, and failures are ignored silently.',
      'In DMs the channel is used in place of the server.',
      STORAGE_TAG_NOTE,
      STORAGE_KEY_NOTE,
    ],
  },
  {
    id: 'LOGICAL_DELETE_USER',
    names: ['deleteuser'],
    category: 'variables',
    summary: 'Deletes a variable saved for you with `{setuser}`.',
    syntax: '{deleteuser:name}',
    args: [
      {name: 'name', description: 'The name of the stored variable to delete.'},
    ],
    examples: [
      {code: '{deleteuser:coins}', result: 'Removes your saved "coins".'},
    ],
    notes: [
      'Outputs nothing, and failures are ignored silently.',
      'Always affects the person using the tag.',
      STORAGE_TAG_NOTE,
      STORAGE_KEY_NOTE,
    ],
  },
  {
    id: 'LOGICAL_FOR_EACH',
    names: ['foreach'],
    category: 'logic',
    summary: 'Runs code once for every item in a list, or a set number of times.',
    description: 'The first value is evaluated, then:\n\n'
      + '- a whole number runs the code that many times;\n'
      + '- a JSON array runs it once per item;\n'
      + '- a JSON object runs it once per key;\n'
      + '- a JSON string is split into words (like command arguments, quotes keep words together) and runs once per word.\n\n'
      + 'Inside the code, `{get:idx}` is the current index (or object key) and `{get:valuex}` is the current item (objects and arrays come out as JSON). The output of every run is joined together with nothing in between.',
    syntax: '{foreach:list|code}',
    args: [
      {name: 'list', description: 'A number, or a JSON array/object/string to loop over.'},
      {name: 'code', description: 'The tagscript to run for each item. Everything after the first `|` is part of the code.'},
    ],
    examples: [
      {code: '{foreach:["a","b","c"]|{get:idx}={get:valuex} }', result: '0=a 1=b 2=c'},
      {code: '{foreach:3|Hi! }', result: 'Hi! Hi! Hi!'},
      {code: '{foreach:{"x":1,"y":2}|{get:idx}:{get:valuex}{newline}}', result: 'x:1 and y:2 on separate lines'},
    ],
    notes: [
      'At most 200 iterations, more causes an error.',
      'If the list is invalid JSON, empty, or anything else, nothing is output.',
      'Without a `|` the function is left as plain text.',
    ],
  },
  {
    id: 'LOGICAL_GET',
    names: ['get'],
    category: 'variables',
    summary: 'Outputs the value of a variable set with `{set}`.',
    syntax: '{get:name|default?}',
    args: [
      {name: 'name', description: 'The variable name. Functions inside it are evaluated, and surrounding spaces are trimmed.'},
      GET_DEFAULT_ARG,
    ],
    examples: [
      {code: '{set:food|cake}I like {get:food}', result: 'I like cake'},
      {code: '{get:missing|nothing here}', result: 'nothing here'},
      {code: '{get:__files}', result: '[{"filename":"image.png"}] (the files attached to the response so far)'},
    ],
    notes: [
      'Names longer than 64 characters cause an error.',
      'The special name `__files` outputs a JSON array of the tag\'s files (`filename` and `description`).',
      'If the variable does not exist and no default is given, nothing is output.',
    ],
  },
  {
    id: 'LOGICAL_GET_CHANNEL',
    names: ['getchannel'],
    category: 'variables',
    summary: 'Outputs a variable saved for this channel with `{setchannel}`.',
    description: 'Stored variables persist between uses of the tag. Channel variables are shared by everyone using the tag in this channel.',
    syntax: '{getchannel:name|default?}',
    args: [
      {name: 'name', description: 'The stored variable name. Functions inside it are evaluated, and surrounding spaces are trimmed.'},
      GET_DEFAULT_ARG,
    ],
    examples: [
      {code: 'Channel high score: {getchannel:highscore|0}', result: 'Channel high score: 42'},
    ],
    notes: [
      STORAGE_TAG_NOTE + ' Otherwise nothing is output.',
      STORAGE_KEY_NOTE,
    ],
  },
  {
    id: 'LOGICAL_GET_FILE_NAME',
    names: ['getfilename'],
    category: 'media',
    summary: 'Outputs the filename of one of the tag\'s files.',
    syntax: '{getfilename:number}',
    args: [
      {name: 'number', description: 'Which file, starting at 1 for the first file.'},
    ],
    examples: [
      {code: '{getfilename:1}', result: 'The first file\'s name, e.g. image.png'},
    ],
    notes: [
      'Empty or non-numeric input leaves the function as plain text.',
      'A file number that does not exist causes an error.',
    ],
  },
  {
    id: 'LOGICAL_GET_GLOBAL',
    names: ['getglobal'],
    category: 'variables',
    summary: 'Outputs a global variable saved with `{setglobal}`.',
    description: 'Global variables belong to the tag itself and are shared by everyone, in every server.',
    syntax: '{getglobal:name|default?}',
    args: [
      {name: 'name', description: 'The stored variable name. Functions inside it are evaluated, and surrounding spaces are trimmed.'},
      GET_DEFAULT_ARG,
    ],
    examples: [
      {code: 'This tag has been used {getglobal:uses|0} times', result: 'This tag has been used 1337 times'},
    ],
    notes: [
      STORAGE_TAG_NOTE + ' Otherwise nothing is output.',
      STORAGE_KEY_NOTE,
    ],
  },
  {
    id: 'LOGICAL_GET_SERVER',
    names: ['getserver'],
    category: 'variables',
    summary: 'Outputs a variable saved for this server with `{setserver}`.',
    description: 'Server variables are shared by everyone using the tag in this server.',
    syntax: '{getserver:name|default?}',
    args: [
      {name: 'name', description: 'The stored variable name. Functions inside it are evaluated, and surrounding spaces are trimmed.'},
      GET_DEFAULT_ARG,
    ],
    examples: [
      {code: 'Server counter: {getserver:counter|0}', result: 'Server counter: 7'},
    ],
    notes: [
      'In DMs the channel is used in place of the server.',
      STORAGE_TAG_NOTE + ' Otherwise nothing is output.',
      STORAGE_KEY_NOTE,
    ],
  },
  {
    id: 'LOGICAL_GET_USER',
    names: ['getuser'],
    category: 'variables',
    summary: 'Outputs a variable saved for you with `{setuser}`.',
    description: 'User variables are separate for each person using the tag, and follow them across servers.',
    syntax: '{getuser:name|default?}',
    args: [
      {name: 'name', description: 'The stored variable name. Functions inside it are evaluated, and surrounding spaces are trimmed.'},
      GET_DEFAULT_ARG,
    ],
    examples: [
      {code: 'You have {getuser:coins|0} coins', result: 'You have 150 coins'},
    ],
    notes: [
      'Always reads the variable of the person using the tag.',
      STORAGE_TAG_NOTE + ' Otherwise nothing is output.',
      STORAGE_KEY_NOTE,
    ],
  },
  {
    id: 'LOGICAL_INCLUDES',
    names: ['includes'],
    category: 'logic',
    summary: 'Outputs `true` if the text matches any of the given values, otherwise `false`.',
    description: 'The first value is compared against each of the others in order (exact, case-sensitive match).',
    syntax: '{includes:text|value1|value2|...}',
    args: [
      {name: 'text', description: 'The text to look for. Functions inside it are evaluated, the same way as the values.'},
      {name: 'value1|value2|...', description: 'The values to compare against. These are evaluated one by one until a match is found.'},
    ],
    examples: [
      {code: '{includes:cake|pie|cake|cookie}', result: 'true'},
      {code: '{includes:{lower:{args}}|yes|y}', result: 'true when the arguments are "yes" or "Y"'},
      {code: '{includes:Cake|cake}', result: 'false'},
    ],
    notes: [
      'Without a `|` the function is left as plain text.',
    ],
  },
  {
    id: 'LOGICAL_IF',
    names: ['if'],
    category: 'logic',
    summary: 'Compares two values and runs `then:` or `else:` depending on the result.',
    description: 'Comparisons: `=` equal, `!=` not equal, `>` `>=` `<` `<=` numeric comparisons (decimals work), `~` which compares numbers by value or text case-insensitively, and `?` which checks if the first value matches the regex in the second value (case-insensitive).\n\n'
      + 'After the two values, give up to three branches starting with `then:`, `else:` or `finally:`, in any order. Only the branch that matches is evaluated, then `finally:` (if given) is evaluated and added after it.',
    syntax: '{if:value1|comparison|value2|then:code|else:code}',
    args: [
      {name: 'value1', description: 'The first value to compare.'},
      {name: 'comparison', description: 'One of `=`, `!=`, `>`, `>=`, `<`, `<=`, `~`, `?`. Write it with no spaces around it.'},
      {name: 'value2', description: 'The second value to compare.'},
      {name: 'then:code', description: 'Output when the comparison is true.', optional: true},
      {name: 'else:code', description: 'Output when the comparison is false.', optional: true},
      {name: 'finally:code', description: 'Always evaluated and output after then/else (without the `finally:` prefix).', optional: true},
    ],
    examples: [
      {code: '{if:{args}|=|hello|then:Hi there!|else:You did not say hello.}', result: 'Hi there! (when the argument is "hello")'},
      {code: '{if:{range:1|10}|>|5|then:High|else:Low}', result: 'High or Low'},
      {code: '{if:YES|~|yes|then:match}', result: 'match'},
      {code: '{if:{args}|?|^(hi\\|hello)$|then:Hey!|else:...}', result: 'Hey! (when the argument is "hi" or "Hello")'},
      {code: '{if:1|=|2|then:same|else:different|finally:!}', result: 'different!'},
    ],
    notes: [
      '`>`, `>=`, `<` and `<=` are false if either value is not a number.',
      '`?` matches anywhere in the text unless the regex uses `^` and `$`. Escape `|` as `\\|` inside the regex. An invalid regex, or one that takes too long, causes an error.',
      'At least one branch is required, and each branch can only appear once (a duplicate causes an error).',
      'Branches must start exactly with `then:`, `else:` or `finally:` (no leading spaces), and the comparison must be a valid operator, otherwise the function is left as plain text.',
    ],
  },
  {
    id: 'LOGICAL_IF_ERROR',
    names: ['iferror'],
    category: 'logic',
    summary: 'Outputs the first value that does not throw an error.',
    description: 'Tries each value in order. If evaluating one errors, its output is dropped and the next one is tried, with `{get:error}` set to that error\'s message. If they all error, nothing is output.',
    syntax: '{iferror:code1|code2|...}',
    args: [
      {name: 'code1|code2|...', description: 'Values to try, split by `|`.'},
    ],
    examples: [
      {code: '{iferror:{getfilename:3}|No third file!}', result: 'No third file! (when there are fewer than 3 files)'},
      {code: '{iferror:{attach:{arg}}|Couldn\'t attach it: {get:error}}', result: 'The download error, when the link doesn\'t work'},
    ],
    notes: [
      'With a single value (no `|`), it is evaluated and output, or nothing is output if it errors.',
      'An `{exit}` or `{exitsilent}` inside is not caught, it still stops the whole tag.',
      '`error` only exists inside the `{iferror}`, afterwards it goes back to what it was before.',
    ],
  },
  {
    id: 'LOGICAL_IS_FROM_AI',
    names: ['isfromai'],
    category: 'meta',
    summary: 'Outputs `true` if the code was written by NotSoAI, otherwise `false`.',
    description: 'True when the code running is NotSoAI\'s response (from the AI command, or an `{ai}` reply that gets run as code), and false in a user\'s tag, including a tag NotSoAI calls with `{tag}`. This is the same check the NotSoAI-only functions use.',
    syntax: '{isfromai}',
    examples: [
      {code: '{isfromai}', result: 'false (in a user\'s tag)'},
    ],
  },
  {
    id: 'LOGICAL_IS_FROM_COMPONENT',
    names: ['isfromcomponent'],
    category: 'meta',
    summary: 'Outputs `true` if the code is running because of a component (button/select menu use or a component timeout), otherwise `false`.',
    syntax: '{isfromcomponent}',
    examples: [
      {code: '{if:{isfromcomponent}|=|true|then:Thanks for clicking!|else:Click the button below.}', result: 'Click the button below. (when first run)'},
    ],
  },
  {
    id: 'LOGICAL_IS_MAIN_TAG',
    names: ['ismaintag'],
    category: 'tags',
    summary: 'Outputs `true` if this is the tag that was run directly, or `false` if it was called from another tag with `{tag}`.',
    syntax: '{ismaintag}',
    examples: [
      {code: '{if:{ismaintag}|=|true|then:Run directly!|else:Called from another tag.}', result: 'Run directly!'},
    ],
  },
  {
    id: 'LOGICAL_OR',
    names: ['or'],
    category: 'logic',
    summary: 'Outputs the first value that is not empty.',
    description: 'Each value is evaluated in order and the first non-empty one is output. Later values are not evaluated. If they are all empty, nothing is output.',
    syntax: '{or:value1|value2|...}',
    args: [
      {name: 'value1|value2|...', description: 'Values to try, split by `|`.'},
    ],
    examples: [
      {code: 'Hello {or:{args}|stranger}!', result: 'Hello stranger! (when no arguments are given)'},
      {code: '{or:{get:nick}|{get:name}|Unknown}', result: 'The first of those variables that is set'},
    ],
    notes: [
      'With a single value (no `|`), it is evaluated and output.',
    ],
  },
];
