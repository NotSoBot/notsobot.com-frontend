import discordLogo from '@/assets/logos/Discord-Logo-White.svg';
import { cn } from '@/lib/utils';


export function DiscordLogo({ className }: {className?: string}) {
  return <img src={discordLogo} alt='' aria-hidden className={cn('h-4 w-auto', className)}/>;
}
