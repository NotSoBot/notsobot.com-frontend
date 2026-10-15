import { Search, X } from 'lucide-react';
import type { InputHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';


interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'size'> {
  value: string,
  onValueChange: (value: string) => void,
  size?: 'md' | 'lg',
}


export function SearchInput({ className, value, onValueChange, size = 'md', ...props }: SearchInputProps) {
  return (
    <div className={cn('relative', className)}>
      <Search aria-hidden className='pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted'/>
      <input
        type='search'
        autoComplete='off'
        spellCheck={false}
        {...props}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        className={cn(
          'w-full rounded-lg border border-line bg-surface-3 pl-12 text-fg placeholder:text-muted',
          'transition-colors outline-none focus:border-brand [&::-webkit-search-cancel-button]:hidden',
          // room for the clear button only while it's shown, so placeholders get the full width
          (value) ? 'pr-11' : 'pr-4',
          // 16px on phones: fits more of the placeholder, and anything smaller makes iOS zoom in on focus
          size === 'lg' ? 'h-14 text-base sm:text-lg' : 'h-12 text-base',
        )}
      />
      {(value) ? (
        <button
          type='button'
          aria-label='Clear search'
          onClick={() => onValueChange('')}
          className='absolute top-1/2 right-2 -translate-y-1/2 cursor-pointer rounded-md p-1.5 text-subtle hover:bg-surface-3 hover:text-fg'
        >
          <X className='size-4'/>
        </button>
      ) : null}
    </div>
  );
}
