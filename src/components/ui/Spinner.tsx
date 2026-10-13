import { cn } from '@/lib/utils';


export function Spinner({ className, label = 'Loading' }: {className?: string, label?: string}) {
  return (
    <span role='status' aria-label={label} className={cn('inline-block size-6 animate-spin rounded-full border-2 border-line-strong border-t-brand', className)}/>
  );
}
