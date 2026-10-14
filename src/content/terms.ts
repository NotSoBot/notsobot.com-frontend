import type { LegalDocument } from './legal';

export const TERMS_OF_SERVICE: LegalDocument = {
  title: "Terms of Service",
  effective: "November 12, 2026",
  lastUpdated: "October 13, 2026",
  intro: "Please read these Terms of Service carefully before using NotSoBot. They explain what you can and can't do with the Service, what we store when you use it, and how to reach us.",
  sections: [
    {
      title: "Section 1 - Definitions",
      blocks: [
        {type: 'paragraph', text: "For the purposes of these Terms:"},
        {type: 'list', items: [
          "\"Company\", \"We\", \"Us\" or \"Our\" refers to NotSoCompany, 254 Chapman Rd, Ste 208 #8692 Newark, Delaware 19702.",
          "\"Service\" refers to NotSoBot, including the NotSoBot Discord application (its slash commands, prefixed commands, context menu commands and user-installed commands), the website at notsobot.com, and the NotSoBot API.",
          "\"Discord\" refers to Discord Inc. and the Discord platform through which most of the Service is used.",
          "\"Your Content\" means anything You provide to the Service, including command text, prompts, attachments, URLs, tags, reminders, reports and audio samples.",
          "\"Output\" means anything the Service generates in response to Your Content, including edited media, AI-generated text, images and audio.",
          "\"Third-party Service\" means any service, website or content provider that is not owned or controlled by the Company and that the Service relies on or links to.",
          "\"You\" means the individual using the Service, or the server, company or other entity on whose behalf that individual is using it.",
        ]},
      ],
    },
    {
      title: "Section 2 - Acceptance and Eligibility",
      blocks: [
        {type: 'paragraph', text: "By adding NotSoBot to a server, installing it to your account, running any of its commands, or using the website or API, You agree to these Terms and to Our Privacy Policy. If You don't agree, don't use the Service. A server administrator who adds NotSoBot to a server is responsible for making sure its use in that server follows these Terms."},
        {type: 'paragraph', text: "You must be at least 18 years old to use the Service. The Company does not permit anyone under 18 to use it. Features marked as NSFW are only available in channels Discord marks as age-restricted."},
        {type: 'paragraph', text: "You must also follow the Discord Terms of Service and Discord Community Guidelines while using the Service. Nothing in these Terms permits anything Discord's terms prohibit."},
      ],
    },
    {
      title: "Section 3 - Acceptable Use",
      blocks: [
        {type: 'paragraph', text: "You agree not to use the Service to:"},
        {type: 'list', items: [
          "create, upload, request or distribute child sexual abuse material or any sexualized content involving minors, whether real or AI-generated",
          "create or share sexual or intimate imagery of a real person without their consent, or sexual deepfakes of anyone",
          "clone, imitate or generate the voice of any person without their explicit permission",
          "harass, threaten, dox, impersonate or defraud anyone",
          "promote violence, violent extremism, self-harm, or any illegal activity",
          "post NSFW content outside of age-restricted channels",
          "infringe anyone's copyright, trademark or other rights",
          "spam, automate or abuse commands, get around rate limits, premium restrictions or blocks, or interfere with the Service's operation or security",
          "scrape, mine or bulk-collect data through the Service, or use the Service to collect information about other Discord users",
          "violate the Discord Terms of Service, Discord Community Guidelines or any applicable law",
        ]},
        {type: 'paragraph', text: "Server administrators can disable commands, block users or channels, and remove NotSoBot from their server at any time, and You can remove a user-installed NotSoBot from your account at any time."},
      ],
    },
    {
      title: "Section 4 - Your Content and Output",
      blocks: [
        {type: 'paragraph', text: "You keep whatever rights You have in Your Content. You give Us a limited, worldwide, non-exclusive license to store, process, transform and display Your Content only as needed to run the Service for You, for example to edit an image You sent, save a tag You created, or send You a reminder. This license ends when Your Content is deleted, except where We are required to keep it under Section 7 or Section 8."},
        {type: 'paragraph', text: "You are responsible for Your Content and must have the right to use it with the Service. Output is provided for You to use as You like, subject to these Terms and the rights of others. Output may be similar to output generated for other users."},
        {type: 'paragraph', text: "Tags You create in a server, or publish to the tag directory, can be seen and used by others in that server or in the directory. Server administrators may edit or remove tags in their server."},
      ],
    },
    {
      title: "Section 5 - AI Features",
      blocks: [
        {type: 'paragraph', text: "Some commands use artificial intelligence to generate text, images, audio, transcriptions, translations and descriptions of media. AI output can be wrong, offensive or misleading. Don't rely on it for medical, legal, financial or safety decisions, and check anything important yourself."},
        {type: 'paragraph', text: "AI providers only receive data when You use an AI feature: the ai command, a tag that uses AI, or voice cloning. The prompt, any media You provide, and any messages You reply to with the ai command are sent to the company that runs the AI model being used, only to generate Your result. Our Privacy Policy lists these companies. They handle it under their own terms and privacy policies. Other AI features, such as image generation and transcription, run on Our own servers. We do not use Discord message content to train machine learning or AI models."},
        {type: 'paragraph', text: "Voice cloning sends the audio sample You provide to ElevenLabs to create a voice that only You can use through the Service. You may only clone your own voice, or a voice whose owner has given You explicit permission. Deleting a cloned voice also deletes it from ElevenLabs."},
      ],
    },
    {
      title: "Section 6 - Data We Store",
      blocks: [
        {type: 'paragraph', text: "We only store data needed to provide the Service's features, keep it secure and prevent abuse. Our Privacy Policy explains this in more detail. Depending on which features You use, We store:"},
        {type: 'list', items: [
          "Discord account information: your user ID, username, discriminator, avatar, account flags, and the ID of your DM channel with NotSoBot.",
          "Your settings: language, timezone, units, response display preferences, file upload preferences, selected AI models and personality, and text-to-speech voice.",
          "Server information and settings for servers NotSoBot is in: server ID, name, icon, features, language, timezone, custom prefixes, AI settings, and command and user allowlists and blocklists along with who added each entry.",
          "Logging settings: if a server enables logging, the channel and webhook used to post logs, including the webhook token. Log events are sent to that webhook and are not kept by Us.",
          "Command replies: the IDs of your command message, its channel, the command used, and NotSoBot's reply, so that editing or deleting your command can update or remove the reply. The text of your command message is not stored.",
          "Command usage statistics: which command was used, when, and the server, channel and user IDs involved.",
          "Tags: names, content, variables, attached media, usage counts and directory listings for tags You create.",
          "Reminders: reminder text, times, and the channel and message they belong to.",
          "Reports You send with the report command, including the text, the server, channel and message IDs involved, and Our review notes.",
          "Uploaded files: files You ask NotSoBot to host, their file names, sizes, dimensions and file hashes (MD5, SHA-1 and BLAKE2b).",
          "AI requests: the prompt, including any messages You replied to with the ai command, along with the instructions, model, generated response, any error and token counts.",
          "Cloned voices: the voice's name and the ID of the voice stored at ElevenLabs. The audio sample itself is not kept by Us.",
          "Purchases: premium entitlements and subscription status received from Discord. Payments are processed by Discord, and We never see your payment details.",
          "Website and API use: if You log in to notsobot.com, a Discord OAuth2 access and refresh token with the scopes You approved, your login sessions and their browser user agent, and request logs including the IP address, user agent, path and response time.",
          "Safety records: information about content flagged by Our automated safety systems, described in Section 7.",
        ]},
        {type: 'paragraph', text: "We do not read or store messages that aren't directed at NotSoBot. NotSoBot only reads other messages when a command You run needs them. Recent messages read to find an image or build a word cloud are only used to complete that command and are not saved. Messages You reply to with the ai command are sent to the AI provider and stored as part of that AI request."},
        {type: 'paragraph', text: "We never sell, rent or license data from the Service. We don't share it with data brokers, advertising networks or other monetization services, and We don't use it to profile Discord users, track their relationships, or make eligibility decisions about anyone. We only use aggregated or de-identified data, such as total command counts, to improve the Service."},
      ],
    },
    {
      title: "Section 7 - Content Safety",
      blocks: [
        {type: 'paragraph', text: "To keep the Service safe and legal, media and prompts processed by NotSoBot may be scanned by automated safety systems. If something is flagged, We may block the result or refuse to host it, and We keep a record of the flag containing:"},
        {type: 'list', items: [
          "the user, server, channel, message and command involved",
          "the prompt, if the command used one",
          "the URL the media came from",
          "a cryptographic hash (SHA-256) and a perceptual hash (PDQ) of the media",
          "the safety scores and the action taken",
        ]},
        {type: 'paragraph', text: "We do not keep a copy of flagged media. Hashes can't be turned back into the original media, and We use them to recognize and block the same media if it's uploaded again."},
        {type: 'paragraph', text: "Flags may be reviewed by Our team. Flags found to be mistaken are dismissed. If a review confirms content that breaks these Terms or the law, We may block the users or servers involved, report the content to Discord, and report it to law enforcement or other authorities when the law requires it or when We believe it's needed to protect someone's safety. Flag records are kept to prevent repeat abuse, and for as long as the law requires for content We report."},
      ],
    },
    {
      title: "Section 8 - Data Retention and Deletion",
      blocks: [
        {type: 'list', items: [
          "Links between your command messages and NotSoBot's replies are deleted after 14 days of inactivity.",
          "Temporary files are deleted automatically when they expire.",
          "AI requests, including any messages You replied to, are deleted after 30 days.",
          "Tags, reminders and cloned voices are deleted when You delete them.",
          "Server settings are kept if NotSoBot is removed from a server, so they still apply if it is added back. A server owner can ask Us to delete them.",
          "Other data is kept while You use the Service, and deleted when You ask Us to delete it or when We no longer need it to provide the Service.",
        ]},
        {type: 'paragraph', text: "You can ask Us for a copy of your data, or to delete it, by using the report command or emailing privacy@notsocompany.com from the address linked to your request. We'll delete it within 30 days, except data We must keep for legal reasons, to deal with abuse, or for safety records under Section 7. Deleting your data may remove your tags, settings and premium perks."},
        {type: 'paragraph', text: "If We learn that data from the Service was accessed without authorization, We will notify Discord and affected users as required by the Discord Developer Terms of Service and applicable law."},
      ],
    },
    {
      title: "Section 9 - Third-party Services",
      blocks: [
        {type: 'paragraph', text: "The Service depends on Third-party Services, including Discord, AI providers, search and media sources, and infrastructure and error-monitoring providers. Content You request from websites such as YouTube, Reddit, Google or TikTok is fetched only to complete your command. Each Third-party Service has its own terms and privacy policy, and We are not responsible for their content, policies or practices."},
      ],
    },
    {
      title: "Section 10 - Premium",
      blocks: [
        {type: 'paragraph', text: "Some features require NotSoBot Premium. Premium is purchased through Discord, and Discord's own terms, billing and refund policies apply to those purchases. Premium perks may change over time. If your access is ended for breaking these Terms, You won't be refunded for unused time unless the law requires it."},
      ],
    },
    {
      title: "Section 11 - Reporting Problems",
      blocks: [
        {type: 'paragraph', text: "If You find a bug, a security problem, or someone using NotSoBot in a way that breaks these Terms, the Discord Terms of Service or the Discord Community Guidelines, report it with the report command or by email at privacy@notsocompany.com. We review reports and take action where appropriate, which may include removing content and blocking users or servers. You can also report problems to Discord directly."},
      ],
    },
    {
      title: "Section 12 - Termination",
      blocks: [
        {type: 'paragraph', text: "We may block, suspend or limit any user or server's access to the Service at any time, with or without notice, including for breaking these Terms. You can stop using the Service at any time by removing NotSoBot from your servers or your account."},
      ],
    },
    {
      title: "Section 13 - \"AS IS\" and \"AS AVAILABLE\" Disclaimer",
      blocks: [
        {type: 'paragraph', text: "The Service is provided \"AS IS\" and \"AS AVAILABLE\" with all faults and without warranty of any kind. To the maximum extent permitted by law, the Company disclaims all warranties, whether express, implied or statutory, including warranties of merchantability, fitness for a particular purpose, title and non-infringement. We don't promise that the Service will be uninterrupted, error-free, secure or accurate, or that any Output will meet your needs."},
        {type: 'paragraph', text: "Some jurisdictions don't allow some of these exclusions, so some of them may not apply to You. In that case they apply to the greatest extent the law allows."},
      ],
    },
    {
      title: "Section 14 - Limitation of Liability",
      blocks: [
        {type: 'paragraph', text: "To the maximum extent permitted by law, the Company's total liability to You for anything related to the Service is limited to the amount You paid for the Service in the 12 months before the claim, or 100 USD if You haven't paid anything. The Company is not liable for any indirect, incidental, special or consequential damages, including lost profits, lost data or loss of privacy, arising from your use of or inability to use the Service, even if We were told such damages were possible."},
      ],
    },
    {
      title: "Section 15 - Governing Law and Disputes",
      blocks: [
        {type: 'paragraph', text: "These Terms are governed by the laws of the State of Delaware, United States, excluding its conflict of law rules. If You have a concern or dispute about the Service, You agree to first try to resolve it informally by contacting Us. If You live in the European Union or United Kingdom, You also benefit from any mandatory consumer protections of the country where You live."},
        {type: 'paragraph', text: "You represent that You are not located in a country subject to a United States government embargo, and that You are not on any United States government list of prohibited or restricted parties."},
      ],
    },
    {
      title: "Section 16 - General",
      blocks: [
        {type: 'paragraph', text: "If any part of these Terms can't be enforced, the rest stays in effect. Not enforcing a part of these Terms doesn't waive our right to enforce it later. These Terms may be translated, but the English version controls if there's a conflict."},
      ],
    },
    {
      title: "Section 17 - Changes to These Terms",
      blocks: [
        {type: 'paragraph', text: "We may update these Terms from time to time. If a change is material, We'll make reasonable efforts to give at least 30 days' notice, for example on the website or in NotSoBot's support server, before it takes effect. Continuing to use the Service after a change takes effect means You accept the updated Terms."},
      ],
    },
    {
      title: "Section 18 - Contact Us",
      blocks: [
        {type: 'paragraph', text: "Questions about these Terms, data requests and reports can be sent to privacy@notsocompany.com, or through NotSoBot's report command."},
      ],
    },
  ],
};
