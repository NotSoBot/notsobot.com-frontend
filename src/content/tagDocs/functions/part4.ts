import type { TagDocFunction } from '../types';


const MARKUP_MENTION_NOTE = '`@` signs are escaped with an invisible character so mentions, `@everyone` and `@here` will not ping.';

const MARKUP_SINGLE_LINE_NOTE = 'New lines in the text are replaced with spaces, so the formatting covers a single line.';

const MARKUP_LIMIT_NOTE = 'The text is cut to roughly 2000 bytes.';

const MEDIASCRIPT_FILES_NOTE = 'Use `FILE_1`, `FILE_2`, ... in the code to refer to files the tag has already attached (in the order they were attached). Referenced files are handed to the script and removed from the tag\'s attachments; write `FILE_1_COPY` instead to keep the original attached as well. Referring to a file that does not exist is an error.';

const MEDIASCRIPT_ARGUMENTS_NOTE = 'If the script returns variables, each one is set as a tag variable (as if you used `{set}`), so you can read them afterwards with `{get}`.';

const SEARCH_PAGE_ARG = {
  name: 'index',
  description: 'Which result to use, starting at 0, or `random`. If left out (or the first part is not a number or `random`), a random result is picked and the whole argument is the query.',
  optional: true,
};

const SEARCH_CACHE_NOTE = 'Results are cached per query for the rest of the run, so searching the same query again does not count as another network request.';


export const TAG_DOC_FUNCTIONS_PART4: Array<TagDocFunction> = [
  {
    id: 'MEDIASCRIPT_MAYBE_URL',
    names: ['mediascriptmaybeurl', 'mscriptmaybeurl', 'imagescriptmaybeurl', 'iscriptmaybeurl'],
    category: 'media',
    summary: 'Runs MediaScript code and attaches the result, or outputs a URL to it when the API uploads it instead.',
    description: 'Works like `{mediascript}`, but the output file is not held to Discord\'s strict upload size. If the API returns an uploaded copy of the result, its URL is added to the text; otherwise the resulting file is attached to the reply.',
    syntax: '{mediascriptmaybeurl:code}',
    args: [
      {name: 'code', description: 'The MediaScript code to run.'},
    ],
    examples: [
      {code: '{image:https://example.com/cat.png}{mscriptmaybeurl:...code using FILE_1...}', result: 'The edited image, attached or as a link'},
    ],
    notes: [
      MEDIASCRIPT_FILES_NOTE,
      MEDIASCRIPT_ARGUMENTS_NOTE,
      'Counts as one network request.',
      'Safe mode (NSFW filtering) follows the channel, and the image generation model follows the `ML_IMAGINE_MODEL` setting from `{settings}`.',
      'An attached result larger than the max upload size is an error. A script error is shown as an error.',
      'With empty code, the function is left in the output as plain text.',
    ],
  },
  {
    id: 'MEDIASCRIPT_URL',
    names: ['mediascripturl', 'mscripturl', 'imagescripturl', 'iscripturl'],
    category: 'media',
    summary: 'Runs MediaScript code, uploads the result, and outputs its URL.',
    description: 'Works like `{mediascript}`, but instead of attaching the result to the reply, the result is uploaded and its CDN URL is added to the text. Handy for passing a result into other functions or embeds.',
    syntax: '{mediascripturl:code}',
    args: [
      {name: 'code', description: 'The MediaScript code to run.'},
    ],
    examples: [
      {code: '{image:https://example.com/cat.png}{mscripturl:...code using FILE_1...}', result: 'A URL to the edited image'},
    ],
    notes: [
      'Uploaded results expire after 7 days.',
      MEDIASCRIPT_FILES_NOTE,
      MEDIASCRIPT_ARGUMENTS_NOTE,
      'Counts as one network request.',
      'Safe mode (NSFW filtering) follows the channel, and the image generation model follows the `ML_IMAGINE_MODEL` setting from `{settings}`.',
      'With empty code, the function is left in the output as plain text.',
    ],
  },
  {
    id: 'NSFW',
    names: ['nsfw'],
    category: 'meta',
    summary: 'Stops the tag with an error unless it is being used somewhere NSFW content is allowed.',
    description: 'Put this at the start of a tag that should only be used in NSFW channels. It outputs nothing when NSFW content is allowed.\n\nNSFW is allowed in DMs with the bot, in age-restricted channels, and in servers whose explicit content filter does not apply to the user. It is not allowed when the bot is used as a user-installed app outside of a server it is in.',
    syntax: '{nsfw}',
    examples: [
      {code: '{nsfw}Spicy content here', result: 'Errors in a normal channel, shows the text in an NSFW channel'},
    ],
  },
  {
    id: 'NSFW_FILTER',
    names: ['nsfwfilter'],
    category: 'strings',
    summary: 'Outputs the text only if a safety scan does not flag it as unsafe.',
    description: 'The text is sent to a moderation scan. If it passes, the text (cut to 2000 characters) is output; if it is flagged, nothing is output.',
    syntax: '{nsfwfilter:text}',
    args: [
      {name: 'text', description: 'The text to check.'},
    ],
    examples: [
      {code: '{nsfwfilter:{args}}', result: 'The arguments, or nothing if they were flagged'},
    ],
    notes: [
      'Counts as one network request and one safety request (2 safety requests are allowed per run by default), even with empty text.',
      'The scan is stricter outside of NSFW channels.',
      'If the safety service is unavailable, the text is treated as unsafe and nothing is output.',
      'The text is cut to 2000 characters.',
    ],
  },
  {
    id: 'PAGE_JSON',
    names: ['pagejson'],
    category: 'output',
    summary: 'Adds one or more pages to the reply, shown with page buttons.',
    description: 'Takes a JSON object describing one page, or an array of them. Each page can have:\n\n`content`: a string of text.\n\n`embed`: a single embed object (it must have some content, an image, a thumbnail, or a video).\n\n`files`: an array of `attachment://filename` strings, pointing at files the tag attached.\n\n`components`: an array of Components V2 layout components (action rows, containers, files, media galleries, sections, separators, text displays).\n\nEvery page needs at least one of these.',
    syntax: '{pagejson:json}',
    args: [
      {name: 'json', description: 'A page object, or an array of page objects.'},
    ],
    examples: [
      {code: '{pagejson:[{"content": "Page one"}, {"content": "Page two"}]}', result: 'Two pages you can flip between'},
      {code: '{pagejson:{"embed": {"title": "Hello", "description": "An embed page"}}}', result: 'Adds a page with an embed'},
      {code: '{pagejson:{"components": [{"type": 17, "components": [{"type": 10, "content": "Inside a container"}]}]}}', result: 'Adds a page with a container holding some text'},
    ],
    notes: [
      'Invalid JSON, a page that is not an object, an empty embed, or a page with nothing usable is an error.',
      '{newline} inside a JSON string becomes a real line break.',
      'Page components cannot be interactive: buttons must be link buttons and select menus are not allowed. Buttons must be inside action rows or sections.',
      'Each page can have at most 33 components (counting nested ones).',
      'A tag can have at most 1000 pages.',
    ],
  },
  {
    id: 'PREFIX',
    names: ['prefix'],
    category: 'meta',
    summary: 'Outputs the command prefix that was used to run the tag.',
    description: 'For slash commands and other interactions this is always `/`.',
    syntax: '{prefix}',
    examples: [
      {code: 'Try {prefix}help', result: 'Try .help (if the tag was run with the `.` prefix)'},
    ],
  },
  {
    id: 'REPLY_CONTENT',
    names: ['replycontent'],
    category: 'message',
    summary: 'Outputs the content of the message the invoking message is replying to.',
    syntax: '{replycontent}',
    examples: [
      {code: 'They said: {replycontent}', result: 'They said: (the text of the replied-to message)'},
    ],
    notes: [
      'Only works when the tag is run from a normal message that replies to another message. Otherwise (including slash commands) nothing is output.',
    ],
  },
  {
    id: 'REPLY_USER_ID',
    names: ['replyuserid'],
    category: 'message',
    summary: 'Outputs the user ID of the author of the message being replied to.',
    syntax: '{replyuserid}',
    examples: [
      {code: '{replyuserid}', result: '300505364032389122'},
    ],
    notes: [
      'Only works when the tag is run from a normal message that replies to another message. Otherwise (including slash commands) nothing is output.',
    ],
  },
  {
    id: 'REQUEST',
    names: ['request'],
    category: 'network',
    summary: 'Makes an HTTP request and outputs the response as JSON.',
    description: 'Takes a JSON object with the request options:\n\n`method` (required): `GET`, `POST`, `PUT`, `PATCH`, `DELETE` or `HEAD` (case-insensitive).\n\n`url` (required): the URL to request.\n\n`headers`: an object of header names to values.\n\n`query`: an object of query string parameters.\n\n`json`: a JSON body (object or array). Only used for `POST`, `PUT` and `PATCH`.\n\n`data`: a form body, as a flat object whose values are strings, numbers or booleans. Only used for `POST`, `PUT` and `PATCH`, and cannot be combined with `json`.\n\nThe output is a JSON string like `{"cookies": {...}, "data": ..., "data_is_bytes": false, "headers": {...}, "status": 200, "url": "..."}`, where `data` is the response body.',
    syntax: '{request:json}',
    args: [
      {name: 'json', description: 'The request options object described above.'},
    ],
    examples: [
      {code: '{request:{"method": "GET", "url": "https://httpbin.org/get", "query": {"q": "cats"}}}', result: '{"cookies":{},"data":...,"data_is_bytes":false,"headers":{...},"status":200,"url":"https://httpbin.org/get?q=cats"}'},
      {code: '{request:{"method": "POST", "url": "https://httpbin.org/post", "json": {"text": {jsonify:{args}}}}}', result: 'Sends the arguments as a JSON body and outputs the response'},
    ],
    notes: [
      'Counts against the network request limit.',
      'Use `{jsonify}` to safely put text inside the JSON options.',
      'Invalid options give a specific error, e.g. "Request method is invalid.", "Request url is invalid." or "Request cannot have both json and data.". Options that are not valid JSON are also an error.',
      'If the request fails, the tag errors, including any details the request service gives.',
      'The URL is parsed like other media URLs, so a user mention or ID becomes their avatar URL and a custom emoji becomes its image URL.',
    ],
  },
  {
    id: 'RNG_CHOOSE',
    names: ['choose'],
    category: 'rng',
    summary: 'Picks one of the given choices at random.',
    description: 'Only the picked choice is evaluated, so functions inside the other choices never run. This makes it safe to put things like `{set}` or network calls in the choices.',
    syntax: '{choose:choice1|choice2|...}',
    args: [
      {name: 'choices', description: 'The options to pick from, separated by `|`. With no `|`, the single value is output.'},
    ],
    examples: [
      {code: '{choose:heads|tails}', result: 'heads or tails'},
      {code: '{choose:You win!|You lose, {user}.}', result: 'One of the two messages'},
    ],
    notes: [
      'With no argument, the function is left in the output as plain text.',
    ],
  },
  {
    id: 'RNG_RANGE',
    names: ['range', 'random', 'rnd'],
    category: 'rng',
    summary: 'Outputs a random whole number in a range, including both ends.',
    description: 'With one number, picks between 0 and that number. With two, picks between them; the order does not matter. Very large numbers are supported.',
    syntax: '{range:max} or {range:min|max}',
    args: [
      {name: 'min', description: 'The lowest number. Defaults to 0.', optional: true},
      {name: 'max', description: 'The highest number.'},
    ],
    examples: [
      {code: '{range:10}', result: 'A number from 0 to 10, e.g. 7'},
      {code: '{random:1|6}', result: 'A dice roll, e.g. 4'},
      {code: '{rnd:-5|5}', result: 'A number from -5 to 5'},
    ],
    notes: [
      'Decimals are cut off (`{range:1.9|5.5}` is the same as `{range:1|5}`).',
      'If either value is not a number, or there is no argument, the function is left in the output as plain text.',
    ],
  },
  {
    id: 'RNG_UUID',
    names: ['uuid'],
    category: 'rng',
    summary: 'Generates a random UUID.',
    syntax: '{uuid:version?}',
    args: [
      {name: 'version', description: '`4` (the default) for a fully random UUID, or `7` for a time-ordered one.', optional: true},
    ],
    examples: [
      {code: '{uuid}', result: '3b241101-e2bb-4255-8caf-4136c566a962'},
      {code: '{uuid:7}', result: 'A UUID v7, e.g. 0192a3e4-5b6c-7d8e-9f01-23456789abcd'},
    ],
    notes: [
      'Any other version is left in the output as plain text.',
    ],
  },
  {
    id: 'SEARCH_DUCKDUCKGO_IMAGES',
    names: ['search.duckduckgo.images', 'search.ddg.images', 's.duckduckgo.images', 's.ddg.images'],
    category: 'search',
    summary: 'Searches DuckDuckGo Images and outputs an image URL.',
    syntax: '{search.ddg.images:index?|query}',
    args: [
      SEARCH_PAGE_ARG,
      {name: 'query', description: 'What to search for. Cut to 1024 characters.'},
    ],
    examples: [
      {code: '{s.ddg.images:cat}', result: 'The URL of a random cat image from the results'},
      {code: '{s.ddg.images:0|cat}', result: 'The URL of the first result'},
    ],
    notes: [
      'Counts as one network request.',
      SEARCH_CACHE_NOTE,
      'Safe search is on unless the channel allows NSFW content.',
      'Outputs nothing if there are no results, the index is past the end of the results, or the query is empty.',
    ],
  },
  {
    id: 'SEARCH_GOOGLE_IMAGES',
    names: ['search.google.images', 'search.g.images', 's.google.images', 's.g.images'],
    category: 'search',
    summary: 'Searches Google Images and outputs an image URL.',
    syntax: '{search.google.images:index?|query}',
    args: [
      SEARCH_PAGE_ARG,
      {name: 'query', description: 'What to search for. Cut to 1024 characters.'},
    ],
    examples: [
      {code: '{s.g.images:dog}', result: 'The URL of a random dog image from the results'},
      {code: '{s.g.images:2|dog}', result: 'The URL of the third result'},
      {code: '{s.g.images:random|{args}}', result: 'A random image for whatever was passed into the tag'},
    ],
    notes: [
      'Counts as one network request.',
      SEARCH_CACHE_NOTE,
      'Safe search is on unless the channel allows NSFW content.',
      'Outputs nothing if there are no results, the index is past the end of the results, or the query is empty.',
    ],
  },
  {
    id: 'SEARCH_YOUTUBE',
    names: ['search.youtube', 'search.yt', 's.youtube', 's.yt'],
    category: 'search',
    summary: 'Searches YouTube and outputs the URL of the first video.',
    description: 'Channels and playlists in the results are skipped; the first video result is used.',
    syntax: '{search.youtube:query}',
    args: [
      {name: 'query', description: 'What to search for. Cut to 1024 characters.'},
    ],
    examples: [
      {code: '{s.yt:never gonna give you up}', result: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'},
    ],
    notes: [
      'Counts as one network request.',
      SEARCH_CACHE_NOTE,
      'Outputs nothing if no video is found or the query is empty.',
    ],
  },
  {
    id: 'SETTINGS',
    names: ['settings'],
    category: 'meta',
    summary: 'Changes how the tag behaves for the rest of the run.',
    description: 'Takes exactly two parts: the setting name (case-insensitive) and its value. Spaces around either part are ignored, and an empty value clears the setting. Settings only last for the current run of the tag.\n\n`AI_MODEL`: the AI model used by the text generation functions (an invalid model errors and lists the valid ones).\n\n`AI_PERSONALITY`: a personality prompt used by the text generation functions, instead of the user\'s or server\'s.\n\n`ALLOW_COMPONENT_EXECUTIONS_FROM_EVERYONE`: `true` lets anyone use the tag\'s buttons and menus, not just the person who ran the tag. `false` turns it back off.\n\n`DISPLAY_MEDIA_AS_NATIVE`: `true` shows a single attached file natively, when the reply has no embeds and no buttons. `false` turns it back off.\n\n`MEDIA_IV_FALLBACK`: when an image function (such as `{iv}` or `{image}`) cannot find media from its argument, it runs this function with the same argument instead and uses the URL it gives back. One of `MEDIA_IMAGE_IMAGINE` (or `imagine`/`imagineurl`, generates an image and uses its temporary URL), `SEARCH_DUCK_DUCK_GO_IMAGES` (or `SEARCH_DUCKDUCKGO_IMAGES` or a `search.duckduckgo.images` name) or `SEARCH_GOOGLE_IMAGES` (or a `search.google.images` name).\n\n`MEDIA_AV_FALLBACK`: the same, for audio/video functions such as `{transcribe}`. Only `SEARCH_YOUTUBE` (or a `search.youtube` name) is allowed.\n\n`ML_IMAGINE_DO_NOT_ERROR`: a true/false value. When true, image generation is asked not to error.\n\n`ML_IMAGINE_MODEL`: the image generation model, `FLUX_KLEIN` or `SDXL_TURBO` (case-insensitive).',
    syntax: '{settings:SETTING|value}',
    args: [
      {name: 'SETTING', description: 'The setting name, from the list above.'},
      {name: 'value', description: 'The new value for the setting.'},
    ],
    examples: [
      {code: '{settings:MEDIA_IV_FALLBACK|search.google.images}{iv:{args}}', result: 'Uses the arguments as media, or searches Google Images for them if they are not media'},
      {code: '{settings:ML_IMAGINE_MODEL|SDXL_TURBO}{imagine:a cat in a hat}', result: 'Generates the image with SDXL Turbo'},
      {code: '{settings:ALLOW_COMPONENT_EXECUTIONS_FROM_EVERYONE|true}', result: 'Lets everyone press the tag\'s buttons'},
      {code: '{settings:MEDIA_IV_FALLBACK|MEDIA_IMAGE_IMAGINE}{edit:make it snow}', result: 'Edits the last image, or a freshly generated one if there is none'},
      {code: '{settings:ML_IMAGINE_MODEL|}', result: 'Clears the model setting again'},
    ],
    notes: [
      'Outputs nothing on success.',
      'If there are not exactly two parts, or the setting name is unknown, the function is left in the output as plain text.',
      'An unrecognised value for `MEDIA_IV_FALLBACK` or `MEDIA_AV_FALLBACK` is silently ignored. For the true/false settings, `true`, `yes`, `y` and `+` enable them; anything else (including `false`) clears them.',
    ],
  },
  {
    id: 'SETTINGS_SET_SERVER_AI_PERSONALITY',
    names: ['settings.set.server.ai.personality'],
    category: 'ai',
    summary: 'Not available yet: always left in the output as plain text.',
    syntax: '{settings.set.server.ai.personality:prompt?}',
    args: [
      {name: 'prompt', description: 'The personality prompt.', optional: true},
    ],
    notes: [
      'This function currently does nothing; it is always left in the output exactly as written.',
    ],
  },
  {
    id: 'SETTINGS_SET_USER_AI_PERSONALITY',
    names: ['settings.set.user.ai.personality'],
    category: 'ai',
    summary: 'Reads or changes the AI personality saved in the settings of the person using the tag. Only NotSoAI can use this.',
    description: 'With no argument, outputs the user\'s current AI personality (or nothing if they have none). With a prompt, saves it as their personality and outputs `true`, or `false` if it was already set to that. Use `clear` to remove it.',
    syntax: '{settings.set.user.ai.personality:prompt?}',
    args: [
      {name: 'prompt', description: 'The new personality prompt, or `clear` to remove it. Leave out to read the current one.', optional: true},
    ],
    examples: [
      {code: '{settings.set.user.ai.personality}', result: 'The current personality prompt'},
      {code: '{settings.set.user.ai.personality:You are a grumpy pirate.}', result: 'true'},
      {code: '{settings.set.user.ai.personality:clear}', result: 'true (or false if none was set)'},
    ],
    notes: [
      'Only NotSoAI can use this. In a user\'s tag (or a tag NotSoAI calls with {tag}) the function is left in the output as plain text.',
      'This permanently changes the NotSoBot settings of the person who asked NotSoAI, not just this run.',
    ],
  },
  {
    id: 'SETTINGS_SET_USER_LOCALE',
    names: ['settings.set.user.locale'],
    category: 'ai',
    summary: 'Reads or changes the language saved in the settings of the person using the tag. Only NotSoAI can use this.',
    description: 'With no argument, outputs the user\'s current locale (or nothing if they have none). With a language name or code, saves it and outputs `true`, or `false` if it was already set to that. Use `clear` to remove it.',
    syntax: '{settings.set.user.locale:locale?}',
    args: [
      {name: 'locale', description: 'A language name or code like `spanish` or `es`, or `clear` to remove it. Leave out to read the current one.', optional: true},
    ],
    examples: [
      {code: '{settings.set.user.locale:spanish}', result: 'true'},
    ],
    notes: [
      'Only NotSoAI can use this. In a user\'s tag (or a tag NotSoAI calls with {tag}) the function is left as plain text.',
      'This permanently changes the NotSoBot settings of the person who asked NotSoAI, not just this run.',
      'Throws an error if the language is not recognised.',
    ],
  },
  {
    id: 'SETTINGS_SET_USER_TIMEZONE',
    names: ['settings.set.user.timezone'],
    category: 'ai',
    summary: 'Reads or changes the timezone saved in the settings of the person using the tag. Only NotSoAI can use this.',
    description: 'The timezone is used when reading reminder times like "at 4pm". With no argument, outputs the user\'s current timezone (or nothing if they have none). With a timezone, saves it and outputs `true`, or `false` if it was already set to that. Use `clear` to remove it.',
    syntax: '{settings.set.user.timezone:timezone?}',
    args: [
      {name: 'timezone', description: 'An IANA name like `America/New_York`, an abbreviation like `EST`, or a city/region name, or `clear` to remove it. Leave out to read the current one.', optional: true},
    ],
    examples: [
      {code: '{settings.set.user.timezone:America/New_York}', result: 'true'},
      {code: '{settings.set.user.timezone}', result: 'America/New_York'},
    ],
    notes: [
      'Only NotSoAI can use this. In a user\'s tag (or a tag NotSoAI calls with {tag}) the function is left as plain text.',
      'This permanently changes the NotSoBot settings of the person who asked NotSoAI, not just this run.',
      'Throws an error if the timezone is not recognised.',
    ],
  },
  {
    id: 'STRING_INDEX_OF',
    names: ['indexof'],
    category: 'strings',
    summary: 'Outputs the position of the first match of some text inside other text.',
    description: 'Positions start at 0. Outputs `-1` if the text is not found. The search is case-sensitive.',
    syntax: '{indexof:search|text}',
    args: [
      {name: 'search', description: 'The text to look for.'},
      {name: 'text', description: 'The text to search in. Everything after the first `|` is part of it.'},
    ],
    examples: [
      {code: '{indexof:,|the cat jumped, over a dog}', result: '14'},
      {code: '{indexof:z|hello}', result: '-1'},
    ],
    notes: [
      'Plain values (without functions in them) are trimmed of surrounding spaces.',
      'Without a `|`, the function is left in the output as plain text.',
    ],
  },
  {
    id: 'STRING_JSONIFY',
    names: ['jsonify'],
    category: 'json',
    summary: 'Turns text into a JSON string, with quotes and escaping.',
    description: 'Wraps the text in double quotes and escapes quotes, backslashes and new lines, so it can be dropped into JSON safely (for example in `{request}` or `{pagejson}`).',
    syntax: '{jsonify:text}',
    args: [
      {name: 'text', description: 'The text to convert.'},
    ],
    examples: [
      {code: '{jsonify:He said "hi"}', result: '"He said \\"hi\\""'},
      {code: '{pagejson:{"content": {jsonify:{args}}}}', result: 'A page containing the arguments, safely escaped'},
    ],
  },
  {
    id: 'STRING_LENGTH',
    names: ['len', 'length'],
    category: 'strings',
    summary: 'Outputs the number of characters in the text.',
    syntax: '{len:text}',
    args: [
      {name: 'text', description: 'The text to measure.'},
    ],
    examples: [
      {code: '{len:hello}', result: '5'},
      {code: '{length:{args}}', result: 'How long the arguments are'},
    ],
    notes: [
      'Surrounding spaces are trimmed before measuring. Some emoji count as 2 characters.',
    ],
  },
  {
    id: 'STRING_LOWER',
    names: ['lower'],
    category: 'strings',
    summary: 'Converts text to lowercase.',
    syntax: '{lower:text}',
    args: [
      {name: 'text', description: 'The text to convert.'},
    ],
    examples: [
      {code: '{lower:HELLO World}', result: 'hello world'},
    ],
  },
  {
    id: 'STRING_MARKUP_BOLD',
    names: ['markupbold'],
    category: 'markup',
    summary: 'Makes text **bold**.',
    description: 'Wraps the text in `**`. Any `**` already in the text is escaped.',
    syntax: '{markupbold:text}',
    args: [
      {name: 'text', description: 'The text to format.'},
    ],
    examples: [
      {code: '{markupbold:hello}', result: '**hello**'},
    ],
    notes: [MARKUP_MENTION_NOTE, MARKUP_LIMIT_NOTE],
  },
  {
    id: 'STRING_MARKUP_CODEBLOCK',
    names: ['code', 'markupcodeblock'],
    category: 'markup',
    summary: 'Puts text in a code block.',
    description: 'Wraps the text in triple backticks, on their own lines. Any triple backticks in the text are broken up so they cannot end the block early.',
    syntax: '{code:text}',
    args: [
      {name: 'text', description: 'The text to put in the code block.'},
    ],
    examples: [
      {code: '{code:console.log("hi");}', result: '```\nconsole.log("hi");\n```'},
    ],
    notes: [
      'No language can be set for syntax highlighting.',
      'Unlike most markup functions, mentions are not escaped. ' + MARKUP_LIMIT_NOTE,
    ],
  },
  {
    id: 'STRING_MARKUP_CODESTRING',
    names: ['markupcodestring'],
    category: 'markup',
    summary: 'Formats text as `inline code`.',
    description: 'Wraps the text in single backticks. If the text contains a backtick, double backticks are used instead.',
    syntax: '{markupcodestring:text}',
    args: [
      {name: 'text', description: 'The text to format.'},
    ],
    examples: [
      {code: '{markupcodestring:npm install}', result: '`npm install`'},
    ],
    notes: [MARKUP_MENTION_NOTE, MARKUP_LIMIT_NOTE],
  },
  {
    id: 'STRING_MARKUP_ESCAPE',
    names: ['markupescape'],
    category: 'markup',
    summary: 'Escapes Discord markdown so the text shows exactly as typed.',
    description: 'Escapes backslashes, `*`, `_`, backticks, `||`, `~~`, `__`, `>` and leading `#`/`-#`, and breaks up masked links. Useful for showing user input without it being formatted.',
    syntax: '{markupescape:text}',
    args: [
      {name: 'text', description: 'The text to escape.'},
    ],
    examples: [
      {code: '{markupescape:**not bold**}', result: '\\*\\*not bold\\*\\*'},
    ],
    notes: [MARKUP_MENTION_NOTE, MARKUP_LIMIT_NOTE],
  },
  {
    id: 'STRING_MARKUP_HEADER_BIG',
    names: ['markupheaderbig'],
    category: 'markup',
    summary: 'Makes text a big header (`# text`).',
    syntax: '{markupheaderbig:text}',
    args: [
      {name: 'text', description: 'The header text.'},
    ],
    examples: [
      {code: '{markupheaderbig:Welcome}', result: '# Welcome'},
    ],
    notes: [MARKUP_SINGLE_LINE_NOTE, MARKUP_MENTION_NOTE, 'Headers only render at the start of a line, so put a new line before it if needed.'],
  },
  {
    id: 'STRING_MARKUP_HEADER_MEDIUM',
    names: ['markupheadermedium'],
    category: 'markup',
    summary: 'Makes text a medium header (`## text`).',
    syntax: '{markupheadermedium:text}',
    args: [
      {name: 'text', description: 'The header text.'},
    ],
    examples: [
      {code: '{markupheadermedium:Rules}', result: '## Rules'},
    ],
    notes: [MARKUP_SINGLE_LINE_NOTE, MARKUP_MENTION_NOTE, 'Headers only render at the start of a line, so put a new line before it if needed.'],
  },
  {
    id: 'STRING_MARKUP_HEADER_SMALL',
    names: ['markupheadersmall'],
    category: 'markup',
    summary: 'Makes text a small header (`### text`).',
    syntax: '{markupheadersmall:text}',
    args: [
      {name: 'text', description: 'The header text.'},
    ],
    examples: [
      {code: '{markupheadersmall:Details}', result: '### Details'},
    ],
    notes: [MARKUP_SINGLE_LINE_NOTE, MARKUP_MENTION_NOTE, 'Headers only render at the start of a line, so put a new line before it if needed.'],
  },
  {
    id: 'STRING_MARKUP_ITALICS',
    names: ['markupitalics'],
    category: 'markup',
    summary: 'Makes text _italic_.',
    description: 'Wraps the text in `_`. Any `_` or `*` in the text is escaped.',
    syntax: '{markupitalics:text}',
    args: [
      {name: 'text', description: 'The text to format.'},
    ],
    examples: [
      {code: '{markupitalics:hello}', result: '_hello_'},
    ],
    notes: [MARKUP_MENTION_NOTE, MARKUP_LIMIT_NOTE],
  },
  {
    id: 'STRING_MARKUP_LIST_DOTTED',
    names: ['markuplistdotted'],
    category: 'markup',
    summary: 'Turns `|`-separated items into a bulleted list.',
    syntax: '{markuplistdotted:item1|item2|...}',
    args: [
      {name: 'items', description: 'The list items, separated by `|`.'},
    ],
    examples: [
      {code: '{markuplistdotted:apples|bananas|cherries}', result: '- apples\n- bananas\n- cherries'},
    ],
    notes: [
      'Each item is kept on one line (new lines become spaces), and `-` or `*` inside an item is escaped.',
      MARKUP_MENTION_NOTE,
    ],
  },
  {
    id: 'STRING_MARKUP_LIST_NUMBERED',
    names: ['markuplistnumbered'],
    category: 'markup',
    summary: 'Turns `|`-separated items into a numbered list.',
    syntax: '{markuplistnumbered:item1|item2|...}',
    args: [
      {name: 'items', description: 'The list items, separated by `|`.'},
    ],
    examples: [
      {code: '{markuplistnumbered:first|second|third}', result: '1. first\n2. second\n3. third'},
    ],
    notes: [
      'Numbering starts at 1.',
      'Each item is kept on one line (new lines become spaces), and `-` or `*` inside an item is escaped.',
      MARKUP_MENTION_NOTE,
    ],
  },
  {
    id: 'STRING_MARKUP_QUOTE',
    names: ['markupquote'],
    category: 'markup',
    summary: 'Makes text a block quote (`> text`).',
    syntax: '{markupquote:text}',
    args: [
      {name: 'text', description: 'The text to quote.'},
    ],
    examples: [
      {code: '{markupquote:{replycontent}}', result: '> (the replied-to message)'},
    ],
    notes: [MARKUP_SINGLE_LINE_NOTE, 'Any `>` in the text is escaped.', MARKUP_MENTION_NOTE],
  },
  {
    id: 'STRING_MARKUP_SPOILER',
    names: ['markupspoiler'],
    category: 'markup',
    summary: 'Hides text behind a ||spoiler||.',
    syntax: '{markupspoiler:text}',
    args: [
      {name: 'text', description: 'The text to hide.'},
    ],
    examples: [
      {code: '{markupspoiler:the butler did it}', result: '||the butler did it||'},
    ],
    notes: ['Any `||` in the text is escaped.', MARKUP_MENTION_NOTE, MARKUP_LIMIT_NOTE],
  },
  {
    id: 'STRING_MARKUP_STRIKE',
    names: ['markupstrike'],
    category: 'markup',
    summary: 'Crosses text out with ~~strikethrough~~.',
    syntax: '{markupstrike:text}',
    args: [
      {name: 'text', description: 'The text to cross out.'},
    ],
    examples: [
      {code: '{markupstrike:old price}', result: '~~old price~~'},
    ],
    notes: ['Any `~~` in the text is escaped.', MARKUP_MENTION_NOTE, MARKUP_LIMIT_NOTE],
  },
  {
    id: 'STRING_MARKUP_SUBTEXT',
    names: ['markupsubtext'],
    category: 'markup',
    summary: 'Makes text small, grey subtext (`-# text`).',
    syntax: '{markupsubtext:text}',
    args: [
      {name: 'text', description: 'The text to format.'},
    ],
    examples: [
      {code: '{markupsubtext:requested by {user}}', result: '-# requested by cake'},
    ],
    notes: [MARKUP_SINGLE_LINE_NOTE, MARKUP_MENTION_NOTE, 'Subtext only renders at the start of a line.'],
  },
  {
    id: 'STRING_MARKUP_TIME',
    names: ['markuptime'],
    category: 'markup',
    summary: 'Outputs a Discord timestamp (`<t:...>`) that shows in each viewer\'s own timezone.',
    description: 'The time can be a number of milliseconds since 1970 or a date string such as `2025-01-01T12:00:00Z`. With no time, the current time is used.\n\nThe last part can be a style: `BOTH_LONG` (`F`), `BOTH_SHORT` (`f`), `DATE_LONG` (`D`), `DATE_SHORT` (`d`), `RELATIVE` (`R`), `TIME_LONG` (`T`) or `TIME_SHORT` (`t`). Style names are case-insensitive, the single letters are Discord\'s own and are case-sensitive. Without a style, Discord\'s default format is used. A style on its own (like `{markuptime:RELATIVE}`) uses the current time.',
    syntax: '{markuptime:time?|style?}',
    args: [
      {name: 'time', description: 'Milliseconds since 1970, or a date string. Defaults to now.', optional: true},
      {name: 'style', description: 'How Discord shows the time, see above.', optional: true},
    ],
    examples: [
      {code: '{markuptime}', result: '<t:1760313600> (the current time)'},
      {code: '{markuptime:1700000000000}', result: '<t:1700000000>'},
      {code: '{markuptime:1700000000000|RELATIVE}', result: '<t:1700000000:R> (shows as something like "2 years ago")'},
      {code: '{markuptime:2025-01-01T12:00:00Z|D}', result: '<t:1735732800:D>'},
    ],
    notes: [
      'Numbers are read as milliseconds, not seconds. A Unix timestamp in seconds will show as a date in January 1970.',
      'If the time cannot be read as a date, the function is left in the output as plain text.',
    ],
  },
  {
    id: 'STRING_MARKUP_UNDERLINE',
    names: ['markupunderline'],
    category: 'markup',
    summary: 'Underlines text (`__text__`).',
    syntax: '{markupunderline:text}',
    args: [
      {name: 'text', description: 'The text to underline.'},
    ],
    examples: [
      {code: '{markupunderline:important}', result: '__important__'},
    ],
    notes: ['Any `__` in the text is escaped.', MARKUP_MENTION_NOTE, MARKUP_LIMIT_NOTE],
  },
  {
    id: 'STRING_MARKUP_URL',
    names: ['markupurl'],
    category: 'markup',
    summary: 'Makes a masked link: clickable text that goes to a URL.',
    syntax: '{markupurl:text|url|tooltip?}',
    args: [
      {name: 'text', description: 'The text to show.'},
      {name: 'url', description: 'Where the link goes.'},
      {name: 'tooltip', description: 'Text shown when hovering over the link. Everything after the second `|` is part of it.', optional: true},
    ],
    examples: [
      {code: '{markupurl:NotSoBot|https://notsobot.com}', result: '[NotSoBot](https://notsobot.com)'},
      {code: '{markupurl:Docs|https://notsobot.com|Read the docs}', result: '[Docs](https://notsobot.com \'Read the docs\')'},
    ],
    notes: [
      'Any `)` in the URL is encoded as `%29` so it does not break the link.',
      'The URL is required; leaving it out is an error.',
    ],
  },
  {
    id: 'STRING_ONE_OF',
    names: ['oneof'],
    category: 'strings',
    summary: 'Finds the choice that best matches a value.',
    description: 'First looks for a choice that contains the value (case-insensitive) and outputs the first one found. If none do, a fuzzy search is used to find the closest choice, which is handy for typos or partial input.',
    syntax: '{oneof:value|choice1|choice2|...}',
    args: [
      {name: 'value', description: 'The text to match.'},
      {name: 'choices', description: 'The possible choices, separated by `|`.'},
    ],
    examples: [
      {code: '{oneof:ban|apple|banana|cherry}', result: 'banana'},
      {code: '{oneof:chery|apple|banana|cherry}', result: 'cherry'},
      {code: '{oneof:{args}|rock|paper|scissors}', result: 'The choice closest to what the user typed'},
    ],
    notes: [
      'Outputs nothing if nothing matches, or if the value or choices are missing.',
      'With no argument at all, the function is left in the output as plain text.',
    ],
  },
  {
    id: 'STRING_REPEAT',
    names: ['repeat'],
    category: 'strings',
    summary: 'Repeats text a number of times.',
    syntax: '{repeat:amount|text}',
    args: [
      {name: 'amount', description: 'How many times to repeat the text (a whole number).'},
      {name: 'text', description: 'The text to repeat. Everything after the first `|` is part of it, and it is trimmed.'},
    ],
    examples: [
      {code: '{repeat:3|ha}', result: 'hahaha'},
      {code: '{repeat:5|⭐}', result: '⭐⭐⭐⭐⭐'},
    ],
    notes: [
      'If the result would make the output larger than the max upload size, the tag errors.',
      'A negative amount is an error.',
      'Without a `|`, or if the amount is not a number, the function is left in the output as plain text.',
    ],
  },
  {
    id: 'STRING_REPLACE',
    names: ['replace', 'replaceregex'],
    category: 'strings',
    summary: 'Replaces every match of a regular expression in some text.',
    description: 'The first part is a JavaScript regular expression, which always runs with the `g` (replace all) and `i` (case-insensitive) flags; other flags cannot be set. A plain word works too, since it is just a regex with no special characters.\n\nBy default the order is pattern, replacement, then the text. You can also label the parts with `with:` and `in:` to write them in either order. The replacement can use `$1`, `$2`, ... to insert captured groups, and `$&` for the whole match.',
    syntax: '{replace:pattern|replacement|text}',
    args: [
      {name: 'pattern', description: 'The regular expression to look for. Escape any `|` in it as `\\|`.'},
      {name: 'replacement', description: 'What to replace each match with. Can be prefixed with `with:`.'},
      {name: 'text', description: 'The text to search in. Can be prefixed with `in:`. Everything after the second `|` is part of it.'},
    ],
    examples: [
      {code: '{replace:cat|dog|The Cat sat with another cat}', result: 'The dog sat with another dog'},
      {code: '{replace:(cake\\|josh)|tom|cake went with josh to the store}', result: 'tom went with tom to the store'},
      {code: '{replace:"|in:"help"|with:\'}', result: '\'help\''},
    ],
    notes: [
      'Regex special characters such as `.`, `?`, `(`, `[` and `*` need a backslash if you want to match them literally.',
      'An invalid regex, or one that takes longer than 25ms to run, is an error.',
      'With fewer than three parts, the function is left in the output as plain text.',
    ],
  },
  {
    id: 'STRING_REVERSE',
    names: ['reverse'],
    category: 'strings',
    summary: 'Reverses text.',
    syntax: '{reverse:text}',
    args: [
      {name: 'text', description: 'The text to reverse.'},
    ],
    examples: [
      {code: '{reverse:hello}', result: 'olleh'},
    ],
    notes: [
      'Emoji and some other special characters can break when reversed.',
    ],
  },
  {
    id: 'STRING_SUB',
    names: ['substring'],
    category: 'strings',
    summary: 'Outputs part of some text, by position.',
    description: 'Positions start at 0. The output starts at `start` and ends just before `end` (or at the end of the text). Negative positions count as 0, and if `start` is bigger than `end` the two are swapped.',
    syntax: '{substring:text|start|end?}',
    args: [
      {name: 'text', description: 'The text to cut. It cannot contain an unescaped `|`.'},
      {name: 'start', description: 'The position to start at.'},
      {name: 'end', description: 'The position to stop before. Defaults to the end of the text.', optional: true},
    ],
    examples: [
      {code: '{substring:hello world|6}', result: 'world'},
      {code: '{substring:hello world|0|5}', result: 'hello'},
      {code: '{substring:{args}|0|1}', result: 'The first character of the arguments'},
    ],
    notes: [
      'Without a `|`, with empty text or start, or if start/end are not numbers, the function is left in the output as plain text.',
    ],
  },
  {
    id: 'STRING_TRANSLATE',
    names: ['translate'],
    category: 'strings',
    summary: 'Translates text with Google Translate.',
    description: 'If there is more than one part, the last part is checked as a language name or code (e.g. `russian`, `ja`, or `random`). If it is not a language, it is treated as part of the text.\n\nWithout a language, the text is translated into your language: your NotSoBot language setting, then your Discord language (for slash commands), then the server\'s language setting, then the server\'s preferred language, then English.',
    syntax: '{translate:text|language?}',
    args: [
      {name: 'text', description: 'The text to translate. The source language is detected automatically.'},
      {name: 'language', description: 'The language to translate into. Matching is fuzzy, so close spellings work.', optional: true},
    ],
    examples: [
      {code: '{translate:hello|spanish}', result: 'Hola'},
      {code: '{translate:bonjour}', result: 'Hello (if your language is English)'},
      {code: '{translate:good morning|random}', result: 'Good morning in a random language'},
    ],
    notes: [
      'Counts as one network request, even with empty text.',
      'If the translation fails, nothing is output.',
      'Because the last part is fuzzy-matched against language names, text containing a `|` can have its last piece mistaken for a language.',
    ],
  },
];
