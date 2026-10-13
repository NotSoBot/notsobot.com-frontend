import { Check, Flame, LayoutGrid } from 'lucide-react';
import { useCallback, useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useSearchParams } from 'react-router';

import { SearchInput } from '@/components/ui/SearchInput';
import { Segmented } from '@/components/ui/Segmented';
import { readStored, writeStored } from '@/hooks/usePersistentState';
import { useCommandsQuery, useCommandStatsQuery } from '@/lib/api/queries';
import { cn, formatCompact } from '@/lib/utils';

import { CommandCard, TrendingCard } from './CommandCards';
import { CommandDrawer } from './CommandDrawer';
import {
  buildEntries,
  CATEGORY_ORDER,
  categoryMeta,
  compareByName,
  compareByUses,
  TYPE_OPTIONS,
  typeOptionFromParam,
} from './commandMeta';


// Filters live in the URL (shareable) and the last-used set is remembered, so coming back to a
// plain /commands (e.g. from the navbar) restores them. An explicit filter in the URL wins.
const FILTER_PARAMS = ['type', 'category', 'dm', 'q', 'sort'] as const;
const STORAGE_FILTERS = 'commands:filters';

const PAGE_SIZE = 60;
const TRENDING_COUNT = 8;


type Sort = 'popular' | 'az';


export function CommandsPage() {
  const [ searchParams, setSearchParams ] = useSearchParams();

  const typeOption = typeOptionFromParam(searchParams.get('type'));
  const category = (searchParams.get('category') || '').toUpperCase() || null;
  const dmOnly = searchParams.get('dm') === '1';
  const sort: Sort = (searchParams.get('sort') === 'az') ? 'az' : 'popular';
  const query = searchParams.get('q') || '';
  const selectedKey = searchParams.get('cmd');
  const deferredQuery = useDeferredValue(query);

  const updateParams = useCallback((updates: Record<string, string | null>) => {
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          next.set(key, value);
        } else {
          next.delete(key);
        }
      }
      return next;
    }, {replace: true, preventScrollReset: true});
  }, [setSearchParams]);

  useLayoutEffect(() => {
    if (FILTER_PARAMS.some((key) => searchParams.has(key))) {
      return;
    }
    const stored = readStored<Record<string, string>>(STORAGE_FILTERS, {});
    const restored = Object.fromEntries(
      Object.entries(stored).filter(([key, value]) => (FILTER_PARAMS as ReadonlyArray<string>).includes(key) && value),
    );
    if (Object.keys(restored).length) {
      updateParams(restored);
    }
    // only on arrival; later changes are the user's own edits
  }, []);

  useEffect(() => {
    const filters: Record<string, string> = {};
    for (const key of FILTER_PARAMS) {
      const value = searchParams.get(key);
      if (value) {
        filters[key] = value;
      }
    }
    writeStored(STORAGE_FILTERS, filters);
  }, [searchParams]);

  const { data: commands, isPending, isError, refetch } = useCommandsQuery();
  const { data: stats } = useCommandStatsQuery(7);

  const entries = useMemo(() => buildEntries(commands || [], stats), [commands, stats]);
  const weekTotal = useMemo(() => entries.reduce((sum, entry) => sum + entry.uses, 0), [entries]);
  const totalRanked = useMemo(() => entries.filter((entry) => entry.rank).length, [entries]);

  // type + DM narrow everything (counts, trending, list); category and search only the list
  const scoped = useMemo(() => entries.filter(({ metadata }) => {
    return (!typeOption.types || typeOption.types.includes(metadata.type)) && (!dmOnly || metadata.dmable);
  }), [entries, typeOption, dmOnly]);

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const entry of scoped) {
      counts.set(entry.category, (counts.get(entry.category) || 0) + 1);
    }
    return counts;
  }, [scoped]);

  const filtered = useMemo(() => {
    const needle = deferredQuery.trim().toLowerCase();
    const result = scoped.filter(({ metadata, category: entryCategory }) => {
      if (category && entryCategory !== category) {
        return false;
      }
      if (needle) {
        return metadata.name.toLowerCase().includes(needle)
          || !!metadata.description?.toLowerCase().includes(needle)
          || metadata.aliases.some((alias) => alias.toLowerCase().includes(needle));
      }
      return true;
    });
    return result.sort((sort === 'popular') ? compareByUses : compareByName);
  }, [scoped, category, deferredQuery, sort]);

  // Always shown (hiding it made the page jump); follows type/DM/category but not the search box.
  const trending = useMemo(() => {
    return scoped
      .filter((entry) => entry.uses && (!category || entry.category === category))
      .sort(compareByUses)
      .slice(0, TRENDING_COUNT);
  }, [scoped, category]);

  // render in pages; the full list is ~760 cards
  const [ visible, setVisible ] = useState(PAGE_SIZE);
  const resultsRef = useRef<HTMLDivElement>(null);
  const isFirstFilterRender = useRef(true);
  useEffect(() => {
    setVisible(PAGE_SIZE);
    if (isFirstFilterRender.current) {
      isFirstFilterRender.current = false;
      return;
    }
    // Stay where you are, unless you were scrolled past the top of the results (then a shorter
    // list could leave you staring at the footer): bring the results' top into view, nothing more.
    const results = resultsRef.current;
    if (results && results.getBoundingClientRect().top < 0) {
      results.scrollIntoView({block: 'start'});
    }
  }, [typeOption.param, category, dmOnly, deferredQuery, sort]);

  const selected = (selectedKey) ? entries.find((entry) => entry.key === selectedKey) : undefined;
  const siblings = (selected) ? entries.filter((entry) => entry.command.id === selected.command.id && entry.key !== selected.key) : [];
  const openCommand = useCallback((key: string) => updateParams({cmd: key}), [updateParams]);
  const closeCommand = useCallback(() => updateParams({cmd: null}), [updateParams]);

  const activeFilterCount = Number(typeOption.types !== null) + Number(!!category) + Number(dmOnly);

  return (
    <>
      <div className='border-b border-line bg-surface'>
        <div className='container-page flex flex-col gap-1 py-6 sm:flex-row sm:items-end sm:justify-between'>
          <div>
            <h1 className='mb-2 text-3xl text-white'>Commands</h1>
            <p className='text-muted'>Everything NotSoBot can do, ranked by what people actually use.</p>
          </div>
          {(entries.length) ? (
            <p className='text-sm text-subtle tabular-nums'>
              {entries.length.toLocaleString()} commands
              {(weekTotal) ? <> · <span className='text-muted'>{formatCompact(weekTotal)}</span> uses in the last 7 days</> : null}
            </p>
          ) : null}
        </div>
      </div>

      <div className='container-page py-8'>
        {(entries.length) ? (
          <section aria-labelledby='trending-heading' className='mb-10'>
            <h2 id='trending-heading' className='mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-xl text-white'>
              <Flame className='size-5 text-warning'/>
              Trending this week
              {(category || typeOption.types) ? (
                <span className='text-sm text-subtle'>
                  · {[category && categoryMeta(category).label, typeOption.types && typeOption.label].filter(Boolean).join(' · ')}
                </span>
              ) : null}
            </h2>
            {/* one fixed-height row that scrolls sideways, so switching filters never shifts the page */}
            {(trending.length) ? (
              <div className='-mx-4 sm:mx-0'>
                <ul
                  key={`${typeOption.param}:${category}:${dmOnly}`}
                  className={cn(
                    'grid h-[11.5rem] animate-fade-in auto-cols-[15.5rem] grid-flow-col gap-3 overflow-x-auto overscroll-x-contain px-4 pb-2 sm:px-0',
                    'snap-x snap-mandatory scroll-px-4 sm:scroll-px-0 [&>li]:snap-start',
                  )}
                >
                  {trending.map((entry) => (
                    <TrendingCard key={entry.key} entry={entry} max={trending[0].uses} onOpen={() => openCommand(entry.key)}/>
                  ))}
                </ul>
              </div>
            ) : (
              // same height as the row above, so an empty category doesn't shift the page either
              <div className='flex h-[11.5rem] animate-fade-in items-center justify-center rounded-lg border border-dashed border-line-strong pb-2 text-sm text-muted'>
                Nothing here has been used this week.
              </div>
            )}
          </section>
        ) : null}

        <div className='grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[260px_minmax(0,1fr)]'>
          <aside aria-label='Categories' className='lg:sticky lg:top-24 lg:self-start'>
            <h2 className='section-label mb-2 hidden px-1 lg:block'>Categories</h2>
            <ul className='-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:px-0 lg:pb-0'>
              <li>
                <CategoryButton active={!category} count={scoped.length} onClick={() => updateParams({category: null})}>
                  <LayoutGrid className='size-4 text-muted'/>
                  <span className='min-w-0 truncate'>All commands</span>
                </CategoryButton>
              </li>
              {CATEGORY_ORDER.filter((value) => categoryCounts.get(value)).map((value) => {
                const meta = categoryMeta(value);
                const Icon = meta.icon;
                return (
                  <li key={value}>
                    <CategoryButton
                      active={category === value}
                      count={categoryCounts.get(value) || 0}
                      color={meta.color}
                      onClick={() => updateParams({category: (category === value) ? null : value.toLowerCase()})}
                    >
                      <Icon className='size-4 text-[var(--cat)]'/>
                      <span className='min-w-0 truncate' title={meta.label}>{meta.label}</span>
                    </CategoryButton>
                  </li>
                );
              })}
            </ul>

            <label className='group mt-4 hidden w-fit cursor-pointer items-center gap-3 px-1 lg:flex'>
              <DmCheckbox checked={dmOnly} onChange={(value) => updateParams({dm: value ? '1' : null})}/>
            </label>
          </aside>

          <div ref={resultsRef} className='min-w-0 scroll-mt-20'>
            <div className='mb-4 flex flex-col gap-3 xl:flex-row xl:items-center'>
              <SearchInput
                className='flex-1'
                value={query}
                onValueChange={(value) => updateParams({q: value || null})}
                placeholder='Search commands, aliases, descriptions...'
                aria-label='Search commands'
              />
              <div className='flex flex-wrap items-center gap-2'>
                <Segmented
                  label='Command type'
                  value={typeOption.param}
                  options={TYPE_OPTIONS.map((option) => ({value: option.param, label: option.label}))}
                  onChange={(value) => updateParams({type: (value === 'all') ? null : value})}
                />
                <Segmented
                  label='Sort'
                  value={sort}
                  options={[{value: 'popular', label: 'Popular'}, {value: 'az', label: 'A–Z'}]}
                  onChange={(value) => updateParams({sort: (value === 'popular') ? null : value})}
                />
              </div>
            </div>

            <div className='mb-4 flex items-center justify-between gap-3 text-sm'>
              <span className='text-muted tabular-nums'>
                {(isPending) ? 'Loading commands…' : `${filtered.length.toLocaleString()} ${filtered.length === 1 ? 'command' : 'commands'}`}
                {(category) ? <> in <span className='text-white'>{categoryMeta(category).label}</span></> : null}
              </span>
              <div className='flex items-center gap-3'>
                <label className='group flex cursor-pointer items-center gap-2 lg:hidden'>
                  <DmCheckbox checked={dmOnly} onChange={(value) => updateParams({dm: value ? '1' : null})} compact/>
                </label>
                {(activeFilterCount) ? (
                  <button
                    type='button'
                    onClick={() => updateParams({type: null, category: null, dm: null})}
                    className='cursor-pointer text-muted transition-colors hover:text-white'
                  >
                    Clear filters
                  </button>
                ) : null}
              </div>
            </div>

            {(isPending) ? (
              <CardGridSkeleton/>
            ) : (isError) ? (
              <div className='card flex flex-col items-center gap-3 p-10 text-center'>
                <p className='text-muted'>Couldn't load commands right now.</p>
                <button type='button' className='btn btn-secondary' onClick={() => refetch()}>Retry</button>
              </div>
            ) : (filtered.length) ? (
              <>
                <ul className='grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3'>
                  {filtered.slice(0, visible).map((entry) => (
                    <CommandCard key={entry.key} entry={entry} onOpen={() => openCommand(entry.key)}/>
                  ))}
                </ul>
                {(visible < filtered.length) ? (
                  <div className='mt-6 flex justify-center'>
                    <button type='button' className='btn btn-secondary' onClick={() => setVisible((value) => value + PAGE_SIZE)}>
                      Show more ({(filtered.length - visible).toLocaleString()} left)
                    </button>
                  </div>
                ) : null}
              </>
            ) : (
              <div className='card p-12 text-center text-muted'>No commands match that. Try a different search or category.</div>
            )}
          </div>
        </div>
      </div>

      {(selected) ? (
        <CommandDrawer entry={selected} siblings={siblings} totalRanked={totalRanked} onSelect={openCommand} onClose={closeCommand}/>
      ) : null}
    </>
  );
}


function CategoryButton({ active, count, color, onClick, children }: {
  active: boolean,
  count: number,
  color?: string,
  onClick: () => void,
  children: ReactNode,
}) {
  return (
    <button
      type='button'
      aria-pressed={active}
      onClick={onClick}
      style={(color) ? {'--cat': color} as CSSProperties : undefined}
      className={cn(
        'flex w-full shrink-0 cursor-pointer items-center gap-2.5 rounded-md border px-3 py-2 text-left text-sm whitespace-nowrap transition-colors [&>svg]:shrink-0',
        'lg:border-transparent',
        active
          ? 'border-line-strong bg-surface-3 text-white'
          : 'border-line text-muted hover:bg-surface-2 hover:text-white',
      )}
    >
      {children}
      <span className='ml-auto shrink-0 pl-2 text-xs text-subtle tabular-nums'>{count}</span>
    </button>
  );
}


function DmCheckbox({ checked, onChange, compact = false }: {checked: boolean, onChange: (value: boolean) => void, compact?: boolean}) {
  return (
    <>
      <input type='checkbox' className='peer sr-only' checked={checked} onChange={(event) => onChange(event.target.checked)}/>
      <span
        aria-hidden
        className={cn(
          'flex size-5 items-center justify-center rounded border-2 transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-brand',
          checked ? 'border-brand bg-brand' : 'border-[#4e5058] bg-surface-3 group-hover:border-brand',
        )}
      >
        {checked ? <Check className='size-3.5 text-white'/> : null}
      </span>
      <span className='text-sm text-muted'>{compact ? 'DM only' : 'Works in DMs only'}</span>
    </>
  );
}


function CardGridSkeleton() {
  return (
    <ul className='grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3' aria-hidden>
      {Array.from({length: 9}, (_, i) => (
        <li key={i} className='card h-32 animate-pulse p-4'>
          <div className='h-4 w-32 rounded bg-surface-3'/>
          <div className='mt-3 h-3 w-3/4 rounded bg-surface-2'/>
        </li>
      ))}
    </ul>
  );
}

