import { useState, type ReactNode } from 'react';

import { cn } from '@/lib/utils';


// Discord-flavored markdown (the same text shows up in the bot's embeds), rendered straight to React nodes so nothing
// the user wrote is ever treated as HTML. Supports headings, `-#` subtext, quotes, lists, code blocks, bold, italics,
// underline, strikethrough, spoilers, inline code, custom emojis and http(s) links (masked or bare).
export function Markdown({ text, className }: {text: string, className?: string}) {
  return <div className={cn('min-w-0 space-y-2 break-words', className)}>{renderBlocks(text)}</div>;
}


// The text without any markdown syntax, for places that only have room for a line or two (directory cards).
export function stripMarkdown(text: string): string {
  // escaped characters are set aside first so they don't count as markdown
  const escaped: Array<string> = [];
  let stripped = text
    .replace(/\\([^\w\s])/g, (_, char: string) => String.fromCharCode(0xE000 + escaped.push(char) - 1))
    .replace(/```[^\n]*\n?([\s\S]*?)```/g, '$1')
    .replace(/^ *(?:#{1,3}|-#) +/gm, '')
    .replace(/^ *(?:>>> |> )/gm, '')
    .replace(/^( *)[-*] +/gm, '$1• ')
    .replace(/<a?:(\w+):\d+>/g, ':$1:')
    .replace(/\[([^\]\n]+)\]\(<?https?:\/\/[^\s)>]+>?\)/g, '$1')
    .replace(/<(https?:\/\/[^\s>]+)>/g, '$1');
  // repeated for nesting, `***both***` and `*a **b** c*`
  for (let previous = ''; previous !== stripped;) {
    previous = stripped;
    stripped = stripped
      .replace(/(\*\*|__|~~|\|\||\*|`)(?=\S)([\s\S]*?\S)\1/g, '$2')
      .replace(/(^|\W)_(?=\S)([\s\S]*?\S)_(?!\w)/g, '$1$2');
  }
  return stripped.replace(/[\uE000-\uF8FF]/g, (char) => escaped[char.charCodeAt(0) - 0xE000] ?? char);
}


const FENCE_PATTERN = /^ *```/;
const HEADING_PATTERN = /^ *(#{1,3}) +(.+)$/;
const SUBTEXT_PATTERN = /^ *-# +(.+)$/;
const LIST_PATTERN = /^( *)([-*]|\d{1,9}\.) +(.*)$/;
const QUOTE_PATTERN = /^ *> ?(.*)$/;
const QUOTE_REST_PATTERN = /^ *>>> ?(.*)$/;

const HEADING_CLASSES = ['text-xl font-bold', 'text-lg font-bold', 'text-base font-semibold'];

function renderBlocks(text: string): Array<ReactNode> {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const blocks: Array<ReactNode> = [];
  let paragraph: Array<string> = [];

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push(<p key={blocks.length} className='whitespace-pre-wrap'>{renderInline(paragraph.join('\n'))}</p>);
      paragraph = [];
    }
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    if (FENCE_PATTERN.test(line)) {
      const close = lines.findIndex((other, j) => i < j && other.trimEnd().endsWith('```'));
      const opener = line.trim().slice(3);
      // ```js on its own line is a language hint, ```code``` on one line is all content
      if (opener.endsWith('```') && 3 <= opener.length) {
        flushParagraph();
        blocks.push(<CodeBlock key={blocks.length} code={opener.slice(0, -3)}/>);
        i++;
        continue;
      }
      if (close !== -1) {
        flushParagraph();
        const body = [(/^\w*$/.test(opener)) ? null : opener, ...lines.slice(i + 1, close), lines[close].trimEnd().slice(0, -3)];
        blocks.push(<CodeBlock key={blocks.length} code={body.filter((part) => part !== null).join('\n').replace(/^\n|\n$/g, '')}/>);
        i = close + 1;
        continue;
      }
    }

    const quoteRest = QUOTE_REST_PATTERN.exec(line);
    if (quoteRest) {
      flushParagraph();
      blocks.push(<Quote key={blocks.length} text={[quoteRest[1], ...lines.slice(i + 1)].join('\n')}/>);
      break;
    }

    if (QUOTE_PATTERN.test(line)) {
      flushParagraph();
      const quoted: Array<string> = [];
      while (i < lines.length && QUOTE_PATTERN.test(lines[i]) && !QUOTE_REST_PATTERN.test(lines[i])) {
        quoted.push(QUOTE_PATTERN.exec(lines[i])![1]);
        i++;
      }
      blocks.push(<Quote key={blocks.length} text={quoted.join('\n')}/>);
      continue;
    }

    const heading = HEADING_PATTERN.exec(line);
    if (heading) {
      flushParagraph();
      const Tag = (['h4', 'h5', 'h6'] as const)[heading[1].length - 1];
      blocks.push(<Tag key={blocks.length} className={cn('text-white', HEADING_CLASSES[heading[1].length - 1])}>{renderInline(heading[2])}</Tag>);
      i++;
      continue;
    }

    const subtext = SUBTEXT_PATTERN.exec(line);
    if (subtext) {
      flushParagraph();
      blocks.push(<p key={blocks.length} className='text-xs text-subtle'>{renderInline(subtext[1])}</p>);
      i++;
      continue;
    }

    if (LIST_PATTERN.test(line)) {
      flushParagraph();
      const items: Array<{depth: number, marker: string | null, text: string}> = [];
      while (i < lines.length && LIST_PATTERN.test(lines[i])) {
        const [ , indent, marker, content ] = LIST_PATTERN.exec(lines[i])!;
        items.push({depth: Math.min(2, Math.floor(indent.length / 2)), marker: (marker.endsWith('.')) ? marker : null, text: content});
        i++;
      }
      blocks.push(
        <ul key={blocks.length} className='space-y-1'>
          {items.map((item, j) => (
            <li key={j} className='flex gap-2' style={{marginLeft: `${item.depth * 1.25}rem`}}>
              {(item.marker) ? (
                <span className='shrink-0 text-subtle tabular-nums'>{item.marker}</span>
              ) : (
                <span aria-hidden className={cn('mt-[0.6em] size-1.5 shrink-0 rounded-full', (item.depth) ? 'border border-current text-subtle' : 'bg-current text-subtle')}/>
              )}
              <span className='min-w-0'>{renderInline(item.text)}</span>
            </li>
          ))}
        </ul>,
      );
      continue;
    }

    if (line.trim()) {
      paragraph.push(line);
    } else {
      flushParagraph();
    }
    i++;
  }
  flushParagraph();
  return blocks;
}


function CodeBlock({ code }: {code: string}) {
  return (
    <pre className='overflow-x-auto rounded-md border border-line bg-deep p-3 font-mono text-[0.85em] leading-relaxed whitespace-pre text-fg'>
      <code>{code}</code>
    </pre>
  );
}


function Quote({ text }: {text: string}) {
  return (
    <blockquote className='border-l-4 border-line-strong pl-3'>
      <div className='space-y-2'>{renderBlocks(text)}</div>
    </blockquote>
  );
}


function Spoiler({ children }: {children: ReactNode}) {
  const [ revealed, setRevealed ] = useState(false);
  if (revealed) {
    return <span className='rounded bg-white/10 box-decoration-clone px-0.5'>{children}</span>;
  }
  return (
    <span
      role='button'
      tabIndex={0}
      aria-label='Spoiler, click to reveal'
      className='cursor-pointer rounded bg-deep box-decoration-clone px-0.5 text-transparent select-none hover:bg-surface-3 [&_*]:invisible'
      onClick={() => setRevealed(true)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          setRevealed(true);
        }
      }}
    >
      {children}
    </span>
  );
}


function safeUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    return (parsed.protocol === 'http:' || parsed.protocol === 'https:') ? parsed.href : null;
  } catch {
    return null;
  }
}

function ExternalLink({ href, children }: {href: string, children: ReactNode}) {
  return (
    <a href={href} target='_blank' rel='noopener noreferrer nofollow ugc' className='text-code hover:underline'>
      {children}
    </a>
  );
}


const ESCAPE_PATTERN = /\\([^\w\s])/y;
const CODE_PATTERN = /(``?)(?!`)([\s\S]+?)\1(?!`)/y;
const MASKED_LINK_PATTERN = /\[([^\]\n]+)\]\(<?(https?:\/\/[^\s)>]+)>?\)/y;
const ANGLE_LINK_PATTERN = /<(https?:\/\/[^\s>]+)>/y;
const BARE_LINK_PATTERN = /https?:\/\/[^\s<]+[^\s<.,:;"')\]!?]/y;
const EMOJI_PATTERN = /<(a?):(\w{2,32}):(\d{15,21})>/y;

// longest first, so `**` isn't read as two `*`s
const DELIMITERS: Array<{token: string, wrap: (children: ReactNode, key: number) => ReactNode}> = [
  {token: '**', wrap: (children, key) => <strong key={key} className='font-bold text-white'>{children}</strong>},
  {token: '__', wrap: (children, key) => <u key={key}>{children}</u>},
  {token: '~~', wrap: (children, key) => <s key={key}>{children}</s>},
  {token: '||', wrap: (children, key) => <Spoiler key={key}>{children}</Spoiler>},
  {token: '*', wrap: (children, key) => <em key={key}>{children}</em>},
  {token: '_', wrap: (children, key) => <em key={key}>{children}</em>},
];

function matchAt(pattern: RegExp, text: string, index: number): RegExpExecArray | null {
  pattern.lastIndex = index;
  return pattern.exec(text);
}

const isWordChar = (char: string | undefined) => !!char && /\w/.test(char);

// finds where a delimiter opened at `start` closes, or -1
function findClose(text: string, token: string, start: number): number {
  const open = start + token.length;
  if (text.length <= open || /\s/.test(text[open])) {
    return -1;
  }
  // `_` only works on word boundaries, so snake_case_names stay as they are
  if (token === '_' && isWordChar(text[start - 1])) {
    return -1;
  }
  let found = text.indexOf(token, open + 1);
  while (found !== -1) {
    let runEnd = found + token.length;
    while (text[runEnd] === token[0]) {
      runEnd++;
    }
    // a `**` inside `*...*` belongs to a nested span, skip over it
    if (token.length === 1 && 1 < runEnd - found) {
      found = text.indexOf(token, runEnd);
      continue;
    }
    // close on the last characters of a run, so `***both***` is bold around italics
    const close = runEnd - token.length;
    if (!/\s/.test(text[close - 1]) && !(token === '_' && isWordChar(text[runEnd]))) {
      return close;
    }
    found = text.indexOf(token, runEnd);
  }
  return -1;
}

function renderInline(text: string): Array<ReactNode> {
  const nodes: Array<ReactNode> = [];
  let plain = '';
  const pushPlain = () => {
    if (plain) {
      nodes.push(plain);
      plain = '';
    }
  };

  let i = 0;
  outer: while (i < text.length) {
    const char = text[i];

    if (char === '\\') {
      const escaped = matchAt(ESCAPE_PATTERN, text, i);
      if (escaped) {
        plain += escaped[1];
        i += escaped[0].length;
        continue;
      }
    }

    if (char === '`') {
      const code = matchAt(CODE_PATTERN, text, i);
      if (code) {
        pushPlain();
        nodes.push(<code key={nodes.length} className='rounded bg-deep box-decoration-clone px-1 py-0.5 font-mono text-[0.85em]'>{code[2].trim() || code[2]}</code>);
        i += code[0].length;
        continue;
      }
    }

    if (char === '[') {
      const link = matchAt(MASKED_LINK_PATTERN, text, i);
      const href = link && safeUrl(link[2]);
      if (link && href) {
        pushPlain();
        nodes.push(<ExternalLink key={nodes.length} href={href}>{renderInline(link[1])}</ExternalLink>);
        i += link[0].length;
        continue;
      }
    }

    if (char === '<') {
      const emoji = matchAt(EMOJI_PATTERN, text, i);
      if (emoji) {
        pushPlain();
        const [ , animated, name, id ] = emoji;
        nodes.push(
          <img
            key={nodes.length}
            src={`https://cdn.discordapp.com/emojis/${id}.${(animated) ? 'gif' : 'webp'}?size=48`}
            alt={`:${name}:`}
            title={`:${name}:`}
            loading='lazy'
            className='inline-block size-[1.375em] object-contain align-[-0.3em]'
          />,
        );
        i += emoji[0].length;
        continue;
      }
      const angle = matchAt(ANGLE_LINK_PATTERN, text, i);
      const href = angle && safeUrl(angle[1]);
      if (angle && href) {
        pushPlain();
        nodes.push(<ExternalLink key={nodes.length} href={href}>{angle[1]}</ExternalLink>);
        i += angle[0].length;
        continue;
      }
    }

    if (char === 'h' && !isWordChar(text[i - 1])) {
      const bare = matchAt(BARE_LINK_PATTERN, text, i);
      const href = bare && safeUrl(bare[0]);
      if (bare && href) {
        pushPlain();
        nodes.push(<ExternalLink key={nodes.length} href={href}>{bare[0]}</ExternalLink>);
        i += bare[0].length;
        continue;
      }
    }

    for (const delimiter of DELIMITERS) {
      if (text.startsWith(delimiter.token, i)) {
        const close = findClose(text, delimiter.token, i);
        if (close !== -1) {
          pushPlain();
          nodes.push(delimiter.wrap(renderInline(text.slice(i + delimiter.token.length, close)), nodes.length));
          i = close + delimiter.token.length;
          continue outer;
        }
      }
    }

    plain += char;
    i++;
  }
  pushPlain();
  return nodes;
}
