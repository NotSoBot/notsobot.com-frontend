import { Globe, Lock, MessageCircle, Server, User, Users, type LucideIcon } from 'lucide-react';
import { generatePath } from 'react-router';

import { Routes } from '@/config';
import { TagStorageTypes, type Tag, type TagStorageType, type UserMe } from '@/lib/api';


// same limits as the bot / notsobot.api (`PatchTag`, `PutTagVariableSingle`, `MAX_TAG_*`)
export const TAG_NAME_MAX = 64;
export const TAG_CONTENT_MAX = 2000;
export const TAG_VARIABLE_NAME_MAX = 128;
export const TAG_VARIABLE_VALUE_MAX = 16 * 1024;
export const TAG_VARIABLES_PER_STORAGE = 5;
export const TAG_BLOB_MAX_BYTES = 256 * 1024;


export function dashboardTagPath(tagId: string): string {
  return generatePath(Routes.DASHBOARD_TAG, {tagId});
}


// Where a tag lives, from its `server_id`:
//   - equal to its `guild_id`                       -> a server
//   - equal to the owner's DM channel with the bot   -> that one-on-one DM (`channel_id` on the user)
//   - any other channel (no guild)                   -> a group DM (the bot can't see those)
//   - equal to the owner's own id                    -> personal (where directory tags live)
//   - none                                           -> global
export type TagLocationKind = 'server' | 'dm' | 'group_dm' | 'personal' | 'global';

export interface TagLocation {
  kind: TagLocationKind,
  icon: LucideIcon,
  // "Cool Gamers Club", "DM with NotSoBot", "Group DM", "Personal", "Global"
  label: string,
  // the server/channel id, when there is one worth showing
  id: string | null,
  // false when the name is just the kind (e.g. a server the dashboard can't name)
  named: boolean,
}

export function tagLocation(
  tag: Pick<Tag, 'server_id' | 'guild_id'>,
  user: Pick<UserMe, 'id' | 'channel_id'> | null,
  guildNames?: Map<string, string>,
): TagLocation {
  const serverId = tag.server_id;
  if (!serverId) {
    return {kind: 'global', icon: Globe, label: 'Global', id: null, named: false};
  }
  if (user && serverId === user.id) {
    return {kind: 'personal', icon: User, label: 'Personal', id: null, named: false};
  }
  if (tag.guild_id && serverId === tag.guild_id) {
    const name = guildNames?.get(serverId);
    return {kind: 'server', icon: Server, label: name ?? 'Server', id: serverId, named: !!name};
  }
  if (user?.channel_id && serverId === user.channel_id) {
    return {kind: 'dm', icon: MessageCircle, label: 'DM with NotSoBot', id: serverId, named: false};
  }
  return {kind: 'group_dm', icon: Users, label: 'Group DM', id: serverId, named: false};
}

// "Cool Gamers Club (1100…)", "your DM with NotSoBot", "a group DM (1300…)"
export function describeTagLocation(location: TagLocation): string {
  switch (location.kind) {
    case 'server': return (location.named) ? `${location.label} (${location.id})` : `server ${location.id}`;
    case 'dm': return 'your DM with NotSoBot';
    case 'group_dm': return `a group DM (${location.id})`;
    case 'personal': return 'your personal tags';
    case 'global': return 'global tags';
  }
}


export function TagLocationLabel({ location, className }: {location: TagLocation, className?: string}) {
  const Icon = location.icon;
  return (
    <span className={className} title={(location.id) ? `${location.label} · ${location.id}` : location.label}>
      <Icon aria-hidden className='size-3.5 shrink-0'/>
      <span className={(location.named) ? 'truncate text-fg' : 'shrink-0'}>{location.label}</span>
      {(location.id) ? <span className='min-w-0 truncate font-mono text-subtle'>{location.id}</span> : null}
    </span>
  );
}


export function TagBadges({ tag }: {tag: Tag}) {
  return (
    <>
      {(tag.locked) ? (
        <span className='inline-flex items-center gap-1 rounded bg-warning/15 px-1.5 py-0.5 text-[11px] font-medium text-warning'>
          <Lock aria-hidden className='size-3'/> Locked
        </span>
      ) : null}
      {(tag.nsfw) ? <span className='rounded bg-danger/15 px-1.5 py-0.5 text-[11px] font-medium text-danger'>NSFW</span> : null}
      {(tag.is_command) ? <span className='rounded bg-brand/20 px-1.5 py-0.5 text-[11px] font-medium text-[#a5acff]'>Command</span> : null}
      {(tag.is_on_directory) ? <span className='rounded bg-success/15 px-1.5 py-0.5 text-[11px] font-medium text-success'>Directory</span> : null}
      {(tag.reference_tag) ? <span className='rounded bg-surface-3 px-1.5 py-0.5 text-[11px] font-medium text-muted'>Alias</span> : null}
    </>
  );
}


export interface StorageMeta {
  type: TagStorageType,
  label: string,
  description: string,
  color: string,
}

// global first: it's the one every tag can use without knowing any ids
export const STORAGE_ORDER: ReadonlyArray<StorageMeta> = [
  {type: TagStorageTypes.GLOBAL, label: 'Global', description: 'Shared everywhere the tag runs.', color: '#5865f2'},
  {type: TagStorageTypes.USER, label: 'User', description: 'Per user who runs the tag.', color: '#3ba55c'},
  {type: TagStorageTypes.GUILD, label: 'Server', description: 'Per server the tag runs in.', color: '#faa81a'},
  {type: TagStorageTypes.CHANNEL, label: 'Channel', description: 'Per channel the tag runs in.', color: '#00b0f4'},
];


export function isSnowflake(value: string): boolean {
  return /^\d{15,21}$/.test(value);
}


// base64 <-> text for blobs; returns null when the bytes aren't valid UTF-8 (binary blob)
export function decodeBlob(base64: string): {text: string | null, bytes: number} {
  try {
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    try {
      return {text: new TextDecoder('utf-8', {fatal: true}).decode(bytes), bytes: bytes.length};
    } catch {
      return {text: null, bytes: bytes.length};
    }
  } catch {
    return {text: null, bytes: 0};
  }
}

export function encodeBlob(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

export function byteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}


// pretty-prints JSON values, leaves anything else alone
export function formatJson(value: string): string | null {
  try {
    const parsed: unknown = JSON.parse(value);
    if (parsed === null || typeof parsed !== 'object') {
      return null;
    }
    return JSON.stringify(parsed, null, 2);
  } catch {
    return null;
  }
}

export function isJson(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || !'{["'.includes(trimmed[0])) {
    return false;
  }
  try {
    JSON.parse(trimmed);
    return true;
  } catch {
    return false;
  }
}
