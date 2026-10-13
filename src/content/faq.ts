// FAQ content. Answers use a tiny markup that FaqPage renders:
//   `code`, [label](url or /path), blank line = new paragraph, lines starting with "- " = list.
// Facts here are checked against notsobot.ts (prefixes, permissions, settings) as of the category rework.

export type FaqSectionId = 'start' | 'commands' | 'server' | 'premium' | 'privacy';

export interface FaqSection {
  id: FaqSectionId,
  title: string,
  description: string,
}

export interface FaqQuestion {
  id: string,
  section: FaqSectionId,
  question: string,
  answer: string,
}


export const FAQ_SECTIONS: Array<FaqSection> = [
  {id: 'start', title: 'Getting Started', description: 'Adding the bot and running your first command.'},
  {id: 'commands', title: 'Commands & Media', description: 'Images, videos, downloads and file limits.'},
  {id: 'server', title: 'Server Setup', description: 'Prefixes, permissions, restrictions and logging.'},
  {id: 'premium', title: 'Premium & AI', description: 'NotSoPremium tiers and NotSoAI.'},
  {id: 'privacy', title: 'Privacy & Support', description: 'Your data and where to get help.'},
];


export const FAQ_QUESTIONS: Array<FaqQuestion> = [
  // getting started
  {
    id: 'add-to-server',
    section: 'start',
    question: 'How do I add NotSoBot to my server?',
    answer: 'Use the [Add to Discord](/invite) button and pick your server. You need the **Manage Server** permission in that server to add bots.\n\nOnce it joins, try `.help` or type `/` in any channel to browse its slash commands.',
  },
  {
    id: 'use-without-server',
    section: 'start',
    question: 'Can I use NotSoBot without adding it to a server?',
    answer: 'Yes. You can add NotSoBot to your Discord account instead of a server. Its slash commands and right-click menu commands (like **Download** or **OCR** on a message) then work in DMs and in servers that allow external apps.\n\nPrefix commands like `.magik` only work in servers the bot has been added to.',
  },
  {
    id: 'how-to-run-commands',
    section: 'start',
    question: 'How do I run a command?',
    answer: 'There are three ways:\n\n- Type the prefix and the command name, like `.magik` (the default prefix is `.`)\n- Mention the bot instead of a prefix, like `@NotSoBot magik`\n- Use slash commands by typing `/` and picking one\n\nThe [command list](/commands) shows every command, its usage and examples.',
  },
  {
    id: 'not-responding',
    section: 'start',
    question: 'The bot isn\'t responding to my commands. What\'s wrong?',
    answer: 'Usually it\'s one of these:\n\n- **Missing permissions.** NotSoBot needs View Channel, Send Messages, Embed Links, Attach Files and Read Message History in that channel. Run `/help-permissions-check` to find out what\'s missing.\n- **A different prefix.** The server may have set a custom prefix, which replaces `.`. Mention the bot (`@NotSoBot prefixes`) to see which ones are active.\n- **The channel, your role or the command is restricted.** Server admins can limit where and by whom the bot is used (see [Server Setup](#section-server)).',
  },

  // commands & media
  {
    id: 'image-input',
    section: 'commands',
    question: 'How do I use an image command on a specific picture?',
    answer: 'Image and video commands take their input from, in order of preference:\n\n- A file attached to your message\n- A message you\'re replying to\n- A URL, a custom emoji, or a user (for their avatar), like `.magik @someone`\n\nIf you don\'t give it anything, NotSoBot uses the most recent image or video in the channel.',
  },
  {
    id: 'chain-effects',
    section: 'commands',
    question: 'Can I apply several effects at once?',
    answer: 'Yes, with `.pipe`. Separate the commands with semicolons, for example `.pipe flip; flop`. Up to 5 commands can be chained, and each one runs on the result of the one before it.',
  },
  {
    id: 'download-videos',
    section: 'commands',
    question: 'How do I download a video from TikTok, Instagram, YouTube and so on?',
    answer: 'Use `.download <url>` or `/download`. You can also right-click (or long-press) a message containing a link and choose **Apps → Download**.\n\nTo change the default video quality for your downloads, use `/settings set download-quality`.',
  },
  {
    id: 'files-as-links',
    section: 'commands',
    question: 'Why did I get a link instead of a file?',
    answer: 'When a result is bigger than Discord lets the bot upload, NotSoBot hosts it on [nsb.gg](https://nsb.gg) and sends you a link instead. Those links are temporary. With NotSoPremium they can be kept permanently.\n\nYou can control when this happens with `/settings set file-upload-threshold` and `/settings set file-upload-type`.',
  },
  {
    id: 'undo',
    section: 'commands',
    question: 'How do I delete the bot\'s response to my command?',
    answer: 'Run `.undo` in the same channel to remove the bot\'s responses to your last command, or `.undo 5` for your last five.',
  },
  {
    id: 'nsfw',
    section: 'commands',
    question: 'Why was my result blocked, or why can\'t I use NSFW commands?',
    answer: 'NSFW commands only work in channels marked as **age-restricted**. In other channels, NotSoBot scans media it produces and blocks anything that may be NSFW. Searches use SafeSearch unless the channel is age-restricted.\n\nTo allow NSFW results, a server admin has to mark the channel as age-restricted in its channel settings.',
  },

  // server setup
  {
    id: 'change-prefix',
    section: 'server',
    question: 'How do I change the bot\'s prefix?',
    answer: 'Use `.prefixes add <prefix>` to add one, `.prefixes replace <prefix>` to swap all of them for a single new one, and `.prefixes remove <prefix>` to remove one. These need the **Manage Server** permission.\n\nOnce a server has custom prefixes, the default `.` stops working there. Mentioning the bot always works, so `@NotSoBot prefixes` shows what\'s active.',
  },
  {
    id: 'restrict-channels',
    section: 'server',
    question: 'How do I limit NotSoBot to certain channels, roles or users?',
    answer: 'Use the allowlist and blocklist (these need **Administrator**):\n\n- `.allowlist add #bot-commands`: the bot only responds in allowlisted channels, roles or users\n- `.blocklist add #general @Role`: the bot ignores blocklisted channels, roles or users\n\nRun `.allowlist` or `.blocklist` on its own to see the current lists.',
  },
  {
    id: 'disable-command',
    section: 'server',
    question: 'How do I turn off a specific command?',
    answer: 'Use `.commands blocklist add <command>`, for example `.commands blocklist add rule34`. Add `-channels` to only disable it in certain channels: `.commands blocklist add rule34 -channels lobby`. This needs the **Manage Server** permission.',
  },
  {
    id: 'loggers',
    section: 'server',
    question: 'Can NotSoBot log what happens in my server?',
    answer: 'Yes. Set up loggers for bans, channels, members, messages, roles, users and voice, for example `.loggers add messages -channel message-logs`. Run `.loggers` to see what\'s currently being logged and where.',
  },
  {
    id: 'language',
    section: 'server',
    question: 'Can NotSoBot reply in my language?',
    answer: 'Yes, it\'s available in 33 languages. Use `/settings set locale` to pick yours, or `/settings-server set locale` to set the server\'s default.',
  },

  // premium & ai
  {
    id: 'premium',
    section: 'premium',
    question: 'What is NotSoPremium?',
    answer: 'NotSoPremium is an optional subscription, bought through Discord on NotSoBot\'s profile. It comes in three tiers:\n\n- **NotSoPremium**: premium-only commands and permanent file hosting on nsb.gg\n- **NotSoPremium Plus**: everything above, plus the heavier premium commands\n- **NotSoPremium Plus AI**: everything above, plus NotSoAI\n\nSome commands work for the whole server when the server owner has premium.',
  },
  {
    id: 'notsoai',
    section: 'premium',
    question: 'How do I talk to NotSoAI?',
    answer: 'Mention the bot with a message, or reply to one of its messages, and NotSoAI will answer. It needs **NotSoPremium Plus AI**, either yours or the server owner\'s. You can set its personality with `/settings set ai-personality`.',
  },

  // privacy & support
  {
    id: 'data',
    section: 'privacy',
    question: 'What data does NotSoBot store about me?',
    answer: 'Your basic Discord profile (ID, username, avatar), the settings you choose, tags you create, and records of which commands you use. The [Privacy Policy](/legal/privacy) has the details.',
  },
  {
    id: 'delete-data',
    section: 'privacy',
    question: 'How do I get my data deleted?',
    answer: 'Email [privacy@notsocompany.com](mailto:privacy@notsocompany.com) from an address you can verify, and include your Discord user ID.',
  },
  {
    id: 'support',
    section: 'privacy',
    question: 'Where do I report a bug or get more help?',
    answer: 'Join the [support server](/support) and ask there. Include the command you ran and what happened, and a screenshot if you can.',
  },
  {
    id: 'created',
    section: 'privacy',
    question: 'When was NotSoBot created?',
    answer: 'April 16, 2016.',
  },
];


// plain text for searching (markup stripped)
export function faqSearchText(question: FaqQuestion): string {
  return `${question.question} ${question.answer}`
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[`*]/g, '')
    .toLowerCase();
}
