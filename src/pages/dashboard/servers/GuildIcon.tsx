import { useState } from 'react';

import { guildIconUrl, guildInitials } from '@/lib/discord';
import { cn } from '@/lib/utils';


export function GuildIcon({ guild, size = 64, className }: {guild: {id: string, name: string, icon: string | null}, size?: number, className?: string}) {
  const url = guildIconUrl(guild, size * 2);
  const [ failed, setFailed ] = useState(false);
  if (url && !failed) {
    return <img src={url} alt='' loading='lazy' onError={() => setFailed(true)} className={cn('shrink-0 rounded-2xl bg-surface-3 object-cover', className)}/>;
  }
  return (
    <span aria-hidden className={cn('flex shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-brand font-semibold text-white', className)}>
      {guildInitials(guild.name)}
    </span>
  );
}
