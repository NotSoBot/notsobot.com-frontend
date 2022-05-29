import * as React from 'react';

import { NavPage } from '../NavPage';


interface Question {
  description: string,
  images?: {after?: string, before?: string},
  title: string,
}

const QUESTIONS: Array<Question> = [
  {
    title: 'How do I disable NSFW Searching? (SafeSearch)',
    description: 'SafeSearch is enabled by default based around two things, the Channel\'s NSFW Setting and the Server\'s NSFW Setting (Explicit Content Filter). NSFW commands are only allowed in NSFW Channels.',
  },
  {
    title: 'How do I change the Bot\'s Prefix?',
    description: 'Use `.prefixes add <prefix>`. Check the Bot\'s current prefixes by doing `@NotSoBot prefixes`',
  },
  {
    title: 'Does this Bot have a Leveling System?',
    description: 'We do not wish to add a leveling system to this bot since we believe it just creates more spam in servers.',
  },
  {
    title: 'Did the Owner(s) of NotSoBot Perish?',
    description: 'no',
  },
];

export function FAQPage() {
  return (
    <NavPage>

    </NavPage>
  );
}
