import { AtSign, Hash, Server, Shield } from 'lucide-react';
import { generatePath } from 'react-router';

import { Routes } from '@/config';
import type { GuildEditableArea } from '@/lib/api';


export function dashboardServerPath(guildId: string): string {
  return generatePath(Routes.DASHBOARD_SERVER, {guildId});
}


// permission the bot command for each area needs (owners always pass)
export const AREA_PERMISSION: Record<GuildEditableArea, string> = {
  prefixes: 'Manage Server',
  allowlist: 'Administrator',
  blocklist: 'Administrator',
  commands: 'Manage Server',
  loggers: 'Manage Server',
  settings: 'Manage Server',
};

export const AREA_LABEL: Record<GuildEditableArea, string> = {
  prefixes: 'Prefixes',
  settings: 'Server settings',
  allowlist: 'Allowlist',
  blocklist: 'Blocklist',
  commands: 'Command lists',
  loggers: 'Loggers',
};

export function readOnlyMessage(area: GuildEditableArea): string {
  return `You need the ${AREA_PERMISSION[area]} permission in this server to change this.`;
}


export const LIST_TYPES = ['channel', 'role', 'user'] as const;
export const COMMAND_LIST_TYPES = ['guild', 'channel', 'role', 'user'] as const;

export const ENTRY_TYPE_LABELS: Record<string, string> = {
  channel: 'Channel',
  guild: 'Whole server',
  role: 'Role',
  user: 'User',
};


// IDs only for now (the API doesn't store names), formatted like Discord mentions
export function EntryMention({ type, id }: {type: string, id: string}) {
  const Icon = (type === 'channel') ? Hash : (type === 'role') ? Shield : (type === 'guild') ? Server : AtSign;
  const color = (type === 'channel') ? 'text-code' : (type === 'role') ? 'text-warning' : (type === 'guild') ? 'text-success' : 'text-[#a5acff]';
  return (
    <span className='inline-flex min-w-0 items-center gap-1.5'>
      <Icon aria-hidden className={`size-3.5 shrink-0 ${color}`}/>
      <span className='sr-only'>{ENTRY_TYPE_LABELS[type] ?? type} </span>
      {(type === 'guild') ? (
        <span className='text-sm text-fg'>Whole server</span>
      ) : (
        <span className='truncate font-mono text-sm text-fg'>{id}</span>
      )}
    </span>
  );
}


// `GuildLoggerTypes`
export const LOGGER_TYPES: ReadonlyArray<{value: number, label: string, description: string}> = [
  {value: 0, label: 'Messages', description: 'Edits, deletes and bulk deletes'},
  {value: 1, label: 'Users', description: 'Username and avatar changes'},
  {value: 2, label: 'Members', description: 'Joins, leaves and member updates'},
  {value: 3, label: 'Voice', description: 'Voice channel joins, leaves and moves'},
  {value: 4, label: 'Channels', description: 'Channel creates, deletes and updates'},
  {value: 5, label: 'Bans', description: 'Bans and unbans'},
  {value: 6, label: 'Roles', description: 'Role creates, deletes and updates'},
];

export function loggerTypeLabel(type: number): string {
  return LOGGER_TYPES.find((item) => item.value === type)?.label ?? `Type ${type}`;
}

