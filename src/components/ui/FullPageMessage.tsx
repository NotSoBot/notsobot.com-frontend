import type { ReactNode } from 'react';


export function FullPageMessage({ title, description, children }: {
  title?: ReactNode,
  description?: ReactNode,
  children?: ReactNode,
}) {
  return (
    <div className='container-page flex min-h-[60vh] flex-col items-center justify-center gap-4 py-16 text-center'>
      {title ? <h1 className='text-2xl font-bold tracking-tight sm:text-3xl'>{title}</h1> : null}
      {description ? <p className='max-w-md text-muted'>{description}</p> : null}
      {children}
    </div>
  );
}
