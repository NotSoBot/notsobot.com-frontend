import { X } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';

import { ImageComparison } from '@/components/ui/ImageComparison';
import { CommandMediaTypes, type Command } from '@/lib/api';
import { cn, formatNumber } from '@/lib/utils';

import { CategoryBadge, categoryStyle, CommandName } from './CommandCards';
import { PREFIXES, TYPE_LABELS, type Entry } from './commandMeta';


export function CommandDrawer({ entry, siblings, totalRanked, onSelect, onClose }: {
  entry: Entry,
  // the same command under its other types (e.g. the slash version of a prefix command)
  siblings: Array<Entry>,
  totalRanked: number,
  onSelect: (key: string) => void,
  onClose: () => void,
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const { metadata } = entry;
  const prefix = PREFIXES[metadata.type] ?? '';

  // focus in, Escape out, page scroll locked, focus handed back on close
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = overflow;
      previouslyFocused?.focus?.();
    };
  }, [onClose]);

  return (
    <div className='fixed inset-0 z-50'>
      <div aria-hidden className='absolute inset-0 animate-fade-in bg-black/60' onClick={onClose}/>
      <aside
        role='dialog'
        aria-modal='true'
        aria-labelledby='command-drawer-title'
        style={categoryStyle(entry.category)}
        className='absolute inset-y-0 right-0 flex w-full max-w-xl animate-drawer-in flex-col border-l border-line bg-surface shadow-2xl shadow-black/50'
      >
        <header className='relative border-b border-line p-5'>
          <span aria-hidden className='absolute inset-x-0 top-0 h-1 bg-[var(--cat)]'/>
          <div className='mb-3 flex items-center justify-between gap-3'>
            <div className='flex flex-wrap items-center gap-2'>
              <CategoryBadge category={entry.category}/>
              <span className='rounded bg-surface-3 px-2 py-0.5 text-xs text-muted'>{TYPE_LABELS[metadata.type]}</span>
              {(metadata.dmable) ? <span className='rounded bg-success/15 px-2 py-0.5 text-xs font-medium text-success'>Works in DMs</span> : null}
            </div>
            <button ref={closeRef} type='button' aria-label='Close' onClick={onClose} className='btn btn-ghost -mr-2 p-2'>
              <X className='size-5'/>
            </button>
          </div>
          <h2 id='command-drawer-title'>
            <CommandName type={metadata.type} name={metadata.name} className='text-2xl font-semibold text-white'/>
          </h2>
          <p className='mt-2 text-muted'>{metadata.description || 'No description available'}</p>

          <dl className='mt-4 grid grid-cols-2 gap-2'>
            <div className='rounded-md bg-deep px-3 py-2'>
              <dt className='text-xs text-muted'>Uses this week</dt>
              <dd className='text-lg font-semibold text-white tabular-nums'>{formatNumber(entry.uses)}</dd>
            </div>
            <div className='rounded-md bg-deep px-3 py-2'>
              <dt className='text-xs text-muted'>Popularity</dt>
              <dd className='text-lg font-semibold text-white tabular-nums'>
                {(entry.rank) ? <>#{entry.rank} <span className='text-sm font-normal text-subtle'>of {totalRanked}</span></> : '—'}
              </dd>
            </div>
          </dl>
        </header>

        <div className='flex-1 space-y-5 overflow-y-auto p-5'>
          {(metadata.usage) ? (
            <Section title='Usage'>
              <code className='code-block'>{prefix}{metadata.name} {metadata.usage}</code>
            </Section>
          ) : null}

          <MediaPreview command={entry.command}/>

          {(metadata.examples.length) ? (
            <Section title='Examples'>
              <div className='space-y-1'>
                {metadata.examples.map((example, i) => <code key={i} className='code-block'>{prefix}{example}</code>)}
              </div>
            </Section>
          ) : null}

          {(metadata.args?.length) ? (
            <Section title='Arguments'>
              <div className='space-y-2'>
                {metadata.args.map((arg) => (
                  <div key={arg.name} className='rounded bg-deep px-3 py-2'>
                    <span className='font-mono text-sm text-code'>{arg.prefix}{arg.name}</span>
                    {(arg.aliases.length) ? (
                      <span className='ml-2 font-mono text-xs text-subtle'>({arg.aliases.map((alias) => `${arg.prefix}${alias}`).join(', ')})</span>
                    ) : null}
                    {(arg.description) ? <p className='mt-1 text-sm text-muted'>{arg.description}</p> : null}
                  </div>
                ))}
              </div>
            </Section>
          ) : null}

          {(metadata.aliases.length) ? (
            <Section title='Aliases'>
              <div className='flex flex-wrap gap-2'>
                {metadata.aliases.map((alias) => <span key={alias} className='rounded bg-surface-3 px-2.5 py-1 font-mono text-sm text-fg'>{prefix}{alias}</span>)}
              </div>
            </Section>
          ) : null}

          {(siblings.length) ? (
            <Section title='Also available as'>
              <div className='flex flex-wrap gap-2'>
                {siblings.map((sibling) => (
                  <button
                    key={sibling.key}
                    type='button'
                    onClick={() => onSelect(sibling.key)}
                    className='flex cursor-pointer items-center gap-2 rounded-md border border-line bg-deep px-3 py-1.5 text-sm transition-colors hover:border-[var(--cat)]'
                  >
                    <CommandName type={sibling.metadata.type} name={sibling.metadata.name} className='text-white'/>
                    <span className='text-xs text-subtle'>{TYPE_LABELS[sibling.metadata.type]}</span>
                  </button>
                ))}
              </div>
            </Section>
          ) : null}

          {(metadata.ratelimits?.length) ? (
            <Section title='Ratelimits'>
              <ul className='flex flex-wrap gap-2'>
                {metadata.ratelimits.map((limit, i) => (
                  <li key={i} className='rounded bg-surface-3 px-2.5 py-1 text-sm text-fg'>
                    {limit.limit} per {limit.duration / 1000}s <span className='text-subtle'>/ {limit.type}</span>
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}
        </div>
      </aside>
    </div>
  );
}


function MediaPreview({ command }: {command: Command}) {
  const before = command.media?.find((media) => media.type === CommandMediaTypes.BEFORE);
  const after = command.media?.find((media) => media.type === CommandMediaTypes.AFTER);
  if (before && after) {
    return <Section title='Preview'><ImageComparison before={before.url} after={after.url}/></Section>;
  }
  const single = after || before;
  if (!single) {
    return null;
  }
  return (
    <Section title='Preview'>
      <img src={single.url} alt='Command preview' loading='lazy' className={cn('size-64 rounded border border-line object-cover')}/>
    </Section>
  );
}


function Section({ title, children }: {title: string, children: ReactNode}) {
  return (
    <section>
      <h3 className='section-label mb-2'>{title}</h3>
      {children}
    </section>
  );
}
