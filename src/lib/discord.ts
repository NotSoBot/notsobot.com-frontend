import type { User } from '@/lib/api';


const CDN = 'https://cdn.discordapp.com';


export function userAvatarUrl(user: Pick<User, 'id' | 'avatar' | 'discriminator'>, size = 64): string {
  if (user.avatar) {
    const extension = user.avatar.startsWith('a_') ? 'gif' : 'png';
    return `${CDN}/avatars/${user.id}/${user.avatar}.${extension}?size=${size}`;
  }

  // default avatars: pomelo (discriminator 0) users use the id, legacy users the discriminator
  const discriminator = Number(user.discriminator);
  const index = (discriminator)
    ? discriminator % 5
    : Number((BigInt(user.id) >> 22n) % 6n);
  return `${CDN}/embed/avatars/${index}.png`;
}


export function userDisplayTag(user: Pick<User, 'username' | 'discriminator'>): string {
  return (Number(user.discriminator)) ? `${user.username}#${user.discriminator}` : user.username;
}


export function guildIconUrl(guild: {id: string, icon: string | null}, size = 128): string | null {
  if (!guild.icon) {
    return null;
  }
  const extension = guild.icon.startsWith('a_') ? 'gif' : 'png';
  return `${CDN}/icons/${guild.id}/${guild.icon}.${extension}?size=${size}`;
}


// "Cool Gamers Club" -> "CGC", like Discord's icon-less servers
export function guildInitials(name: string): string {
  return name.split(/\s+/).filter(Boolean).map((word) => [...word][0]).join('').slice(0, 3) || '?';
}


export const DiscordPermissions = {
  ADMINISTRATOR: 1n << 3n,
  MANAGE_GUILD: 1n << 5n,
} as const;

export function hasPermission(permissions: string, permission: bigint): boolean {
  try {
    const value = BigInt(permissions);
    return (value & DiscordPermissions.ADMINISTRATOR) === DiscordPermissions.ADMINISTRATOR || (value & permission) === permission;
  } catch {
    return false;
  }
}
