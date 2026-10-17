import { X } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@/lib/utils';


// open modals, innermost last: Escape only closes the top one, so a confirm dialog over a modal doesn't close both
const openModals: Array<symbol> = [];

// for keyboard shortcuts of a modal that shouldn't fire while another one is open over it
export function openModalCount(): number {
  return openModals.length;
}


// Centered dialog over the current page: Escape / backdrop click close it, focus moves in and is
// handed back to whatever opened it, and the page underneath doesn't scroll while it's open.
// Rendered at the end of `body`, so it's never inside a transformed ancestor and a modal opened from another one stacks
// over it (each one's dimming included).
// `stickyClose` keeps the close button at the top of the window while scrolling on phones, for a modal whose header
// sticks there too (at `-top-12`, this window's top padding on phones).
export function Modal({ labelledBy, onClose, className, stickyClose = false, children }: {
  labelledBy: string,
  onClose: () => void,
  className?: string,
  stickyClose?: boolean,
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
    const { position } = document.documentElement.style;
    document.body.style.overflow = 'hidden';
    // so the dimming can cover the whole page, see below
    document.documentElement.style.position = 'relative';
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      openModals.splice(openModals.indexOf(self), 1);
      document.body.style.overflow = overflow;
      document.documentElement.style.position = position;
      previouslyFocused?.focus?.({preventScroll: true});
    };
  }, []);

  return createPortal(
    <>
      {/* The dimming is part of the page (absolute over the whole document) rather than fixed to the window: iOS
          Safari's floating toolbar sits below where the window's `bottom: 0` ends, the page shows through there, and
          it clips fixed elements to the window, however far past the bottom they run */}
      <div aria-hidden className='absolute inset-0 z-50 min-h-lvh animate-fade-in bg-black/70'/>
      {/* `my-auto` instead of `items-center`: centered when it fits, and when it's taller than the window it starts
          below the top padding instead of being cut off above it */}
      <div className='fixed inset-0 z-50 flex items-start justify-center overflow-y-auto px-3 pt-12 pb-6 sm:px-6 sm:pt-20 sm:pb-10'>
        {/* the blur only needs to cover what's in the window, a blur the size of the whole page is slow */}
        <div aria-hidden className='fixed inset-0 animate-fade-in backdrop-blur-sm' onClick={onClose}/>
        <div
          role='dialog'
          aria-modal='true'
          aria-labelledby={labelledBy}
          className={cn(
            'relative my-auto w-full max-w-4xl animate-modal-in rounded-xl border border-line-strong bg-bg shadow-2xl shadow-black/60',
            className,
          )}
        >
          {/* a zero-height wrapper, so when it sticks it carries the button along without taking up any room */}
          <div className={cn(stickyClose && 'max-sm:sticky max-sm:-top-12 max-sm:z-20 max-sm:h-0')}>
            <button
              ref={closeRef}
              type='button'
              aria-label='Close'
              onClick={onClose}
              className='absolute top-3 right-3 z-10 cursor-pointer rounded-md p-2 text-muted transition-colors hover:bg-surface-2 hover:text-white'
            >
              <X className='size-5'/>
            </button>
          </div>
          {children}
        </div>
      </div>
    </>,
    document.body,
  );
}
