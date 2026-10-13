import { TriangleAlert } from 'lucide-react';
import { Link } from 'react-router';

import { Routes } from '@/config';
import { cn } from '@/lib/utils';


export function TagsDisabledNotice({ className }: {className?: string}) {
  return (
    <div role='alert' className={cn('flex items-start gap-3 rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-left text-sm text-fg', className)}>
      <TriangleAlert aria-hidden className='mt-0.5 size-5 shrink-0 text-warning'/>
      <div className='min-w-0'>
        <p className='mb-1 font-semibold text-white'>The tag system has been disabled at this time at Discord’s request.</p>
        <p>
          Discord gave us two weeks to remove the tag system due to content moderation concerns. We’ve since added new safety filters and reached out to Discord about keeping the feature. We’re sorry for the disruption, especially to everyone who built games and collections with tags. For updates or questions, join our{' '}
          <Link to={Routes.SUPPORT_INVITE} className='text-code hover:underline'>support server</Link>.
        </p>
      </div>
    </div>
  );
}
