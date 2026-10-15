import { ChevronDown, CircleCheck, TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';


const TONES = {
  success: {box: 'border-success/40 bg-success/10', icon: CircleCheck, iconColor: 'text-success'},
  warning: {box: 'border-warning/40 bg-warning/10', icon: TriangleAlert, iconColor: 'text-warning'},
};

// banner that only shows its title until clicked
export function CollapsibleNotice({ children, className, title, tone = 'warning' }: {
  children: ReactNode,
  className?: string,
  title: ReactNode,
  tone?: keyof typeof TONES,
}) {
  const { box, icon: Icon, iconColor } = TONES[tone];
  return (
    <details role={(tone === 'warning') ? 'alert' : 'status'} className={cn('group rounded-md border px-4 py-3 text-left text-sm text-fg', box, className)}>
      <summary className='flex cursor-pointer list-none items-start gap-3 [&::-webkit-details-marker]:hidden'>
        <Icon aria-hidden className={cn('mt-0.5 size-5 shrink-0', iconColor)}/>
        <span className='min-w-0 flex-1 font-semibold text-white'>{title}</span>
        <ChevronDown aria-hidden className='mt-0.5 size-4 shrink-0 text-fg transition-transform group-open:rotate-180'/>
      </summary>
      <div className='mt-1 pl-8'>
        {children}
      </div>
    </details>
  );
}
