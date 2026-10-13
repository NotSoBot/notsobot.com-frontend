import type { TagDocFunction } from '../types';


// written against notsobot.ts/src/utils/tags/index.ts (AI through COMPONENTS_ON_TIMEOUT)
export const TAG_DOC_FUNCTIONS_PART1: Array<TagDocFunction> = [
  {
    id: 'AI',
    names: ['ai'],
    category: 'ai',
    summary: 'Asks NotSoBot\'s AI a question and outputs its answer.',
    description: [
      'Sends the text to the AI and adds the generated reply to the output. The text can be wrapped in a code block, which gets stripped before sending.',
      'You can give the AI media by putting `load URL` (or `load URL filename`) lines at the very top of the prompt. Files you created earlier in the tag with {attach} can be referenced as `FILE_1`, `FILE_2`, etc. Using `FILE_1` moves that file into the AI request (it will no longer be sent with the message); use `FILE_1_COPY` to keep it.',
      'The personality comes from {settings:AI_PERSONALITY|...} if set, otherwise your user or server AI personality. The model can be picked with {settings:AI_MODEL|...}.',
    ].join('\n\n'),
    syntax: '{ai:prompt}',
    args: [
      {name: 'prompt', description: 'What to ask. Optional `load URL [filename]` lines may come first.'},
    ],
    examples: [
      {code: '{ai:write a haiku about {arg}}', result: 'A haiku about the first argument, written by the AI.'},
      {code: '{ai:load {lastattachment}\ndescribe this image in one sentence}', result: 'A one sentence description of the last image in the channel.'},
    ],
    notes: [
      'Counts against the AI execution limit (1 per run by default) and the network request limit.',
      'The prompt is capped at 12,000 characters (including a short internal header with the AI execution count).',
      'An empty prompt outputs nothing.',
      'When used inside a tag, the reply is added as plain text. When the script comes from the AI itself, the reply is parsed as tagscript first (and counts as coming from NotSoAI for {isfromai} and the NotSoAI-only functions).',
      'Using a `FILE_N` that does not exist throws an error.',
    ],
  },
  {
    id: 'API_CREATE_REMINDER',
    names: ['api.create.reminder'],
    category: 'network',
    summary: 'Creates a reminder for the user and outputs it as JSON. Only NotSoAI can use this.',
    description: 'The time is parsed the same way the reminder command parses it (things like "in 5 minutes" or "tomorrow at 4pm"). If no text is given, any leftover words from the time text are used instead. Outputs an object like `{"id": string, "position": number, "content": string, "timestamp_start": string, ...}`.',
    syntax: '{api.create.reminder:time[|text]}',
    args: [
      {name: 'time', description: 'A natural-language time, e.g. `in 2 hours` or `next friday at 4pm do laundry`.'},
      {name: 'text', description: 'The reminder text. Defaults to the non-time words from `time`. Everything after the first `|` is used.', optional: true},
    ],
    examples: [
      {code: '{api.create.reminder:in 2 hours|drink water}', result: 'Creates the reminder and outputs its JSON.'},
    ],
    notes: [
      'Only NotSoAI can use this. In a user\'s tag (or a tag NotSoAI calls with {tag}) the function is left as plain text.',
      'Counts against the API manipulation limit (1 per run by default) and the network request limit.',
      'Throws an error if no time can be found in `time`.',
      'An empty argument outputs nothing.',
    ],
  },
  {
    id: 'API_DELETE_REMINDER',
    names: ['api.delete.reminder'],
    category: 'network',
    summary: 'Deletes one of the user\'s reminders by its position. Only NotSoAI can use this.',
    description: 'The position is the `position` field from {api.fetch.reminders}. Outputs `true` when deleted.',
    syntax: '{api.delete.reminder:position}',
    args: [
      {name: 'position', description: 'The reminder\'s position number.'},
    ],
    examples: [
      {code: '{api.delete.reminder:1}', result: '`true`'},
    ],
    notes: [
      'Only NotSoAI can use this. In a user\'s tag (or a tag NotSoAI calls with {tag}) the function is left as plain text.',
      'Counts against the API manipulation limit (1 per run by default) and the network request limit.',
      'Throws an error if the position is not a positive number or no reminder exists there.',
      'An empty argument outputs nothing.',
    ],
  },
  {
    id: 'API_EDIT_REMINDER',
    names: ['api.edit.reminder'],
    category: 'network',
    summary: 'Changes the time and/or text of one of the user\'s reminders. Only NotSoAI can use this.',
    description: 'The position is the `position` field from {api.fetch.reminders}. Leave `time` empty to keep the current time, and leave out `text` to keep the current text. Outputs the edited reminder as JSON.',
    syntax: '{api.edit.reminder:position|time[|text]}',
    args: [
      {name: 'position', description: 'The reminder\'s position number.'},
      {name: 'time', description: 'A new natural-language time, or empty to keep the current one.'},
      {name: 'text', description: 'The new reminder text. Everything after the second `|` is used.', optional: true},
    ],
    examples: [
      {code: '{api.edit.reminder:1|tomorrow at 9am}', result: 'Moves reminder 1 to tomorrow at 9am and outputs its JSON.'},
      {code: '{api.edit.reminder:2||buy milk}', result: 'Changes reminder 2\'s text and outputs its JSON.'},
    ],
    notes: [
      'Only NotSoAI can use this. In a user\'s tag (or a tag NotSoAI calls with {tag}) the function is left as plain text.',
      'Counts against the API manipulation limit (1 per run by default) and the network request limit.',
      'Throws an error if the position is not a positive number, no reminder exists there, or the new time is in the past.',
    ],
  },
  {
    id: 'API_FETCH_REMINDERS',
    names: ['api.fetch.reminders'],
    category: 'network',
    summary: 'Outputs the user\'s reminders as JSON. Only NotSoAI can use this.',
    description: 'Outputs an object like `{"count": number, "reminders": [...]}` with the same reminder fields as {api.create.reminder}. Only reminders in the current server are listed unless `global` is passed.',
    syntax: '{api.fetch.reminders[:global]}',
    args: [
      {name: 'global', description: 'Pass `global` to list reminders from every server.', optional: true},
    ],
    examples: [
      {code: '{traversejson:count|{api.fetch.reminders}}', result: 'How many reminders the user has in this server.'},
    ],
    notes: [
      'Only NotSoAI can use this. In a user\'s tag (or a tag NotSoAI calls with {tag}) the function is left as plain text.',
      'Counts against the network request limit.',
    ],
  },
  {
    id: 'API_SEARCH_DUCKDUCKGO_IMAGES',
    names: ['api.search.duckduckgo.images'],
    category: 'search',
    summary: 'Searches DuckDuckGo Images and outputs the raw results as JSON.',
    description: 'Outputs an object like `{"amount": number, "results": [...]}` where each result has fields such as `header`, `footer`, `url`, `image.url`, `image.width`, `image.height` and `thumbnail.url`. Pair it with {traversejson} or {set} to pick out what you need.',
    syntax: '{api.search.duckduckgo.images:query}',
    args: [
      {name: 'query', description: 'The search query (only the first 1024 characters are used).'},
    ],
    examples: [
      {code: '{traversejson:results[0].image.url|{api.search.duckduckgo.images:cute cats}}', result: 'The URL of the first image result.'},
      {code: '{traversejson:amount|{api.search.duckduckgo.images:sunsets}}', result: 'How many results were found.'},
    ],
    notes: [
      'Counts against the network request limit. Repeating the same query in one run reuses the cached result without counting again.',
      'SafeSearch is enabled unless the channel allows NSFW content.',
      'An empty query outputs nothing.',
    ],
  },
  {
    id: 'API_SEARCH_IMGUR',
    names: ['api.search.imgur'],
    category: 'search',
    summary: 'Searches Imgur and outputs the raw results as JSON.',
    description: 'Outputs an object like `{"amount": number, "results": [...]}` where each result has `id`, `url`, `thumbnail`, `type`, `views`, `likes`, `dislikes` and `points`.',
    syntax: '{api.search.imgur:query}',
    args: [
      {name: 'query', description: 'The search query (only the first 1024 characters are used).'},
    ],
    examples: [
      {code: '{traversejson:results[0].url|{api.search.imgur:funny dogs}}', result: 'The URL of the first Imgur result.'},
    ],
    notes: [
      'Counts against the network request limit. Repeating the same query in one run reuses the cached result without counting again.',
      'An empty query outputs nothing.',
    ],
  },
  {
    id: 'API_UTILITIES_LOCATIONS',
    names: ['api.utilities.locations'],
    category: 'search',
    summary: 'Looks up places matching a query and outputs the results as JSON.',
    description: 'Outputs an object like `{"count": number, "results": [...]}`. Each result has `name`, `name_official`, `latitude`, `longitude`, `urls` and an `address` object (`full`, `city`, `state`, `country`, `country_code`, `zipcode`, and more).',
    syntax: '{api.utilities.locations:query}',
    args: [
      {name: 'query', description: 'The place to look up (only the first 1024 characters are used).'},
    ],
    examples: [
      {code: '{traversejson:results[0].address.full|{api.utilities.locations:eiffel tower}}', result: 'The full address of the best match.'},
    ],
    notes: [
      'Counts against the network request limit. Repeating the same query in one run reuses the cached result without counting again.',
      'An empty query outputs nothing.',
    ],
  },
  {
    id: 'API_UTILITIES_QR_CREATE',
    names: ['api.utilities.qr.create'],
    category: 'network',
    summary: 'Attaches a QR code image of some text.',
    description: 'Adds the QR code as a file attachment on the tag\'s output.',
    syntax: '{api.utilities.qr.create:text}',
    args: [
      {name: 'text', description: 'The text or url to encode.'},
    ],
    examples: [
      {code: '{api.utilities.qr.create:https://notsobot.com}', result: 'Attaches a QR code that opens the NotSoBot site.'},
    ],
    notes: [
      'Counts against the attachment limit and the network request limit.',
      'An empty argument outputs nothing.',
    ],
  },
  {
    id: 'API_UTILITIES_QR_SCAN',
    names: ['api.utilities.qr.scan'],
    category: 'network',
    summary: 'Scans an image for QR codes and outputs the results as JSON.',
    description: 'Outputs an object like `{"results": [{"data": string, "type": string}]}`. With no argument, the last image in the chat is used.',
    syntax: '{api.utilities.qr.scan[:url]}',
    args: [
      {name: 'url', description: 'An image url, user, or emoji. Defaults to the last image in the chat.', optional: true},
    ],
    examples: [
      {code: '{traversejson:results[0].data|{api.utilities.qr.scan}}', result: 'The contents of the first QR code found.'},
    ],
    notes: [
      'Counts against the network request limit.',
      'Throws an error if no image can be found.',
    ],
  },
  {
    id: 'API_UTILITIES_SCREENSHOT',
    names: ['api.utilities.screenshot'],
    category: 'network',
    summary: 'Attaches a screenshot of a website.',
    description: 'Adds the screenshot as a file attachment on the tag\'s output. NSFW sites are blocked unless the channel is marked NSFW.',
    syntax: '{api.utilities.screenshot:url}',
    args: [
      {name: 'url', description: 'The website to screenshot.'},
    ],
    examples: [
      {code: '{api.utilities.screenshot:https://notsobot.com}', result: 'Attaches a screenshot of the NotSoBot site.'},
    ],
    notes: [
      'Counts against the attachment limit and the network request limit.',
      'An empty argument outputs nothing.',
    ],
  },
  {
    id: 'API_UTILITIES_WEATHER',
    names: ['api.utilities.weather'],
    category: 'search',
    summary: 'Gets the weather for a location and outputs the raw data as JSON.',
    description: 'Outputs an object with `location` (same shape as a {api.utilities.locations} result), `timezone`, `thumbnail` and `weather`. `weather.current` includes `temperature`, `feels_like`, `humidity`, `wind`, `conditions` and more, and `weather.daily` holds the forecast.',
    syntax: '{api.utilities.weather:query[|units]}',
    args: [
      {name: 'query', description: 'The location (only the first 1024 characters are used).'},
      {name: 'units', description: '`metric` or `imperial` (case-insensitive). Only treated as units if the last `|` part is one of these; otherwise it stays part of the query.', optional: true},
    ],
    examples: [
      {code: '{traversejson:weather.current.temperature|{api.utilities.weather:London|metric}}', result: 'The current temperature in London in Celsius.'},
      {code: '{traversejson:weather.current.conditions[0].title|{api.utilities.weather:New York}}', result: 'Something like "Clouds".'},
    ],
    notes: [
      'Counts against the network request limit. Repeating the same query with the same units in one run reuses the cached result without counting again.',
      'An empty argument outputs nothing.',
    ],
  },
  {
    id: 'ARG',
    names: ['arg'],
    category: 'arguments',
    summary: 'Outputs a single argument passed to the tag.',
    description: 'Arguments are the text after the tag name, split on spaces. Words wrapped in quotes count as one argument, so `"hello world"` is a single argument (without the quotes).',
    syntax: '{arg[:index]}',
    args: [
      {name: 'index', description: 'Zero-based argument index, defaults to 0. Negative numbers count from the end (-1 is the last argument).', optional: true},
    ],
    examples: [
      {code: '{arg}', result: 'With `.t mytag apple banana`, outputs "apple".'},
      {code: '{arg:1}', result: 'With `.t mytag apple banana`, outputs "banana".'},
      {code: '{arg:-1}', result: 'The last argument.'},
    ],
    notes: [
      'If the index is out of range, nothing is output.',
      'If the index is not a number, the function is left as-is in the output.',
    ],
  },
  {
    id: 'ARG_SAFE',
    names: ['argsafe'],
    category: 'arguments',
    summary: 'Like {arg}, but escapes any `|` in the argument so it can be safely passed into other functions.',
    description: 'Every unescaped `|` becomes `\\|`, so a user typing a pipe will not accidentally split the arguments of the function you feed it into.',
    syntax: '{argsafe[:index]}',
    args: [
      {name: 'index', description: 'Zero-based argument index, defaults to 0. Negative numbers count from the end.', optional: true},
    ],
    examples: [
      {code: '{set:word|{argsafe}}', result: 'Stores the first argument in a variable, even if it contains `|`.'},
    ],
    notes: [
      'If the index is out of range, nothing is output.',
      'If the index is not a number, the function is left as-is in the output.',
    ],
  },
  {
    id: 'ARGS',
    names: ['args'],
    category: 'arguments',
    summary: 'Outputs all of the tag\'s arguments, or a range of them.',
    description: 'With no argument it outputs the raw argument text exactly as typed. With a range, it takes a slice of the parsed argument list and joins it with single spaces.',
    syntax: '{args[:start[|end]]}',
    args: [
      {name: 'start', description: 'Zero-based index to start from, defaults to 0. Negative numbers count from the end.', optional: true},
      {name: 'end', description: 'Index to stop before (exclusive), defaults to the number of arguments. Negative numbers count from the end.', optional: true},
    ],
    examples: [
      {code: '{args}', result: 'With `.t mytag one two three`, outputs "one two three".'},
      {code: '{args:1}', result: 'Everything except the first argument: "two three".'},
      {code: '{args:0|-1}', result: 'Everything except the last argument: "one two".'},
    ],
    notes: [
      'If `start` is not a number, the function is left as-is in the output.',
      'When a range is used, quoted arguments lose their quotes and spacing is normalised to single spaces.',
    ],
  },
  {
    id: 'ARGS_LEN',
    names: ['argslen'],
    category: 'arguments',
    summary: 'Outputs how many arguments were passed to the tag.',
    syntax: '{argslen}',
    examples: [
      {code: '{argslen}', result: 'With `.t mytag one "two three"`, outputs "2".'},
      {code: '{if:{argslen}|=|0|then:Give me something!|else:You said {args}}', result: 'Prompts the user when no arguments are given.'},
    ],
    notes: [
      'Quoted text counts as one argument.',
    ],
  },
  {
    id: 'ARGS_SAFE',
    names: ['argssafe'],
    category: 'arguments',
    summary: 'Like {args}, but escapes any `|` so the text can be safely passed into other functions.',
    syntax: '{argssafe[:start[|end]]}',
    args: [
      {name: 'start', description: 'Zero-based index to start from, defaults to 0. Negative numbers count from the end.', optional: true},
      {name: 'end', description: 'Index to stop before (exclusive), defaults to the number of arguments. Negative numbers count from the end.', optional: true},
    ],
    examples: [
      {code: '{set:input|{argssafe}}', result: 'Stores all the arguments in a variable, even if they contain `|`.'},
      {code: '{argssafe:1}', result: 'Every argument after the first, with pipes escaped.'},
    ],
    notes: [
      'If `start` is not a number, the function is left as-is in the output.',
    ],
  },
  {
    id: 'ATTACHMENT',
    names: ['attachment', 'attach', 'file'],
    category: 'media',
    summary: 'Downloads a URL and attaches it as a file to the tag\'s message.',
    description: 'Besides normal URLs, you can pass a user mention or ID (attaches their avatar) or an emoji (custom or unicode). URLs without `http(s)://` get `https://` added.\n\nAttached files can later be referenced in {ai} and code functions as `FILE_1`, `FILE_2`, etc.',
    syntax: '{attach:url[|filename[|description]]}',
    args: [
      {name: 'url', description: 'The URL, user, or emoji to download.'},
      {name: 'filename', description: 'Name to give the file. Defaults to the name from the download.', optional: true},
      {name: 'description', description: 'Alt text for the file. Everything after the second `|` is used.', optional: true},
    ],
    examples: [
      {code: '{attach:https://example.com/cat.png}', result: 'Sends cat.png along with the message.'},
      {code: '{attach:{avatar}|me.png|My avatar}', result: 'Attaches your avatar as me.png with alt text.'},
    ],
    notes: [
      'Counts against the network request limit. Attaching the same URL again in one run reuses the download without counting again.',
      'Up to 10 attachments per run by default; going over throws an error. If attachments are disabled for this run, the function is left as-is.',
      'Each file must fit within the upload size limit of the server/channel, or an error is thrown.',
      'Downloads use SafeSearch-style filtering unless the channel allows NSFW content.',
      'An invalid URL throws an error.',
    ],
  },
  {
    id: 'ATTACHMENT_LAST',
    names: ['last_attachment', 'lastattachment', 'lattachment', 'lattach'],
    category: 'media',
    summary: 'Outputs the URL of the most recent image.',
    description: 'Looks for an image in the triggering message first, then the message it replies to, then recent messages in the channel. For slash commands, an attached file is used.',
    syntax: '{lastattachment}',
    examples: [
      {code: '{lastattachment}', result: 'Something like "https://cdn.discordapp.com/attachments/.../image.png".'},
      {code: '{attach:{lastattachment}|again.png}', result: 'Re-uploads the last image as again.png.'},
    ],
    notes: [
      'Always counts against the network request limit.',
      'Outputs nothing if no image is found. Any argument is ignored.',
    ],
  },
  {
    id: 'ATTACHMENT_SPOILER',
    names: ['attachmentspoiler', 'attachspoiler', 'filespoiler'],
    category: 'media',
    summary: 'Same as {attach}, but the file is marked as a spoiler.',
    syntax: '{attachspoiler:url[|filename[|description]]}',
    args: [
      {name: 'url', description: 'The URL, user, or emoji to download.'},
      {name: 'filename', description: 'Name to give the file. Defaults to the name from the download.', optional: true},
      {name: 'description', description: 'Alt text for the file.', optional: true},
    ],
    examples: [
      {code: '{attachspoiler:https://example.com/plot-twist.png}', result: 'Sends the image hidden behind a spoiler.'},
    ],
    notes: [
      'Shares all limits and behaviour with {attach}.',
    ],
  },
  {
    id: 'ATTACHMENT_TEXT',
    names: ['attachmenttext', 'attachtext', 'filetext'],
    category: 'media',
    summary: 'Attaches the given text as a .txt file.',
    description: 'The first file is named `content.txt`; if other files are already attached, it becomes `content.2.txt`, `content.3.txt`, etc. The whole argument is used as the file content, including any `|`.',
    syntax: '{attachtext:text}',
    args: [
      {name: 'text', description: 'The content of the text file.'},
    ],
    examples: [
      {code: '{attachtext:{args}}', result: 'Sends the arguments as content.txt.'},
    ],
    notes: [
      'Does not use a network request.',
      'Counts toward the attachment limit (10 per run by default). If attachments are disabled for this run, the function is left as-is.',
      'The text must fit within the upload size limit, or an error is thrown.',
    ],
  },
  {
    id: 'ATTACHMENT_VOICE',
    names: ['attachmentvoice', 'attachvoice', 'filevoice'],
    category: 'media',
    summary: 'Downloads audio or video from a URL and attaches it as a Discord voice message.',
    description: 'The audio is extracted and converted to OGG with a waveform, so it shows up like a voice message.',
    syntax: '{attachvoice:url[|filename]}',
    args: [
      {name: 'url', description: 'URL of the audio or video to use.'},
      {name: 'filename', description: 'Name to give the file. Everything after the first `|` is used.', optional: true},
    ],
    examples: [
      {code: '{attachvoice:https://example.com/song.mp3}', result: 'Sends song.mp3 as a voice message.'},
    ],
    notes: [
      'Always counts against the network request limit (not cached).',
      'Counts toward the attachment limit (10 per run by default). If attachments are disabled for this run, the function is left as-is.',
      'The result must fit within the upload size limit, or an error is thrown.',
    ],
  },
  {
    id: 'AVATAR',
    names: ['avatar'],
    category: 'user',
    summary: 'Outputs a user\'s avatar URL (1024px).',
    syntax: '{avatar[:user]}',
    args: [
      {name: 'user', description: 'A mention, ID, or name to look up. Defaults to whoever used the tag.', optional: true},
    ],
    examples: [
      {code: '{avatar}', result: 'Your avatar URL.'},
      {code: '{avatar:439205512425504771}', result: 'The avatar URL of that user.'},
      {code: '{attach:{avatar:{arg}}}', result: 'Attaches the avatar of the user named in the first argument.'},
    ],
    notes: [
      'Looking up a user counts against the network request limit; using it with no argument does not.',
      'Outputs nothing if the user cannot be found.',
    ],
  },
  {
    id: 'CHANNEL',
    names: ['channel'],
    category: 'server',
    summary: 'Outputs a channel\'s name.',
    syntax: '{channel[:channel]}',
    args: [
      {name: 'channel', description: 'A channel mention, ID, or name in this server. Defaults to the current channel.', optional: true},
    ],
    examples: [
      {code: '{channel}', result: 'Something like "general".'},
      {code: '{channel:560595518129045504}', result: 'The name of that channel.'},
    ],
    notes: [
      'In DMs (with no argument), outputs "Direct Message".',
      'Only channels from the current server are found. Names are matched case-insensitively (starts-with first, then contains).',
      'Outputs nothing if no channel is found.',
    ],
  },
  {
    id: 'CHANNEL_ID',
    names: ['channelid'],
    category: 'server',
    summary: 'Outputs a channel\'s ID.',
    syntax: '{channelid[:channel]}',
    args: [
      {name: 'channel', description: 'A channel mention, ID, or name in this server. Defaults to the current channel.', optional: true},
    ],
    examples: [
      {code: '{channelid}', result: 'The current channel\'s ID, e.g. "560595518129045504".'},
      {code: '{channelid:general}', result: 'The ID of the first channel matching "general".'},
    ],
    notes: [
      'Only channels from the current server are found. Names are matched case-insensitively.',
      'Outputs nothing if no channel is found.',
    ],
  },
  {
    id: 'CHANNEL_MENTION',
    names: ['channelmention'],
    category: 'server',
    summary: 'Outputs a clickable mention of a channel.',
    syntax: '{channelmention[:channel]}',
    args: [
      {name: 'channel', description: 'A channel mention, ID, or name in this server. Defaults to the current channel.', optional: true},
    ],
    examples: [
      {code: '{channelmention}', result: 'A mention of the current channel, like <#560595518129045504>.'},
      {code: 'Please read {channelmention:rules}!', result: 'Mentions the rules channel.'},
    ],
    notes: [
      'Only channels from the current server are found. Names are matched case-insensitively.',
      'Outputs nothing if no channel is found.',
    ],
  },
  {
    id: 'CHANNEL_RANDOM',
    names: ['randchannel'],
    category: 'rng',
    summary: 'Outputs the name of a random channel in the server.',
    syntax: '{randchannel}',
    examples: [
      {code: 'Go hang out in #{randchannel}!', result: 'Something like "Go hang out in #memes!".'},
    ],
    notes: [
      'Picks from every channel the bot knows about in the server, which can include categories and voice channels.',
      'In DMs, outputs "Direct Message".',
    ],
  },
  {
    id: 'COMPONENT_JSON',
    names: ['componentjson'],
    category: 'output',
    summary: 'Adds a message component (buttons, select menus, containers, etc.) from JSON.',
    description: 'The argument is a Discord component object in JSON, optionally wrapped in a code block. Tagscript inside it is parsed first, then the JSON is read and added to the message. Supported types include action rows, buttons, select menus, containers, sections, text displays, thumbnails, media galleries, files and separators.\n\nButtons need a `label` or a `url` (a URL makes it a link button), and can have a `run` string of tagscript to execute when pressed.',
    syntax: '{componentjson:json}',
    args: [
      {name: 'json', description: 'A single component object as JSON.'},
    ],
    examples: [
      {code: '{componentjson:{"type": 1, "components": [{"type": 2, "label": "Click me", "run": "You clicked it!"}]}}', result: 'Adds an action row with one button.'},
      {code: '{componentjson:{"type": 2, "label": "Docs", "url": "https://notsobot.com"}}', result: 'Adds a link button.'},
    ],
    notes: [
      'Invalid JSON, or JSON that is not an object, throws an error.',
      '{newline} inside a JSON string becomes a real line break.',
      'Up to 5 action rows or 25 loose buttons per message, and you cannot mix action rows with loose buttons.',
      'Action rows hold 1–5 components; containers hold 1–40.',
    ],
  },
  {
    id: 'COMPONENTS_ON_TIMEOUT',
    names: ['componentsontimeout'],
    category: 'output',
    summary: 'Sets tagscript that runs when the message\'s components expire.',
    description: 'The argument is stored as-is (it is not parsed right away) and is run once the components time out.',
    syntax: '{componentsontimeout:tagscript}',
    args: [
      {name: 'tagscript', description: 'The tagscript to run on timeout.'},
    ],
    examples: [
      {code: '{componentsontimeout:Too slow! The buttons expired.}', result: 'Shows that text once the buttons stop working.'},
    ],
    notes: [
      'Only one timeout script is kept; using this again replaces the previous one.',
      'An empty argument leaves the function as-is in the output.',
    ],
  },
];
