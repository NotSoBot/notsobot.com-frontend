import { BookOpen, Check, Copy, Link2 } from 'lucide-react';
import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router';

import { Segmented } from '@/components/ui/Segmented';
import { SearchInput } from '@/components/ui/SearchInput';
import { Routes } from '@/config';
import {
  MEDIASCRIPT_CATEGORIES,
  MEDIASCRIPT_COMMANDS_SORTED,
  MEDIASCRIPT_GUIDE,
  TAG_DOC_CATEGORIES,
  TAG_DOC_FUNCTIONS,
  TAG_DOC_GUIDE,
  mediaScriptCommandAnchor,
  mediaScriptCommandSearchText,
  tagFunctionAnchor,
  tagFunctionSearchText,
  type TagDocExample,
  type TagDocFunction,
  type TagDocGuideSection,
  type TagDocMediaScriptCommand,
} from '@/content/tagDocs';
import { cn } from '@/lib/utils';


type DocsView = 'tagscript' | 'mediascript';

const VIEW_OPTIONS: Array<{value: DocsView, label: string}> = [
  {value: 'tagscript', label: 'TagScript'},
  {value: 'mediascript', label: 'MediaScript'},
];

// MediaScript anchors are all prefixed with `ms-`, so a shared link opens the right view
const MEDIASCRIPT_ANCHOR_PREFIX = 'ms-';

const HASH_SCROLL_DELAY_MS = 250;

function guideAnchor(view: DocsView, section: TagDocGuideSection): string {
  return (view === 'mediascript') ? `${MEDIASCRIPT_ANCHOR_PREFIX}guide-${section.id}` : `guide-${section.id}`;
}

function categoryAnchor(view: DocsView, id: string): string {
  return (view === 'mediascript') ? `${MEDIASCRIPT_ANCHOR_PREFIX}ref-${id}` : `ref-${id}`;
}

function guideSearchText(section: TagDocGuideSection): string {
  return [section.title, section.body, ...(section.table?.rows.flat() ?? [])].join(' ').toLowerCase();
}

// exact name hits first, then anything mentioning the query
function search<T>(items: ReadonlyArray<T>, needle: string, text: (item: T) => string, names: (item: T) => Array<string>): ReadonlyArray<T> {
  if (!needle) {
    return items;
  }
  return items
    .filter((item) => text(item).includes(needle))
    .sort((a, b) => Number(!names(a).includes(needle)) - Number(!names(b).includes(needle)));
}


export function TagDocsPage() {
  const location = useLocation();
  const [ searchParams, setSearchParams ] = useSearchParams();
  const [ query, setQuery ] = useState('');

  const hash = decodeURIComponent(location.hash.slice(1));
  const view: DocsView = (searchParams.get('view') === 'mediascript' || hash.startsWith(MEDIASCRIPT_ANCHOR_PREFIX)) ? 'mediascript' : 'tagscript';
  const setView = (value: string) => {
    setSearchParams((value === 'mediascript') ? {view: value} : {}, {replace: true});
    window.scrollTo({top: 0});
  };

  const needle = query.trim().toLowerCase();
  const guide = useMemo(() => {
    const sections = (view === 'mediascript') ? MEDIASCRIPT_GUIDE : TAG_DOC_GUIDE;
    return (needle) ? sections.filter((section) => guideSearchText(section).includes(needle)) : sections;
  }, [view, needle]);

  const categories = useMemo(() => {
    if (view === 'mediascript') {
      const commands = search(MEDIASCRIPT_COMMANDS_SORTED, needle, mediaScriptCommandSearchText, (command) => [command.name, ...(command.aliases ?? [])]);
      return MEDIASCRIPT_CATEGORIES.map((category) => {
        const items = commands.filter((command) => command.category === category.id);
        return {...category, count: items.length, items: items.map((command) => <MediaScriptCard key={command.name} command={command} highlight={needle}/>)};
      }).filter((category) => category.count);
    }
    const functions = search(TAG_DOC_FUNCTIONS, needle, tagFunctionSearchText, (fn) => fn.names);
    return TAG_DOC_CATEGORIES.map((category) => {
      const items = functions.filter((fn) => fn.category === category.id);
      return {...category, count: items.length, items: items.map((fn) => <FunctionCard key={fn.id} fn={fn} highlight={needle}/>)};
    }).filter((category) => category.count);
  }, [view, needle]);
  const total = categories.reduce((sum, category) => sum + category.count, 0);
  const noun = (view === 'mediascript') ? 'command' : 'function';

  // `/docs/tags#fn-upper` scrolls to that function. It waits for the router's own scroll handling
  // on load (which runs after this lazy page mounts) so it lands in the right place.
  useEffect(() => {
    if (!hash) {
      return;
    }
    const timer = window.setTimeout(() => document.getElementById(hash)?.scrollIntoView({block: 'start'}), HASH_SCROLL_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [hash]);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({block: 'start'});
    window.history.replaceState(null, '', `${location.search}#${id}`);
  };

  // no ligatures: JetBrains Mono would otherwise draw `!=` and `>=` as single glyphs, which can't be typed
  return (
    <div className='[font-variant-ligatures:none]'>
      <div className='border-b border-line bg-surface'>
        <div className='container-page py-10 sm:py-12'>
          <div className='mb-3 flex items-center gap-2 text-sm font-medium text-brand'>
            <BookOpen className='size-4'/>
            Documentation
          </div>
          <h1 className='mb-2 text-3xl font-bold text-white sm:text-4xl'>Tag Scripting</h1>
          <p className='mb-6 max-w-2xl text-muted'>
            {(view === 'mediascript') ? (
              <>MediaScript edits images, audio, and video from inside a tag, one command per line. These {MEDIASCRIPT_COMMANDS_SORTED.length} commands run through <code className='font-mono text-code'>{'{mediascript}'}</code>.</>
            ) : (
              <>Tags are saved messages that can do much more than reply with text. Use these {TAG_DOC_FUNCTIONS.length} functions to read arguments, store data, edit images, call APIs, and build interactive replies.</>
            )}
          </p>
          <div className='flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-center'>
            <Segmented label='Language' value={view} options={VIEW_OPTIONS} onChange={setView}/>
            <SearchInput
              className='min-w-0 flex-1'
              value={query}
              onValueChange={setQuery}
              placeholder={(view === 'mediascript') ? 'Search commands, e.g. “caption” or “gif”...' : 'Search functions, e.g. “upper” or “random”...'}
              aria-label='Search the documentation'
            />
          </div>
          {(needle) ? (
            <p className='mt-2 text-sm text-muted' aria-live='polite'>
              {total} {(total === 1) ? noun : `${noun}s`} and {guide.length} guide {(guide.length === 1) ? 'section' : 'sections'} for “{query.trim()}”
            </p>
          ) : null}
        </div>
      </div>

      <div className='container-page grid grid-cols-[minmax(0,1fr)] gap-8 py-10 lg:grid-cols-[230px_minmax(0,1fr)]'>
        <nav aria-label='Documentation sections' className='hidden lg:sticky lg:top-24 lg:block lg:max-h-[calc(100vh-7rem)] lg:self-start lg:overflow-y-auto'>
          {(guide.length) ? (
            <>
              <h2 className='section-label mb-2 px-1'>Guide</h2>
              <ul className='mb-6 space-y-0.5'>
                {guide.map((section) => (
                  <li key={section.id}>
                    <SidebarButton onClick={() => scrollTo(guideAnchor(view, section))}>{section.title.replaceAll('`', '')}</SidebarButton>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          {(categories.length) ? (
            <>
              <h2 className='section-label mb-2 px-1'>Reference</h2>
              <ul className='space-y-0.5'>
                {categories.map((category) => (
                  <li key={category.id}>
                    <SidebarButton onClick={() => scrollTo(categoryAnchor(view, category.id))} count={category.count}>
                      {category.title}
                    </SidebarButton>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </nav>

        <div className='min-w-0 space-y-12'>
          {(guide.length) ? (
            <div className='space-y-6'>
              {guide.map((section) => <GuideSection key={section.id} anchor={guideAnchor(view, section)} section={section} highlight={needle}/>)}
            </div>
          ) : null}

          {categories.map((category) => (
            <section key={category.id} id={categoryAnchor(view, category.id)} aria-labelledby={`${categoryAnchor(view, category.id)}-title`} className='scroll-mt-24'>
              <header className='mb-4'>
                <h2 id={`${categoryAnchor(view, category.id)}-title`} className='text-xl font-semibold text-white'>{category.title}</h2>
                <p className='text-sm text-muted'>{category.description}</p>
              </header>
              <div className='space-y-4'>{category.items}</div>
            </section>
          ))}

          {(!total && !guide.length) ? (
            <div className='card p-10 text-center'>
              <p className='mb-1 text-lg text-white'>Nothing matches “{query.trim()}”.</p>
              <p className='text-muted'>
                {(view === 'mediascript') ? 'Try a command name like ' : 'Try a function name like '}
                <code className='font-mono text-code'>{(view === 'mediascript') ? 'caption' : 'args'}</code>
                {(view === 'mediascript') ? ', or search the TagScript functions instead.' : ', or search the MediaScript commands instead.'}
              </p>
            </div>
          ) : null}

          <aside className='flex flex-col items-start justify-between gap-4 rounded-lg border border-brand/30 bg-gradient-to-r from-brand/20 to-brand/5 p-6 sm:flex-row sm:items-center'>
            <div>
              <h2 className='mb-1 text-lg font-semibold text-white'>Looking for inspiration?</h2>
              <p className='text-sm text-muted'>Browse tags other people have made, or ask in the support server.</p>
            </div>
            <div className='flex flex-wrap gap-2'>
              <Link to={Routes.TAG_DIRECTORY} className='btn btn-secondary'>Tag Directory</Link>
              <a href={Routes.SUPPORT} className='btn btn-discord'>Join the support server</a>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}


function SidebarButton({ onClick, count, children }: {onClick: () => void, count?: number, children: ReactNode}) {
  return (
    <button
      type='button'
      onClick={onClick}
      className='flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-1.5 text-left text-sm text-muted transition-colors hover:bg-surface-2 hover:text-white'
    >
      <span className='min-w-0 truncate'>{children}</span>
      {(count !== undefined) ? <span className='ml-auto shrink-0 pl-2 text-xs text-subtle tabular-nums'>{count}</span> : null}
    </button>
  );
}


function GuideSection({ anchor, section, highlight }: {anchor: string, section: TagDocGuideSection, highlight: string}) {
  return (
    <section id={anchor} className='scroll-mt-24 rounded-lg border border-line bg-surface p-5 sm:p-6'>
      <h2 className='group mb-3 flex items-center gap-2 text-xl font-semibold text-white'>
        <span><Inline text={section.title} highlight={highlight}/></span>
        <AnchorLink id={anchor}/>
      </h2>
      <Prose text={section.body} highlight={highlight}/>
      {(section.table) ? (
        <div className='mt-4 overflow-x-auto rounded-md border border-line'>
          <table className='w-full text-left text-sm'>
            <thead className='bg-deep text-xs tracking-wide text-subtle uppercase'>
              <tr>{section.table.columns.map((column) => <th key={column} className='px-3 py-2 font-semibold'>{column}</th>)}</tr>
            </thead>
            <tbody>
              {section.table.rows.map((row, i) => (
                <tr key={i} className='border-t border-line align-top'>
                  {row.map((cell, j) => (
                    <td key={j} className={cn('px-3 py-2', (j === 0) ? 'font-mono text-code whitespace-nowrap' : 'text-fg')}>
                      {(j === 0) ? <Highlight text={cell} query={highlight}/> : <Inline text={cell} highlight={highlight}/>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {(section.examples?.length) ? <Examples examples={section.examples}/> : null}
    </section>
  );
}


function FunctionCard({ fn, highlight }: {fn: TagDocFunction, highlight: string}) {
  const anchor = tagFunctionAnchor(fn);
  const [ name, ...aliases ] = fn.names;
  return (
    <article id={anchor} className='scroll-mt-24 rounded-lg border border-line bg-surface p-5'>
      <header className='mb-2 flex flex-wrap items-center gap-x-3 gap-y-1.5'>
        <h3 className='group flex items-center gap-2 font-mono text-lg font-semibold text-white'>
          <span>{'{'}<Highlight text={name} query={highlight}/>{'}'}</span>
          <AnchorLink id={anchor}/>
        </h3>
        {(aliases.length) ? (
          <div className='flex flex-wrap gap-1.5'>
            {aliases.map((alias) => (
              <span key={alias} className='rounded bg-surface-3 px-1.5 py-0.5 font-mono text-xs text-muted'>
                <Highlight text={alias} query={highlight}/>
              </span>
            ))}
          </div>
        ) : null}
      </header>
      <p className='mb-3 text-fg'><Inline text={fn.summary} highlight={highlight}/></p>

      <CodeBlock code={fn.syntax}/>

      {(fn.description) ? <div className='mt-3'><Prose text={fn.description} highlight={highlight}/></div> : null}

      {(fn.args?.length) ? (
        <dl className='mt-4 space-y-2 text-sm'>
          {fn.args.map((arg) => (
            <div key={arg.name} className='flex flex-col gap-0.5 sm:flex-row sm:gap-3'>
              <dt className='shrink-0 font-mono text-code sm:w-36'>
                {arg.name}
                {(arg.optional) ? <span className='ml-1.5 font-sans text-xs text-subtle'>optional</span> : null}
              </dt>
              <dd className='text-muted'><Inline text={arg.description} highlight=''/></dd>
            </div>
          ))}
        </dl>
      ) : null}

      {(fn.examples?.length) ? <Examples examples={fn.examples}/> : null}

      {(fn.notes?.length) ? (
        <ul className='mt-4 space-y-1.5 text-sm text-muted'>
          {fn.notes.map((note, i) => (
            <li key={i} className='flex gap-2.5'>
              <span aria-hidden className='mt-2 size-1.5 shrink-0 rounded-full bg-warning'/>
              <span><Inline text={note} highlight=''/></span>
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}


function MediaScriptCard({ command, highlight }: {command: TagDocMediaScriptCommand, highlight: string}) {
  const anchor = mediaScriptCommandAnchor(command);
  return (
    <article id={anchor} className='scroll-mt-24 rounded-lg border border-line bg-surface p-5'>
      <header className='mb-2 flex flex-wrap items-center gap-x-3 gap-y-1.5'>
        <h3 className='group flex items-center gap-2 font-mono text-lg font-semibold text-white'>
          <Highlight text={command.name} query={highlight}/>
          <AnchorLink id={anchor}/>
        </h3>
        {(command.aliases?.length) ? (
          <div className='flex flex-wrap gap-1.5'>
            {command.aliases.map((alias) => (
              <span key={alias} className='rounded bg-surface-3 px-1.5 py-0.5 font-mono text-xs text-muted'>
                <Highlight text={alias} query={highlight}/>
              </span>
            ))}
          </div>
        ) : null}
      </header>
      <p className='mb-3 text-fg'><Inline text={command.summary} highlight={highlight}/></p>

      <CodeBlock code={command.syntax}/>

      {(command.args?.length) ? (
        <dl className='mt-4 space-y-2 text-sm'>
          {command.args.map((arg, i) => (
            <div key={i} className='flex flex-col gap-0.5 sm:flex-row sm:gap-3'>
              <dt className='shrink-0 font-mono text-code sm:w-40'>
                {(arg.rest) ? '...' : null}{arg.name}
                {(arg.default !== undefined) ? <span className='ml-1.5 text-xs text-subtle'>= {arg.default}</span> : null}
              </dt>
              <dd className='text-muted'>
                {(arg.description) ? <Inline text={arg.description} highlight=''/> : null}
                {(arg.range) ? (
                  <span className={cn('text-xs text-subtle', arg.description && 'ml-2')}>
                    <Inline text={`\`${arg.range}\``} highlight=''/>
                  </span>
                ) : null}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      {(command.examples?.length) ? <Examples examples={command.examples}/> : null}

      {(command.notes?.length) ? (
        <ul className='mt-4 space-y-1.5 text-sm text-muted'>
          {command.notes.map((note, i) => (
            <li key={i} className='flex gap-2.5'>
              <span aria-hidden className='mt-2 size-1.5 shrink-0 rounded-full bg-warning'/>
              <span><Inline text={note} highlight=''/></span>
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}


function Examples({ examples }: {examples: Array<TagDocExample>}) {
  return (
    <div className='mt-4 space-y-3'>
      <h4 className='section-label'>{(examples.length === 1) ? 'Example' : 'Examples'}</h4>
      {examples.map((example, i) => (
        <div key={i} className='overflow-hidden rounded-md border border-line'>
          <CodeBlock code={example.code} bare/>
          {(example.result) ? (
            <div className='border-t border-line bg-surface-2 px-3 py-2 text-sm text-muted'>
              <span className='mr-2 text-subtle select-none'>→</span>
              <Inline text={example.result} highlight=''/>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}


function CodeBlock({ code, bare }: {code: string, bare?: boolean}) {
  const [ copied, setCopied ] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard blocked, nothing to do
    }
  };
  return (
    <div className={cn('group relative bg-deep', !bare && 'rounded-md')}>
      <pre className='overflow-x-auto px-3 py-2.5 pr-10 font-mono text-sm leading-relaxed whitespace-pre-wrap break-words text-code'>{code}</pre>
      <button
        type='button'
        onClick={copy}
        aria-label='Copy code'
        className='absolute top-1.5 right-1.5 cursor-pointer rounded p-1.5 text-subtle opacity-0 transition-opacity group-hover:opacity-100 hover:bg-surface-3 hover:text-white focus-visible:opacity-100'
      >
        {(copied) ? <Check className='size-3.5 text-success'/> : <Copy className='size-3.5'/>}
      </button>
    </div>
  );
}


function AnchorLink({ id }: {id: string}) {
  return (
    <a
      href={`#${id}`}
      aria-label='Link to this section'
      className='text-subtle opacity-0 transition-opacity group-hover:opacity-100 hover:text-white focus-visible:opacity-100'
    >
      <Link2 className='size-4'/>
    </a>
  );
}


// ---- tiny markup renderer: paragraphs split by blank lines, `- ` lists, and `inline code` ----

function Prose({ text, highlight }: {text: string, highlight: string}) {
  return (
    <div className='space-y-3 leading-relaxed text-fg'>
      {text.split('\n\n').map((block, i) => {
        const lines = block.split('\n');
        if (lines.every((line) => line.startsWith('- '))) {
          return (
            <ul key={i} className='space-y-1.5 pl-1'>
              {lines.map((line, j) => (
                <li key={j} className='flex gap-2.5'>
                  <span aria-hidden className='mt-2.5 size-1.5 shrink-0 rounded-full bg-brand'/>
                  <span><Inline text={line.slice(2)} highlight={highlight}/></span>
                </li>
              ))}
            </ul>
          );
        }
        return <p key={i} className='whitespace-pre-line'><Inline text={block} highlight={highlight}/></p>;
      })}
    </div>
  );
}


const INLINE_PATTERN = /(`[^`]+`)/g;

function Inline({ text, highlight }: {text: string, highlight: string}) {
  return (
    <>
      {text.split(INLINE_PATTERN).map((part, i) => {
        if (part.startsWith('`') && part.endsWith('`') && 2 < part.length) {
          return <code key={i} className='rounded bg-deep box-decoration-clone px-1.5 py-0.5 font-mono text-[0.85em] text-code'>{part.slice(1, -1)}</code>;
        }
        return <Fragment key={i}><Highlight text={part} query={highlight}/></Fragment>;
      })}
    </>
  );
}


function Highlight({ text, query }: {text: string, query: string}) {
  if (!query) {
    return <>{text}</>;
  }
  const lower = text.toLowerCase();
  const parts: Array<ReactNode> = [];
  let index = 0;
  while (index < text.length) {
    const found = lower.indexOf(query, index);
    if (found === -1) {
      parts.push(text.slice(index));
      break;
    }
    if (index < found) {
      parts.push(text.slice(index, found));
    }
    parts.push(<mark key={found} className='rounded-sm bg-warning/30 px-0.5 text-white'>{text.slice(found, found + query.length)}</mark>);
    index = found + query.length;
  }
  return <>{parts}</>;
}
