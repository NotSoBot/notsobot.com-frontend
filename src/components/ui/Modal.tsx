import { X } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';

import { cn } from '@/lib/utils';


// open modals, innermost last: Escape only closes the top one, so a confirm dialog over a modal doesn't close both
const openModals: Array<symbol> = [];

// for keyboard shortcuts of a modal that shouldn't fire while another one is open over it
export function openModalCount(): number {
  return openModals.length;
}


// Centered dialog over the current page: Escape / backdrop click close it, focus moves in and is
// handed back to whatever opened it, and the page underneath doesn't scroll while it's open.
export function Modal({ labelledBy, onClose, className, children }: {
  labelledBy: string,
  onClose: () => void,
  className?: string,
  children: ReactNode,
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeRef.current?.focus({preventScroll: true});
    const self = Symbol('modal');
    openModals.push(self);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && openModals.at(-1) === self) {
        onCloseRef.current();
      }
    };
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      openModals.splice(openModals.indexOf(self), 1);
      document.body.style.overflow = overflow;
      previouslyFocused?.focus?.({preventScroll: true});
    };
  }, []);

  return (
    // `my-auto` instead of `items-center`: centered when it fits, and when it's taller than the window it starts below
    // the top padding instead of being cut off above it
    <div className='fixed inset-0 z-50 flex items-start justify-center overflow-y-auto px-3 pt-12 pb-6 sm:px-6 sm:pt-20 sm:pb-10'>
      {/* runs past the bottom: iOS Safari's floating toolbar sits below where `bottom: 0` ends, and the page shows
          through there undimmed otherwise */}
      <div aria-hidden className='fixed inset-x-0 top-0 -bottom-[50vh] animate-fade-in bg-black/70 backdrop-blur-sm' onClick={onClose}/>
      <div
        role='dialog'
        aria-modal='true'
        aria-labelledby={labelledBy}
        className={cn(
          'relative my-auto w-full max-w-4xl animate-modal-in rounded-xl border border-line-strong bg-bg shadow-2xl shadow-black/60',
          className,
        )}
      >
        <button
          ref={closeRef}
          type='button'
          aria-label='Close'
          onClick={onClose}
          className='absolute top-3 right-3 z-10 cursor-pointer rounded-md p-2 text-muted transition-colors hover:bg-surface-2 hover:text-white'
        >
          <X className='size-5'/>
        </button>
        {children}
      </div>
    </div>
  );
}
