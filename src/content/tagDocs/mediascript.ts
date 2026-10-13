// MediaScript reference, rewritten for tag authors from notsobot.api/api/prompt.txt ("MediaScript Instructions").
// Defaults and ranges are cross-checked against notsobot.api/api/apis/mediascript/mediascript.py (+ structures.py)
// and the TagScript side in notsobot.ts/src/utils/tags/index.ts (MEDIASCRIPT, MEDIASCRIPT_URL, MEDIASCRIPT_MAYBE_URL).

import type {
  TagDocGuideSection,
  TagDocMediaScriptArgument,
  TagDocMediaScriptCategoryId,
  TagDocMediaScriptCommand,
} from './types';


const MIMETYPES = [
  'audio/aac', 'audio/flac', 'audio/mp3', 'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/x-matroska',
  'image/avif', 'image/bmp', 'image/gif', 'image/heic', 'image/heif', 'image/jpeg', 'image/png', 'image/tiff', 'image/webp', 'image/x-apng',
  'video/mp4', 'video/mpeg', 'video/quicktime', 'video/webm', 'video/x-m4v', 'video/x-matroska', 'video/x-msvideo', 'video/x-ms-wmv',
];

const RESIZE_KERNELS = 'NEAREST, BILINEAR, BICUBIC, MITCHELL, CATMULL_ROM, LANCZOS_2, LANCZOS_3, SPLINE_16, SPLINE_36, SPLINE_64';

const TTS_VOICES: Array<[string, string]> = [
  ['TIKTOK_EN_US_FEMALE_01', 'English (US), female. The default voice.'],
  ['TIKTOK_EN_US_FEMALE_02', 'English (US), female'],
  ['TIKTOK_EN_US_MALE_01', 'English (US), male'],
  ['TIKTOK_EN_US_MALE_02', 'English (US), male'],
  ['TIKTOK_EN_US_MALE_03', 'English (US), male'],
  ['TIKTOK_EN_US_MALE_04', 'English (US), male'],
  ['TIKTOK_EN_UK_MALE_01', 'English (UK), male'],
  ['TIKTOK_EN_UK_MALE_02', 'English (UK), male'],
  ['TIKTOK_EN_AU_FEMALE', 'English (Australia), female'],
  ['TIKTOK_EN_AU_MALE', 'English (Australia), male'],
  ['TIKTOK_EN_FEMALE_EMOTIONAL', 'English, female, emotional'],
  ['TIKTOK_EN_SING_FEMALE_WARMY_BREEZE', 'English, female, singing'],
  ['TIKTOK_EN_MALE_FUNNY', 'English, male, funny'],
  ['TIKTOK_EN_MALE_NARRATION', 'English, male, story narrator'],
  ['TIKTOK_EN_SING_MALE_SUNSHINE_SOON', 'English, male, singing'],
  ['TIKTOK_EN_US_DISNEY_C3PO', 'Character: C-3PO'],
  ['TIKTOK_EN_US_DISNEY_CHEWBACCA', 'Character: Chewbacca'],
  ['TIKTOK_EN_US_DISNEY_GHOSTFACE', 'Character: Ghostface'],
  ['TIKTOK_EN_US_DISNEY_ROCKET', 'Character: Rocket'],
  ['TIKTOK_EN_US_DISNEY_STITCH', 'Character: Stitch'],
  ['TIKTOK_EN_US_DISNEY_STORMTROOPER', 'Character: Stormtrooper'],
  ['TIKTOK_BR_FEMALE_01', 'Portuguese (Brazil), female'],
  ['TIKTOK_BR_FEMALE_02', 'Portuguese (Brazil), female'],
  ['TIKTOK_BR_FEMALE_03', 'Portuguese (Brazil), female'],
  ['TIKTOK_BR_MALE_01', 'Portuguese (Brazil), male'],
  ['TIKTOK_DE_FEMALE_01', 'German, female'],
  ['TIKTOK_DE_MALE_01', 'German, male'],
  ['TIKTOK_ES_MALE_01', 'Spanish, male'],
  ['TIKTOK_ES_MX_MALE_01', 'Spanish (Mexico), male'],
  ['TIKTOK_FR_MALE_01', 'French, male'],
  ['TIKTOK_FR_MALE_02', 'French, male'],
  ['TIKTOK_ID_FEMALE_01', 'Indonesian, female'],
  ['TIKTOK_JP_FEMALE_01', 'Japanese, female'],
  ['TIKTOK_JP_FEMALE_02', 'Japanese, female'],
  ['TIKTOK_JP_FEMALE_03', 'Japanese, female'],
  ['TIKTOK_JP_MALE_01', 'Japanese, male'],
  ['TIKTOK_KR_FEMALE_01', 'Korean, female'],
  ['TIKTOK_KR_MALE_01', 'Korean, male'],
  ['TIKTOK_KR_MALE_02', 'Korean, male'],
  ['PHONEME_MORSHU', 'Morshu (Zelda CD-i)'],
  ['FLITE_US_FEMALE_STEPHANIE', 'Flite, English (US), female'],
  ['FLITE_US_MALE_ALAN', 'Flite, English (US), male'],
  ['FLITE_US_MALE_KAL', 'Flite, English (US), male'],
  ['FLITE_US_MALE_RICH', 'Flite, English (US), male'],
  ['SAPI_ATT_EN_MALE_MOONMAN', 'Classic SAPI: AT&T "Moonman"'],
  ['SAPI_DECTALK_EN_MALE_MOONBASE_ALPHA', 'Classic SAPI: DECtalk (Moonbase Alpha)'],
  ['SAPI_MICROSOFT_EN_FEMALE_MARY', 'Classic SAPI: Microsoft Mary'],
  ['SAPI_MICROSOFT_EN_MALE_MIKE', 'Classic SAPI: Microsoft Mike'],
  ['SAPI_MICROSOFT_EN_MALE_SAM', 'Classic SAPI: Microsoft Sam'],
  ['SAPI_SCANSOFT_EN_MALE_MLG_DANIEL', 'Classic SAPI: ScanSoft Daniel (MLG)'],
  ['KLATTSCH', 'Formant synthesizer you can steer with ARPABET phonemes, pitch and voice controls. See the Klattsch section.'],
];


function media(description: string = 'the media to change'): TagDocMediaScriptArgument {
  return {name: 'MEDIA_KEY', description};
}


export const MEDIASCRIPT_GUIDE: Array<TagDocGuideSection> = [
  {
    id: 'ms-overview',
    title: 'What is MediaScript?',
    body: [
      'MediaScript is a small scripting language for editing images, GIFs, audio and video inside a tag. You write it inside one of three TagScript functions, and NotSoBot runs it on its media servers and gives you back the finished file.',
      '`{mediascript:CODE}` (also `{mscript}`, `{imagescript}`, `{iscript}`) attaches the result to the tag\'s reply. It counts toward the reply\'s 10 attachments and only works where the tag is allowed to attach files.',
      '`{mediascripturl:CODE}` (also `{mscripturl}`, `{imagescripturl}`, `{iscripturl}`) uploads the result instead and puts its link in the tag\'s text. The link expires after 7 days. Use it when you want to pass the result into something else, like `{attach:}` or an embed image.',
      '`{mediascriptmaybeurl:CODE}` (also `{mscriptmaybeurl}`, `{imagescriptmaybeurl}`, `{iscriptmaybeurl}`) attaches the result when it can, and gives you a link instead when it has to be uploaded (for example when it is too big to attach).',
      'Each MediaScript call counts as one network request toward the tag\'s limit of 15. A script can have at most 300 non-empty lines, and all the media it holds at once must stay under 300 MB.',
      'The rules in one breath: one command per line; the first word is the command and the rest are its arguments, separated by spaces; lines starting with `#` are comments; any text that might contain spaces, new lines or special characters should be wrapped in `{jsonify:...}`.',
    ].join('\n\n'),
    examples: [
      {
        code: '{mediascript:\n# grab the last image or video in chat\nload {iv} img\ninvert img\nrender img}',
        result: 'Attaches an inverted copy of the most recent image or video.',
      },
      {
        code: '{set:url|{mediascripturl:load {avatar} pfp\ndeepfry pfp\nrender pfp}}{embedjson:{"image": {"url": "{get:url}"}}}',
        result: 'Uploads a deepfried avatar and shows it inside an embed.',
      },
    ],
  },

  {
    id: 'ms-media-keys',
    title: 'Media keys, loading and rendering',
    body: [
      'Every piece of media in a script lives under a name you pick, called a media key, like `img`, `pfp` or `background`. `load URL KEY` downloads an image, GIF, audio file or video into that key. Most commands then take the key as their first argument and change that media in place. Commands that make new media (`create`, `tti`, `tts`, `imagine`, `qrcode`, `clone` and friends) store it under the key you give them.',
      'Stick to plain letters (and digits) for keys. Every key automatically gets size variables named after it (see Variables), so a key called `img` gives you `imgw`, `imgh`, `imgd` and `imgfc`.',
      'The URL in `load` is usually a TagScript function such as `{iv}`, `{image}`, `{video}`, `{audio}` or `{avatar}`, but any direct media link works. Add `true` as a third argument (`AUDIO_PRIORITY`) to prefer audio when the link has both.',
      'You can also load files the tag has already attached, like the result of an earlier `{mediascript}`, a `{python}` run or `{attach:}`. `FILE_1` is the tag\'s first attachment so far, `FILE_2` the second, and so on. `FILE_X` takes the file and removes it from the reply\'s attachments; `FILE_X_COPY` uses it and keeps it attached too. TagScript replaces every `FILE_X` in your code before it runs, so avoid writing that word in captions.',
      '`render KEY MIMETYPE` ends the script and sends `KEY` as the result. Anything after `render` is ignored. The mimetype is optional: leave it out (or write `default`) to keep the media\'s current format, or pick one from the table to convert it. You may also add a file name after the mimetype. If a script never calls `render`, the first media key it created is rendered automatically in its own format.',
    ].join('\n\n'),
    table: {
      columns: ['Kind', 'Mimetypes you can render to'],
      rows: [
        ['Audio', MIMETYPES.filter((x) => x.startsWith('audio/')).join(', ')],
        ['Image', MIMETYPES.filter((x) => x.startsWith('image/')).join(', ')],
        ['Video', MIMETYPES.filter((x) => x.startsWith('video/')).join(', ')],
      ],
    },
    examples: [
      {
        code: '{attach:{avatar}}{mediascript:load FILE_1 pfp\nflip pfp\nrender pfp image/png}',
        result: 'Takes the attached avatar (removing it from the reply) and sends a flipped PNG instead.',
      },
      {
        code: '{mediascript:load {video} clip\nrender clip image/gif}',
        result: 'Turns the last video in chat into a GIF.',
      },
    ],
  },

  {
    id: 'ms-arguments',
    title: 'Arguments and equations',
    body: [
      'Arguments are positional: they are read in the order the command lists them, separated by spaces. In this reference `NAME=value` means the argument is optional and `value` is used when you leave it out, `NAME?` means optional with no fixed default, and `...NAME` means "the rest of the line".',
      'Because arguments are positional, to set a later one you have to fill in the earlier ones too. For example, to make `spin` go counter-clockwise without the circle crop you write `spin img false false`.',
      'Yes/no arguments accept `true`, `yes`, `y` or `+` for yes. Anything else counts as no.',
      'Any number can also be an equation, and equations can use variables and functions. Equations must not contain spaces, since a space starts the next argument: write `(imgw/2)-(textw/2)`, not `(imgw / 2) - (textw / 2)`.',
      'Equations support `+`, `-`, `*`, `/`, parentheses and decimal numbers. The engine also understands `%` (remainder) and `^` (power).',
    ].join('\n\n'),
    table: {
      columns: ['Operator', 'Meaning'],
      rows: [
        ['+  -', 'Add, subtract'],
        ['*  /', 'Multiply, divide'],
        ['( )', 'Group parts of an equation'],
        ['%', 'Remainder, e.g. `idx%7`'],
        ['^', 'Power, e.g. `2^3` is 8'],
      ],
    },
    examples: [
      {
        code: '{mediascript:load {iv} img\ncrop img imgw/2 imgh/2 imgw/4 imgh/4\nrender img}',
        result: 'Crops out the middle half of the image.',
      },
    ],
  },

  {
    id: 'ms-variables',
    title: 'Variables',
    body: [
      'Every media key gets four automatic variables, named by putting a letter after the key (no underscore): `KEYw`, `KEYh`, `KEYd` and `KEYfc`. They update whenever the media changes.',
      '`set NAME VALUE` stores a number (VALUE can be an equation) and `get KEY PROPERTY NAME` copies a property of a media key into a variable. Both can then be used in any later equation. Variable names may only use letters, digits and underscores.',
      'To send numbers back to TagScript, use `export NAME` (or `export NAME ALIAS` to rename it) and `exportmultiple NAME1 NAME2 ...`. When the script finishes, each exported variable is saved with TagScript\'s `{set:}`, so you read it afterwards with `{get:NAME}`. Exported values are always numbers. Exports only come back when the script finishes successfully.',
      'Inside a `foreachframe` or `dobetween` block, the variable `idx` holds the current frame number (foreachframe only), and any variables you set inside the block are thrown away when it ends.',
    ].join('\n\n'),
    table: {
      columns: ['Variable', 'Meaning', 'Example for key `img`'],
      rows: [
        ['KEYw', 'Width in pixels', '`imgw`'],
        ['KEYh', 'Height in pixels', '`imgh`'],
        ['KEYd', 'Duration in seconds', '`imgd`'],
        ['KEYfc', 'Number of frames', '`imgfc`'],
        ['idx', 'Current frame number inside `foreachframe`', '`idx`'],
      ],
    },
    examples: [
      {
        code: '{mediascript:load {iv} img\nset area imgw*imgh\nexport imgw width\nexportmultiple area imgfc\nrender img}\nWidth: {get:width}px, area: {get:area}, frames: {get:imgfc}',
        result: 'Attaches the image and prints its width, area and frame count.',
      },
    ],
  },

  {
    id: 'ms-functions',
    title: 'Functions',
    body: [
      'Functions can be used anywhere an equation is allowed. Like the rest of an equation, they cannot contain spaces.',
      'Prefer `rand()` over TagScript\'s `{range:}` inside MediaScript: `rand()` is picked fresh every time the line runs, so inside a `foreachframe` each frame gets its own random number, while `{range:}` is filled in once before the script even starts.',
    ].join('\n\n'),
    table: {
      columns: ['Function', 'What it returns', 'Example'],
      rows: [
        ['abs(n), cos(n), sin(n), tan(n)', 'Absolute value, cosine, sine, tangent (radians)', '`abs(imgw-512)`'],
        ['max(a,b,...)', 'The biggest number', '`max(10,imgfc)`'],
        ['min(a,b,...)', 'The smallest number', '`min(imgw,imgh)`'],
        ['rand(a,b)', 'A random number between a and b (with one number, between 0 and it)', '`rand(0,360)`'],
        ['round(n,digits?)', 'n rounded, optionally to a number of decimal places', '`round(imgw/3)`'],
        ['if(condition,if_true,if_false)', 'if_true when the condition holds, otherwise if_false. Operators: `==`, `!=`, `<=`, `>=`, `<`, `>`', '`if(imgw>imgh,imgw,imgh)`'],
        ['is(TYPE,KEY)', '1 if the media is of that type, 0 if not. TYPE is `audio`, `image` or `video`', '`is(video,clip)`'],
        ['color(mostused,KEY)', 'The most used color in the media, as a decimal RGB number', '`color(mostused,img)`'],
      ],
    },
  },

  {
    id: 'ms-colors',
    title: 'Colors',
    body: [
      'Commands that take a color accept an FFmpeg color name (like `white`, `red` or `skyblue`), an RGBA value like `rgba(255,0,0,128)` or `255,0,0`, or a hex code like `#ff0000`. Never put spaces inside a color.',
      'Most effect commands (such as `chromakey`, `overlay`, `fadein` or `rotate`) also accept `mostused`, which means the most used color in the media itself. Drawing commands like `tti` and `createpolygonfill` fall back to black for `mostused`.',
      'The numbers inside `rgba(...)` can be equations too, e.g. `rgba(255,rand(0,255),0,255)`.',
    ].join('\n\n'),
    examples: [
      {
        code: '{mediascript:load {iv} img\nchromakey img mostused 0.2\nrender img image/png}',
        result: 'Removes the image\'s most common color (often its background).',
      },
    ],
  },

  {
    id: 'ms-loops',
    title: 'Loops and conditions',
    body: [
      'Three commands run other MediaScript code: `foreachframe` runs code once per frame, `dobetween` runs code on a slice of time, and `if` runs code only when a comparison is true. The code goes at the end of the line.',
      'Because each line is one command, code with more than one line has to be JSON-encoded so it fits on a single line. The easy way is `{jsonify:...}`: put the inner commands on their own lines inside it. A single short command can be written directly, like `if rand(0,1) <= 0.5 flip img`.',
      'Inside `foreachframe KEY START END CODE`, the current frame is available as its own media key called `KEYx` (so for `pfp` it is `pfpx`), and `idx` is the frame number. START is inclusive and END is exclusive, so `0 pfpfc` covers every frame. Commands inside must keep the frame a single still image, so avoid commands that turn images into GIFs (like `spin` or `shake`) inside the loop.',
      '`dobetween KEY START END CODE` works the same way but on a time range in seconds: the slice is available as `KEYx`, and after the code runs it is stitched back between the untouched parts.',
      '`if LEFT OPERATOR RIGHT CODE` compares two equations. Unlike the `if()` function, the two sides and the operator must be separated by spaces: `if imgw > 500 ...`.',
      'Media keys and variables created inside a loop disappear when it ends; changes to keys that already existed are kept. You cannot `render` from inside a loop.',
    ].join('\n\n'),
    examples: [
      {
        code: '{mediascript:load {avatar} pfp\nsetframecount pfp max(10,pfpfc)\nforeachframe pfp 0 pfpfc {jsonify:\nhueshifthsv pfpx idx*36 100 0\n}\nrender pfp image/gif}',
        result: 'Makes an avatar GIF with at least 10 frames that cycles through colors.',
      },
      {
        code: '{mediascript:load {avatar} pfp\nsetframecount pfp max(10,pfpfc)\nforeachframe pfp 0 pfpfc {jsonify:\nif rand(0,1) <= 0.5 flip pfpx\nif rand(0,1) <= 0.5 invert pfpx\n}\nrender pfp image/gif}',
        result: 'Randomly flips and inverts each frame.',
      },
    ],
  },

  {
    id: 'ms-tts',
    title: 'Text-to-speech voices',
    body: [
      '`tts KEY VOICE TEXT` turns text into an audio clip stored in KEY. The voice is optional; without it you get `TIKTOK_EN_US_FEMALE_01`. Wrap the text in `{jsonify:}`. Text longer than 4096 characters is cut off.',
      'Combine it with `audioputreplace`, `audioputmix` or `audioputconcat` to put the speech on a video, or render it on its own as audio.',
    ].join('\n\n'),
    table: {
      columns: ['Voice', 'Description'],
      rows: TTS_VOICES.map(([voice, description]) => [`\`${voice}\``, description]),
    },
    examples: [
      {
        code: '{mediascript:tts voice SAPI_MICROSOFT_EN_MALE_SAM {jsonify:{args}}\nrender voice audio/mp3}',
        result: 'Reads the tag\'s arguments out loud as Microsoft Sam.',
      },
    ],
  },

  {
    id: 'ms-klattsch',
    title: 'Klattsch phoneme syntax',
    body: [
      'The `KLATTSCH` voice is a speech synthesizer you can steer by hand. Its text can be plain English words, ARPABET phonemes (like `HH AH L OW`), or a mix of both. English words are converted to phonemes for you; phonemes you write are kept as they are.',
      'Suffixes on a phoneme change its pitch or stress: `PH!` stresses it (a short lift and a longer sound), `PH+N` / `PH-N` glides the pitch up or down by N Hz and keeps the new pitch for what follows, and `PH(+N)` / `PH(-N)` is a one-off ornament where the pitch returns afterwards. Wrap phonemes in `( P P P )` (with spaces around the parentheses) to squeeze them into one syllable, which is handy for diphthongs and quick unstressed syllables.',
      'Pauses: `,` is 100 ms, `;` is 200 ms, `.` is 300 ms and `pN` is exactly N ms.',
      'State tokens change the voice from that point on. Each is a letter: `xN` or `x=N` sets it, `x+N` / `x-N` nudges it, and a bare `x` resets it to the default. The long forms `[base=N]`, `[rate=N]`, `[scale=N]` and `[pause=N]` are the same as `bN`, `rN`, `sN` and `pN`.',
      'Pitch rules: `!` and `(+N)` only affect one phoneme, `+N` / `-N` stick, `bN` jumps to an absolute pitch, and a bare `b` returns to the pitch the line started on. For example `AY+20 D IH+10 D` puts the last D at +30, while `AY(+20) D IH(+10) D` leaves every D at the base pitch.',
      'Style tips: statements end with the last stressed vowel falling 5 to 15 Hz; yes/no questions end rising 15 to 30 Hz; excitement uses a wider range with `g+0.2 r-20`; sadness uses `r+30 h+0.2 t-0.2 v2`; a whisper is `h0.7 g0.2 t-0.3`; a female voice is `s1.17 b220` and a child is `s1.3 b260`; for singing use note names (`bC4`), vibrato (`vN`, `wN`) and a slower rate. Use `!` at most once or twice per phrase, prefer `(+N)` ornaments for small accents, and don\'t restate defaults (the baseline voice is male).',
    ].join('\n\n'),
    table: {
      columns: ['Token', 'Controls', 'Example'],
      rows: [
        ['b', 'Base pitch in Hz, or a note name. Bare `b` returns to the starting pitch', '`b140`, `bC4`, `bA#3`, `bDb5`'],
        ['r', 'Rate in ms per phoneme (bigger is slower)', '`r+30`'],
        ['s', 'Formant scale: 1.0 male, 1.17 female, 1.3 child', '`s1.17`, `s+0.1`'],
        ['v', 'Vibrato depth in Hz (0 is off)', '`v2`'],
        ['w', 'Vibrato rate in Hz (default 5)', '`w6`'],
        ['m', 'Tremolo depth, 0..1', '`m0.3`'],
        ['n', 'Tremolo rate in Hz (default 5)', '`n4`'],
        ['h', 'Breathiness, 0..1', '`h0.7`'],
        ['t', 'Spectral tilt, -0.9 (dark) to +0.9 (bright)', '`t-0.2`'],
        ['g', 'Vocal effort, 0 (lax) to 1 (tense), default 0.5', '`g+0.2`'],
        ['p', 'Pause of exactly N ms', '`p250`'],
      ],
    },
    examples: [
      {
        code: '{mediascript:tts voice KLATTSCH {jsonify:HH AH L OW b+15 W ER L D}\nrender voice audio/wav}',
        result: '"Hello world" with a little lift on "world".',
      },
      {
        code: '{mediascript:tts voice KLATTSCH {jsonify:s1.17 b220 hello world}\nrender voice audio/wav}',
        result: '"Hello world" in a female voice, written as plain English.',
      },
      {
        code: '{mediascript:tts voice KLATTSCH {jsonify:AY+8 M S AO+10 R IY-30 D EY+10 V}\nrender voice audio/wav}',
        result: '"I\'m sorry Dave" with hand-tuned pitch.',
      },
    ],
  },

  {
    id: 'ms-examples',
    title: 'Worked examples',
    body: 'A few complete tags that combine several commands. Copy one into `.tag create` and tweak it.',
    examples: [
      {
        code: '{mediascript:load {iv} img\ncaption img {jsonify:{args}}\nrender img}',
        result: 'Captions the last image, GIF or video with whatever the user typed after the tag name.',
      },
      {
        code: '{mediascript:load {avatar} pfp\nspin pfp\nrender pfp image/gif}',
        result: 'Makes a spinning GIF of the user\'s avatar (a still image becomes a 20-frame GIF).',
      },
      {
        code: '{mediascript:load {video} clip\ntts voice TIKTOK_EN_MALE_NARRATION {jsonify:{args}}\naudioputreplace clip voice\nrender clip video/mp4}',
        result: 'Replaces the audio of the last video with a narrator reading the tag\'s arguments.',
      },
      {
        code: '{mediascript:load {iv} img\ntti text 40 imgw white {jsonify:{args}}\noverlay img text (imgw/2)-(textw/2) (imgh/2)-(texth/2)\nrender img}',
        result: 'Writes white text in the middle of the image.',
      },
      {
        code: '{mediascript:load {search.google.images:cake} img\ncreate sun min(imgw,imgh)/3 min(imgw,imgh)/3 255 255 0\ncropcircle sun\noverlay img sun imgw-sunw 0\nrender img}',
        result: 'Draws a yellow "sun" in the top right corner of a cake picture.',
      },
      {
        code: '{mediascript:load {avatar} pfp\nfit pfp 512 512\nsetframecount pfp max(36,pfpfc)\nforeachframe pfp 0 pfpfc/2 {jsonify:\nrotate3d pfpx (10*idx)+5 45 0 1.5 none tpr\n}\nforeachframe pfp pfpfc/2 pfpfc {jsonify:\nrotate3d pfpx (10*idx)+5-360 45 0 1.5 none tpr\n}\nrender pfp image/gif}',
        result: 'Spins the avatar around in 3D, like the dancing cockroach meme.',
      },
    ],
  },
];


export const MEDIASCRIPT_CATEGORIES: ReadonlyArray<{id: TagDocMediaScriptCategoryId, title: string, description: string}> = [
  {id: 'io', title: 'Load & Render', description: 'Bring media in, copy it, convert it and send it back out.'},
  {id: 'flow', title: 'Logic, Loops & Variables', description: 'Per-frame loops, conditions, and numbers you can share with TagScript.'},
  {id: 'generate', title: 'Create Media', description: 'Make new images and audio from scratch, text, AI or the web.'},
  {id: 'text', title: 'Text & Captions', description: 'Put words on media.'},
  {id: 'size', title: 'Size, Crop & Rotate', description: 'Resize, crop, flip and reposition.'},
  {id: 'time', title: 'Time & Frames', description: 'Trim, loop, speed up, reverse and control frames.'},
  {id: 'compose', title: 'Combine & Mask', description: 'Overlay, join and cut out media.'},
  {id: 'color', title: 'Color', description: 'Brightness, hue, tints and channel tricks.'},
  {id: 'filters', title: 'Filters', description: 'Blurs, fries, art styles and glitches.'},
  {id: 'distort', title: 'Distort & Animate', description: 'Warp, mirror, spin and shake.'},
  {id: 'audio', title: 'Audio', description: 'Pitch, effects, volume and mixing audio tracks.'},
];


export const MEDIASCRIPT_COMMANDS: Array<TagDocMediaScriptCommand> = [
  // load & render
  {
    name: 'load',
    category: 'io',
    summary: 'Downloads an image, GIF, audio file or video from a URL into a media key.',
    syntax: 'load URL_HERE MEDIA_KEY AUDIO_PRIORITY=False',
    args: [
      {name: 'URL_HERE', description: 'a direct media link, a TagScript function like `{iv}` or `{avatar}`, or `FILE_X` / `FILE_X_COPY`'},
      {name: 'MEDIA_KEY', description: 'the name to store the media under'},
      {name: 'AUDIO_PRIORITY', default: 'False', description: 'prefer audio when the link has both audio and video'},
    ],
    examples: [
      {code: '{mediascript:load {iv} img\nrender img}', result: 'Sends back the last image or video in chat.'},
    ],
    notes: [
      '`FILE_X` loads the tag\'s Xth attachment so far and removes it from the reply; `FILE_X_COPY` keeps it attached.',
    ],
  },
  {
    name: 'render',
    category: 'io',
    summary: 'Ends the script and sends the media as the result, optionally converted to another format.',
    syntax: 'render MEDIA_KEY MIMETYPE?',
    args: [
      media('the media to send'),
      {name: 'MIMETYPE', range: MIMETYPES.join(', '), description: 'the format to save as; leave out (or `default`) to keep the current one'},
    ],
    notes: [
      'Anything after `render` is ignored.',
      'If a script has no `render`, the first media key created is rendered automatically.',
      'You can add a file name after the mimetype to name the output file.',
    ],
  },
  {
    name: 'convert',
    category: 'io',
    summary: 'Converts media to another format without ending the script.',
    syntax: 'convert MEDIA_KEY MIMETYPE',
    args: [
      media(),
      {name: 'MIMETYPE', range: 'same as `render`', description: 'the format to convert to'},
    ],
  },
  {
    name: 'clone',
    aliases: ['copy'],
    category: 'io',
    summary: 'Copies a media key into a new key, so you can edit one and keep the original.',
    syntax: 'clone MEDIA_KEY MEDIA_KEY_2',
    args: [
      media('the media to copy'),
      {name: 'MEDIA_KEY_2', description: 'the name for the copy'},
    ],
  },
  {
    name: 'bitrate',
    category: 'io',
    summary: 'Sets the video and audio bitrate, mostly to make files smaller (or crunchier).',
    syntax: 'bitrate MEDIA_KEY VIDEO=0 AUDIO=0',
    args: [
      media(),
      {name: 'VIDEO', default: '0', range: '0..10485760', description: 'video bitrate in bits per second'},
      {name: 'AUDIO', default: '0', range: '0..10485760', description: 'audio bitrate in bits per second'},
    ],
  },

  // flow
  {
    name: 'foreachframe',
    category: 'flow',
    summary: 'Runs MediaScript code once for every frame in a range.',
    syntax: 'foreachframe MEDIA_KEY START END ...MEDIASCRIPTCODE',
    args: [
      media('the media whose frames to loop over'),
      {name: 'START', default: '0', description: 'first frame (inclusive)'},
      {name: 'END', default: 'MEDIA_KEYfc', description: 'stops before this frame (exclusive)'},
      {name: 'MEDIASCRIPTCODE', rest: true, description: 'the code to run, JSON-encoded with `{jsonify:}` if it has more than one line'},
    ],
    examples: [
      {
        code: '{mediascript:load {avatar} pfp\nsetframecount pfp max(10,pfpfc)\nforeachframe pfp 0 pfpfc {jsonify:\nhueshifthsv pfpx rand(0,360) 100 0\n}\nrender pfp image/gif}',
        result: 'Gives every frame of the avatar a random hue.',
      },
    ],
    notes: [
      'The current frame is the media key `MEDIA_KEYx` (e.g. `pfpx`), and `idx` is the frame number.',
      'Don\'t use commands that turn a still image into a GIF inside the loop; each frame must stay a single image.',
      'Variables and new media keys made inside the loop are discarded when it ends. `render` is not allowed inside.',
    ],
  },
  {
    name: 'dobetween',
    category: 'flow',
    summary: 'Runs MediaScript code on just one stretch of time, then stitches it back in.',
    syntax: 'dobetween MEDIA_KEY START END ...MEDIASCRIPTCODE',
    args: [
      media(),
      {name: 'START', default: '0', description: 'start time in seconds'},
      {name: 'END', default: 'MEDIA_KEYd', description: 'end time in seconds'},
      {name: 'MEDIASCRIPTCODE', rest: true, description: 'the code to run, JSON-encoded with `{jsonify:}`'},
    ],
    examples: [
      {
        code: '{mediascript:load {video} clip\ndobetween clip 2 4 {jsonify:\ninvert clipx\ndeepfry clipx\n}\nrender clip}',
        result: 'Inverts and deepfries only seconds 2 to 4 of the video.',
      },
    ],
    notes: [
      'The slice is available as `MEDIA_KEYx`.',
      'Variables and new media keys made inside are discarded when it ends. `render` is not allowed inside.',
    ],
  },
  {
    name: 'if',
    category: 'flow',
    summary: 'Runs MediaScript code only when a comparison is true.',
    syntax: 'if EXPRESSION OPERATOR EXPRESSION ...MEDIASCRIPTCODE',
    args: [
      {name: 'EXPRESSION', description: 'a number or equation (no spaces)'},
      {name: 'OPERATOR', range: '==, !=, <=, >=, <, >', description: 'how to compare'},
      {name: 'EXPRESSION', description: 'a number or equation (no spaces)'},
      {name: 'MEDIASCRIPTCODE', rest: true, description: 'the code to run, JSON-encoded with `{jsonify:}` if it has more than one line'},
    ],
    examples: [
      {
        code: '{mediascript:load {iv} media\nif is(video,media) == 1 reverse media\nif mediaw > 1000 scale media 0.5\nrender media}',
        result: 'Reverses the media only if it is a video, and halves it if it is wider than 1000px.',
      },
    ],
    notes: [
      'The two expressions and the operator must be separated by spaces, e.g. `if 2 == 2`.',
      'Both sides are compared as decimal numbers.',
    ],
  },
  {
    name: 'set',
    category: 'flow',
    summary: 'Stores a number in a variable you can use in later equations.',
    syntax: 'set VARIABLE_NAME VALUE=0',
    args: [
      {name: 'VARIABLE_NAME', description: 'letters, digits and underscores only'},
      {name: 'VALUE', default: '0', description: 'a number or equation'},
    ],
    examples: [
      {code: '{mediascript:load {iv} img\nset size min(imgw,imgh)\ncrop img size size\nrender img}', result: 'Crops the image to a square.'},
    ],
  },
  {
    name: 'get',
    category: 'flow',
    summary: 'Copies a property of a media key into a variable.',
    syntax: 'get MEDIA_KEY PROPERTY VARIABLE_NAME',
    args: [
      media('the media to read from'),
      {name: 'PROPERTY', range: 'width, height, duration, framecount', description: 'what to read'},
      {name: 'VARIABLE_NAME', description: 'the variable to store it in'},
    ],
    notes: [
      'You usually don\'t need this: `KEYw`, `KEYh`, `KEYd` and `KEYfc` are always available.',
    ],
  },
  {
    name: 'export',
    category: 'flow',
    summary: 'Sends a MediaScript variable back to TagScript, readable afterwards with `{get:}`.',
    syntax: 'export VARIABLE_NAME VARIABLE_NAME_ALIAS?',
    args: [
      {name: 'VARIABLE_NAME', description: 'the MediaScript variable to export'},
      {name: 'VARIABLE_NAME_ALIAS', description: 'the TagScript variable name to use instead'},
    ],
    examples: [
      {code: '{mediascript:load {iv} img\nexport imgfc frames\nrender img}This has {get:frames} frames.', result: 'Prints how many frames the media has.'},
    ],
  },
  {
    name: 'exportmultiple',
    category: 'flow',
    summary: 'Sends several MediaScript variables back to TagScript at once.',
    syntax: 'exportmultiple ...VARIABLE_NAMES',
    args: [
      {name: 'VARIABLE_NAMES', rest: true, description: 'variable names separated by spaces'},
    ],
  },

  // create media
  {
    name: 'create',
    category: 'generate',
    summary: 'Creates a blank image of a solid color.',
    syntax: 'create MEDIA_KEY WIDTH HEIGHT RED=0 GREEN=0 BLUE=0 ALPHA?',
    args: [
      media('the name for the new image'),
      {name: 'WIDTH', description: 'width in pixels'},
      {name: 'HEIGHT', description: 'height in pixels'},
      {name: 'RED', default: '0', range: '0..255'},
      {name: 'GREEN', default: '0', range: '0..255'},
      {name: 'BLUE', default: '0', range: '0..255'},
      {name: 'ALPHA', range: '0..255', description: 'transparency; leave out for fully opaque'},
    ],
    examples: [
      {code: '{mediascript:create canvas 500 500 135 206 235\nrender canvas image/png}', result: 'A 500x500 sky-blue square.'},
    ],
  },
  {
    name: 'createpolygonfill',
    aliases: ['createpolygon'],
    category: 'generate',
    summary: 'Draws a filled polygon from a list of points.',
    syntax: 'createpolygonfill MEDIA_KEY COLOR ...POINTS',
    args: [
      media('the name for the new image'),
      {name: 'COLOR', description: 'RGBA or #HEX, no spaces'},
      {name: 'POINTS', rest: true, description: '`x,y` points separated by spaces'},
    ],
    examples: [
      {code: '{mediascript:createpolygonfill tri rgba(255,0,0,255) 150,0 0,300 300,300\nrender tri image/png}', result: 'A red triangle on a transparent 300x300 image.'},
    ],
    notes: ['The image size is set by the largest X and largest Y among the points.'],
  },
  {
    name: 'createpolygonstroke',
    category: 'generate',
    summary: 'Draws just the outline of a polygon from a list of points.',
    syntax: 'createpolygonstroke MEDIA_KEY COLOR ...POINTS',
    args: [
      media('the name for the new image'),
      {name: 'COLOR', description: 'RGBA or #HEX, no spaces'},
      {name: 'POINTS', rest: true, description: '`x,y` points separated by spaces'},
    ],
    notes: ['Same as `createpolygonfill`, but outlined instead of filled.'],
  },
  {
    name: 'loadsvg',
    category: 'generate',
    summary: 'Turns SVG markup into an image.',
    syntax: 'loadsvg MEDIA_KEY SVG_TEXT',
    args: [
      media('the name for the new image'),
      {name: 'SVG_TEXT', rest: true, description: 'the SVG code, wrapped in `{jsonify:}`'},
    ],
    examples: [
      {code: '{mediascript:loadsvg dot {jsonify:<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><circle cx="50" cy="50" r="40" fill="red"/></svg>}\nrender dot image/png}', result: 'A red circle.'},
    ],
  },
  {
    name: 'imagine',
    category: 'generate',
    summary: 'Generates an image from a text prompt with AI.',
    syntax: 'imagine MEDIA_KEY PROMPT?',
    args: [
      media('the name for the new image'),
      {name: 'PROMPT', rest: true, description: 'what to draw; a random prompt is used if empty'},
    ],
    examples: [
      {code: '{mediascript:imagine car {jsonify:a red sports car}\nvaporwave car\nrender car}', result: 'An AI car, vaporwaved.'},
    ],
  },
  {
    name: 'screenshot',
    category: 'generate',
    summary: 'Takes a screenshot of a web page.',
    syntax: 'screenshot URL MEDIA_KEY TIMEOUT=7.0 WIDTH=1920 HEIGHT=1080 WAIT=1.0 DARKMODE=true',
    args: [
      {name: 'URL', description: 'the page to capture'},
      media('the name for the screenshot'),
      {name: 'TIMEOUT', default: '7.0', range: '1.0..15.0', description: 'seconds to wait for the page to load'},
      {name: 'WIDTH', default: '1920', description: 'browser width in pixels'},
      {name: 'HEIGHT', default: '1080', description: 'browser height in pixels'},
      {name: 'WAIT', default: '1.0', range: '0.0..5.0', description: 'extra seconds to wait after loading'},
      {name: 'DARKMODE', default: 'true', description: 'ask the page for its dark theme'},
    ],
    examples: [
      {code: '{mediascript:screenshot https://notsobot.com page 10 1280 720\nrender page image/png}', result: 'A 1280x720 screenshot of the site.'},
    ],
  },
  {
    name: 'qrcode',
    category: 'generate',
    summary: 'Creates a QR code image.',
    syntax: 'qrcode MEDIA_KEY WIDTH HEIGHT MARGIN ...TEXT',
    args: [
      media('the name for the QR code'),
      {name: 'WIDTH', description: 'width in pixels, 512 is a good choice'},
      {name: 'HEIGHT', description: 'height in pixels, 512 is a good choice'},
      {name: 'MARGIN', description: 'quiet border around the code, usually 1'},
      {name: 'TEXT', rest: true, description: 'the text or link to encode'},
    ],
    examples: [
      {code: '{mediascript:qrcode qr 512 512 1 {jsonify:https://notsobot.com}\nrender qr image/png}', result: 'A scannable QR code for the site.'},
    ],
  },
  {
    name: 'wordcloud',
    category: 'generate',
    summary: 'Creates a word cloud from a list of words.',
    syntax: 'wordcloud MEDIA_KEY WIDTH=1024 HEIGHT=768 ...WORDS',
    args: [
      media('the name for the word cloud'),
      {name: 'WIDTH', default: '1024', description: 'width in pixels; 0 uses the default'},
      {name: 'HEIGHT', default: '768', description: 'height in pixels; 0 uses the default'},
      {name: 'WORDS', rest: true, description: 'the words, split by new lines (wrap in `{jsonify:}`)'},
    ],
    examples: [
      {code: '{mediascript:wordcloud cloud 0 0 {jsonify:cake\ncake\ncake\npie\ncookies}\nrender cloud image/png}', result: 'A word cloud where "cake" is the biggest word.'},
    ],
    notes: ['The size is kept between 512 and 2048 pixels.'],
  },
  {
    name: 'tts',
    category: 'generate',
    summary: 'Generates a text-to-speech audio clip.',
    syntax: 'tts MEDIA_KEY VOICE=TIKTOK_EN_US_FEMALE_01 ...TEXT',
    args: [
      media('the name for the audio'),
      {name: 'VOICE', default: 'TIKTOK_EN_US_FEMALE_01', description: 'one of the voices in the Text-to-speech voices table'},
      {name: 'TEXT', rest: true, description: 'what to say, wrapped in `{jsonify:}`'},
    ],
    examples: [
      {code: '{mediascript:tts voice TIKTOK_EN_US_GHOSTFACE {jsonify:what\'s your favorite scary movie}\nrender voice audio/mp3}', result: 'An MP3 of Ghostface asking the question.'},
      {code: '{mediascript:load {video} clip\ntts voice {jsonify:{args}}\naudioputmix clip voice\nrender clip}', result: 'Mixes the default voice reading the arguments over the last video.'},
    ],
    notes: ['Text longer than 4096 characters is cut off. See the Klattsch section for the `KLATTSCH` phoneme voice.'],
  },

  // text
  {
    name: 'caption',
    category: 'text',
    summary: 'Adds a white caption bar with text above the media, like the classic caption meme.',
    syntax: 'caption MEDIA_KEY TEXT',
    args: [
      media(),
      {name: 'TEXT', rest: true, description: 'the caption; separate top and bottom text with `|`'},
    ],
    examples: [
      {code: '{mediascript:load {iv} img\ncaption img {jsonify:me when the tag works}\nrender img}'},
    ],
  },
  {
    name: 'meme',
    category: 'text',
    summary: 'Adds Impact-style meme text on top of the media.',
    syntax: 'meme MEDIA_KEY TEXT',
    args: [
      media(),
      {name: 'TEXT', rest: true, description: 'the text; separate top and bottom text with `|`'},
    ],
    examples: [
      {code: '{mediascript:load {iv} img\nmeme img {jsonify:top text|bottom text}\nrender img}'},
    ],
  },
  {
    name: 'tti',
    aliases: ['text'],
    category: 'text',
    summary: 'Creates a transparent image with centered text on it.',
    syntax: 'tti MEDIA_KEY FONT_SIZE WRAP_WIDTH COLOR ...TEXT',
    args: [
      media('the name for the text image'),
      {name: 'FONT_SIZE', description: 'text size'},
      {name: 'WRAP_WIDTH', description: 'width in pixels to wrap lines at'},
      {name: 'COLOR', description: 'color name, RGBA or #HEX, no spaces'},
      {name: 'TEXT', rest: true, description: 'the text, wrapped in `{jsonify:}`'},
    ],
    examples: [
      {code: '{mediascript:load {iv} img\ntti text 40 imgw white {jsonify:hello}\noverlay img text (imgw/2)-(textw/2) (imgh/2)-(texth/2)\nrender img}', result: 'Writes "hello" in the middle of the image.'},
    ],
    notes: ['The image is only as big as the text, so use `textw` / `texth` to position it with `overlay`.'],
  },
  {
    name: 'ttil',
    category: 'text',
    summary: 'Same as `tti`, but the text is left-aligned.',
    syntax: 'ttil MEDIA_KEY FONT_SIZE WRAP_WIDTH COLOR ...TEXT',
    args: [
      media('the name for the text image'),
      {name: 'FONT_SIZE', description: 'text size'},
      {name: 'WRAP_WIDTH', description: 'width in pixels to wrap lines at'},
      {name: 'COLOR', description: 'color name, RGBA or #HEX, no spaces'},
      {name: 'TEXT', rest: true, description: 'the text, wrapped in `{jsonify:}`'},
    ],
  },
  {
    name: 'ttir',
    category: 'text',
    summary: 'Same as `tti`, but the text is right-aligned.',
    syntax: 'ttir MEDIA_KEY FONT_SIZE WRAP_WIDTH COLOR ...TEXT',
    args: [
      media('the name for the text image'),
      {name: 'FONT_SIZE', description: 'text size'},
      {name: 'WRAP_WIDTH', description: 'width in pixels to wrap lines at'},
      {name: 'COLOR', description: 'color name, RGBA or #HEX, no spaces'},
      {name: 'TEXT', rest: true, description: 'the text, wrapped in `{jsonify:}`'},
    ],
  },
  {
    name: 'asciitext',
    aliases: ['asciit'],
    category: 'text',
    summary: 'Creates an image of big ASCII-art letters from text.',
    syntax: 'asciitext MEDIA_KEY TEXT',
    args: [
      media('the name for the new image'),
      {name: 'TEXT', rest: true, description: 'the text, wrapped in `{jsonify:}` (new lines allowed)'},
    ],
    examples: [
      {code: '{mediascript:asciitext art {jsonify:hello\nworld}\nrender art}'},
    ],
  },
  {
    name: 'labeltriggered2',
    aliases: ['triggered2'],
    category: 'text',
    summary: 'Resizes the media to 256 pixels wide and adds a "triggered" label underneath.',
    syntax: 'labeltriggered2 MEDIA_KEY',
    args: [media()],
  },
  {
    name: 'labeltriggered3',
    aliases: ['triggered3'],
    category: 'text',
    summary: 'Same as `labeltriggered2`, with a different "triggered" label.',
    syntax: 'labeltriggered3 MEDIA_KEY',
    args: [media()],
  },

  // size
  {
    name: 'resize',
    category: 'size',
    summary: 'Resizes to an exact width and height (stretching if needed).',
    syntax: 'resize MEDIA_KEY WIDTH HEIGHT KERNEL=none',
    args: [
      media(),
      {name: 'WIDTH', description: 'new width in pixels'},
      {name: 'HEIGHT', description: 'new height in pixels'},
      {name: 'KERNEL', default: 'none', range: RESIZE_KERNELS, description: 'resampling method, e.g. `NEAREST` for crisp pixel art'},
    ],
  },
  {
    name: 'contain',
    category: 'size',
    summary: 'Fits the media inside a box and pads the empty space with transparency.',
    syntax: 'contain MEDIA_KEY WIDTH HEIGHT KERNEL=none',
    args: [
      media(),
      {name: 'WIDTH', description: 'box width in pixels'},
      {name: 'HEIGHT', description: 'box height in pixels'},
      {name: 'KERNEL', default: 'none', range: RESIZE_KERNELS},
    ],
  },
  {
    name: 'cover',
    category: 'size',
    summary: 'Fills a box completely, cropping off whatever sticks out.',
    syntax: 'cover MEDIA_KEY WIDTH HEIGHT KERNEL=none',
    args: [
      media(),
      {name: 'WIDTH', description: 'box width in pixels'},
      {name: 'HEIGHT', description: 'box height in pixels'},
      {name: 'KERNEL', default: 'none', range: RESIZE_KERNELS},
    ],
  },
  {
    name: 'fit',
    category: 'size',
    summary: 'Shrinks or grows the media to fit inside a box, keeping its shape.',
    syntax: 'fit MEDIA_KEY WIDTH HEIGHT KERNEL=none',
    args: [
      media(),
      {name: 'WIDTH', description: 'box width in pixels'},
      {name: 'HEIGHT', description: 'box height in pixels'},
      {name: 'KERNEL', default: 'none', range: RESIZE_KERNELS},
    ],
  },
  {
    name: 'scale',
    category: 'size',
    summary: 'Resizes by a multiplier, e.g. 0.5 for half size or 2 for double.',
    syntax: 'scale MEDIA_KEY SCALE KERNEL=none',
    args: [
      media(),
      {name: 'SCALE', description: 'the multiplier'},
      {name: 'KERNEL', default: 'none', range: RESIZE_KERNELS},
    ],
  },
  {
    name: 'stretch',
    category: 'size',
    summary: 'Stretches the width and/or height by a multiplier.',
    syntax: 'stretch MEDIA_KEY WIDTH=1.0 HEIGHT=1.0 CROP=FALSE',
    args: [
      media(),
      {name: 'WIDTH', default: '1.0', range: '0..3', description: 'width multiplier'},
      {name: 'HEIGHT', default: '1.0', range: '0..3', description: 'height multiplier'},
      {name: 'CROP', default: 'FALSE', description: 'crop back to the original size'},
    ],
  },
  {
    name: 'crop',
    category: 'size',
    summary: 'Cuts out a rectangle of the media.',
    syntax: 'crop MEDIA_KEY WIDTH HEIGHT X=0 Y=0',
    args: [
      media(),
      {name: 'WIDTH', description: 'width of the area to keep'},
      {name: 'HEIGHT', description: 'height of the area to keep'},
      {name: 'X', default: '0', description: 'left edge of the area'},
      {name: 'Y', default: '0', description: 'top edge of the area'},
    ],
  },
  {
    name: 'cropauto',
    aliases: ['cropsmart'],
    category: 'size',
    summary: 'Automatically crops to the most interesting part of the media.',
    syntax: 'cropauto MEDIA_KEY',
    args: [media()],
  },
  {
    name: 'cropcircle',
    category: 'size',
    summary: 'Crops the media into a circle with a transparent outside.',
    syntax: 'cropcircle MEDIA_KEY',
    args: [media()],
  },
  {
    name: 'cropnft',
    aliases: ['croptwitterhex'],
    category: 'size',
    summary: 'Crops the media into a hexagon, like Twitter NFT avatars.',
    syntax: 'cropnft MEDIA_KEY',
    args: [media()],
  },
  {
    name: 'trim',
    category: 'size',
    summary: 'Trims away black borders around the media.',
    syntax: 'trim MEDIA_KEY THRESHOLD=10',
    args: [
      media(),
      {name: 'THRESHOLD', default: '10', description: 'how dark a border must be to count as black'},
    ],
  },
  {
    name: 'uncaption',
    category: 'size',
    summary: 'Crops off a caption bar that sits above the media.',
    syntax: 'uncaption MEDIA_KEY TOLERANCE=35',
    args: [
      media(),
      {name: 'TOLERANCE', default: '35', range: '0..255', description: 'how far from white the caption background may be'},
    ],
  },
  {
    name: 'flip',
    category: 'size',
    summary: 'Flips the media upside down (vertical flip).',
    syntax: 'flip MEDIA_KEY',
    args: [media()],
  },
  {
    name: 'flop',
    category: 'size',
    summary: 'Mirrors the media left to right (horizontal flip).',
    syntax: 'flop MEDIA_KEY',
    args: [media()],
  },
  {
    name: 'rotate',
    category: 'size',
    summary: 'Rotates the media by a number of degrees.',
    syntax: 'rotate MEDIA_KEY DEGREES FILLCOLOR=none|black CROP=false',
    args: [
      media(),
      {name: 'DEGREES', range: '-360..360', description: 'how far to rotate'},
      {name: 'FILLCOLOR', default: 'none|black', description: 'color for the uncovered corners, as `image_color|video_color` or one color for both'},
      {name: 'CROP', default: 'false', description: 'crop back to the original size'},
    ],
    examples: [
      {code: '{mediascript:load {iv} img\nrotate img 45 white\nrender img}', result: 'Tilts the image 45 degrees on a white background.'},
    ],
    notes: ['Images get transparent corners by default and videos get black ones, since video can\'t be transparent.'],
  },
  {
    name: 'offset',
    category: 'size',
    summary: 'Shifts the picture inside its canvas by X and/or Y pixels.',
    syntax: 'offset MEDIA_KEY X=0 Y=0',
    args: [
      media(),
      {name: 'X', default: '0', description: 'horizontal shift'},
      {name: 'Y', default: '0', description: 'vertical shift'},
    ],
  },

  // time
  {
    name: 'snip',
    category: 'time',
    summary: 'Keeps only part of the media\'s duration.',
    syntax: 'snip MEDIA_KEY START END?',
    args: [
      media(),
      {name: 'START', description: 'start time in seconds; negative counts back from the end'},
      {name: 'END', description: 'end time in seconds; negative counts back from the end; leave out for the end'},
    ],
    examples: [
      {code: '{mediascript:load {video} clip\nsnip clip -5\nrender clip}', result: 'Keeps the last 5 seconds.'},
    ],
  },
  {
    name: 'clonesnip',
    aliases: ['copysnip'],
    category: 'time',
    summary: 'Copies a section of the media into a new key, leaving the original alone.',
    syntax: 'clonesnip MEDIA_KEY MEDIA_KEY_2 START END?',
    args: [
      media('the media to copy from'),
      {name: 'MEDIA_KEY_2', description: 'the name for the snipped copy'},
      {name: 'START', description: 'start time in seconds'},
      {name: 'END', description: 'end time in seconds; leave out for the end'},
    ],
  },
  {
    name: 'snipframes',
    category: 'time',
    summary: 'Keeps only a range of frames.',
    syntax: 'snipframes MEDIA_KEY START_FRAME END_FRAME=MEDIA_KEYfc',
    args: [
      media(),
      {name: 'START_FRAME', description: 'first frame to keep'},
      {name: 'END_FRAME', default: 'MEDIA_KEYfc', description: 'frame to stop at'},
    ],
  },
  {
    name: 'repeat',
    category: 'time',
    summary: 'Plays the media several times in a row.',
    syntax: 'repeat MEDIA_KEY AMOUNT=2',
    args: [
      media(),
      {name: 'AMOUNT', default: '2', description: 'how many times to repeat'},
    ],
  },
  {
    name: 'repeatduration',
    category: 'time',
    summary: 'Loops the media until it is a certain length.',
    syntax: 'repeatduration MEDIA_KEY DURATION',
    args: [
      media(),
      {name: 'DURATION', description: 'total length in seconds'},
    ],
  },
  {
    name: 'reverse',
    category: 'time',
    summary: 'Plays the media backwards.',
    syntax: 'reverse MEDIA_KEY AUDIO=true',
    args: [
      media(),
      {name: 'AUDIO', default: 'true', description: 'reverse the audio too'},
    ],
  },
  {
    name: 'speed',
    category: 'time',
    summary: 'Speeds up or slows down playback.',
    syntax: 'speed MEDIA_KEY SPEED=0',
    args: [
      media(),
      {name: 'SPEED', default: '0', description: 'the speed multiplier, e.g. 2 for double speed or 0.5 for half'},
    ],
  },
  {
    name: 'setframecount',
    category: 'time',
    summary: 'Duplicates or drops frames to reach an exact frame count. Great for turning stills into GIFs.',
    syntax: 'setframecount MEDIA_KEY AMOUNT',
    args: [
      media(),
      {name: 'AMOUNT', range: '1..10000', description: 'the number of frames you want'},
    ],
    notes: ['`setframecount img max(10,imgfc)` makes sure there are at least 10 frames.'],
  },
  {
    name: 'setfps',
    category: 'time',
    summary: 'Sets the frames per second.',
    syntax: 'setfps MEDIA_KEY AMOUNT',
    args: [
      media(),
      {name: 'AMOUNT', range: '1..90', description: 'frames per second'},
    ],
  },
  {
    name: 'setframedelay',
    category: 'time',
    summary: 'Sets how long each frame is shown.',
    syntax: 'setframedelay MEDIA_KEY AMOUNT',
    args: [
      media(),
      {name: 'AMOUNT', range: '0 and up', description: 'delay per frame in milliseconds'},
    ],
  },
  {
    name: 'fadein',
    category: 'time',
    summary: 'Fades the media in from a color at the start.',
    syntax: 'fadein MEDIA_KEY DURATION=0.5 COLOR=black',
    args: [
      media(),
      {name: 'DURATION', default: '0.5', range: '0..120', description: 'fade length in seconds'},
      {name: 'COLOR', default: 'black', description: 'color to fade from'},
    ],
  },
  {
    name: 'fadeout',
    category: 'time',
    summary: 'Fades the media out to a color at the end.',
    syntax: 'fadeout MEDIA_KEY DURATION=0.5 COLOR=black',
    args: [
      media(),
      {name: 'DURATION', default: '0.5', range: '0..120', description: 'fade length in seconds'},
      {name: 'COLOR', default: 'black', description: 'color to fade to'},
    ],
  },
  {
    name: 'shuffle',
    category: 'time',
    summary: 'Chops the media into segments and shuffles their order.',
    syntax: 'shuffle MEDIA_KEY SEGMENT=0.5',
    args: [
      media(),
      {name: 'SEGMENT', default: '0.5', range: '0.1..120', description: 'segment length in seconds'},
    ],
  },
  {
    name: 'stammer',
    category: 'time',
    summary: 'Rebuilds the media from its own frames so it "plays" another clip\'s audio.',
    syntax: 'stammer MEDIA_KEY MODULATOR_MEDIA_KEY MATCHER_MODE=basic COLOR_MODE=full',
    args: [
      media('the carrier media whose audio and video frames get cut up'),
      {name: 'MODULATOR_MEDIA_KEY', description: 'the media whose audio is matched'},
      {name: 'MATCHER_MODE', default: 'basic', range: 'basic, combination, unique, weighted', description: '`basic` uses the most similar frame, `combination` blends several, `unique` uses each carrier frame once, `weighted` uses A-weighted audio matching'},
      {name: 'COLOR_MODE', default: 'full', range: 'fast_8, full_8, full', description: '`fast_8` is fast 8-bit with a default palette, `full_8` is slow 8-bit with a custom palette, `full` is fast 16-bit'},
    ],
    examples: [
      {code: '{mediascript:load {video} carrier\nload {audio} song\nstammer carrier song\nrender carrier video/mp4}', result: 'The video\'s own sounds rearranged to mimic the song.'},
    ],
    notes: ['Both media must have audio.'],
  },

  // compose
  {
    name: 'overlay',
    category: 'compose',
    summary: 'Places one media on top of another at a position.',
    syntax: 'overlay MEDIA_KEY MEDIA_KEY_2 X=0 Y=0 COLOR=none SIMILARITY=0.01 BLEND=0 LOOP=TRUE OPACITY=100',
    args: [
      media('the background media (gets changed)'),
      {name: 'MEDIA_KEY_2', description: 'the media to put on top'},
      {name: 'X', default: '0', description: 'left position of the top media'},
      {name: 'Y', default: '0', description: 'top position of the top media'},
      {name: 'COLOR', default: 'none', description: 'a color to key out of the top media (like a green screen)'},
      {name: 'SIMILARITY', default: '0.01', range: '0..1', description: 'how close a color must be to be keyed out'},
      {name: 'BLEND', default: '0', range: '0.0..1.0', description: 'how softly keyed edges blend'},
      {name: 'LOOP', default: 'TRUE', description: 'loop the shorter media to match the longer one'},
      {name: 'OPACITY', default: '100', range: '0..100', description: 'opacity of the top media'},
    ],
    examples: [
      {code: '{mediascript:load {iv} img\nload {avatar} pfp\noverlay img pfp (imgw/2)-(pfpw/2) (imgh/2)-(pfph/2)\nrender img}', result: 'Puts the avatar in the middle of the image.'},
      {code: '{mediascript:load {video} clip\nload https://example.com/greenscreen.mp4 gs\noverlay clip gs 0 0 green 0.3 0.2\nrender clip}', result: 'Overlays a green-screen video with the green removed.'},
    ],
  },
  {
    name: 'watermark',
    category: 'compose',
    summary: 'Places a small, semi-transparent copy of one media in the bottom right corner of another.',
    syntax: 'watermark MEDIA_KEY MEDIA_KEY_2 SIZE=20 OPACITY=50 MARGIN=2',
    args: [
      media('the media to watermark'),
      {name: 'MEDIA_KEY_2', description: 'the watermark'},
      {name: 'SIZE', default: '20', range: '1..100', description: 'watermark size as a percentage of MEDIA_KEY'},
      {name: 'OPACITY', default: '50', range: '0..100', description: 'watermark opacity'},
      {name: 'MARGIN', default: '2', range: '0..50', description: 'gap from the corner as a percentage of MEDIA_KEY'},
    ],
  },
  {
    name: 'overlayface',
    category: 'compose',
    summary: 'Detects faces and pastes media over the face, eyes or mouth.',
    syntax: 'overlayface MEDIA_KEY FACE_MEDIA=none LEFT_EYE_MEDIA=none RIGHT_EYE_MEDIA=none MOUTH_MEDIA=none FACE_SCALE=1.35 EYE_SCALE=0.5',
    args: [
      media('the media with faces in it'),
      {name: 'FACE_MEDIA', default: 'none', description: 'media key to cover each face with'},
      {name: 'LEFT_EYE_MEDIA', default: 'none', description: 'media key for left eyes'},
      {name: 'RIGHT_EYE_MEDIA', default: 'none', description: 'media key for right eyes'},
      {name: 'MOUTH_MEDIA', default: 'none', description: 'media key for mouths'},
      {name: 'FACE_SCALE', default: '1.35', description: 'size of the face overlay compared to the face'},
      {name: 'EYE_SCALE', default: '0.5', description: 'size of the eye overlays'},
    ],
  },
  {
    name: 'join',
    category: 'compose',
    summary: 'Puts two media side by side, or one above the other.',
    syntax: 'join MEDIA_KEY MEDIA_KEY_2 VERTICAL=false LOOP=true NORESIZE=false',
    args: [
      media('the first media (gets changed)'),
      {name: 'MEDIA_KEY_2', description: 'the media to add'},
      {name: 'VERTICAL', default: 'false', description: 'stack top to bottom instead of left to right'},
      {name: 'LOOP', default: 'true', description: 'loop the shorter media to match the longer one'},
      {name: 'NORESIZE', default: 'false', description: 'don\'t resize them to match'},
    ],
  },
  {
    name: 'concat',
    category: 'compose',
    summary: 'Plays one media after another.',
    syntax: 'concat MEDIA_KEY MEDIA_KEY_2',
    args: [
      media('the first media (gets changed)'),
      {name: 'MEDIA_KEY_2', description: 'the media to add to the end'},
    ],
  },
  {
    name: 'concatmultiple',
    category: 'compose',
    summary: 'Plays several media one after another. Much faster than chaining `concat`.',
    syntax: 'concatmultiple MEDIA_KEY MEDIA_KEY_2 MEDIA_KEY_3 ...',
    args: [
      media('the first media (gets changed)'),
      {name: 'MEDIA_KEY_2', description: 'the next media'},
      {name: 'MEDIA_KEY_3', rest: true, description: 'any number of further media keys'},
    ],
  },
  {
    name: 'croptransparency',
    category: 'compose',
    summary: 'Uses one media as a transparency mask for another.',
    syntax: 'croptransparency MEDIA_KEY MEDIA_KEY_2',
    args: [
      media(),
      {name: 'MEDIA_KEY_2', description: 'the mask'},
    ],
  },
  {
    name: 'chromakey',
    category: 'compose',
    summary: 'Removes a color, like a green screen.',
    syntax: 'chromakey MEDIA_KEY COLOR=black SIMILARITY=0.01 BLEND=0 CONVERT=None',
    args: [
      media(),
      {name: 'COLOR', default: 'black', description: 'the color to remove (`mostused` works)'},
      {name: 'SIMILARITY', default: '0.01', range: '0.01..1.0', description: 'how close a color must be to be removed'},
      {name: 'BLEND', default: '0', range: '0.0..1.0', description: 'how softly the edges blend'},
      {name: 'CONVERT', default: 'None', description: 'an image or video mimetype to convert to'},
    ],
    notes: ['Video can\'t be transparent, so removed areas in a video turn black.'],
  },
  {
    name: 'backgroundremove',
    aliases: ['bgrm'],
    category: 'compose',
    summary: 'Removes the background with AI, leaving the subject on transparency.',
    syntax: 'backgroundremove MEDIA_KEY MODEL=ISNET_GENERAL_USE',
    args: [
      media(),
      {name: 'MODEL', default: 'ISNET_GENERAL_USE', range: 'ALPHA_MATTING, ISNET_ANIME, ISNET_GENERAL_USE, SILUETA, U2NET, U2NETP, U2NET_CLOTH_SEG, U2NET_HUMAN_SEG', description: 'which model to use, e.g. `ISNET_ANIME` for drawings'},
    ],
  },

  // color
  {
    name: 'brightness',
    aliases: ['lighten'],
    category: 'color',
    summary: 'Makes the media brighter (or darker with negative numbers).',
    syntax: 'brightness MEDIA_KEY PERCENTAGE=0',
    args: [
      media(),
      {name: 'PERCENTAGE', default: '0', range: '-100..100'},
    ],
  },
  {
    name: 'darken',
    category: 'color',
    summary: 'Makes the media darker (or brighter with negative numbers).',
    syntax: 'darken MEDIA_KEY PERCENTAGE=0',
    args: [
      media(),
      {name: 'PERCENTAGE', default: '0', range: '-100..100'},
    ],
  },
  {
    name: 'contrast',
    category: 'color',
    summary: 'Raises or lowers contrast.',
    syntax: 'contrast MEDIA_KEY PERCENTAGE=0',
    args: [
      media(),
      {name: 'PERCENTAGE', default: '0', range: '-100..100'},
    ],
  },
  {
    name: 'grayscale',
    aliases: ['gray', 'greyscale', 'grey'],
    category: 'color',
    summary: 'Removes all color.',
    syntax: 'grayscale MEDIA_KEY',
    args: [media()],
  },
  {
    name: 'sepia',
    category: 'color',
    summary: 'Gives the media an old-photo brown tint.',
    syntax: 'sepia MEDIA_KEY',
    args: [media()],
  },
  {
    name: 'invert',
    aliases: ['inverse'],
    category: 'color',
    summary: 'Inverts all colors, like a photo negative.',
    syntax: 'invert MEDIA_KEY',
    args: [media()],
  },
  {
    name: 'invertrgba',
    aliases: ['inversergba'],
    category: 'color',
    summary: 'Inverts only the color channels you choose.',
    syntax: 'invertrgba MEDIA_KEY RED=1 GREEN=1 BLUE=1 ALPHA=0',
    args: [
      media(),
      {name: 'RED', default: '1', range: '0, 1', description: '1 inverts, 0 leaves alone'},
      {name: 'GREEN', default: '1', range: '0, 1'},
      {name: 'BLUE', default: '1', range: '0, 1'},
      {name: 'ALPHA', default: '0', range: '0, 1'},
    ],
  },
  {
    name: 'opacity',
    aliases: ['alpha', 'fade', 'transparency'],
    category: 'color',
    summary: 'Makes the media see-through.',
    syntax: 'opacity MEDIA_KEY PERCENTAGE',
    args: [
      media(),
      {name: 'PERCENTAGE', range: '0..100', description: '100 is fully visible, 0 is invisible'},
    ],
  },
  {
    name: 'hueshifthsv',
    category: 'color',
    summary: 'Shifts hue, saturation and brightness.',
    syntax: 'hueshifthsv MEDIA_KEY HUE=90 SATURATION=0 BRIGHTNESS=0',
    args: [
      media(),
      {name: 'HUE', default: '90', description: 'degrees to rotate the hue'},
      {name: 'SATURATION', default: '0', description: 'saturation change'},
      {name: 'BRIGHTNESS', default: '0', description: 'brightness change'},
    ],
  },
  {
    name: 'hueshifthsvffmpeg',
    category: 'color',
    summary: 'Like `hueshifthsv`, but done with FFmpeg instead of ImageMagick (often faster on video).',
    syntax: 'hueshifthsvffmpeg MEDIA_KEY HUE=90 SATURATION=1 BRIGHTNESS=0',
    args: [
      media(),
      {name: 'HUE', default: '90', range: '-360..360', description: 'degrees to rotate the hue'},
      {name: 'SATURATION', default: '1', range: '0..3', description: 'saturation multiplier (1 is unchanged)'},
      {name: 'BRIGHTNESS', default: '0', range: '-1..1', description: 'brightness change'},
    ],
    notes: ['Saturation here is a multiplier, so leaving it out keeps the original saturation.'],
  },
  {
    name: 'hueshiftrgb',
    category: 'color',
    summary: 'Shifts the red, green and blue channels.',
    syntax: 'hueshiftrgb MEDIA_KEY RED=0 GREEN=0 BLUE=0',
    args: [
      media(),
      {name: 'RED', default: '0', range: '0..255'},
      {name: 'GREEN', default: '0', range: '0..255'},
      {name: 'BLUE', default: '0', range: '0..255'},
    ],
  },
  {
    name: 'huecurvergba',
    category: 'color',
    summary: 'Remaps a color channel with a curve, like the Curves tool in photo editors.',
    syntax: 'huecurvergba MEDIA_KEY CHANNEL ...TEXT',
    args: [
      media(),
      {name: 'CHANNEL', range: 'red, green, blue, alpha, all', description: 'which channel to change'},
      {name: 'TEXT', rest: true, description: 'curve points separated by spaces, as `x,y` or just `y`, all between 0 and 1; `x` must increase'},
    ],
    examples: [
      {code: '{mediascript:load {iv} img\nhuecurvergba img all 0,1 0.5,0 1,1\nrender img}', result: 'A V-shaped curve: darks and lights go bright, midtones go dark.'},
      {code: '{mediascript:load {iv} img\nhuecurvergba img red 0,0 0.5,rand(0,1) 1,1\nrender img}', result: 'Randomly boosts or cuts the red midtones.'},
    ],
  },
  {
    name: 'swaprgba',
    category: 'color',
    summary: 'Reorders the red, green, blue and alpha channels.',
    syntax: 'swaprgba MEDIA_KEY CHANNELS=rgba',
    args: [
      media(),
      {name: 'CHANNELS', default: 'rgba', description: '3 or 4 letters from `r`, `g`, `b`, `a`, `0` (empty channel) and `1` (full channel), e.g. `bgra`'},
    ],
  },
  {
    name: 'blurple',
    category: 'color',
    summary: 'Tints the media in Discord\'s blurple.',
    syntax: 'blurple MEDIA_KEY',
    args: [media()],
  },
  {
    name: 'gold',
    category: 'color',
    summary: 'Gives the media a gold tint.',
    syntax: 'gold MEDIA_KEY',
    args: [media()],
  },
  {
    name: 'rain',
    category: 'color',
    summary: 'Applies a rainbow-style tint.',
    syntax: 'rain MEDIA_KEY',
    args: [media()],
  },
  {
    name: 'derain',
    category: 'color',
    summary: 'Applies the opposite of the `rain` tint.',
    syntax: 'derain MEDIA_KEY',
    args: [media()],
  },
  {
    name: 'raingold',
    category: 'color',
    summary: 'Combines the rainbow and gold tints.',
    syntax: 'raingold MEDIA_KEY',
    args: [media()],
  },
  {
    name: 'recolor',
    category: 'color',
    summary: 'Recolors the media with bright vaporwave colors.',
    syntax: 'recolor MEDIA_KEY',
    args: [media()],
  },
  {
    name: 'solarize',
    category: 'color',
    summary: 'Inverts everything brighter than a threshold, for a solarized photo look.',
    syntax: 'solarize MEDIA_KEY THRESHOLD=128',
    args: [
      media(),
      {name: 'THRESHOLD', default: '128', range: '0..256'},
    ],
  },

  // filters
  {
    name: 'ascii',
    category: 'filters',
    summary: 'Redraws an image or video as ASCII art.',
    syntax: 'ascii MEDIA_KEY INVERT=false',
    args: [
      media(),
      {name: 'INVERT', default: 'false', description: 'invert the brightness'},
    ],
  },
  {
    name: 'blur',
    category: 'filters',
    summary: 'Blurs the media.',
    syntax: 'blur MEDIA_KEY SCALE=2',
    args: [
      media(),
      {name: 'SCALE', default: '2', range: '1..100', description: 'blur strength'},
    ],
  },
  {
    name: 'motionblur',
    category: 'filters',
    summary: 'Blurs in one direction, as if the camera moved.',
    syntax: 'motionblur MEDIA_KEY STRENGTH=20 VERTICAL=false',
    args: [
      media(),
      {name: 'STRENGTH', default: '20', range: '1..50'},
      {name: 'VERTICAL', default: 'false', description: 'blur up/down instead of left/right'},
    ],
  },
  {
    name: 'zoomblur',
    category: 'filters',
    summary: 'Blurs outward from the center, like zooming during a long exposure.',
    syntax: 'zoomblur MEDIA_KEY AMOUNT=1.2 EXPAND=false',
    args: [
      media(),
      {name: 'AMOUNT', default: '1.2', range: '1..10'},
      {name: 'EXPAND', default: 'false'},
    ],
  },
  {
    name: 'sharpen',
    category: 'filters',
    summary: 'Sharpens the media (negative numbers soften it).',
    syntax: 'sharpen MEDIA_KEY SCALE=15',
    args: [
      media(),
      {name: 'SCALE', default: '15', range: '-100..100'},
    ],
  },
  {
    name: 'deepfry',
    category: 'filters',
    summary: 'Deepfries the media: crushed colors, oversaturated and crunchy.',
    syntax: 'deepfry MEDIA_KEY SCALE=10',
    args: [
      media(),
      {name: 'SCALE', default: '10', range: '0..100', description: 'how fried'},
    ],
  },
  {
    name: 'jpeg',
    aliases: ['jpg'],
    category: 'filters',
    summary: 'Adds JPEG compression artifacts ("needs more jpeg").',
    syntax: 'jpeg MEDIA_KEY QUALITY=1',
    args: [
      media(),
      {name: 'QUALITY', default: '1', description: 'image quality; lower is crunchier'},
    ],
  },
  {
    name: 'android',
    category: 'filters',
    summary: 'Makes media look like it was sent from an old Android: compressed audio, pixelated picture and 2 fps.',
    syntax: 'android MEDIA_KEY SCALE=10',
    args: [
      media(),
      {name: 'SCALE', default: '10', range: '1..100'},
    ],
  },
  {
    name: 'magik',
    aliases: ['magick', 'magic'],
    category: 'filters',
    summary: 'Applies the classic liquid-rescale "magik" warp.',
    syntax: 'magik MEDIA_KEY ITERATIONS=1 RESCALE=false',
    args: [
      media(),
      {name: 'ITERATIONS', default: '1', range: '1..10', description: 'how many times to apply it'},
      {name: 'RESCALE', default: 'false'},
    ],
  },
  {
    name: 'pixelate',
    aliases: ['pixel'],
    category: 'filters',
    summary: 'Pixelates the media.',
    syntax: 'pixelate MEDIA_KEY PIXEL_SIZE=9 NO_LINES=false',
    args: [
      media(),
      {name: 'PIXEL_SIZE', default: '9', range: '2..100', description: 'size of each block'},
      {name: 'NO_LINES', default: 'false', description: 'hide the grid lines between blocks'},
    ],
  },
  {
    name: 'trace',
    category: 'filters',
    summary: 'Finds and highlights edges (Prewitt edge detection).',
    syntax: 'trace MEDIA_KEY',
    args: [media()],
  },
  {
    name: 'edgedetect',
    category: 'filters',
    summary: 'Finds edges and blends them back onto the media, with lots of blend modes.',
    syntax: 'edgedetect MEDIA_KEY STRENGTH=5.0 METHOD=OVER MIX=100 INVERT=false',
    args: [
      media(),
      {name: 'STRENGTH', default: '5.0', range: '0.0..50.0'},
      {name: 'METHOD', default: 'OVER', range: 'color_burn, color_dodge, colorize, darken, darkenintensity, difference, exclusion, hard_light, hue, lighten, lightenintensity, linear_burn, linear_dodge, linear_light, luminize, multiply, over, overlay, pegtop_light, pin_light, saturate, screen, soft_light, vivid_light', description: 'how the edges are composed onto the media'},
      {name: 'MIX', default: '100', range: '0..100', description: 'how much of the effect to apply'},
      {name: 'INVERT', default: 'false'},
    ],
    notes: ['Uses 8-directional Sobel edge detection.'],
  },
  {
    name: 'emboss',
    category: 'filters',
    summary: 'Makes the media look raised or stamped.',
    syntax: 'emboss MEDIA_KEY METHOD=GIMP AZIMUTH=135 ELEVATION=45 DEPTH=1 INTENSITY=0 COMPOSE=none GRAY=none',
    args: [
      media(),
      {name: 'METHOD', default: 'GIMP', range: 'GIMP, PHOTOSHOP'},
      {name: 'AZIMUTH', default: '135', range: '0..360', description: 'light direction'},
      {name: 'ELEVATION', default: '45', range: '0..90', description: 'light height'},
      {name: 'DEPTH', default: '1', range: '0..100'},
      {name: 'INTENSITY', default: '0', range: '-50..50'},
      {name: 'COMPOSE', default: 'none', range: 'none, bumpmap, color_burn, color_dodge, hard_light, linear_burn, linear_dodge, linear_light, multiply, overlay, pegtop_light, pin_light, soft_light, vivid_light', description: 'blend the emboss back onto the original'},
      {name: 'GRAY', default: 'none', description: '`none` or a color'},
    ],
  },
  {
    name: 'paint',
    category: 'filters',
    summary: 'Makes the media look like an oil painting.',
    syntax: 'paint MEDIA_KEY RADIUS=3',
    args: [
      media(),
      {name: 'RADIUS', default: '3', range: '1..10', description: 'brush size'},
    ],
  },
  {
    name: 'watercolor',
    category: 'filters',
    summary: 'Makes the media look like a watercolor painting.',
    syntax: 'watercolor MEDIA_KEY CONTRAST=0.0 EDGE=2.0 MIXING=33 SMOOTHING=0',
    args: [
      media(),
      {name: 'CONTRAST', default: '0.0', range: '0..1000'},
      {name: 'EDGE', default: '2.0', range: '0..1000'},
      {name: 'MIXING', default: '33', range: '0..100'},
      {name: 'SMOOTHING', default: '0', range: '0..1000'},
    ],
  },
  {
    name: 'cartoon',
    category: 'filters',
    summary: 'Makes the media look like a cartoon with flat colors and inked edges.',
    syntax: 'cartoon MEDIA_KEY PATTERN=70 LEVELS=6 METHOD=COLOR_DODGE_BLUR AMOUNT=4.0 BRIGHTNESS=100 SATURATION=150',
    args: [
      media(),
      {name: 'PATTERN', default: '70', range: '0..100'},
      {name: 'LEVELS', default: '6', range: '2..10', description: 'number of color levels'},
      {name: 'METHOD', default: 'COLOR_DODGE_BLUR', range: 'COLOR_DODGE_BLUR, HIGH_PASS_FILTER, MORPHOLOGY_EDGES, SOBEL_EDGES', description: 'how edges are found'},
      {name: 'AMOUNT', default: '4.0', range: '0.0..10.0'},
      {name: 'BRIGHTNESS', default: '100', range: '0..100'},
      {name: 'SATURATION', default: '150', range: '0..300'},
    ],
  },
  {
    name: 'exo',
    category: 'filters',
    summary: 'Applies an alien-looking filter.',
    syntax: 'exo MEDIA_KEY SWIRL=false RAIN=false',
    args: [
      media(),
      {name: 'SWIRL', default: 'false', description: 'add a swirl'},
      {name: 'RAIN', default: 'false', description: 'add the rainbow tint'},
    ],
    notes: [
      'The bot\'s `kek` effect is `exo MEDIA_KEY true`.',
      'The bot\'s `kek2` effect is `exo MEDIA_KEY true true`.',
    ],
  },
  {
    name: 'glitch',
    category: 'filters',
    summary: 'Applies a heavy glitch effect.',
    syntax: 'glitch MEDIA_KEY AMOUNT=0 ITERATIONS=0 SEED=0',
    args: [
      media(),
      {name: 'AMOUNT', default: '0', description: '0 picks automatically'},
      {name: 'ITERATIONS', default: '0', description: '0 picks automatically'},
      {name: 'SEED', default: '0', description: 'use the same seed to get the same glitch; 0 is random'},
    ],
  },
  {
    name: 'datamosh',
    category: 'filters',
    summary: 'Duplicates video P-frames for a smeary datamosh glitch.',
    syntax: 'datamosh MEDIA_KEY CHANCE=8 REPEAT=20',
    args: [
      media(),
      {name: 'CHANCE', default: '8', range: '1..100'},
      {name: 'REPEAT', default: '20', range: '1..100'},
    ],
  },
  {
    name: 'grain',
    category: 'filters',
    summary: 'Adds film grain.',
    syntax: 'grain MEDIA_KEY STRENGTH=20 FLAGS=at',
    args: [
      media(),
      {name: 'STRENGTH', default: '20', range: '0..100'},
      {name: 'FLAGS', default: 'at', description: '1 to 4 letters from `a`, `p`, `t`, `u` (FFmpeg noise flags: averaged, pattern, temporal, uniform)'},
    ],
  },
  {
    name: 'glow',
    category: 'filters',
    summary: 'Adds a glow by laying a blurred, color-inverted copy over the media at 50% opacity.',
    syntax: 'glow MEDIA_KEY AMOUNT=12',
    args: [
      media(),
      {name: 'AMOUNT', default: '12', range: '1..20'},
    ],
  },
  {
    name: 'vaporwave',
    category: 'filters',
    summary: 'Gives the media a vaporwave aesthetic, optionally with text.',
    syntax: 'vaporwave MEDIA_KEY ...TEXT?',
    args: [
      media(),
      {name: 'TEXT', rest: true, description: 'optional text to add'},
    ],
  },
  {
    name: 'edit',
    category: 'filters',
    summary: 'Edits an image with AI according to a prompt.',
    syntax: 'edit MEDIA_KEY PROMPT?',
    args: [
      media(),
      {name: 'PROMPT', rest: true, description: 'what to change; a random prompt is used if empty'},
    ],
    examples: [
      {code: '{mediascript:load {avatar} pfp\nedit pfp {jsonify:give them a wizard hat}\nrender pfp}'},
    ],
    notes: ['Works best for simple edits.'],
  },

  // distort & animate
  {
    name: 'distort',
    category: 'distort',
    summary: 'Applies an ImageMagick distortion with your own numbers.',
    syntax: 'distort MEDIA_KEY METHOD ARGUMENTS',
    args: [
      media(),
      {name: 'METHOD', range: 'arc, affine, affine_projection, barrel, barrel_inverse, bilinear_forward, bilinear_reverse, cylinder_2_plane, depolar, perspective, perspective_projection, plane_2_cylinder, polar, polynomial, resize, rigidaffine, scale_rotate_translate, sentinel, shepards', description: 'the distortion'},
      {name: 'ARGUMENTS', rest: true, description: 'the numbers that method expects, separated by spaces (see ImageMagick\'s -distort docs)'},
    ],
    examples: [
      {code: '{mediascript:load {iv} img\ndistort img arc 360\nrender img}', result: 'Bends the image into a full circle.'},
      {code: '{mediascript:load {iv} img\ndistort img barrel 0.2 0 0 1\nrender img}', result: 'A fisheye-style barrel bulge.'},
    ],
    notes: ['At most 32 numbers are used.'],
  },
  {
    name: 'implode',
    category: 'distort',
    summary: 'Sucks the middle of the media inward.',
    syntax: 'implode MEDIA_KEY SCALE=1',
    args: [
      media(),
      {name: 'SCALE', default: '1', range: '0..100'},
    ],
  },
  {
    name: 'explode',
    category: 'distort',
    summary: 'Pushes the middle of the media outward (the opposite of `implode`).',
    syntax: 'explode MEDIA_KEY SCALE=1',
    args: [
      media(),
      {name: 'SCALE', default: '1', range: '0..100'},
    ],
  },
  {
    name: 'fisheye',
    aliases: ['fish'],
    category: 'distort',
    summary: 'Bulges the middle of the media like a fisheye lens.',
    syntax: 'fisheye MEDIA_KEY',
    args: [media()],
  },
  {
    name: 'swirl',
    category: 'distort',
    summary: 'Twists the media into a swirl.',
    syntax: 'swirl MEDIA_KEY DEGREES=180',
    args: [
      media(),
      {name: 'DEGREES', default: '180', range: '-360..360', description: 'how far to twist; negative goes the other way'},
    ],
  },
  {
    name: 'tunnel',
    category: 'distort',
    summary: 'Wraps the media into a radial or spiral tunnel.',
    syntax: 'tunnel MEDIA_KEY SPIRAL=false',
    args: [
      media(),
      {name: 'SPIRAL', default: 'false'},
    ],
  },
  {
    name: 'detunnel',
    category: 'distort',
    summary: 'Unwraps a radial or spiral tunnel (the opposite of `tunnel`).',
    syntax: 'detunnel MEDIA_KEY SPIRAL=false',
    args: [
      media(),
      {name: 'SPIRAL', default: 'false'},
    ],
  },
  {
    name: 'wave',
    category: 'distort',
    summary: 'Bends the media along a sine wave.',
    syntax: 'wave MEDIA_KEY AMPLITUDE=10 WAVE_LENGTH=64',
    args: [
      media(),
      {name: 'AMPLITUDE', default: '10', description: 'wave height'},
      {name: 'WAVE_LENGTH', default: '64', description: 'distance between waves'},
    ],
  },
  {
    name: 'waves',
    category: 'distort',
    summary: 'Animated, moving waves.',
    syntax: 'waves MEDIA_KEY AMPLITUDE=10 WAVE_LENGTH=64 SPEED=1',
    args: [
      media(),
      {name: 'AMPLITUDE', default: '10', description: 'wave height'},
      {name: 'WAVE_LENGTH', default: '64', description: 'distance between waves'},
      {name: 'SPEED', default: '1', range: '1..10'},
    ],
  },
  {
    name: 'wiggle',
    category: 'distort',
    summary: 'Adds a moving wiggle.',
    syntax: 'wiggle MEDIA_KEY DIRECTION=right AMOUNT=10 WAVELENGTHS=0.5',
    args: [
      media(),
      {name: 'DIRECTION', default: 'right', range: 'down, left, right, up'},
      {name: 'AMOUNT', default: '10', range: '1..100'},
      {name: 'WAVELENGTHS', default: '0.5', range: '0..100'},
    ],
  },
  {
    name: 'skew',
    category: 'distort',
    summary: 'Slants the media sideways (or up and down).',
    syntax: 'skew MEDIA_KEY AMOUNT=1 VERTICAL=false',
    args: [
      media(),
      {name: 'AMOUNT', default: '1'},
      {name: 'VERTICAL', default: 'false'},
    ],
  },
  {
    name: 'zoom',
    category: 'distort',
    summary: 'Zooms into the center of the media.',
    syntax: 'zoom MEDIA_KEY AMOUNT=1.2',
    args: [
      media(),
      {name: 'AMOUNT', default: '1.2', range: '0.01..10'},
    ],
  },
  {
    name: 'mirrorbottom',
    aliases: ['hooh'],
    category: 'distort',
    summary: 'Mirrors the bottom half onto the top half (hooh).',
    syntax: 'mirrorbottom MEDIA_KEY',
    args: [media()],
  },
  {
    name: 'mirrorleft',
    aliases: ['haah'],
    category: 'distort',
    summary: 'Mirrors the left half onto the right half (haah).',
    syntax: 'mirrorleft MEDIA_KEY',
    args: [media()],
  },
  {
    name: 'mirrorright',
    aliases: ['waaw'],
    category: 'distort',
    summary: 'Mirrors the right half onto the left half (waaw).',
    syntax: 'mirrorright MEDIA_KEY',
    args: [media()],
  },
  {
    name: 'mirrortop',
    aliases: ['woow'],
    category: 'distort',
    summary: 'Mirrors the top half onto the bottom half (woow).',
    syntax: 'mirrortop MEDIA_KEY',
    args: [media()],
  },
  {
    name: 'mandalascope',
    category: 'distort',
    summary: 'Turns the media into a mandala-like kaleidoscope.',
    syntax: 'mandalascope MEDIA_KEY AMOUNT=12 SCALE=1.0 ROTATION=0 TRANSLATION=0 ZOOM=1.4',
    args: [
      media(),
      {name: 'AMOUNT', default: '12', range: '3..16', description: 'number of mirrored slices'},
      {name: 'SCALE', default: '1.0', range: '0.01..10.0'},
      {name: 'ROTATION', default: '0', range: '0..360'},
      {name: 'TRANSLATION', default: '0', range: '0..200'},
      {name: 'ZOOM', default: '1.4', range: '0.01..10.0'},
    ],
  },
  {
    name: 'rotate3d',
    category: 'distort',
    summary: 'Rotates the media in 3D space (pan, tilt and roll).',
    syntax: 'rotate3d MEDIA_KEY PAN=0 TILT=0 ROLL=0 ZOOM=1 CROPMODE=none ORDER=ptr',
    args: [
      media(),
      {name: 'PAN', default: '0', range: '-360..360', description: 'turn left/right'},
      {name: 'TILT', default: '0', range: '-360..360', description: 'tip forward/back'},
      {name: 'ROLL', default: '0', range: '-360..360', description: 'spin like a wheel'},
      {name: 'ZOOM', default: '1', range: '-3.0..3.0'},
      {name: 'CROPMODE', default: 'none', range: 'auto, center, none, zoomcenter'},
      {name: 'ORDER', default: 'ptr', description: '1 to 3 letters from `p`, `t`, `r` giving the rotation order, e.g. `ptr` is pan, then tilt, then roll'},
    ],
    examples: [
      {code: '{mediascript:load {iv} img\nrotate3d img 30 20 0\nrender img image/png}', result: 'Turns the image as if seen from an angle.'},
      {code: '{mediascript:load {avatar} pfp\nsetframecount pfp 36\nforeachframe pfp 0 pfpfc {jsonify:\nrotate3d pfpx idx*10 0 0\n}\nrender pfp image/gif}', result: 'A full 3D turn over 36 frames.'},
    ],
  },
  {
    name: 'spin',
    category: 'distort',
    summary: 'Makes the media spin around.',
    syntax: 'spin MEDIA_KEY CLOCKWISE=true CIRCLE=true CROP=true',
    args: [
      media(),
      {name: 'CLOCKWISE', default: 'true'},
      {name: 'CIRCLE', default: 'true', description: 'crop to a circle first'},
      {name: 'CROP', default: 'true'},
    ],
    notes: ['Turns a still image into a 20-frame GIF.'],
  },
  {
    name: 'spin3d',
    category: 'distort',
    summary: 'Spins the media around in 3D space.',
    syntax: 'spin3d MEDIA_KEY TILT=15 ZOOM=1.5 CLOCKWISE=TRUE',
    args: [
      media(),
      {name: 'TILT', default: '15', range: '-360..360'},
      {name: 'ZOOM', default: '1.5', range: '-3..3'},
      {name: 'CLOCKWISE', default: 'TRUE'},
    ],
    notes: ['Turns a still image into a 37-frame GIF.'],
  },
  {
    name: 'orb',
    category: 'distort',
    summary: 'Wraps the media around a spinning orb or globe.',
    syntax: 'orb MEDIA_KEY DIRECTION=RIGHT',
    args: [
      media(),
      {name: 'DIRECTION', default: 'RIGHT', range: 'down, left, right, up'},
    ],
    notes: ['Turns a still image into a 30-frame GIF.'],
  },
  {
    name: 'shake',
    category: 'distort',
    summary: 'Shakes the media around.',
    syntax: 'shake MEDIA_KEY HORIZONTAL=10 VERTICAL=10 RANDOMIZE=false',
    args: [
      media(),
      {name: 'HORIZONTAL', default: '10', range: '-10000..10000'},
      {name: 'VERTICAL', default: '10', range: '-10000..10000'},
      {name: 'RANDOMIZE', default: 'false'},
    ],
    notes: ['Turns a still image into a 15-frame GIF.'],
  },
  {
    name: 'shaketriggered',
    aliases: ['triggered'],
    category: 'distort',
    summary: 'The shaking "triggered" meme, with the label underneath.',
    syntax: 'shaketriggered MEDIA_KEY',
    args: [media()],
    notes: ['Turns a still image into a 4-frame GIF.'],
  },
  {
    name: 'slide',
    category: 'distort',
    summary: 'Scrolls the media continuously in one direction, wrapping around.',
    syntax: 'slide MEDIA_KEY SPEED=1.0 DIRECTION=RIGHT',
    args: [
      media(),
      {name: 'SPEED', default: '1.0', range: '0.1..10.0'},
      {name: 'DIRECTION', default: 'RIGHT', range: 'down, left, right, up'},
    ],
  },
  {
    name: 'wall',
    category: 'distort',
    summary: 'Tiles the media onto a tilted wall.',
    syntax: 'wall MEDIA_KEY',
    args: [media()],
  },

  // audio
  {
    name: 'audioboostbass',
    category: 'audio',
    summary: 'Boosts the bass.',
    syntax: 'audioboostbass MEDIA_KEY',
    args: [media()],
  },
  {
    name: 'audiocompress',
    category: 'audio',
    summary: 'Lowers the audio quality on purpose.',
    syntax: 'audiocompress MEDIA_KEY',
    args: [media()],
  },
  {
    name: 'audiodestroy',
    category: 'audio',
    summary: 'Distorts the audio as much as possible (earrape).',
    syntax: 'audiodestroy MEDIA_KEY',
    args: [media()],
  },
  {
    name: 'audiopitch',
    category: 'audio',
    summary: 'Raises or lowers the pitch.',
    syntax: 'audiopitch MEDIA_KEY SCALE=2.0',
    args: [
      media(),
      {name: 'SCALE', default: '2.0', range: '0.17..2.0', description: 'pitch multiplier; below 1 is deeper'},
    ],
  },
  {
    name: 'audiodelay',
    category: 'audio',
    summary: 'Shifts the audio later (or earlier with a negative number) compared to the video.',
    syntax: 'audiodelay MEDIA_KEY DELAY=0.5',
    args: [
      media(),
      {name: 'DELAY', default: '0.5', description: 'seconds; can be negative'},
    ],
  },
  {
    name: 'audioreverse',
    category: 'audio',
    summary: 'Reverses only the audio, leaving the video as is.',
    syntax: 'audioreverse MEDIA_KEY',
    args: [media()],
  },
  {
    name: 'audiovibrato',
    category: 'audio',
    summary: 'Adds vibrato (a wobbling pitch).',
    syntax: 'audiovibrato MEDIA_KEY FREQUENCY=5.0 DEPTH=0.5',
    args: [
      media(),
      {name: 'FREQUENCY', default: '5.0', range: '0.1..20000.0', description: 'wobbles per second'},
      {name: 'DEPTH', default: '0.5', range: '0.0..1.0'},
    ],
  },
  {
    name: 'audiotremolo',
    category: 'audio',
    summary: 'Adds tremolo (a pulsing volume).',
    syntax: 'audiotremolo MEDIA_KEY FREQUENCY=5 DEPTH=0.5',
    args: [
      media(),
      {name: 'FREQUENCY', default: '5', range: '0.1..20000.0', description: 'pulses per second'},
      {name: 'DEPTH', default: '0.5', range: '0.0..1.0'},
    ],
  },
  {
    name: 'audioreverb',
    category: 'audio',
    summary: 'Adds reverb, like singing in a hall.',
    syntax: 'audioreverb MEDIA_KEY DECAY=0.88 DELAY=60 VOLUME=0.4',
    args: [
      media(),
      {name: 'DECAY', default: '0.88', range: '0.001..1.0'},
      {name: 'DELAY', default: '60', range: '1..20000', description: 'milliseconds'},
      {name: 'VOLUME', default: '0.4', range: '0..1'},
    ],
  },
  {
    name: 'audioflanger',
    category: 'audio',
    summary: 'Adds a flanger (a sweeping, jet-plane whoosh).',
    syntax: 'audioflanger MEDIA_KEY DELAY=0 DEPTH=2 REGEN=0 WIDTH=71 SPEED=0.5 PHASE=25',
    args: [
      media(),
      {name: 'DELAY', default: '0', range: '0..30'},
      {name: 'DEPTH', default: '2', range: '0..10'},
      {name: 'REGEN', default: '0', range: '-95..95'},
      {name: 'WIDTH', default: '71', range: '0..100'},
      {name: 'SPEED', default: '0.5', range: '0.1..10'},
      {name: 'PHASE', default: '25', range: '0..100'},
    ],
  },
  {
    name: 'audioequalizer',
    category: 'audio',
    summary: 'Adjusts seven frequency bands, in decibels.',
    syntax: 'audioequalizer MEDIA_KEY SUBBASS=0 BASS=0 LOWMIDS=0 MIDS=0 HIGHMIDS=0 TREBLE=0 AIR=0',
    args: [
      media(),
      {name: 'SUBBASS', default: '0', range: '-50..50'},
      {name: 'BASS', default: '0', range: '-50..50'},
      {name: 'LOWMIDS', default: '0', range: '-50..50'},
      {name: 'MIDS', default: '0', range: '-50..50'},
      {name: 'HIGHMIDS', default: '0', range: '-50..50'},
      {name: 'TREBLE', default: '0', range: '-50..50'},
      {name: 'AIR', default: '0', range: '-50..50'},
    ],
  },
  {
    name: 'volume',
    category: 'audio',
    summary: 'Sets the volume level.',
    syntax: 'volume MEDIA_KEY AMOUNT',
    args: [
      media(),
      {name: 'AMOUNT', range: '0..1000', description: 'volume level'},
    ],
  },
  {
    name: 'audioputconcat',
    category: 'audio',
    summary: 'Adds another media\'s audio after this media\'s audio.',
    syntax: 'audioputconcat MEDIA_KEY MEDIA_KEY_2 LONGEST=false LOOP=true',
    args: [
      media(),
      {name: 'MEDIA_KEY_2', description: 'the media whose audio is added'},
      {name: 'LONGEST', default: 'false', description: 'make the result as long as the longer of the two'},
      {name: 'LOOP', default: 'true', description: 'loop the shorter one to fill the time'},
    ],
  },
  {
    name: 'audioputmix',
    category: 'audio',
    summary: 'Mixes another media\'s audio on top of this media\'s audio.',
    syntax: 'audioputmix MEDIA_KEY MEDIA_KEY_2 LONGEST=false LOOP=true',
    args: [
      media(),
      {name: 'MEDIA_KEY_2', description: 'the media whose audio is mixed in'},
      {name: 'LONGEST', default: 'false', description: 'make the result as long as the longer of the two'},
      {name: 'LOOP', default: 'true', description: 'loop the shorter one to fill the time'},
    ],
  },
  {
    name: 'audioputreplace',
    category: 'audio',
    summary: 'Replaces this media\'s audio with another media\'s audio.',
    syntax: 'audioputreplace MEDIA_KEY AUDIO_NAME LONGEST=false LOOP=true',
    args: [
      media(),
      {name: 'AUDIO_NAME', description: 'the media key whose audio is used'},
      {name: 'LONGEST', default: 'false', description: 'make the result as long as the longer of the two'},
      {name: 'LOOP', default: 'true', description: 'loop the shorter one to fill the time'},
    ],
  },
];
