// Tag scripting language guide (everything except the per-function reference).
// Facts here are checked against notsobot.ts/src/utils/tags/index.ts (the `parse` loop, `split`, `ScriptTags._code`),
// notsobot.ts/src/utils/formatter/commands/tag.show.ts (how the reply is built) and the tag commands.

import type { TagDocGuideSection } from './types';


export const TAG_DOC_GUIDE: Array<TagDocGuideSection> = [
  {
    id: 'what-are-tags',
    title: 'What are tags?',
    body: [
      'A tag is a saved message you can bring back with a short name. Tags can be plain text, but they can also contain TagScript: little `{functions}` in curly brackets that run every time the tag is shown. That lets one tag greet whoever used it, pick a random answer, remember a score, fetch an image or even run Python.',
      'Create a tag with `.tag create <name> <content>` and show it with `.tag <name>` (or the shorter `.t <name>`, or `/tag show`). Anything you type after the tag name is passed to the tag as its arguments. Tag names with spaces go in quotes, like `.tag create "my tag" hello!`.',
      'Change a tag with `.tag edit <name> <new content>`, and see its raw source with `.tag raw <name>` (an alias of `.tag info`). Server managers can turn a tag into a custom command with `.tag commands add <name>`, so members can run it directly as `.<name>`.',
      'If you create a tag with no text but attach a file to the message, the tag is saved as `{attach:URL}` so the file is sent every time the tag runs.',
    ].join('\n\n'),
    examples: [
      {
        code: '.tag create greet Hello {user}, welcome to {server}!',
        result: 'Creates a tag named `greet`.',
      },
      {
        code: '.tag greet',
        result: 'Hello cake, welcome to NotSoBot Support!',
      },
    ],
  },

  {
    id: 'syntax',
    title: 'Syntax',
    body: [
      'A function is written as `{name}` or `{name:argument}`. The name ends at the first `:`, and everything after it, up to the matching `}`, is the argument. Function names are not case sensitive, so `{UPPER:hi}` and `{upper:hi}` are the same.',
      'Functions that take several arguments separate them with `|`, like `{range:1|10}`. A `|` inside a nested function does not split the outer one, so `{choose:a|{upper:b|c}}` has two choices, not three.',
      'Functions can be nested. For most functions the argument is evaluated first (inside-out), and the function then works on the finished text: in `{upper:{user}}`, `{user}` becomes `cake` and then `upper` turns it into `CAKE`.',
      'Some functions evaluate their arguments lazily instead, only running the parts they actually need: `if`, `and`, `or`, `iferror`, `choose`, `foreach`, `set` and `get` (in every storage scope), `includes`, `indexof`, `substring`, `setfilename`, `componentjson`, `componentsontimeout` and `evalsilent`. This is why `{if}` only runs the branch that matches, and `{choose}` only runs the option it picked.',
      'Whitespace just inside the brackets is trimmed, so `{ user }` works, but the name itself must be written without spaces before the `:` (`{upper :hi}` is not recognised). Plain arguments are trimmed too.',
      'If a name is not a known function, or a function is given arguments it cannot use, the text is left in the output as it was written (with any nested functions already filled in). A `{` without a matching `}` is also output as plain text.',
    ].join('\n\n'),
    examples: [
      {
        code: '{upper:{user}}',
        result: 'CAKE',
      },
      {
        code: '{choose:{set:prize|gold}|{set:prize|silver}}You won {get:prize}!',
        result: 'You won gold! (or silver; only the chosen `set` runs)',
      },
      {
        code: 'Hi {notafunction:{user}}',
        result: 'Hi {notafunction:cake}',
      },
    ],
  },

  {
    id: 'escaping',
    title: 'Escaping and comments',
    body: [
      'To output TagScript without running it, wrap it in `{ignore:...}`. The argument is printed exactly as written and nothing inside it is evaluated. Its brackets still need to be balanced.',
      '`{note:...}` is a comment: its contents are never evaluated and nothing is output, which is handy for leaving yourself notes in long tags.',
      'To print a single symbol that would otherwise be read as syntax, use the insert functions: `{bracketleft}` for `{`, `{bracketright}` for `}`, `{splitterargument}` for `|`, `{splitterfunction}` for `:` and `{newline}` for a line break. Each accepts a count, like `{newline:3}`.',
      'A backslash `\\` before `{`, `}` or `|` escapes it. In the tag\'s own text (outside any function) the backslash is removed and the character is printed as-is, so `\\{user}` outputs `{user}` without running it. Inside a function\'s argument, `\\{` and `\\}` stop a bracket from opening or closing a function and `\\|` stops a `|` from splitting arguments, but the backslash before a bracket stays in the output there, so `{ignore}` and the insert functions are usually cleaner inside functions.',
      'Keep in mind that the insert functions produce real characters: when used inside a function that evaluates its argument first, an inserted `|` is seen by that function as a separator.',
    ].join('\n\n'),
    examples: [
      {
        code: '{ignore:Use {user} to show your name!}',
        result: 'Use {user} to show your name!',
      },
      {
        code: '{note:this part is just for me}Hello!',
        result: 'Hello!',
      },
      {
        code: '{bracketleft}user{bracketright} is {user}',
        result: '{user} is cake',
      },
    ],
  },

  {
    id: 'arguments',
    title: 'Arguments',
    body: [
      'Everything typed after the tag name becomes the tag\'s arguments. `{args}` returns all of it as typed, and `{arg:N}` returns a single argument by position, starting from 0 (`{arg}` alone is the first one). Negative positions count from the end, so `{arg:-1}` is the last argument. `{argslen}` returns how many arguments there are, and `{args:start|end}` returns a range joined with spaces.',
      'Arguments are split on spaces. Wrapping words in quotes keeps them together as one argument, so `.tag rate "pizza with pineapple"` has one argument. Straight quotes and most curly and international quote pairs work.',
      'Arguments are inserted into your tag as text, so if someone types a `|` it can be read as a separator by the function it ends up in. `{argsafe}` and `{argssafe}` work like `{arg}` and `{args}` but escape any `|` first.',
      'When one tag runs another with `{tag:id|arguments}`, the inner tag gets its own arguments, and the outer tag\'s arguments are restored when it finishes.',
    ].join('\n\n'),
    examples: [
      {
        code: '.tag create rate {arg} is a {range:1|10}/10',
        result: 'Creates a tag that rates its first argument.',
      },
      {
        code: '.tag rate "pizza with pineapple"',
        result: 'pizza with pineapple is a 7/10',
      },
      {
        code: 'You gave {argslen} arguments, the last one was {arg:-1}',
        result: 'With arguments `a b c`: You gave 3 arguments, the last one was c',
      },
    ],
  },

  {
    id: 'variables-and-storage',
    title: 'Variables and storage',
    body: [
      'Variables let a tag remember values while it runs. `{set:name|value}` stores a value and `{get:name}` reads it back. `{get:name|fallback}` returns the fallback when the variable was never set, and `{delete:name}` removes it. Values are trimmed when stored.',
      'Variables only last for a single run of the tag (and any button clicks on that same message). A tag can have up to 100 variables, names can be up to 64 characters, and values longer than 1 MB are cut off.',
      'Names starting with `__` are reserved for the engine\'s own private variables, so they cannot be set or deleted, though some can be read with `{get}`: `{get:__args}` gives the parsed arguments as a JSON array, `{get:__argsString}` the arguments exactly as typed, and `{get:__files}` a JSON list (filename and description) of the files attached to the reply so far.',
      'To keep data between runs, use persistent storage. There are four scopes, each with its own set, get and delete functions: user (`{setuser}`, `{getuser}`, `{deleteuser}`) is separate for every person, channel (`{setchannel}`...) for every channel, server (`{setserver}`...) for every server (in DMs, the DM channel counts as the server), and global (`{setglobal}`, `{getglobal}`) is shared by everyone who uses the tag anywhere.',
      'Storage belongs to the tag, so two different tags never see each other\'s data, while aliases of a tag share it. Storage only works when running a saved tag. Storage keys can be up to 128 characters and values up to 16,384 characters. Each scope holds at most 5 keys; saving a 6th errors, and saving an empty value deletes a key. `{variablesuser}`, `{variableschannel}`, `{variablesserver}` and `{variablesglobal}` return a scope\'s stored keys and values as JSON.',
      'Code run from a tag (Python, Node.js and Lua) can read and change variables and storage too, through the `discord` object. Code also has access to blobs: one larger value per scope (user, channel, server and global), up to 256 KB each, that only code can read and write. The same 5-keys-per-scope limit applies whether storage is written by `{setuser}` and friends or from code. See "The `discord` object" for the details.',
      'In short: variables hold up to 1 MB each and are cleared after every run, storage values hold up to 16,384 characters each and are kept between runs, and blobs hold up to 256 KB each and are kept between runs.',
    ].join('\n\n'),
    examples: [
      {
        code: '{set:food|pizza}I love {get:food}!',
        result: 'I love pizza!',
      },
      {
        code: '{setuser:count|{math:{getuser:count|0}+1}}You have used this tag {getuser:count} times.',
        result: 'You have used this tag 5 times.',
      },
      {
        code: 'Hi {get:nickname|stranger}',
        result: 'Hi stranger',
      },
    ],
  },

  {
    id: 'conditions',
    title: 'Conditions',
    body: [
      '`{if:value|operator|value|then:...|else:...|finally:...}` compares two values and runs the matching branch. `then:`, `else:` and `finally:` can come in any order and any of them can be left out (at least one is needed). Only the branch that matches is evaluated; `finally:` is always evaluated afterwards and added after it.',
      'Both values are evaluated first, then compared. Write the operator with no spaces around it (`|=|`, not `| = |`), otherwise it is not recognised and the whole `{if}` is output as text. Spaces left around the values also count as part of them.',
      '`=` and `!=` compare text exactly, including upper and lower case. `>`, `>=`, `<` and `<=` compare numbers (decimals are fine, and an empty value counts as 0); if either value is not a number, the comparison is false. `~` is a loose equals: numbers are compared by value, so `1.50` matches `1.5`, and anything else is compared as text ignoring case, so `Yes` matches `yes`. `?` treats the second value as a regex and checks if it matches anywhere in the first value, ignoring case (use `^` and `$` to match the whole thing, and `\\|` for a literal `|` in the regex).',
      'For combining checks, `{and:a|b|c}` runs each part in order and stops at the first one that comes out empty. If none are empty it outputs the last part. `{or:a|b|c}` outputs the first part that is not empty. Both run left to right and skip the rest once they have an answer. With a single part (no `|`), `{or}` simply evaluates and outputs it.',
    ].join('\n\n'),
    table: {
      columns: ['Operator', 'Meaning', 'Compares'],
      rows: [
        ['=', 'Equal', 'Text, exact match'],
        ['!=', 'Not equal', 'Text, exact match'],
        ['>', 'Greater than', 'Numbers'],
        ['>=', 'Greater than or equal', 'Numbers'],
        ['<', 'Less than', 'Numbers'],
        ['<=', 'Less than or equal', 'Numbers'],
        ['~', 'Loosely equal', 'Numbers by value, otherwise text ignoring case'],
        ['?', 'Regex match', 'Text, against the regex in the second value, ignoring case'],
      ],
    },
    examples: [
      {
        code: '{if:{arg}|~|yes|then:Great!|else:Oh no...}',
        result: 'With argument `YES`: Great!',
      },
      {
        code: '{if:{range:1|100}|>|90|then:Critical hit!|else:You hit.}',
        result: 'Critical hit! (about 1 in 10 times)',
      },
      {
        code: '{or:{get:nickname}|{user}}',
        result: 'The saved nickname, or your username if none is set.',
      },
    ],
  },

  {
    id: 'code-execution',
    title: 'Running code',
    body: [
      'Tags can run real code in a sandbox: use a programming language as the function name, like `{python:print("hi")}` or `{js:console.log(1 + 1)}`. Whatever the program prints is added to the tag\'s output at that spot, so code and normal TagScript can be mixed freely.',
      'The code can also be wrapped in a ``` code block inside the function (`{python:```py ... ```}`). The language written after the opening backticks is ignored; the function name decides the language. An empty function does nothing.',
      'Language names are not case sensitive, and the internal names work too (`{node:...}`, `{golang:...}`, `{c_plus_plus:...}`). A specific version can be requested after a dash, like `{python-3.12:...}` or `{node-24.5.0:...}`; without one, the default version is used.',
      'Each code run counts as one network request (files loaded with `load` lines do not cost extra). Other tags cannot be run from inside code: a `{tag}` inside a code function is left as plain text.',
      'The table lists every language and the names you can call it by. Python, Node.js and Lua also get a ready-made `discord` object with the tag\'s context, variables and storage (see "The `discord` object" below).',
    ].join('\n\n'),
    table: {
      columns: ['Language', 'Names you can use', 'Notes'],
      rows: [
        ['Bash', 'bash, sh, zsh', 'ffmpeg and ImageMagick are installed.'],
        ['Brainfuck', 'brainfuck, bf', ''],
        ['C', 'c, c(gcc), h', ''],
        ['C++', 'c++, cpp, c++(gcc), h++, hpp, cxx, hxx, cc, hh', ''],
        ['CoffeeScript', 'coffeescript, coffee, cson, iced', ''],
        ['COW', 'cow', ''],
        ['D', 'd', ''],
        ['Dart', 'dart', ''],
        ['Deno', 'deno', 'No `discord` object.'],
        ['Elixir', 'elixir, ex', ''],
        ['Emojicode', 'emojicode, emoji', ''],
        ['Erlang', 'erlang, erl', ''],
        ['Fortran', 'fortran, fort, f90, f95', ''],
        ['gojq', 'gojq', ''],
        ['Go', 'go, golang', ''],
        ['Java', 'java, jsp', ''],
        ['LOLCODE', 'lolcode, lol', ''],
        ['Lua', 'lua', 'Lua 5.4 with dkjson and base64. Has the `discord` object.'],
        ['NASM (32-bit)', 'nasm, nasm32, asm, assembly', ''],
        ['NASM (64-bit)', 'nasm64, asm64, assembly64', ''],
        ['Node.js', 'javascript, js, node.js, node, jsx', 'Versions 22.18.0 (default) and 24.5.0. Has the `discord` object.'],
        ['PHP', 'php', ''],
        ['Prolog', 'prolog, pro', ''],
        ['Python 3', 'python, python3, py, py3', 'Versions 3.9.16, 3.11.6 (default) and 3.12.0. Has the `discord` object.'],
        ['Python 2', 'python2, python2.7, py2.7, py2', 'Version 2.7.18. Has the `discord` object.'],
        ['Ruby', 'ruby, rb', ''],
        ['Rust', 'rust, rs', ''],
        ['Swift', 'swift', ''],
        ['TypeScript', 'typescript, ts', 'Same packages as Node.js, but no `discord` object.'],
      ],
    },
    examples: [
      {
        code: '{python:print("Hello from Python, {user}!")}',
        result: 'Hello from Python, cake!',
      },
      {
        code: '{js:console.log(Math.round(Math.random() * 100))} is your score',
        result: '42 is your score',
      },
      {
        code: '{python-3.12:import sys; print(sys.version.split()[0])}',
        result: '3.12.0',
      },
    ],
  },

  {
    id: 'code-tagscript-first',
    title: 'TagScript inside code runs first',
    body: [
      'Before your code is sent to the sandbox, the whole argument is evaluated as TagScript. That is handy, because `{python:print("{user}")}` prints your username, but it also means every `{...}` in your code is read as a possible TagScript function.',
      'Curly brackets are everywhere in code: Python dicts, sets and f-strings, JavaScript objects, blocks and `${}` templates, and the bodies of C, Java, Rust and Go functions. If the text inside the brackets happens to match a function name (`{name}`, `{id}`, `{user}`, `{text}`, `{e}`, `{pi}`, `{args}`...) it gets replaced, and the program breaks in confusing ways. Brackets that do not match a function name are left alone, but anything inside them is still evaluated and can use up the iteration limit.',
      'The fix is to wrap the code in `{ignore:...}`, which passes it through exactly as written. You can keep the TagScript parts you want outside of the `{ignore}`, for example `load` lines or a value you insert at the top. The brackets inside `{ignore}` still have to balance, so a lone `{` inside a string should be written another way (like `chr(123)` in Python).',
      'To pass user input into code safely, insert it with `{jsonify:...}`. It turns any text into a quoted, escaped string literal that is valid in both Python and JavaScript, so quotes or newlines in the input cannot break your code.',
    ].join('\n\n'),
    examples: [
      {
        code: '{js:{ignore:const data = {a: 1, b: [1, 2]}; console.log(JSON.stringify(data));}}',
        result: '{"a":1,"b":[1,2]}',
      },
      {
        code: [
          '{python:name = {jsonify:{args}}',
          '{ignore:print(f"Hello {name}, your name has {len(name)} letters")}}',
        ].join('\n'),
        result: 'With arguments `Ana "the great"`: Hello Ana "the great", your name has 15 letters',
      },
      {
        code: '{python:name = "Bob"; print(f"Hi {name}")}',
        result: 'Hi cake (not Bob): `{name}` is a TagScript function, so it was replaced with your username before Python ran. Wrapping the code in `{ignore}` fixes it.',
      },
    ],
  },

  {
    id: 'code-environment',
    title: 'What code can use',
    body: [
      'Every run starts in a fresh, empty sandbox with its working folder at `/home/notsocoder`. Nothing is kept between runs except what you save through the `discord` object\'s storage, blobs and variables.',
      'Code has internet access, limited to about 20 Mbps and 3 requests per second, so it can call web APIs (for example with `requests` in Python or `fetch` in Node.js). A run can take about 15 seconds before it is stopped, a bit longer for premium users.',
      'The command line tools `ffmpeg`, `ffprobe` and ImageMagick are installed for every language, so even a `{bash}` tag can convert media. The packages in the table below come preinstalled; nothing else can be installed.',
      'Anything a program writes to its error output (stderr) stops the tag with that text as the error, even if it is only a warning. Silence warnings or log to stdout instead. The one exception is ffmpeg, which prints its version banner to stderr even when it works: if the error output starts with that banner or mentions `Input`, the tag carries on as long as the program produced output files. Passing `-hide_banner -loglevel error` to ffmpeg avoids the problem entirely.',
    ].join('\n\n'),
    table: {
      columns: ['Language', 'Third-party packages'],
      rows: [
        ['Python 3', 'numpy, scipy, pandas, whoosh, bcrypt, passlib, sympy, pillow, wand, aiohttp, requests, ffmpeg-python, beautifulsoup4, matplotlib, yfinance, moviepy, networkx, opencv-python, primp, pydub, numba, redis'],
        ['Python 2', 'numpy, scipy, pycrypto, whoosh, bcrypt, passlib, requests'],
        ['Node.js, TypeScript', 'jssoup, mathjs, imagescript, sharp, node-fetch, undici, redis, canvas'],
        ['Lua', 'dkjson, base64'],
      ],
    },
    examples: [
      {
        code: [
          '{python:import requests',
          'r = requests.get("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd")',
          'print("Bitcoin is $" + str(r.json()["bitcoin"]["usd"]))}',
        ].join('\n'),
        result: 'Bitcoin is $67000',
      },
      {
        code: [
          '{python:{ignore:import warnings',
          'warnings.filterwarnings("ignore")',
          'import pandas as pd',
          'print(pd.Series([3, 1, 2]).sort_values().tolist())}}',
        ].join('\n'),
        result: '[1, 2, 3] (warnings are silenced so they cannot stop the tag)',
      },
    ],
  },

  {
    id: 'code-output',
    title: 'What code sends back',
    body: [
      'Text printed to stdout is added to the tag\'s output, with surrounding whitespace trimmed. Printed text up to 16,000 characters is checked for JSON (embeds, components, pages); longer text is always added as plain text. The finished message is still cut to the normal message length.',
      'If the program prints a single JSON object, a few keys are turned into real message parts instead of text:',
      '- `embed` (one embed object) and `embeds` (a list of them) add embeds, up to 10 in total.\n- `components` (a list of buttons, select menus or action rows, in the same format as `{componentjson}`) adds components; an optional `componentsOnTimeout` string is TagScript to run when they expire.\n- `pages` adds paginator pages in the same format as `{pagejson}`, but only when it is the object\'s only key.',
      'When the JSON has `embed`, `embeds` or `components`, none of the printed text is shown, and other keys (like `content`) are ignored. Print a normal line of text, or use `{embedjson}` outside the code, if you need both.',
      'Files the program saves into `/home/notsocoder/output` (or `./output`) are attached to the reply, up to 10 per run. Files larger than the channel\'s upload limit are skipped, and the reply as a whole can still only carry 10 attachments. Output images and videos go through the same content filter as other media, so NSFW results are blocked outside NSFW channels. These files can be passed on to later code, `{ai}` or MediaScript with `load FILE_X` (see "Loading files with `load`").',
    ].join('\n\n'),
    examples: [
      {
        code: [
          '{python:{ignore:import json',
          'print(json.dumps({"embed": {"title": "Hello from Python", "color": 5793266}}))}}',
        ].join('\n'),
        result: 'A blurple embed titled "Hello from Python" (the JSON itself is not shown).',
      },
      {
        code: [
          '{python:{ignore:import matplotlib',
          'matplotlib.use("Agg")',
          'import matplotlib.pyplot as plt',
          'plt.plot([1, 4, 2, 5])',
          'plt.savefig("/home/notsocoder/output/chart.png")}}',
        ].join('\n'),
        result: 'A line chart attached as chart.png.',
      },
      {
        code: '{bash:seq 1 5000 > ./output/numbers.txt; echo done}',
        result: 'done, with numbers.txt attached.',
      },
    ],
  },

  {
    id: 'code-discord-object',
    title: 'The `discord` object',
    body: [
      'In Python (3 and 2), Node.js (JavaScript) and Lua, a global `discord` object holds the context of the tag run. In Python it is a dict (`discord["user"]["id"]`), in Node.js an object (`discord.user.id`) and in Lua a table (`discord.user.id`). Deno, TypeScript and the other languages do not get it.',
      'Most fields are read-only snapshots: changing them does nothing. Only `variables`, `storage` and `blobs` are written back when the program exits normally. In Node.js that happens on the `beforeExit` event, so calling `process.exit()` or crashing skips saving; in Python it happens at exit, so `os._exit()` skips it. Changing the working folder can also stop the save from being found.',
      '`variables` contains the tag\'s variables at the moment the code started (including private ones like `__args` and `__files`). After the run, every key that does not start with `__` is set as a TagScript variable, converted to text and cut to 1 MB, following the usual variable rules (names up to 64 characters, up to 100 variables). Removing a key in code does not delete the TagScript variable; use `{delete}` for that.',
      '`storage` holds the tag\'s persistent storage for the current `user`, `channel`, `server` and `global` scopes, the same data `{getuser}`, `{getchannel}`, `{getserver}` and `{getglobal}` read. Each scope is written back as a whole: keys you delete are removed, and setting a scope to `{}` (or `None`/`null` in Python and Node.js) clears it. Values are saved as text: a number `5` becomes `"5"`, and a dict, list or object is saved as its JSON text (parse it again when you read it back).',
      'Storage written from code has extra rules: each scope can hold at most 5 keys, keys can be up to 128 characters and values up to 16,384 characters. Breaking one stops the tag with an error. `{setuser}` and friends enforce the same 5-key limit, so storage written outside code can never block a code run. Empty values do not count toward the limit.',
      '`blobs` hold one larger value per scope (`user`, `channel`, `server`, `global`), up to 256 KB each, and can only be used from code. A blob arrives as `bytes` in Python, a `Buffer` in Node.js and a string in Lua, or as `None`/`null` when empty. You can assign bytes, a string, or any other value (which is saved as JSON text); set it to `None`/`null` to clear it. In Lua, setting a blob or storage scope to `nil` keeps the old value, so assign an empty string or table instead.',
      'Storage and blobs only exist when running a saved tag. Aliases share their main tag\'s data. When code runs outside a saved tag, both start empty and changes are thrown away.',
    ].join('\n\n'),
    table: {
      columns: ['Field', 'What it holds', 'Writable'],
      rows: [
        ['user', 'The user who ran the tag (id, username, avatar...).', 'No'],
        ['member', 'That user\'s server member data (nick, roles, joined_at...). Null outside servers.', 'No'],
        ['channel / channel_id', 'The channel the tag ran in, and its id.', 'No'],
        ['guild / guild_id', 'The server and its id. Null in DMs. On servers with more than 10,000 members, only the bot, the user and members in voice are included.', 'No'],
        ['message', 'The message that ran the tag. Null for slash commands and button clicks.', 'No'],
        ['tag', 'The saved tag: id, name, content, uses, nsfw, locked, created, edited, user (the owner) and more. Null outside saved tags.', 'No'],
        ['user_bot / member_bot', 'The bot\'s own user and member data.', 'No'],
        ['variables', 'The tag\'s variables. Keys not starting with `__` are copied back as TagScript variables.', 'Yes'],
        ['storage', '`user`, `channel`, `server` and `global` objects of persistent key/value storage.', 'Yes'],
        ['blobs', '`user`, `channel`, `server` and `global` binary values, up to 256 KB each.', 'Yes'],
      ],
    },
    examples: [
      {
        code: '{python:discord["variables"]["lucky"] = 7}Your lucky number is {get:lucky}',
        result: 'Your lucky number is 7',
      },
      {
        code: [
          '{python:{ignore:s = discord["storage"]["user"]',
          's["runs"] = str(int(s.get("runs", "0")) + 1)',
          'print("You have run this tag", s["runs"], "times")}}',
        ].join('\n'),
        result: 'You have run this tag 3 times (the count is the same one `{getuser:runs}` reads)',
      },
      {
        code: [
          '{python:{ignore:import json',
          'raw = discord["blobs"]["global"]',
          'ids = json.loads(raw) if raw else []',
          'if discord["user"]["id"] not in ids:',
          '    ids.append(discord["user"]["id"])',
          'discord["blobs"]["global"] = json.dumps(ids)',
          'print(len(ids), "different people have used this tag")}}',
        ].join('\n'),
        result: '12 different people have used this tag',
      },
      {
        code: '{js:{ignore:console.log(`${discord.user.username} is in #${discord.channel.name}`)}}',
        result: 'cake is in #general',
      },
    ],
  },

  {
    id: 'code-files',
    title: 'Files in code',
    body: [
      'Files you hand to the program with `load` lines (explained in the next section) are saved in `/home/notsocoder/input` (also reachable as `./input`), using the filename you gave or the one from the download. Filenames are cleaned up, so spaces and unusual characters may be replaced. Up to 10 files can be loaded into one run.',
      'Each loaded file\'s full path is also put in an environment variable: `FILE_1`, `FILE_2` and so on. Read it with `os.environ["FILE_1"]` in Python, `process.env.FILE_1` in Node.js or `$FILE_1` in Bash. This numbering only counts the files loaded into this one run, and it is separate from the `FILE_X` numbers used in `load` lines.',
      'The environment variables are numbered with files reused from earlier in the tag (`load FILE_X`) first, then files downloaded from web URLs, each group in the order of its `load` lines. If you only load one kind, that is simply the order of the lines. When mixing both, giving each file a name and opening it from `/home/notsocoder/input/NAME` avoids any confusion.',
      'Anything saved to `/home/notsocoder/output` (or `./output`) is attached to the reply when the program ends. Do not try to `{attach}` those paths; they only exist inside the sandbox.',
    ].join('\n\n'),
    examples: [
      {
        code: [
          '{python:load {avatar} avatar.png',
          '{ignore:import os',
          'print(os.environ["FILE_1"], os.path.getsize(os.environ["FILE_1"]), "bytes")}}',
        ].join('\n'),
        result: '/home/notsocoder/input/avatar.png 48213 bytes',
      },
      {
        code: [
          '{bash:load {iv}',
          'ffmpeg -hide_banner -loglevel error -i "$FILE_1" -vf negate "./output/$(basename "$FILE_1")"}',
        ].join('\n'),
        result: 'The last image or video in chat with its colors inverted.',
      },
    ],
  },

  {
    id: 'loading-files',
    title: 'Loading files with `load`',
    body: [
      'Code, `{ai}` and MediaScript can all be given files by starting their content with `load` lines. In code and `{ai}`, the line is `load URL` or `load URL FILENAME`; in MediaScript it is `load URL MEDIA_KEY`, where the third word names the media inside the script.',
      'The rules for code and `{ai}`:',
      '- Put one `load` line per file at the very top, before any other code or text. Blank lines between them are fine.\n- The first line that is not a `load` line ends the list, and everything from there on is your code or prompt. A `load` line further down is just treated as code.\n- The URL cannot contain spaces, and anything after `##` on a `load` line is a comment. `load` is not case sensitive.\n- The URL is usually TagScript, like `{image}`, `{avatar}` or `{iv}`, which is filled in before the code runs.\n- Give each file a different name: two `load` lines with the same filename keep only the last one.',
      'Instead of a web URL you can write `FILE_X` to reuse a file that this run of the tag already produced: anything added by `{attach}`, `{attachtext}`, `{mediascript}`, or files written by earlier code. `FILE_1` is the first file currently attached to the reply, `FILE_2` the second, and so on, in the order they were added. `{get:__files}` shows the current list if you are unsure.',
      '`FILE_X` moves the file: it is handed over and removed from the reply\'s attachments, which is what you want when the file was only an in-between step. `FILE_X_COPY` hands over a copy and leaves the original attached. A file loaded with `FILE_X` keeps its filename unless you give a new one.',
      'Because `FILE_X` removes files, the numbers of the files after it move down once the function finishes. If the reply has files 1, 2 and 3 and code loads `FILE_1`, the old file 2 is `FILE_1` for the next function. Within a single function all the numbers refer to the list as it was before that function started, so `load FILE_1` and `load FILE_2` together grab the first two files. New output files are added to the end of the list.',
      'In MediaScript, `FILE_X` and `FILE_X_COPY` work the same way but are replaced anywhere in the script, not only in `load` lines.',
    ].join('\n\n'),
    table: {
      columns: ['Write', 'What happens'],
      rows: [
        ['load https://...', 'Downloads the URL and passes it in (named after the download).'],
        ['load https://... name.png', 'Same, saved as name.png.'],
        ['load FILE_2', 'Passes in the 2nd file attached so far and removes it from the reply.'],
        ['load FILE_2_COPY', 'Passes in the 2nd file attached so far and keeps it in the reply.'],
        ['load FILE_2 new.png', 'Moves the 2nd file in, renamed to new.png.'],
      ],
    },
    examples: [
      {
        code: [
          '{python:load {image} input.png',
          '{ignore:import os',
          'from PIL import Image, ImageOps',
          'img = Image.open(os.environ["FILE_1"]).convert("RGB")',
          'ImageOps.invert(img).save("/home/notsocoder/output/inverted.png")',
          'print("Inverted!")}}',
        ].join('\n'),
        result: 'Inverted! with the last image in chat attached as inverted.png, colors inverted.',
      },
      {
        code: [
          '{python:load {avatar} left.png',
          'load {avatar:{arg}} right.png',
          '{ignore:from PIL import Image',
          'a = Image.open("/home/notsocoder/input/left.png").convert("RGBA").resize((256, 256))',
          'b = Image.open("/home/notsocoder/input/right.png").convert("RGBA").resize((256, 256))',
          'out = Image.new("RGBA", (512, 256))',
          'out.paste(a, (0, 0))',
          'out.paste(b, (256, 0))',
          'out.save("/home/notsocoder/output/versus.png")}}',
        ].join('\n'),
        result: 'With argument `@friend`: your avatar and your friend\'s side by side.',
      },
      {
        code: [
          '{ai:load {image}',
          'Describe this image in one short sentence.}',
        ].join('\n'),
        result: 'The AI\'s description of the last image in chat (uses your one `{ai}` call).',
      },
      {
        code: [
          '{mediascript:load {iv} media',
          'invert media',
          'render media image/png}',
          '{python:load FILE_1 inverted.png',
          '{ignore:from PIL import Image',
          'img = Image.open("/home/notsocoder/input/inverted.png")',
          'print(f"The inverted image is {img.width}x{img.height}")}}',
        ].join('\n'),
        result: 'The inverted image is 512x512. The MediaScript result was moved into Python, so it is not attached.',
      },
      {
        code: [
          '{python:{ignore:from PIL import Image',
          'Image.new("RGB", (256, 256), "red").save("/home/notsocoder/output/red.png")}}',
          '{mediascript:load FILE_1 square',
          'spin square',
          'render square}',
        ].join('\n'),
        result: 'Python makes a red square, MediaScript spins it, and only the spinning GIF is sent.',
      },
      {
        code: [
          '{attach:https://example.com/cat.png|cat.png}',
          '{python:load FILE_1_COPY',
          '{ignore:import os',
          'print("cat.png is", os.path.getsize(os.environ["FILE_1"]), "bytes")}}',
        ].join('\n'),
        result: 'cat.png is 20480 bytes, with cat.png still attached because of `_COPY`.',
      },
    ],
  },

  {
    id: 'settings',
    title: 'Settings',
    body: [
      '`{settings:SETTING|value}` changes how the rest of the tag behaves. Setting names are not case sensitive. Settings only affect the current run and apply to functions that run after them, so put them at the start of the tag.',
      'Spaces around the setting and value are ignored, and an empty value clears a setting. An unknown setting name, or a call without exactly one `|`, is left in the output as text.',
    ].join('\n\n'),
    table: {
      columns: ['Setting', 'Value', 'What it does'],
      rows: [
        ['AI_MODEL', 'A model name, e.g. ANTHROPIC_CLAUDE_HAIKU_5_5', 'Which model `{ai}` uses. An unknown model gives an error listing the valid choices.'],
        ['AI_PERSONALITY', 'Any text', 'The personality `{ai}` uses instead of your saved one.'],
        ['ALLOW_COMPONENT_EXECUTIONS_FROM_EVERYONE', 'true or false', 'Lets anyone use the tag\'s buttons and select menus. By default only the person who ran the tag can.'],
        ['DISPLAY_MEDIA_AS_NATIVE', 'true or false', 'By default, a reply that is only one file (or only one nsb.gg link) is shown like a media command\'s reply, with its size and who ran it. `true` sends it as a plain Discord attachment or link instead.'],
        ['MEDIA_AV_FALLBACK', 'SEARCH_YOUTUBE or search.youtube (or an alias like s.yt)', 'When `{transcribe}` finds no audio or video, search YouTube with its argument instead.'],
        ['MEDIA_IV_FALLBACK', 'MEDIA_IMAGE_IMAGINE, SEARCH_GOOGLE_IMAGES or SEARCH_DUCK_DUCK_GO_IMAGES (or the function names, like imagine, and their aliases)', 'When image functions like `{image}`, `{iv}`, `{ocr}` or `{edit}` find no image, generate one (as a temporary URL) or search for one using the argument instead.'],
        ['ML_IMAGINE_DO_NOT_ERROR', 'true or false', 'Passed to image generation as its "do not error" option.'],
        ['ML_IMAGINE_MODEL', 'FLUX_KLEIN', 'Which model image generation (`{imagine}`, `{edit}`, media scripts) uses.'],
      ],
    },
    examples: [
      {
        code: '{settings:MEDIA_IV_FALLBACK|search.google.images}{image:{args}}',
        result: 'The last image in chat, or a Google Images result for the arguments if there is none.',
      },
      {
        code: '{settings:ML_IMAGINE_MODEL|FLUX_KLEIN}{imagine:a cat in a tuxedo}',
        result: 'An image generated with Flux Klein.',
      },
    ],
  },

  {
    id: 'limits',
    title: 'Limits',
    body: [
      'To keep things fast and fair, every run of a tag has limits. Going over one stops the tag with an error, except for the iteration limit (explained below). These limits are the same for everyone, premium or not (only the time code may run is longer with premium). Each button or select menu click on a tag\'s message starts with fresh limits.',
      'The iteration limit counts how many times the engine parses a piece of text: once for the tag itself and once for every argument that contains a function. When it runs out, the rest of the tag is output as plain text without being evaluated.',
    ].join('\n\n'),
    table: {
      columns: ['Limit', 'Default', 'What it covers'],
      rows: [
        ['Iterations', '450', 'Times text is parsed per run. When it runs out the remaining text is output unevaluated.'],
        ['Network requests', '15', 'Functions that reach the internet: downloads, searches, attachments, code runs, looking up users and so on.'],
        ['AI requests', '1', '`{ai}` calls.'],
        ['Machine learning requests', '5', 'Image generation and editing (`{imagine}`, `{edit}` and their URL versions).'],
        ['Safety checks', '2', '`{nsfwfilter}` calls.'],
        ['API actions', '1', 'Functions that create something, like `{api.create.reminder}`.'],
        ['Tag calls', '2', 'Other tags run with `{tag}`.'],
        ['Component runs', '2', 'Times the tag can run again from button clicks, select menus or `{componentsontimeout}`.'],
        ['Attachments', '10', 'Files attached to the reply.'],
        ['Embeds', '10', 'Embeds in the reply.'],
        ['Pages', '1,000', 'Pages added with `{pagejson}` or from code.'],
        ['Variables', '100', 'Variables set during one run.'],
        ['Variable name length', '64 characters', 'Length of a variable\'s name.'],
        ['Variable value length', '1 MB', 'Longer values are cut off.'],
        ['Storage key length', '128 characters', 'Length of a persistent storage key.'],
        ['Storage value length', '16,384 characters', 'Length of a persistent storage value.'],
        ['Storage keys per scope', '5', 'Keys a scope (user, channel, server, global) may hold per tag, from set functions or code. Empty values do not count.'],
        ['Blob size', '256 KB', 'Size of each scope\'s blob, written from code.'],
        ['Code run time', 'About 15 seconds', 'How long one code run can take before it is stopped; longer for premium.'],
        ['Code output JSON check', '16,000 characters', 'Printed output longer than this is never read as embed, component or page JSON, only as text.'],
        ['Files loaded into code', '10', 'Files from `load` lines in one code run.'],
        ['Files from code', '10', 'Files saved to the output folder in one run (the reply still holds 10 attachments in total).'],
        ['Code network', '20 Mbps', 'Internet speed inside the sandbox, at about 3 requests per second.'],
        ['AI prompt length', '12,000 characters', 'Longer `{ai}` prompts are cut off.'],
        ['Regex time', '25 ms', 'How long `{replace}` can spend on a regular expression.'],
        ['Loop size', '200', 'Items `{foreach}` can loop over.'],
      ],
    },
  },

  {
    id: 'output',
    title: 'Output',
    body: [
      'When the tag finishes, all the text it produced is trimmed and sent as the message. Text is cut to 2,000 characters (or 4,000 when the message uses the newer component layouts). `{newline}` breaks survive this trimming.',
      'Files added with `{attach}` (and files written by code) are sent as attachments, up to 10. Embeds from `{embedjson}` are sent along with the text, also up to 10. If the tag produces nothing at all, the bot replies with "Tag returned no content".',
      'Buttons and select menus can be added with `{componentjson}`. Give a button or select menu a `run` field containing TagScript, and that code runs when it is clicked, keeping the same variables. The JSON itself is evaluated when the component is created, so wrap the `run` code in `{ignore:...}` if it should only run on click. Select menu choices are available as JSON in `{get:__values}`. A message can have up to 5 action rows or up to 25 loose buttons, but not both. Components stop working after one minute, and `{componentsontimeout:...}` can run TagScript when that happens.',
      'Pages from `{pagejson}` turn the reply into a paginator you can flip through. When a tag has pages, the reply is made only of those pages, and other text and embeds are not shown. Pages cannot be added from a button click.',
      'Before sending, the text, embeds and components are checked by a content filter, and a message with 150 or more line breaks is replaced with a spam notice. While running, a tag\'s text also cannot grow past the channel\'s upload size limit.',
    ].join('\n\n'),
    examples: [
      {
        code: '{embedjson:{"title": "Hello {user}", "color": 16711680}}',
        result: 'A red embed titled "Hello cake".',
      },
      {
        code: '{attach:https://example.com/cat.png|kitty.png}Look at this cat!',
        result: 'The text "Look at this cat!" with the image attached as kitty.png.',
      },
      {
        code: '{componentjson:{"type": 2, "style": 1, "label": "Roll", "run": "You rolled {ignore:{range:1|6}}"}}',
        result: 'A "Roll" button that rolls a new number every time it is clicked.',
      },
    ],
  },

  {
    id: 'errors',
    title: 'Errors',
    body: [
      'When a function fails (for example a download that does not work, a limit being reached, or setting a variable that starts with `__`), the whole tag stops and the bot replies with a "Command Error" message explaining what went wrong. Nothing else from the tag is sent.',
      'Not every mistake is an error. Unknown function names, and functions given arguments they cannot use, are left in the output as plain text, which makes typos easy to spot.',
      'To handle errors yourself, `{iferror:a|b|c}` tries each part in order and outputs the first one that does not fail (inside a later part, `{get:error}` is the message of the error before it), and `{evalsilent:...}` runs its contents and simply drops any error. To stop a tag on purpose, `{exit:message}` throws away everything produced so far and sends only the message, while `{exitsilent:message}` stops but keeps what was already produced. An exit inside `{iferror}` or `{evalsilent}` is not caught: it still stops the whole tag.',
    ].join('\n\n'),
    examples: [
      {
        code: '{iferror:{attach:{arg}}|That link didn\'t work!}',
        result: 'Attaches the file, or says "That link didn\'t work!" if it can\'t be downloaded.',
      },
      {
        code: '{iferror:{attach:{arg}}|Failed: {get:error}}',
        result: 'Attaches the file, or says why it couldn\'t be downloaded.',
      },
      {
        code: '{if:{argslen}|=|0|then:{exit:Please give me something to rate!}}Rating {args}...',
        result: 'With no arguments: Please give me something to rate!',
      },
    ],
  },
];
