import type { TagDocFunction } from '../types';


// Shared wording for the "last media" lookup used by {media}, {image}, {video}, etc.
const LAST_MEDIA_DESCRIPTION = [
  'With no argument, the bot looks for the most recent matching media in this order: an attachment on a slash command, the message that ran the tag (attachments, embeds, stickers), the message it replies to, recent messages in the channel that the bot has cached, and finally the last 50 messages in the channel (only if the bot can read message history).',
  'With an argument, attachments on the message that ran the tag and the message it replies to still come first. After that the argument is read as: `^` (the last media, same as no argument), a URL or a Discord message link (it takes the media from that message), a user mention, ID, `@name` or `name#0000` (that user\'s avatar), a custom emoji (its image), a unicode emoji (its Twemoji image), or a member name search (their avatar).',
].join('\n\n');

const LAST_MEDIA_NOTE = 'Counts as 1 network request, even if nothing is found.';
const NOTHING_FOUND_NOTE = 'Outputs nothing if no matching media is found.';
const IV_FALLBACK_NOTE = 'If nothing is found, a fallback set with `{settings:MEDIA_IV_FALLBACK|...}` runs instead, with the same argument (for example `search.google.images`, `search.ddg.images` or `imagine`, which generates an image and uses its temporary URL).';
const STORAGE_NOTES = [
  'Keys can be up to 128 characters and values up to 16,384 characters, otherwise the tag errors.',
  'Each tag can keep up to 5 keys per channel, server, user or global storage; saving a 6th key errors. An empty value deletes the key.',
  'Storage belongs to the tag (aliases share the original tag\'s storage). Nothing is saved unless the code is running as a saved tag.',
  'Both the key and the value can contain other functions; they are run before saving.',
  'Without a `|` the function is left as plain text.',
];
const MESSAGE_PERMISSION_NOTE = 'You need View Channel and Read Message History in that channel, and the bot must be able to read its history, or the tag errors.';


export const TAG_DOC_FUNCTIONS_PART3: Array<TagDocFunction> = [
  // Variables & storage

  {
    id: 'LOGICAL_SET',
    names: ['set'],
    category: 'variables',
    summary: 'Set a variable for this run of the tag.',
    description: 'Stores a value under a name so you can read it back later with `{get:name}`. Variables only last for the current run; use `{setserver}`, `{setuser}`, `{setchannel}` or `{setglobal}` to keep values between runs.',
    syntax: '{set:name|value}',
    args: [
      {name: 'name', description: 'The variable name. Cannot start with `__` (those are reserved).'},
      {name: 'value', description: 'The value to store. Everything after the first `|` is used, so it can contain more `|` characters. Leading/trailing whitespace is trimmed.'},
    ],
    examples: [
      {code: '{set:greeting|Hello there}{get:greeting}, {user}!', result: 'Hello there, Cake!'},
      {code: '{set:roll|{range:1|6}}You rolled {get:roll}', result: 'You rolled 4'},
    ],
    notes: [
      'Names can be up to 64 characters and you can have up to 100 variables per run.',
      'Values longer than 1 MiB are cut off.',
      'Setting an existing name overwrites it.',
      'The name and value can contain other functions; they are run before saving.',
      'Without a `|` the function is left as plain text.',
    ],
  },
  {
    id: 'LOGICAL_SET_CHANNEL',
    names: ['setchannel'],
    category: 'variables',
    summary: 'Save a value for this tag, shared by everyone in the current channel.',
    description: 'Keeps the value between runs. Read it back with `{getchannel:name}`.',
    syntax: '{setchannel:name|value}',
    args: [
      {name: 'name', description: 'The storage key.'},
      {name: 'value', description: 'The value to save.'},
    ],
    examples: [
      {code: '{setchannel:lastuser|{user}}Saved!', result: 'Saved! (and remembers you as the last user in this channel)'},
    ],
    notes: STORAGE_NOTES,
  },
  {
    id: 'LOGICAL_SET_FILE_NAME',
    names: ['setfilename'],
    category: 'output',
    summary: 'Rename a file the tag is attaching.',
    description: 'Changes the filename (and optionally the extension) of one of the files already attached by the tag, such as one added by `{attach}`, `{imagine}` or `{mediascript}`.',
    syntax: '{setfilename:file number|name?|extension?}',
    args: [
      {name: 'file number', description: 'Which attached file to rename, starting at 1.'},
      {name: 'name', description: 'The new name, without the extension. Leave empty to keep the old name.', optional: true},
      {name: 'extension', description: 'The new extension, without the dot. If left out entirely, the old extension is kept; if given but empty, the file ends up with no extension.', optional: true},
    ],
    examples: [
      {code: '{setfilename:1|myfile}', result: 'Renames the first file to myfile, keeping its extension (e.g. myfile.png)'},
      {code: '{setfilename:1|notes|txt}', result: 'Renames the first file to notes.txt'},
      {code: '{setfilename:1||gif}', result: 'Keeps the name but changes the extension to .gif'},
    ],
    notes: [
      'Errors if there is no attached file with that number.',
      'Left as plain text if there is no `|` or the file number is not a number.',
      'This only renames the file; it does not convert it.',
    ],
  },
  {
    id: 'LOGICAL_SET_GLOBAL',
    names: ['setglobal'],
    category: 'variables',
    summary: 'Save a value for this tag, shared everywhere it is used.',
    description: 'Keeps the value between runs, across every server, channel and user. Read it back with `{getglobal:name}`.',
    syntax: '{setglobal:name|value}',
    args: [
      {name: 'name', description: 'The storage key.'},
      {name: 'value', description: 'The value to save.'},
    ],
    examples: [
      {code: '{setglobal:uses|{math:{getglobal:uses|0}+1}}Used {getglobal:uses} times', result: 'Counts every use of the tag, everywhere'},
    ],
    notes: STORAGE_NOTES,
  },
  {
    id: 'LOGICAL_SET_SERVER',
    names: ['setserver'],
    category: 'variables',
    summary: 'Save a value for this tag, shared by everyone in the current server.',
    description: 'Keeps the value between runs. Read it back with `{getserver:name}`. In DMs the channel is used instead of a server.',
    syntax: '{setserver:name|value}',
    args: [
      {name: 'name', description: 'The storage key.'},
      {name: 'value', description: 'The value to save.'},
    ],
    examples: [
      {code: '{setserver:motd|Be nice to each other}', result: 'Saves a message of the day for this server'},
    ],
    notes: STORAGE_NOTES,
  },
  {
    id: 'LOGICAL_SET_USER',
    names: ['setuser'],
    category: 'variables',
    summary: 'Save a value for this tag, private to the person running it.',
    description: 'Keeps the value between runs for the user running the tag, in any server. Read it back with `{getuser:name}`.',
    syntax: '{setuser:name|value}',
    args: [
      {name: 'name', description: 'The storage key.'},
      {name: 'value', description: 'The value to save.'},
    ],
    examples: [
      {code: '{setuser:color|blue}Your favourite colour is now {getuser:color}', result: 'Remembers the colour just for you'},
    ],
    notes: STORAGE_NOTES,
  },

  // Math

  {
    id: 'MATH',
    names: ['math'],
    category: 'math',
    summary: 'Evaluate a math expression.',
    description: 'Uses a math.js parser with high-precision (BigNumber) numbers, so things like `0.1+0.2` give `0.3`. Supports `+ - * / % ^`, parentheses, `**` (treated as `^`), comparisons, functions like `sqrt`, `round`, `floor`, `ceil`, `abs`, `min`, `max`, `log`, `pow`, `sin`/`cos`/`tan`, constants like `pi` and `e`, and unit conversions like `5 inch to cm`.\n\nNumbers with thousands separators such as `1,000,000` are understood. Results that repeat forever are rounded to 2 decimal places, and trailing zeros are removed.',
    syntax: '{math:expression}',
    args: [
      {name: 'expression', description: 'The expression to evaluate. Whitespace around it is trimmed.'},
    ],
    examples: [
      {code: '{math:5+5}', result: '10'},
      {code: '{math:2**10 / 4}', result: '256'},
      {code: '{math:10/3}', result: '3.33'},
    ],
    notes: [
      'Each expression has a 750ms time limit; slow expressions error with a timeout.',
      'Invalid expressions make the tag error with the math error message.',
      'Unit conversions output only the number, without the unit name.',
      'Within one run, variables assigned in an expression (like `x = 5`) can be reused by later `{math}` calls, as long as those calls use the variable name.',
    ],
  },
  {
    id: 'MATH_ABS',
    names: ['abs'],
    category: 'math',
    summary: 'Absolute value of a number.',
    syntax: '{abs:number}',
    args: [
      {name: 'number', description: 'A number, decimals work.'},
    ],
    examples: [
      {code: '{abs:-42}', result: '42'},
      {code: '{abs:-5.7}', result: '5.7'},
    ],
    notes: [
      'Left as plain text if the argument is not a number.',
    ],
  },
  {
    id: 'MATH_COS',
    names: ['cos'],
    category: 'math',
    summary: 'Cosine of an angle in radians.',
    syntax: '{cos:radians}',
    args: [
      {name: 'radians', description: 'The angle in radians, decimals work.'},
    ],
    examples: [
      {code: '{cos:0}', result: '1'},
      {code: '{cos:{pi}}', result: '-1'},
    ],
    notes: [
      'Left as plain text if the argument is not a number.',
    ],
  },
  {
    id: 'MATH_E',
    names: ['e'],
    category: 'math',
    summary: 'Euler\'s number.',
    syntax: '{e}',
    examples: [
      {code: '{e}', result: '2.718281828459045'},
    ],
  },
  {
    id: 'MATH_MAX',
    names: ['max'],
    category: 'math',
    summary: 'The largest of a list of whole numbers.',
    syntax: '{max:number|number|...}',
    args: [
      {name: 'numbers', description: 'One or more numbers separated by `|`. Decimal parts are dropped, and very large numbers are handled exactly.'},
    ],
    examples: [
      {code: '{max:3|17|8}', result: '17'},
      {code: '{max:2.9|2.1}', result: '2'},
    ],
    notes: [
      'Left as plain text if the argument is empty or any value is not a number.',
    ],
  },
  {
    id: 'MATH_MIN',
    names: ['min'],
    category: 'math',
    summary: 'The smallest of a list of whole numbers.',
    syntax: '{min:number|number|...}',
    args: [
      {name: 'numbers', description: 'One or more numbers separated by `|`. Decimal parts are dropped, and very large numbers are handled exactly.'},
    ],
    examples: [
      {code: '{min:3|17|8}', result: '3'},
      {code: '{min:-4|10}', result: '-4'},
    ],
    notes: [
      'Left as plain text if the argument is empty or any value is not a number.',
    ],
  },
  {
    id: 'MATH_PI',
    names: ['pi'],
    category: 'math',
    summary: 'The number pi.',
    syntax: '{pi}',
    examples: [
      {code: '{pi}', result: '3.141592653589793'},
    ],
  },
  {
    id: 'MATH_SIN',
    names: ['sin'],
    category: 'math',
    summary: 'Sine of an angle in radians.',
    syntax: '{sin:radians}',
    args: [
      {name: 'radians', description: 'The angle in radians, decimals work.'},
    ],
    examples: [
      {code: '{sin:0}', result: '0'},
    ],
    notes: [
      'Left as plain text if the argument is not a number.',
    ],
  },
  {
    id: 'MATH_TAN',
    names: ['tan'],
    category: 'math',
    summary: 'Tangent of an angle in radians.',
    syntax: '{tan:radians}',
    args: [
      {name: 'radians', description: 'The angle in radians, decimals work.'},
    ],
    examples: [
      {code: '{tan:0}', result: '0'},
    ],
    notes: [
      'Left as plain text if the argument is not a number.',
    ],
  },

  // Media

  {
    id: 'MEDIA',
    names: ['media'],
    category: 'media',
    summary: 'Get the URL of an image, video or audio file.',
    description: LAST_MEDIA_DESCRIPTION,
    syntax: '{media:query?}',
    args: [
      {name: 'query', description: 'A URL, message link, user, emoji or `^`. Leave empty to use the last media in the channel.', optional: true},
    ],
    examples: [
      {code: '{media}', result: 'https://cdn.discordapp.com/attachments/.../clip.mp4'},
      {code: '{media:{args}}', result: 'Media from whatever the user passed (a URL, a user\'s avatar, an emoji, ...)'},
    ],
    notes: [LAST_MEDIA_NOTE, NOTHING_FOUND_NOTE],
  },
  {
    id: 'MEDIA_AUDIO',
    names: ['audio'],
    category: 'media',
    summary: 'Get the URL of an audio file.',
    description: 'Works like `{media}` but only matches audio.\n\n' + LAST_MEDIA_DESCRIPTION,
    syntax: '{audio:query?}',
    args: [
      {name: 'query', description: 'A URL, message link or `^`. Leave empty to use the last audio in the channel.', optional: true},
    ],
    examples: [
      {code: '{audio}', result: 'https://cdn.discordapp.com/attachments/.../song.mp3'},
    ],
    notes: [LAST_MEDIA_NOTE, NOTHING_FOUND_NOTE],
  },
  {
    id: 'MEDIA_AUDIO_OR_VIDEO',
    names: ['av'],
    category: 'media',
    summary: 'Get the URL of an audio or video file.',
    description: 'Works like `{media}` but skips images.\n\n' + LAST_MEDIA_DESCRIPTION,
    syntax: '{av:query?}',
    args: [
      {name: 'query', description: 'A URL, message link or `^`. Leave empty to use the last audio/video in the channel.', optional: true},
    ],
    examples: [
      {code: '{av}', result: 'https://cdn.discordapp.com/attachments/.../clip.mp4'},
    ],
    notes: [LAST_MEDIA_NOTE, NOTHING_FOUND_NOTE],
  },
  {
    id: 'MEDIA_IMAGE',
    names: ['image'],
    category: 'media',
    summary: 'Get the URL of an image.',
    description: 'Works like `{media}` but only matches images.\n\n' + LAST_MEDIA_DESCRIPTION,
    syntax: '{image:query?}',
    args: [
      {name: 'query', description: 'A URL, message link, user, emoji or `^`. Leave empty to use the last image in the channel.', optional: true},
    ],
    examples: [
      {code: '{image}', result: 'https://cdn.discordapp.com/attachments/.../cat.png'},
      {code: '{image:{userid}}', result: 'Your avatar URL'},
      {code: '{settings:MEDIA_IV_FALLBACK|search.google.images}{image:{args}}', result: 'An image from the arguments, or a Google Images result for them if none is found'},
    ],
    notes: [LAST_MEDIA_NOTE, IV_FALLBACK_NOTE, NOTHING_FOUND_NOTE],
  },
  {
    id: 'MEDIA_IMAGE_EDIT',
    names: ['edit'],
    category: 'ai',
    summary: 'Edit an image with AI from a text prompt and attach the result.',
    description: 'Finds an image (the same way `{image}` does) and asks the AI image editor to change it based on your prompt. The edited image is attached to the tag\'s reply. If the prompt is empty, one is made up automatically.',
    syntax: '{edit:prompt?|image?}',
    args: [
      {name: 'prompt', description: 'What to change. If there is a `|`, everything before the last `|` is the prompt.', optional: true},
      {name: 'image', description: 'Where to find the image (URL, user, emoji, `^`...). Only read if there is a `|`; otherwise the last image is used.', optional: true},
    ],
    examples: [
      {code: '{edit:make it look like a watercolor painting}', result: 'Attaches an edited version of the last image'},
      {code: '{edit:give them a party hat|{userid}}', result: 'Attaches your avatar wearing a party hat'},
      {code: '{edit:|{args}}', result: 'Attaches an edit of the given image with an automatic prompt'},
    ],
    notes: [
      'Counts as 1 network request and 1 AI request (5 AI requests per run by default).',
      'Always runs in safe mode.',
      'Uses the model picked with `{settings:ML_IMAGINE_MODEL|...}` (currently only `FLUX_KLEIN`); `{settings:ML_IMAGINE_DO_NOT_ERROR|true}` is passed along too.',
      IV_FALLBACK_NOTE,
      'Left as plain text if no image is found, or if attachments are not allowed here.',
      'Errors if the tag already has the maximum number of attachments (10), or if the result is larger than the upload limit.',
    ],
  },
  {
    id: 'MEDIA_IMAGE_EDIT_URL',
    names: ['editurl'],
    category: 'ai',
    summary: 'Edit an image with AI and output a link to the result.',
    description: 'Same as `{edit}`, but instead of attaching the image it uploads it and outputs the URL, so you can use it in embeds or pass it to other functions.',
    syntax: '{editurl:prompt?|image?}',
    args: [
      {name: 'prompt', description: 'What to change. If there is a `|`, everything before the last `|` is the prompt.', optional: true},
      {name: 'image', description: 'Where to find the image. Only read if there is a `|`; otherwise the last image is used.', optional: true},
    ],
    examples: [
      {code: '{editurl:turn it into pixel art}', result: 'https://.../edited.png'},
      {code: 'Here you go: {editurl:make it night time|{args}}', result: 'Here you go: https://.../edited.png'},
    ],
    notes: [
      'Counts as 1 network request and 1 AI request (5 AI requests per run by default).',
      'Always runs in safe mode.',
      'The uploaded link expires after 7 days.',
      'Uses the model picked with `{settings:ML_IMAGINE_MODEL|...}`.',
      IV_FALLBACK_NOTE,
      'Outputs nothing if no image is found.',
    ],
  },
  {
    id: 'MEDIA_IMAGE_IMAGINE',
    names: ['imagine'],
    category: 'ai',
    summary: 'Generate an image with AI and attach it.',
    description: 'Creates a brand new image from a text prompt and attaches it to the tag\'s reply. If the prompt is empty, one is made up automatically.',
    syntax: '{imagine:prompt?}',
    args: [
      {name: 'prompt', description: 'What the image should show.', optional: true},
    ],
    examples: [
      {code: '{imagine:a cat wearing a tiny crown}', result: 'Attaches a generated image of a crowned cat'},
      {code: '{imagine}', result: 'Attaches an image from a random prompt'},
      {code: '{settings:ML_IMAGINE_MODEL|FLUX_KLEIN}{imagine:{args}}', result: 'Generates with the Flux Klein model'},
    ],
    notes: [
      'Counts as 1 network request and 1 AI request (5 AI requests per run by default).',
      'Always runs in safe mode.',
      'Uses the model picked with `{settings:ML_IMAGINE_MODEL|...}` (currently only `FLUX_KLEIN`); `{settings:ML_IMAGINE_DO_NOT_ERROR|true}` is passed along too.',
      'Left as plain text if attachments are not allowed here.',
      'Errors if the tag already has the maximum number of attachments (10), or if the result is larger than the upload limit.',
    ],
  },
  {
    id: 'MEDIA_IMAGE_IMAGINE_URL',
    names: ['imagineurl'],
    category: 'ai',
    summary: 'Generate an image with AI and output a link to it.',
    description: 'Same as `{imagine}`, but uploads the image and outputs its URL instead of attaching it.',
    syntax: '{imagineurl:prompt?}',
    args: [
      {name: 'prompt', description: 'What the image should show.', optional: true},
    ],
    examples: [
      {code: '{imagineurl:a sunset over the ocean}', result: 'https://.../image.png'},
      {code: '{set:art|{imagineurl:{args}}}Your art: {get:art}', result: 'Your art: https://.../image.png'},
    ],
    notes: [
      'Counts as 1 network request and 1 AI request (5 AI requests per run by default).',
      'Always runs in safe mode.',
      'The uploaded link expires after 7 days.',
      'Uses the model picked with `{settings:ML_IMAGINE_MODEL|...}`.',
    ],
  },
  {
    id: 'MEDIA_IMAGE_OR_VIDEO',
    names: ['iv'],
    category: 'media',
    summary: 'Get the URL of an image or video.',
    description: 'Works like `{media}` but skips audio.\n\n' + LAST_MEDIA_DESCRIPTION,
    syntax: '{iv:query?}',
    args: [
      {name: 'query', description: 'A URL, message link, user, emoji or `^`. Leave empty to use the last image/video in the channel.', optional: true},
    ],
    examples: [
      {code: '{iv}', result: 'https://cdn.discordapp.com/attachments/.../funny.gif'},
    ],
    notes: [LAST_MEDIA_NOTE, IV_FALLBACK_NOTE, NOTHING_FOUND_NOTE],
  },
  {
    id: 'MEDIA_VIDEO',
    names: ['video'],
    category: 'media',
    summary: 'Get the URL of a video.',
    description: 'Works like `{media}` but only matches videos.\n\n' + LAST_MEDIA_DESCRIPTION,
    syntax: '{video:query?}',
    args: [
      {name: 'query', description: 'A URL, message link or `^`. Leave empty to use the last video in the channel.', optional: true},
    ],
    examples: [
      {code: '{video}', result: 'https://cdn.discordapp.com/attachments/.../clip.mp4'},
    ],
    notes: [LAST_MEDIA_NOTE, NOTHING_FOUND_NOTE],
  },

  // Messages

  {
    id: 'MESSAGE_CONTENT',
    names: ['messagecontent'],
    category: 'message',
    summary: 'Get the text of a message.',
    description: 'With no argument, outputs the content of the message that ran the tag (prefix commands only). With a message ID, outputs that message\'s content.',
    syntax: '{messagecontent:message id?|channel?}',
    args: [
      {name: 'message id', description: 'The ID of the message to read.', optional: true},
      {name: 'channel', description: 'The channel the message is in (ID, mention or name). Defaults to the current channel.', optional: true},
    ],
    examples: [
      {code: '{messagecontent}', result: 'The full text of the message that ran the tag'},
      {code: '{messagecontent:{messagelastid}}', result: 'The text of the previous message in the channel'},
    ],
    notes: [
      'Looking up a channel counts as 1 network request, and so does fetching a message the bot has not cached.',
      MESSAGE_PERMISSION_NOTE,
      'Outputs nothing if the message or channel can\'t be found, the message is in a different channel, or it is someone else\'s ephemeral message.',
    ],
  },
  {
    id: 'MESSAGE_LAST_ID',
    names: ['messagelastid'],
    category: 'message',
    summary: 'Get the ID of a recent message in a channel.',
    description: 'Looks back through the channel\'s recent messages (skipping the one that ran the tag) and outputs the ID of the one at the given position. `0` is the most recent.',
    syntax: '{messagelastid:position?|channel?}',
    args: [
      {name: 'position', description: 'How far back to go, from `0` (newest) to `99`, or `random` for a random one of the last 100. Defaults to `0`; anything that isn\'t a number is treated as `0`.', optional: true},
      {name: 'channel', description: 'The channel to look in (ID, mention or name). Defaults to the current channel.', optional: true},
    ],
    examples: [
      {code: '{messagelastid}', result: '1234567890123456789 (the previous message)'},
      {code: '{messagelastid:2}', result: 'The ID of the third most recent message'},
      {code: '{messageuserid:{messagelastid:random}}', result: 'The author of a random recent message'},
    ],
    notes: [
      'Errors if the position is 100 or more.',
      'Looking up a channel counts as 1 network request, and so does fetching history when the bot has not cached enough messages.',
      MESSAGE_PERMISSION_NOTE,
      'Other people\'s ephemeral messages are skipped.',
      'Outputs nothing if there are no messages to pick from.',
    ],
  },
  {
    id: 'MESSAGE_RANDOM_ID',
    names: ['randmessageid'],
    category: 'message',
    summary: 'Get the ID of a random message from the last 100 in a channel.',
    syntax: '{randmessageid:channel?}',
    args: [
      {name: 'channel', description: 'The channel to look in (ID, mention or name). Defaults to the current channel.', optional: true},
    ],
    examples: [
      {code: '{randmessageid}', result: '1234567890123456789'},
      {code: '"{messagecontent:{randmessageid}}"', result: 'Quotes a random recent message'},
    ],
    notes: [
      'The message that ran the tag and other people\'s ephemeral messages are skipped.',
      'Looking up a channel counts as 1 network request, and so does fetching history when the bot has not cached 100 messages.',
      MESSAGE_PERMISSION_NOTE,
      'Outputs nothing if there are no messages to pick from.',
    ],
  },
  {
    id: 'MESSAGE_USER_ID',
    names: ['messageuserid'],
    category: 'message',
    summary: 'Get the ID of a message\'s author.',
    description: 'With no argument, outputs the ID of whoever sent the message that ran the tag (prefix commands only). With a message ID, outputs that message\'s author ID.',
    syntax: '{messageuserid:message id?|channel?}',
    args: [
      {name: 'message id', description: 'The ID of the message.', optional: true},
      {name: 'channel', description: 'The channel the message is in (ID, mention or name). Defaults to the current channel.', optional: true},
    ],
    examples: [
      {code: '{messageuserid}', result: 'Your user ID'},
      {code: '<@{messageuserid:{messagelastid}}>', result: 'Mentions whoever sent the previous message'},
    ],
    notes: [
      'Looking up a channel counts as 1 network request, and so does fetching a message the bot has not cached.',
      MESSAGE_PERMISSION_NOTE,
      'Outputs nothing if the message or channel can\'t be found, the message is in a different channel, or it is someone else\'s ephemeral message.',
    ],
  },

  // Mediascript

  {
    id: 'MEDIASCRIPT',
    names: ['mediascript', 'mscript', 'imagescript', 'iscript'],
    category: 'media',
    summary: 'Run a MediaScript program and attach the file it produces.',
    description: 'MediaScript is NotSoBot\'s scripting language for creating and editing images, video and audio. The code runs on NotSoBot\'s servers and the output file is attached to the tag\'s reply.\n\nYou can feed files the tag has already attached into the script by writing `FILE_1`, `FILE_2`, and so on (numbered in attachment order). Using `FILE_1` moves that file into the script, so it is removed from the reply; use `FILE_1_COPY` to keep the original attached as well. Attachments that are only a link are replaced by their URL.',
    syntax: '{mediascript:code}',
    args: [
      {name: 'code', description: 'The MediaScript code to run. Whitespace around it is trimmed.'},
    ],
    examples: [
      {code: '{attach:{image}}{mediascript:...your script using FILE_1...}', result: 'Attaches the processed image in place of the original'},
    ],
    notes: [
      'Counts as 1 network request.',
      'Safe mode is on unless the channel is NSFW (or a DM), following the usual NSFW rules.',
      'Any image generation inside the script uses the model picked with `{settings:ML_IMAGINE_MODEL|...}`.',
      'Values the script returns as arguments are saved as tag variables, as if set with `{set}`.',
      'Text outputs (like .txt) are attached as text files.',
      'Left as plain text if the code is empty or attachments are not allowed here.',
      'Errors if `FILE_n` refers to a file that doesn\'t exist, the script errors, the tag already has the maximum number of attachments (10), or the result is larger than the upload limit.',
    ],
  },
];
