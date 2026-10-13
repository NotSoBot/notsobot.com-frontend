import { ChevronDown, Crosshair, HardDrive, Layers, RefreshCw, Server } from 'lucide-react';
import { useEffect, useMemo, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { useSearchParams } from 'react-router';

import { SearchInput } from '@/components/ui/SearchInput';
import { usePersistentState } from '@/hooks/usePersistentState';
import { ShardStatuses, type InfoDiscord, type InfoDiscordCluster, type InfoDiscordShard, type ShardStatus } from '@/lib/api';
import { useInfoDiscordQuery } from '@/lib/api/queries';
import { COUNTER_GROUPS, COUNTERS, FEATURED_COUNTERS, formatCompact, sumCounts, type Counter, type ShardCounts } from '@/lib/shardCounts';
import { cn, formatMemory, formatNumber, shardIdForGuild } from '@/lib/utils';


// a cluster that hasn't reported in this long is considered dead
const CLUSTER_DEAD_AFTER = 45 * 1000;

type DisplayStatus = ShardStatus | 'DEAD';

const STATUS_STYLES: Record<DisplayStatus, {label: string, className: string}> = {
  [ShardStatuses.READY]: {label: 'Ready', className: 'bg-shard-ready'},
  [ShardStatuses.RESUMING]: {label: 'Resuming', className: 'bg-shard-resuming'},
  [ShardStatuses.IDENTIFYING]: {label: 'Identifying', className: 'bg-shard-identifying'},
  [ShardStatuses.CONNECTING]: {label: 'Connecting', className: 'bg-shard-connecting'},
  [ShardStatuses.OPEN]: {label: 'Open', className: 'bg-shard-open'},
  [ShardStatuses.CLOSED]: {label: 'Closed', className: 'bg-shard-closed'},
  DEAD: {label: 'Dead', className: 'bg-shard-dead'},
};

const LEGEND_ORDER: Array<DisplayStatus> = ['READY', 'RESUMING', 'IDENTIFYING', 'CONNECTING', 'OPEN', 'CLOSED', 'DEAD'];


function isClusterDead(cluster: InfoDiscordCluster, now: number): boolean {
  return CLUSTER_DEAD_AFTER <= now - Date.parse(cluster.last_refresh);
}

function displayStatus(shard: InfoDiscordShard, dead: boolean): DisplayStatus {
  return (dead) ? 'DEAD' : (shard.status in STATUS_STYLES) ? shard.status : 'DEAD';
}


function computeTotals(data: InfoDiscord) {
  const totals = {guilds: 0, healthyShards: 0, ram: 0, users: 0};
  for (const cluster of data.clusters) {
    totals.ram += cluster.ram_usage;
    for (const shard of cluster.shards) {
      totals.guilds += shard.counts.guilds;
      totals.users += shard.counts.users;
      if (shard.status === ShardStatuses.READY) {
        totals.healthyShards += 1;
      }
    }
  }
  return totals;
}


export function StatusPage() {
  const [ searchParams, setSearchParams ] = useSearchParams();
  const lookupInput = searchParams.get('lookup') || '';
  const { data, isPending, isError } = useInfoDiscordQuery();

  const totals = useMemo(() => (data) ? computeTotals(data) : null, [data]);
  const allCounts = useMemo(() => (data) ? sumCounts(data.clusters.flatMap((cluster) => cluster.shards)) : null, [data]);
  // re-rendered on every 2s poll, so wall-clock time keeps dead-cluster detection current even when polls fail
  const now = Date.now();

  const lookup = useMemo(() => (data) ? parseLookup(lookupInput, data) : null, [lookupInput, data]);
  const target = (data && lookup) ? resolveLookup(lookup, data) : null;

  const setLookupInput = (value: string) => {
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      if (value) {
        next.set('lookup', value);
      } else {
        next.delete('lookup');
      }
      return next;
    }, {replace: true, preventScrollReset: true});
  };

  return (
    <div className='container-page py-8'>
      <h1 className='sr-only'>Status</h1>

      <div className='mb-8'>
        <SearchInput
          size='lg'
          value={lookupInput}
          onValueChange={setLookupInput}
          placeholder='Find a shard: server ID, "shard 12" or "cluster 5"'
          aria-label='Find a shard by server ID, shard or cluster'
          aria-describedby='lookup-hint'
        />
        {(!lookupInput) ? (
          <p id='lookup-hint' className='mt-2 text-xs text-subtle'>
            Get your server ID with Developer Mode on: right-click the server icon → Copy Server ID. Channel links work too.
          </p>
        ) : (lookup?.kind === 'invalid') ? (
          <p id='lookup-hint' className='mt-2 text-sm text-danger'>{lookup.message}</p>
        ) : null}

        {(target && data) ? <LookupResult lookup={target.lookup} cluster={target.cluster} shard={target.shard} now={now}/> : null}
      </div>

      {(isError && data) ? (
        <div className='mb-6 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning'>
          Having trouble refreshing — showing the last known status.
        </div>
      ) : null}

      <section aria-labelledby='stats-heading' className='card mb-8 p-6'>
        <h2 id='stats-heading' className='mb-6 text-center text-2xl text-white'>Bot Statistics</h2>
        <div className='grid grid-cols-2 gap-4 lg:grid-cols-4'>
          <StatTile label='Healthy Shards' className='text-success' value={(data && totals) ? `${formatNumber(totals.healthyShards)}/${formatNumber(data.shard_count)}` : null}/>
          <StatTile label='Total RAM' value={totals ? formatMemory(totals.ram, 2) : null}/>
          <StatTile label='Total Guilds' value={totals ? formatNumber(totals.guilds) : null}/>
          <StatTile label='Total Users' value={totals ? formatNumber(totals.users) : null}/>
        </div>
        <AllTotals counts={allCounts}/>
      </section>

      <section aria-labelledby='shards-heading' className='card p-6'>
        <h2 id='shards-heading' className='mb-2 text-center text-2xl text-white'>Shard Status</h2>
        <ul aria-label='Status colors' className='mb-5 flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-xs text-subtle'>
          {LEGEND_ORDER.map((key) => (
            <li key={key} className='flex items-center gap-1.5'>
              <span className={cn('size-2 rounded-full opacity-90', STATUS_STYLES[key].className)}/>
              {STATUS_STYLES[key].label}
            </li>
          ))}
        </ul>
        {(data) ? (
          <ShardGrid data={data} now={now} highlightShardId={target?.shard?.shard_id ?? null} highlightClusterId={target?.cluster.cluster_id ?? null}/>
        ) : (isPending) ? (
          <div className='flex flex-wrap justify-center gap-2' aria-hidden>
            {Array.from({length: 40}, (_, i) => <div key={i} className='h-16 w-60 animate-pulse rounded bg-deep'/>)}
          </div>
        ) : (
          <p className='py-6 text-center text-muted'>Status info isn't available right now. We'll keep trying.</p>
        )}
      </section>
    </div>
  );
}


function StatTile({ label, value, className = 'text-brand' }: {label: string, value: string | null, className?: string}) {
  return (
    <div className='rounded-lg bg-deep p-4 text-center'>
      {(value !== null) ? (
        <div className={cn('mb-1 text-xl font-bold whitespace-nowrap tabular-nums sm:text-2xl lg:text-3xl', className)}>{value}</div>
      ) : (
        <div className='mx-auto mb-2 h-8 w-24 animate-pulse rounded bg-surface-3'/>
      )}
      <div className='text-sm text-muted'>{label}</div>
    </div>
  );
}


interface HoveredShard {
  shardId: number,
  rect: DOMRect,
}


// One shared hover card for the whole grid (1,280+ shards) instead of one per cell.
// Only the shard id is stored, so the card shows live numbers as the page polls.
function ShardGrid({ data, now, highlightShardId, highlightClusterId }: {
  data: InfoDiscord,
  now: number,
  highlightShardId: number | null,
  highlightClusterId: number | null,
}) {
  const [ hovered, setHovered ] = useState<HoveredShard | null>(null);

  // the anchor rect goes stale once the page moves
  useEffect(() => {
    if (!hovered) {
      return;
    }
    const clear = () => setHovered(null);
    window.addEventListener('scroll', clear, {passive: true});
    window.addEventListener('resize', clear);
    return () => {
      window.removeEventListener('scroll', clear);
      window.removeEventListener('resize', clear);
    };
  }, [hovered]);

  const onPointerOver = (event: ReactPointerEvent<HTMLDivElement>) => {
    const cell = (event.target as HTMLElement).closest<HTMLElement>('[data-shard-id]');
    if (cell) {
      const shardId = Number(cell.dataset.shardId);
      if (hovered?.shardId !== shardId) {
        setHovered({shardId, rect: cell.getBoundingClientRect()});
      }
    }
  };

  let hoveredShard: InfoDiscordShard | undefined;
  let hoveredCluster: InfoDiscordCluster | undefined;
  if (hovered) {
    for (const cluster of data.clusters) {
      hoveredShard = cluster.shards.find((shard) => shard.shard_id === hovered.shardId);
      if (hoveredShard) {
        hoveredCluster = cluster;
        break;
      }
    }
  }

  return (
    <>
      <div
        className='flex flex-wrap justify-center gap-2'
        onPointerOver={onPointerOver}
        onPointerLeave={() => setHovered(null)}
      >
        {data.clusters.map((cluster) => (
          <ClusterBlock
            key={cluster.cluster_id}
            cluster={cluster}
            dead={isClusterDead(cluster, now)}
            highlightShardId={highlightShardId}
            targeted={cluster.cluster_id === highlightClusterId}
            hoveredShardId={hovered?.shardId ?? null}
          />
        ))}
      </div>
      {(hovered && hoveredShard && hoveredCluster) ? (
        <ShardHoverCard rect={hovered.rect} shard={hoveredShard} cluster={hoveredCluster} dead={isClusterDead(hoveredCluster, now)}/>
      ) : null}
    </>
  );
}


function ClusterBlock({ cluster, dead, highlightShardId, hoveredShardId = null, targeted = false, anchor = true }: {
  cluster: InfoDiscordCluster,
  dead: boolean,
  highlightShardId: number | null,
  hoveredShardId?: number | null,
  targeted?: boolean,
  // the grid copy is the scroll target for "Show in grid"; the lookup card's copy isn't
  anchor?: boolean,
}) {
  const healthy = cluster.shards.filter((shard) => shard.status === ShardStatuses.READY).length;
  const total = cluster.shards.length;

  return (
    <div
      id={(anchor) ? clusterAnchorId(cluster.cluster_id) : undefined}
      className={cn(
        'scroll-mt-24 rounded-md bg-deep p-2 transition-shadow',
        dead && 'ring-1 ring-danger',
        targeted && 'ring-2 ring-brand',
      )}
    >
      <div className='mb-1.5 flex items-baseline justify-between gap-3 px-0.5 text-[11px]'>
        <span className={cn('font-semibold', dead ? 'text-danger' : 'text-white')}>Cluster {cluster.cluster_id}</span>
        <span className='text-muted tabular-nums'>
          {(dead) ? (
            <span className='font-medium text-danger'>Not responding</span>
          ) : (
            <>
              <span className={(healthy === total) ? 'text-success' : 'text-warning'}>{healthy}/{total}</span>
              {' · '}{formatMemory(cluster.ram_usage, 2)}
            </>
          )}
        </span>
      </div>
      <ul className='flex gap-0.5'>
        {cluster.shards.map((shard) => {
          const status = STATUS_STYLES[displayStatus(shard, dead)];
          const highlighted = shard.shard_id === highlightShardId;
          const hovered = shard.shard_id === hoveredShardId;
          return (
            <li
              key={shard.shard_id}
              data-shard-id={shard.shard_id}
              aria-label={`Shard ${shard.shard_id}: ${status.label}`}
              className={cn(
                'flex size-7 cursor-default items-center justify-center rounded text-[9px] font-medium text-white tabular-nums transition-transform [text-shadow:0_1px_1px_rgb(0_0_0/0.5)]',
                status.className,
                highlighted && 'z-10 scale-110 ring-2 ring-brand',
                hovered && !highlighted && 'z-10 scale-110 ring-2 ring-white/80',
              )}
            >
              {shard.shard_id}
            </li>
          );
        })}
      </ul>
    </div>
  );
}


const HOVER_CARD_WIDTH = 240;

function ShardHoverCard({ rect, shard, cluster, dead }: {
  rect: DOMRect,
  shard: InfoDiscordShard,
  cluster: InfoDiscordCluster,
  dead: boolean,
}) {
  const status = STATUS_STYLES[displayStatus(shard, dead)];

  // centered over the cell, kept inside the viewport, flipped below when there's no room above
  const half = HOVER_CARD_WIDTH / 2;
  const left = Math.min(Math.max(rect.left + rect.width / 2, half + 8), window.innerWidth - half - 8);
  const above = 260 < rect.top;
  const top = (above) ? rect.top - 8 : rect.bottom + 8;

  return (
    <div
      role='tooltip'
      style={{left, top, width: HOVER_CARD_WIDTH}}
      className={cn(
        'pointer-events-none fixed z-50 -translate-x-1/2 rounded-lg border border-line-strong bg-surface p-3 text-sm shadow-2xl shadow-black/50',
        above && '-translate-y-full',
      )}
    >
      <div className='mb-2 flex items-center justify-between gap-2'>
        <span className='font-semibold text-white'>Shard {shard.shard_id}</span>
        <span className='flex items-center gap-1.5 text-xs text-muted'>
          <span className={cn('size-2.5 rounded-sm', status.className)}/>
          {status.label}
        </span>
      </div>
      <div className='mb-2 text-xs text-subtle'>
        Cluster {cluster.cluster_id} · {formatMemory(cluster.ram_usage, 2)}
      </div>
      <dl className='grid grid-cols-2 gap-x-3 gap-y-1 border-t border-line pt-2'>
        {FEATURED_COUNTERS.map((counter) => (
          <div key={counter.key} className='contents'>
            <dt className='text-muted'>{counter.label}</dt>
            <dd className='text-right text-white tabular-nums'>{formatNumber(shard.counts[counter.key])}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}


function clusterAnchorId(clusterId: number): string {
  return `cluster-${clusterId}`;
}


type Lookup =
  | {kind: 'invalid', message: string}
  | {kind: 'guild', guildId: string, shardId: number}
  | {kind: 'shard', shardId: number}
  | {kind: 'cluster', clusterId: number};

const LOOKUP_HELP = 'Enter a server ID, a channel link, "shard 12" or "cluster 5".';

function parseLookup(input: string, data: InfoDiscord): Lookup | null {
  const value = input.trim();
  if (!value) {
    return null;
  }

  // discord.com/channels/<guild>/<channel> links
  const fromLink = value.match(/discord(?:app)?\.com\/channels\/(\d{15,21})/i);
  const guildId = fromLink?.[1] ?? (/^\d{15,21}$/.test(value) ? value : null);
  if (guildId) {
    const shardId = shardIdForGuild(guildId, data.shard_count);
    return (shardId === null) ? {kind: 'invalid', message: LOOKUP_HELP} : {kind: 'guild', guildId, shardId};
  }

  const cluster = value.match(/^(?:c|cluster)\s*#?\s*(\d+)$/i);
  if (cluster) {
    const clusterId = Number(cluster[1]);
    const last = data.clusters.length - 1;
    return (data.clusters.some((x) => x.cluster_id === clusterId))
      ? {kind: 'cluster', clusterId}
      : {kind: 'invalid', message: `There's no cluster ${clusterId}. Clusters go from 0 to ${last}.`};
  }

  // "shard 12", "s12", "#12", or just a small number
  const shard = value.match(/^(?:s|shard)?\s*#?\s*(\d{1,6})$/i);
  if (shard) {
    const shardId = Number(shard[1]);
    return (shardId < data.shard_count)
      ? {kind: 'shard', shardId}
      : {kind: 'invalid', message: `There's no shard ${shardId}. Shards go from 0 to ${data.shard_count - 1}.`};
  }

  return {kind: 'invalid', message: LOOKUP_HELP};
}


function resolveLookup(lookup: Lookup, data: InfoDiscord) {
  if (lookup.kind === 'invalid') {
    return null;
  }
  for (const cluster of data.clusters) {
    if (lookup.kind === 'cluster') {
      if (cluster.cluster_id === lookup.clusterId) {
        return {lookup, cluster, shard: null};
      }
      continue;
    }
    const shard = cluster.shards.find((x) => x.shard_id === lookup.shardId);
    if (shard) {
      return {lookup, cluster, shard};
    }
  }
  return null;
}


function formatAge(milliseconds: number): string {
  const seconds = Math.max(0, Math.round(milliseconds / 1000));
  if (seconds < 60) {
    return `${seconds}s ago`;
  }
  const minutes = Math.round(seconds / 60);
  return (minutes < 60) ? `${minutes}m ago` : `${Math.round(minutes / 60)}h ago`;
}


function LookupResult({ lookup, cluster, shard, now }: {
  lookup: Exclude<Lookup, {kind: 'invalid'}>,
  cluster: InfoDiscordCluster,
  shard: InfoDiscordShard | null,
  now: number,
}) {
  const dead = isClusterDead(cluster, now);
  const healthy = cluster.shards.filter((x) => x.status === ShardStatuses.READY).length;
  const total = cluster.shards.length;
  const shardIds = cluster.shards.map((x) => x.shard_id);
  const firstShard = Math.min(...shardIds);
  const lastShard = Math.max(...shardIds);

  // with a shard: that shard's counts; cluster only: the cluster's totals
  const counts = (shard) ? shard.counts : sumCounts(cluster.shards);
  const [ showAll, setShowAll ] = usePersistentState('status:lookup-show-all', false);

  const shardStatus = (shard) ? STATUS_STYLES[displayStatus(shard, dead)] : null;

  // Jump straight there (smooth scrolling is unreliable in background/embedded views),
  // then pulse the cluster so the eye lands on it.
  const jumpToCluster = () => {
    const element = document.getElementById(clusterAnchorId(cluster.cluster_id));
    if (!element) {
      return;
    }
    element.scrollIntoView({block: 'center'});
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      element.animate([
        {boxShadow: '0 0 0 0 rgb(88 101 242 / 0)'},
        {boxShadow: '0 0 0 8px rgb(88 101 242 / 0.55)'},
        {boxShadow: '0 0 0 0 rgb(88 101 242 / 0)'},
      ], {duration: 900, iterations: 2, easing: 'ease-out'});
    }
  };

  return (
    <section aria-live='polite' className='mt-4 animate-fade-in rounded-lg border border-brand/30 bg-brand/10 p-5'>
      <div className='flex flex-col gap-4 md:flex-row md:items-start md:justify-between'>
        <div className='min-w-0'>
          {(lookup.kind === 'guild') ? (
            <p className='mb-1 truncate font-mono text-xs text-subtle'>Server {lookup.guildId}</p>
          ) : null}
          <h2 className='flex flex-wrap items-center gap-x-3 gap-y-1 text-2xl text-white'>
            {(shard) ? (
              <>
                <span>Shard {shard.shard_id}</span>
                <span className='text-muted'>on</span>
                <span>Cluster {cluster.cluster_id}</span>
              </>
            ) : (
              <span>Cluster {cluster.cluster_id}</span>
            )}
            {(shardStatus) ? (
              <span className='flex items-center gap-1.5 rounded-full bg-deep px-2.5 py-0.5 text-sm text-fg'>
                <span className={cn('size-2 rounded-full', shardStatus.className)}/>
                {shardStatus.label}
              </span>
            ) : null}
          </h2>

          <ul className='mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-muted'>
            <ResultFact icon={Server}>
              {(dead) ? (
                <span className='font-medium text-danger'>Cluster not responding</span>
              ) : (
                <><span className={(healthy === total) ? 'text-success' : 'text-warning'}>{healthy}/{total}</span> shards ready</>
              )}
            </ResultFact>
            <ResultFact icon={Layers}>Shards {firstShard}–{lastShard}</ResultFact>
            <ResultFact icon={HardDrive}>{formatMemory(cluster.ram_usage, 2)} RAM</ResultFact>
            <ResultFact icon={RefreshCw}>Reported {formatAge(now - Date.parse(cluster.last_refresh))}</ResultFact>
          </ul>
        </div>

        <button type='button' onClick={jumpToCluster} className='btn btn-secondary shrink-0 self-start'>
          <Crosshair className='size-4'/>
          Show in grid
        </button>
      </div>

      <div className='mt-5 grid gap-5 lg:grid-cols-[auto_1fr] lg:items-start'>
        <div className='flex justify-center lg:justify-start'>
          <ClusterBlock cluster={cluster} dead={dead} highlightShardId={shard?.shard_id ?? null} anchor={false}/>
        </div>

        <div>
          <div className='mb-2 flex items-center justify-between gap-3'>
            <h3 className='section-label'>{(shard) ? `Shard ${shard.shard_id}` : `Cluster ${cluster.cluster_id} totals`}</h3>
            <button
              type='button'
              aria-expanded={showAll}
              onClick={() => setShowAll((value) => !value)}
              className='flex cursor-pointer items-center gap-1 text-xs text-muted transition-colors hover:text-white'
            >
              {showAll ? 'Show less' : `Show all ${COUNTERS.length}`}
              <ChevronDown className={cn('size-3.5 transition-transform', showAll && 'rotate-180')}/>
            </button>
          </div>
          {(showAll) ? (
            <CounterGroups counts={counts} variant='result'/>
          ) : (
            <dl className='grid grid-cols-2 gap-2 sm:grid-cols-3'>
              {FEATURED_COUNTERS.map((counter) => <CounterTile key={counter.key} counter={counter} value={counts[counter.key]} variant='result'/>)}
            </dl>
          )}
        </div>
      </div>
    </section>
  );
}


function ResultFact({ icon: Icon, children }: {icon: typeof Server, children: ReactNode}) {
  return (
    <li className='flex items-center gap-1.5'>
      <Icon className='size-4 text-subtle'/>
      <span>{children}</span>
    </li>
  );
}


// Every counter, grouped. Used for the global totals and the expanded lookup card.
function CounterGroups({ counts, variant }: {counts: ShardCounts, variant: 'panel' | 'result'}) {
  return (
    <div className='space-y-4'>
      {COUNTER_GROUPS.map(({ group, label }) => (
        <div key={group}>
          <h4 className='mb-2 text-xs text-subtle'>{label}</h4>
          <dl className={cn('grid grid-cols-2 gap-2', (variant === 'panel') ? 'sm:grid-cols-3 lg:grid-cols-6' : 'sm:grid-cols-3')}>
            {COUNTERS.filter((counter) => counter.group === group).map((counter) => (
              <CounterTile key={counter.key} counter={counter} value={counts[counter.key]} variant={variant}/>
            ))}
          </dl>
        </div>
      ))}
    </div>
  );
}


function CounterTile({ counter, value, variant }: {counter: Counter, value: number, variant: 'panel' | 'result'}) {
  return (
    <div title={`${formatNumber(value)} — ${counter.note}`} className='min-w-0 cursor-help rounded-md bg-deep px-3 py-2'>
      <dt className='truncate text-xs text-muted'>{counter.label}</dt>
      <dd className={cn('font-semibold text-white tabular-nums', (variant === 'panel') ? 'text-base' : 'text-lg')}>
        {(variant === 'panel') ? formatCompact(value) : formatNumber(value)}
      </dd>
    </div>
  );
}


function AllTotals({ counts }: {counts: ShardCounts | null}) {
  const [ open, setOpen ] = usePersistentState('status:totals-open', false);

  return (
    <div className='mt-4 border-t border-line pt-3'>
      <button
        type='button'
        aria-expanded={open}
        disabled={!counts}
        onClick={() => setOpen((value) => !value)}
        className='mx-auto flex cursor-pointer items-center gap-1.5 text-sm text-muted transition-colors hover:text-white disabled:cursor-default disabled:opacity-50'
      >
        {open ? 'Hide all totals' : `Show all totals (${COUNTERS.length})`}
        <ChevronDown className={cn('size-4 transition-transform', open && 'rotate-180')}/>
      </button>
      {(open && counts) ? (
        <div className='mt-4 animate-fade-in'>
          <CounterGroups counts={counts} variant='panel'/>
          <p className='mt-3 text-center text-xs text-subtle'>
            Most of these are cache sizes summed across shards. Hover a number for exactly what it counts.
          </p>
        </div>
      ) : null}
    </div>
  );
}
