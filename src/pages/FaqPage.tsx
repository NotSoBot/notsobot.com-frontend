import { Check, ChevronDown, Crown, LifeBuoy, Link2, MessageCircleQuestion, Rocket, Shield, Terminal, type LucideIcon } from 'lucide-react';
import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router';

import { SearchInput } from '@/components/ui/SearchInput';
import { Routes } from '@/config';
import { FAQ_QUESTIONS, FAQ_SECTIONS, faqSearchText, type FaqQuestion, type FaqSectionId } from '@/content/faq';
import { cn } from '@/lib/utils';


const SECTION_ICONS: Record<FaqSectionId, LucideIcon> = {
  start: Rocket,
  commands: Terminal,
  server: Shield,
  premium: Crown,
  privacy: LifeBuoy,
};

const ANSWER_TRANSITION_MS = 200;

function sectionAnchor(id: FaqSectionId): string {
  return `section-${id}`;
}


export function FaqPage() {
  const location = useLocation();
  const [ query, setQuery ] = useState('');
  // answers opened by the reader; search results open on their own
  const [ open, setOpen ] = useState<Set<string>>(() => new Set());

  const needle = query.trim().toLowerCase();
  const matches = useMemo(() => {
    return (needle) ? FAQ_QUESTIONS.filter((question) => faqSearchText(question).includes(needle)) : FAQ_QUESTIONS;
  }, [needle]);

  // `/faq#change-prefix` opens and scrolls to that answer. The scroll waits for the answer's
  // open animation (and the router's own scroll handling on load) so it lands in the right place.
  useEffect(() => {
    const id = decodeURIComponent(location.hash.slice(1));
    const isQuestion = FAQ_QUESTIONS.some((question) => question.id === id);
    if (!isQuestion && !id.startsWith('section-')) {
      return;
    }
    if (isQuestion) {
      setOpen((previous) => new Set(previous).add(id));
    }
    const timer = window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({block: 'start'});
    }, ANSWER_TRANSITION_MS + 50);
    return () => window.clearTimeout(timer);
  }, [location.hash]);

  const toggle = (id: string) => {
    setOpen((previous) => {
      const next = new Set(previous);
      if (!next.delete(id)) {
        next.add(id);
      }
      return next;
    });
  };

  const scrollToSection = (id: FaqSectionId) => {
    document.getElementById(sectionAnchor(id))?.scrollIntoView({block: 'start'});
  };

  return (
    <>
      <div className='border-b border-line bg-surface'>
        <div className='container-page py-10 sm:py-12'>
          <div className='mb-3 flex items-center gap-2 text-sm font-medium text-brand'>
            <MessageCircleQuestion className='size-4'/>
            Help Center
          </div>
          <h1 className='mb-2 text-3xl font-bold text-white sm:text-4xl'>Frequently Asked Questions</h1>
          <p className='mb-6 max-w-2xl text-muted'>
            Everything about adding NotSoBot, running commands, setting it up for your server, premium and your data.
          </p>
          <SearchInput
            size='lg'
            className='max-w-2xl'
            value={query}
            onValueChange={setQuery}
            placeholder='Search questions and answers...'
            aria-label='Search the FAQ'
          />
          {(needle) ? (
            <p className='mt-2 text-sm text-muted' aria-live='polite'>
              {matches.length} {(matches.length === 1) ? 'answer' : 'answers'} for “{query.trim()}”
            </p>
          ) : null}
        </div>
      </div>

      <div className='container-page grid grid-cols-[minmax(0,1fr)] gap-8 py-10 lg:grid-cols-[230px_minmax(0,1fr)]'>
        <nav aria-label='FAQ sections' className='lg:sticky lg:top-24 lg:self-start'>
          <h2 className='section-label mb-2 hidden px-1 lg:block'>Sections</h2>
          <ul className='-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:px-0 lg:pb-0'>
            {FAQ_SECTIONS.map((section) => {
              const Icon = SECTION_ICONS[section.id];
              const count = matches.filter((question) => question.section === section.id).length;
              return (
                <li key={section.id}>
                  <button
                    type='button'
                    disabled={!count}
                    onClick={() => scrollToSection(section.id)}
                    className={cn(
                      'flex w-full shrink-0 cursor-pointer items-center gap-2.5 rounded-md border border-line px-3 py-2 text-left text-sm whitespace-nowrap text-muted transition-colors',
                      'hover:bg-surface-2 hover:text-white disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent lg:border-transparent',
                    )}
                  >
                    <Icon className='size-4 shrink-0 text-brand'/>
                    <span className='min-w-0 truncate'>{section.title}</span>
                    <span className='ml-auto shrink-0 pl-2 text-xs text-subtle tabular-nums'>{count}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className='min-w-0 space-y-10'>
          {FAQ_SECTIONS.map((section) => {
            const questions = matches.filter((question) => question.section === section.id);
            if (!questions.length) {
              return null;
            }
            const Icon = SECTION_ICONS[section.id];
            return (
              <section key={section.id} id={sectionAnchor(section.id)} aria-labelledby={`${sectionAnchor(section.id)}-title`} className='scroll-mt-24'>
                <header className='mb-4 flex items-center gap-3'>
                  <span className='flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand/15'>
                    <Icon className='size-5 text-brand'/>
                  </span>
                  <div>
                    <h2 id={`${sectionAnchor(section.id)}-title`} className='text-xl font-semibold text-white'>{section.title}</h2>
                    <p className='text-sm text-muted'>{section.description}</p>
                  </div>
                </header>
                <div className='overflow-hidden rounded-lg border border-line bg-surface'>
                  {questions.map((question, i) => (
                    <QuestionItem
                      key={question.id}
                      question={question}
                      open={!!needle || open.has(question.id)}
                      highlight={needle}
                      divider={0 < i}
                      onToggle={() => toggle(question.id)}
                    />
                  ))}
                </div>
              </section>
            );
          })}

          {(!matches.length) ? (
            <div className='card p-10 text-center'>
              <p className='mb-1 text-lg text-white'>No answers match “{query.trim()}”.</p>
              <p className='text-muted'>Try different words, or ask in the support server below.</p>
            </div>
          ) : null}

          <aside className='flex flex-col items-start justify-between gap-4 rounded-lg border border-brand/30 bg-gradient-to-r from-brand/20 to-brand/5 p-6 sm:flex-row sm:items-center'>
            <div>
              <h2 className='mb-1 text-lg font-semibold text-white'>Still stuck?</h2>
              <p className='text-sm text-muted'>Ask in the support server and someone will help you out.</p>
            </div>
            <div className='flex flex-wrap gap-2'>
              <a href={Routes.SUPPORT} className='btn btn-discord'>Join the support server</a>
              <Link to={Routes.COMMANDS} className='btn btn-secondary'>Browse commands</Link>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}


function QuestionItem({ question, open, highlight, divider, onToggle }: {
  question: FaqQuestion,
  open: boolean,
  highlight: string,
  divider: boolean,
  onToggle: () => void,
}) {
  const panelId = `${question.id}-answer`;
  return (
    <div id={question.id} className={cn('scroll-mt-24', divider && 'border-t border-line')}>
      <h3>
        <button
          type='button'
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
          className={cn(
            'flex w-full cursor-pointer items-center justify-between gap-4 border-l-[3px] px-5 py-4 text-left transition-colors hover:bg-surface-2',
            open ? 'border-l-brand bg-surface-2/60' : 'border-l-transparent',
          )}
        >
          <span className='font-medium text-white'><Highlight text={question.question} query={highlight}/></span>
          <ChevronDown className={cn('size-5 shrink-0 text-muted transition-transform duration-200', open && 'rotate-180 text-white')}/>
        </button>
      </h3>
      {/* grid-rows 0fr -> 1fr animates the height without measuring it */}
      <div
        id={panelId}
        role='region'
        aria-label={question.question}
        className={cn('grid border-l-[3px] transition-[grid-template-rows] duration-200 ease-out', open ? 'grid-rows-[1fr] border-l-brand bg-surface-2/60' : 'grid-rows-[0fr] border-l-transparent')}
      >
        <div className='overflow-hidden' inert={!open}>
          <div className='px-5 pb-4'>
            <Answer text={question.answer} highlight={highlight}/>
            <CopyLinkButton id={question.id}/>
          </div>
        </div>
      </div>
    </div>
  );
}


function CopyLinkButton({ id }: {id: string}) {
  const [ copied, setCopied ] = useState(false);
  const copy = async () => {
    const url = `${window.location.origin}${Routes.FAQ}#${id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      window.location.hash = id;
    }
  };
  return (
    <button type='button' onClick={copy} className='mt-3 flex cursor-pointer items-center gap-1.5 text-xs text-subtle transition-colors hover:text-white'>
      {(copied) ? <Check className='size-3.5 text-success'/> : <Link2 className='size-3.5'/>}
      {(copied) ? 'Link copied' : 'Copy link'}
    </button>
  );
}


// ---- tiny markup renderer for answers (see content/faq.ts) ----

function Answer({ text, highlight }: {text: string, highlight: string}) {
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
        return <p key={i}><Inline text={block} highlight={highlight}/></p>;
      })}
    </div>
  );
}


const INLINE_PATTERN = /(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g;

function Inline({ text, highlight }: {text: string, highlight: string}) {
  return (
    <>
      {text.split(INLINE_PATTERN).map((part, i) => {
        if (part.startsWith('`') && part.endsWith('`')) {
          return <code key={i} className='rounded bg-deep box-decoration-clone px-1.5 py-0.5 font-mono text-[0.85em] text-code'>{part.slice(1, -1)}</code>;
        }
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className='font-semibold text-white'><Highlight text={part.slice(2, -2)} query={highlight}/></strong>;
        }
        const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (link) {
          return <AnswerLink key={i} href={link[2]}><Highlight text={link[1]} query={highlight}/></AnswerLink>;
        }
        return <Fragment key={i}><Highlight text={part} query={highlight}/></Fragment>;
      })}
    </>
  );
}


function AnswerLink({ href, children }: {href: string, children: ReactNode}) {
  const className = 'font-medium text-brand underline-offset-4 hover:underline';
  if (href.startsWith('#')) {
    return <a href={href} className={className}>{children}</a>;
  }
  // `/invite` and `/support` are redirect routes, so let them do a full navigation
  if (href.startsWith('/') && href !== Routes.INVITE && href !== Routes.SUPPORT) {
    return <Link to={href} className={className}>{children}</Link>;
  }
  const external = /^https?:/.test(href);
  return <a href={href} className={className} {...(external ? {target: '_blank', rel: 'noreferrer'} : {})}>{children}</a>;
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
