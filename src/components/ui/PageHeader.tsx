import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';


export function PageHeader({ title, description, children, className }: {
  title: ReactNode,
  description?: ReactNode,
  children?: ReactNode,
  className?: string,
}) {
  return (
    <header className={cn('pt-12 pb-8 sm:pt-16', className)}>
      <h1 className='text-3xl font-extrabold tracking-tight sm:text-4xl'>{title}</h1>
      {description ? <div className='mt-3 max-w-2xl text-muted'>{description}</div> : null}
      {children ? <div className='mt-6'>{children}</div> : null}
    </header>
  );
}
