import { clsx, type ClassValue } from 'clsx';


export function cn(...inputs: Array<ClassValue>): string {
  return clsx(inputs);
}


export function formatMemory(bytes: number, decimals = 0): string {
  if (!bytes || bytes < 0) {
    return '0 B';
  }
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, exponent)).toFixed(decimals)} ${units[exponent]}`;
}


export function formatNumber(value: number): string {
  return value.toLocaleString();
}


export function shuffle<T>(array: Array<T>): Array<T> {
  const copy = array.slice();
  for (let i = copy.length - 1; 0 < i; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}


// Discord snowflake -> shard id (https://discord.com/developers/docs/topics/gateway#sharding)
export function shardIdForGuild(guildId: string, shardCount: number): number | null {
  if (!/^\d{15,21}$/.test(guildId) || shardCount <= 0) {
    return null;
  }
  return Number((BigInt(guildId) >> 22n) % BigInt(shardCount));
}


// API timestamps are ISO strings; some admin fields may be epoch numbers (seconds or ms)
export function toDate(value: string | number): Date {
  if (typeof value === 'number') {
    return new Date((value < 1e12) ? value * 1000 : value);
  }
  return new Date(value);
}


export function formatDate(value: string | number, options: Intl.DateTimeFormatOptions = {year: 'numeric', month: 'short', day: 'numeric'}): string {
  const date = toDate(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString(undefined, options);
}


export function formatDateTime(value: string | number): string {
  return formatDate(value, {year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'});
}


// down to the second, with the weekday and time zone; for hover titles
export function formatExactDateTime(value: string | number): string {
  return formatDate(value, {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short',
  });
}


const compactFormatter = new Intl.NumberFormat(undefined, {notation: 'compact', maximumFractionDigits: 1});

export function formatCompact(value: number): string {
  return (value < 10000) ? value.toLocaleString() : compactFormatter.format(value);
}


// `#some%20id` -> `some id`; a malformed escape (`#%E0`) would throw, so that falls back to the raw text
export function decodeHash(hash: string): string {
  const raw = hash.replace(/^#/, '');
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}
