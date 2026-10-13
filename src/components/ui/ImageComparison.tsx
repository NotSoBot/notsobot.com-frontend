import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';

import { cn } from '@/lib/utils';


// Before/after slider for command previews. Pointer events cover mouse, touch and pen;
// the handle is a focusable slider so it also works from the keyboard.
export function ImageComparison({ before, after, className }: {before: string, after: string, className?: string}) {
  const [ position, setPosition ] = useState(50);
  const [ dragging, setDragging ] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const moveTo = (clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect && rect.width) {
      setPosition(Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100)));
    }
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
    moveTo(event.clientX);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = (event.shiftKey) ? 10 : 2;
    if (event.key === 'ArrowLeft') {
      setPosition((value) => Math.max(0, value - step));
    } else if (event.key === 'ArrowRight') {
      setPosition((value) => Math.min(100, value + step));
    } else {
      return;
    }
    event.preventDefault();
  };

  return (
    <div
      ref={containerRef}
      role='slider'
      tabIndex={0}
      aria-label='Before and after comparison'
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(position)}
      onPointerDown={onPointerDown}
      onPointerMove={(event) => dragging && moveTo(event.clientX)}
      onPointerUp={() => setDragging(false)}
      onPointerCancel={() => setDragging(false)}
      onKeyDown={onKeyDown}
      className={cn(
        'relative size-64 touch-none overflow-hidden rounded border border-line select-none',
        dragging ? 'cursor-ew-resize' : 'cursor-pointer',
        className,
      )}
    >
      <img src={after} alt='After' draggable={false} className='absolute inset-0 size-full object-cover'/>
      <span className='absolute top-2 right-2 rounded bg-black/70 px-2 py-1 text-xs text-white'>After</span>

      <div className='absolute inset-0' style={{clipPath: `inset(0 ${100 - position}% 0 0)`}}>
        <img src={before} alt='Before' draggable={false} className='size-full object-cover'/>
        <span className='absolute top-2 left-2 rounded bg-black/70 px-2 py-1 text-xs text-white'>Before</span>
      </div>

      <div className='pointer-events-none absolute inset-y-0 w-0.5 bg-brand' style={{left: `${position}%`}}>
        <div className='absolute top-1/2 left-1/2 flex size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center gap-0.5 rounded-full border-2 border-white bg-brand shadow-lg'>
          <span className='h-3 w-0.5 rounded bg-white'/>
          <span className='h-3 w-0.5 rounded bg-white'/>
        </div>
      </div>
    </div>
  );
}
