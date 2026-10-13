import { MessageSquare, TrendingUp, User } from 'lucide-react';
import type { CSSProperties } from 'react';

import { CommandTypes, type CommandType } from '@/lib/api';
import { cn, formatCompact, formatNumber } from '@/lib/utils';

import { categoryMeta, PREFIXES, type Entry } from './commandMeta';


// cards read their accent from `--cat`
export function categoryStyle(category: string): CSSProperties {
  return {'--cat': categoryMeta(category).color} as CSSProperties;
}


export function CommandName({ type, name, className }: {type: CommandType, name: string, className?: string}) {
  const Icon = (type === CommandTypes.APPLICATION_MENU_USER) ? User : (type === CommandTypes.APPLICATION_MENU_MESSAGE) ? MessageSquare : null;
  return (
    <span className={cn('inline-flex min-w-0 items-center gap-1.5 font-mono', className)}>
      {(Icon) ? <Icon aria-hidden className='size-4 shrink-0 text-muted'/> : null}
      <span className='truncate'>{(Icon) ? null : <span className='text-subtle'>{PREFIXES[type]}</span>}{name}</span>
    </span>
  );
}


export function CategoryBadge({ category, className }: {category: string, className?: string}) {
  if (!category) {
    return null;
  }
  const meta = categoryMeta(category);
  const Icon = meta.icon;
  return (
    <span
      style={categoryStyle(category)}
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        'bg-[color-mix(in_srgb,var(--cat)_16%,transparent)] text-[color-mix(in_srgb,var(--cat)_75%,white)]',
        className,
      )}
    >
      <Icon aria-hidden className='size-3'/>
      {meta.label}
    </span>
  );
}


export function UsesLabel({ entry, className }: {entry: Entry, className?: string}) {
  if (!entry.uses) {
    return <span className={cn('text-xs text-subtle', className)}>No uses this week</span>;
  }
  const hot = entry.rank !== null && entry.rank <= 10;
  return (
    <span
      title={`${formatNumber(entry.uses)} uses in the last 7 days · #${entry.rank} overall`}
      className={cn('inline-flex items-center gap-1 text-xs tabular-nums', hot ? 'text-white' : 'text-muted', className)}
    >
      {(hot) ? <TrendingUp aria-hidden className='size-3.5 text-success'/> : null}
      {formatCompact(entry.uses)}<span className='text-subtle'>/wk</span>
    </span>
  );
}


export function CommandCard({ entry, onOpen }: {entry: Entry, onOpen: () => void}) {
  const { metadata } = entry;
  return (
    <li>
      <button
        type='button'
        onClick={onOpen}
        style={categoryStyle(entry.category)}
        className={cn(
          'group flex h-full w-full cursor-pointer flex-col rounded-lg border border-line bg-surface p-4 text-left transition-colors',
          'border-l-[3px] border-l-[var(--cat)] hover:border-line-strong hover:border-l-[var(--cat)] hover:bg-surface-2',
        )}
      >
        <CommandName type={metadata.type} name={metadata.name} className='text-base font-semibold text-white'/>
        <p className='mt-1.5 mb-3 line-clamp-2 text-sm text-muted'>{metadata.description || 'No description available'}</p>
        <div className='mt-auto flex items-center justify-between gap-2'>
          <div className='flex min-w-0 items-center gap-1.5'>
            <CategoryBadge category={entry.category}/>
            {(metadata.dmable) ? <span className='rounded bg-success/15 px-1.5 py-0.5 text-xs font-medium text-success'>DM</span> : null}
          </div>
          <UsesLabel entry={entry}/>
        </div>
      </button>
    </li>
  );
}


export function TrendingCard({ entry, max, onOpen }: {entry: Entry, max: number, onOpen: () => void}) {
  const meta = categoryMeta(entry.category);
  const Icon = meta.icon;
  return (
    <li>
      <button
        type='button'
        onClick={onOpen}
        style={categoryStyle(entry.category)}
        className='group relative flex h-full w-full cursor-pointer flex-col overflow-hidden rounded-lg border border-line bg-surface p-4 text-left transition-colors hover:border-[var(--cat)]'
      >
        {/* soft category glow in the corner */}
        <span aria-hidden className='pointer-events-none absolute -top-10 -right-10 size-28 rounded-full bg-[var(--cat)] opacity-15 blur-2xl transition-opacity group-hover:opacity-25'/>
        <div className='mb-3 flex items-center justify-between'>
          <span className='text-sm font-bold text-subtle tabular-nums'>#{entry.rank}</span>
          <span className='flex size-8 items-center justify-center rounded-md bg-[color-mix(in_srgb,var(--cat)_18%,transparent)]'>
            <Icon aria-hidden className='size-4 text-[var(--cat)]'/>
          </span>
        </div>
        <CommandName type={entry.metadata.type} name={entry.metadata.name} className='text-lg font-semibold text-white'/>
        <p className='mt-1 mb-4 line-clamp-1 text-sm text-muted'>{entry.metadata.description || meta.label}</p>
        <div className='mt-auto'>
          <div className='mb-1.5 flex items-baseline justify-between'>
            <span className='text-xl font-bold text-white tabular-nums'>{formatCompact(entry.uses)}</span>
            <span className='text-xs text-subtle'>uses this week</span>
          </div>
          <div className='h-1 overflow-hidden rounded-full bg-deep'>
            <div className='h-full rounded-full bg-[var(--cat)]' style={{width: `${Math.max(4, (entry.uses / max) * 100)}%`}}/>
          </div>
        </div>
      </button>
    </li>
  );
}
