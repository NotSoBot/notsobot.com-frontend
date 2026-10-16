import { Search, X } from 'lucide-react';
import type { InputHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';


interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'size'> {
  value: string,
  onValueChange: (value: string) => void,
  size?: 'sm' | 'md' | 'lg',
}


export function SearchInput({ className, value, onValueChange, size = 'md', ...props }: SearchInputProps) {
  return (
    <div className={cn('relative', className)}>
      <Search aria-hidden className={cn('pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted', (size === 'sm') ? 'left-3 size-4' : 'left-4 size-5')}/>
      <input
        type='search'
        autoComplete='off'
        spellCheck={false}
        {...props}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        className={cn(
          'w-full border border-line bg-surface-3 text-fg placeholder:text-muted',
          'transition-colors outline-none focus:border-brand [&::-webkit-search-cancel-button]:hidden',
          // room for the clear button only while it's shown, so placeholders get the full width
          (size === 'sm') ? ((value) ? 'pr-9' : 'pr-3') : (value) ? 'pr-11' : 'pr-4',
          // 16px on phones: fits more of the placeholder, and anything smaller makes iOS zoom in on focus
          // sm matches `.input` for compact filter rows
          size === 'lg' ? 'h-14 rounded-lg pl-12 text-base sm:text-lg' : size === 'sm' ? 'h-9 rounded-md pl-9 text-base sm:text-sm' : 'h-12 rounded-lg pl-12 text-base',
        )}
      />
      {(value) ? (
        <button
          type='button'
          aria-label='Clear search'
          onClick={() => onValueChange('')}
          className={cn('absolute top-1/2 -translate-y-1/2 cursor-pointer rounded-md text-subtle hover:bg-surface-3 hover:text-fg', (size === 'sm') ? 'right-1.5 p-1' : 'right-2 p-1.5')}
        >
          <X className='size-4'/>
        </button>
      ) : null}
    </div>
  );
}
