import type { InfoDiscordShard } from '@/lib/api';


export type ShardCounts = InfoDiscordShard['counts'];
export type ShardCountKey = keyof ShardCounts;

export type CounterGroup = 'server' | 'activity';

export interface Counter {
  key: ShardCountKey,
  label: string,
  group: CounterGroup,
  // shown on hover; explains what the number actually measures
  note: string,
  // part of the short list (hover card, collapsed lookup)
  featured?: boolean,
}


// Every counter the bot reports per shard. Labels are deliberately precise: most of these are
// sizes of the bot's in-memory caches, and summing caches across shards double-counts anything
// that lives on more than one shard (a user in servers on several shards is counted once per shard).
export const COUNTERS: Array<Counter> = [
  {key: 'guilds', label: 'Guilds', group: 'server', featured: true, note: 'Servers the bot is in.'},
  {key: 'member_count', label: 'Members', group: 'server', featured: true, note: 'Sum of every server\'s member count, as reported by Discord.'},
  {key: 'users', label: 'Cached Users', group: 'server', featured: true, note: 'Users held in each shard\'s cache. Someone in servers on several shards is counted once per shard, so this overstates unique users.'},
  {key: 'members', label: 'Cached Members', group: 'server', note: 'Member objects held in cache. Lower than Members, since not every member gets cached.'},
  {key: 'channels', label: 'Channels', group: 'server', featured: true, note: 'Channels in cache, across all servers.'},
  {key: 'channel_threads', label: 'Threads', group: 'server', note: 'Active threads in cache.'},
  {key: 'roles', label: 'Roles', group: 'server', featured: true, note: 'Roles in cache, across all servers.'},
  {key: 'emojis', label: 'Emojis', group: 'server', note: 'Custom server emojis in cache.'},
  {key: 'permission_overwrites', label: 'Overwrites', group: 'server', note: 'Per-channel permission overwrites in cache.'},
  {key: 'stage_instances', label: 'Stage Instances', group: 'server', note: 'Live stage channels right now.'},
  {key: 'guild_scheduled_events', label: 'Scheduled Events', group: 'server', note: 'Server scheduled events in cache.'},
  {key: 'applications', label: 'Applications', group: 'server', note: 'Applications in cache.'},

  {key: 'presences', label: 'Presences', group: 'activity', note: 'User presences (online status) in cache.'},
  {key: 'presence_activities', label: 'Presence Activities', group: 'activity', note: 'Activities (playing, listening, etc.) attached to cached presences.'},
  {key: 'voice_states', label: 'Voice States', group: 'activity', featured: true, note: 'Users currently in voice channels.'},
  {key: 'typings', label: 'Typings', group: 'activity', note: 'Typing indicators being tracked right now.'},
  {key: 'messages', label: 'Cached Messages', group: 'activity', note: 'Messages currently held in memory, not all-time messages sent.'},
  {key: 'events', label: 'Gateway Events', group: 'activity', note: 'Gateway events received, as counted by each shard.'},
];

export const COUNTER_GROUPS: Array<{group: CounterGroup, label: string}> = [
  {group: 'server', label: 'Server Data'},
  {group: 'activity', label: 'Live Activity'},
];

export const FEATURED_COUNTERS = COUNTERS.filter((counter) => counter.featured);


export function sumCounts(shards: Array<InfoDiscordShard>): ShardCounts {
  const totals = Object.fromEntries(COUNTERS.map((counter) => [counter.key, 0])) as ShardCounts;
  for (const shard of shards) {
    for (const counter of COUNTERS) {
      totals[counter.key] += shard.counts[counter.key] || 0;
    }
  }
  return totals;
}


export { formatCompact } from '@/lib/utils';
