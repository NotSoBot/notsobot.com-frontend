import type { ReactNode } from 'react';
import { Link } from 'react-router';

import { Routes } from '@/config';


export const PERSONALITY_TAGSCRIPT_EXAMPLE = 'You are a pirate talking to {user}. {if:{len:{args}}|<|40|then:They asked something short, so answer in one sentence.|else:Give a detailed, step-by-step answer.}';


// The bot runs the personality through TagScript (when it has braces) before every AI reply,
// with `{args}` set to what was asked.
export function PersonalityHint({ children }: {children: ReactNode}) {
  return (
    <span className='block space-y-1'>
      <span className='block'>
        {children} Supports <Link to={Routes.TAG_DOCS} className='text-brand hover:underline'>TagScript</Link>, run before every reply,
        with <code className='font-mono text-fg'>{'{args}'}</code> as the message sent to the AI, so the prompt can change with what was asked.
      </span>
      <span className='block'>
        For example: <code className="font-mono text-code break-words [font-feature-settings:'calt'_0,'liga'_0]">{PERSONALITY_TAGSCRIPT_EXAMPLE}</code>
      </span>
    </span>
  );
}
