import { ChevronLeft, ChevronRight } from 'lucide-react';
import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';

import { Modal, openModalCount } from '@/components/ui/Modal';
import { useToastClearance } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';


// Which of a page's items is open in its modal, and the ones either side of it for ← / →. The open item is kept
// after it leaves the list (verifying it out of the review queue, a refetch), so the modal doesn't vanish under
// you, and its neighbours are then whatever's around where it was.
// With `basePath` the open item is in the url (`<basePath>/<id>`, the page's route has an optional `:itemId`), so it can
// be linked. `openId` is then set before the item is found, a page fetches it by id when it isn't on the loaded page.
export function useOpenListItem<T>(items: Array<T>, getId: (item: T) => string, basePath?: string) {
  const [ stateId, setStateId ] = useState<string | null>(null);
  const { itemId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const openId = (basePath) ? (itemId ?? null) : stateId;
  // opened from the list (not a link), so closing it can go back instead of adding another history entry
  const openedHere = (location.state as {itemOpenedHere?: boolean} | null)?.itemOpenedHere === true;

  const setOpenId = (id: string | null) => {
    if (!basePath) {
      setStateId(id);
    } else if (id) {
      navigate({pathname: `${basePath}/${id}`, search: location.search}, {
        preventScrollReset: true,
        // stepping between items replaces, so Back still closes the modal in one go
        replace: !!openId,
        state: {itemOpenedHere: openedHere || !openId},
      });
    } else if (openedHere) {
      navigate(-1);
    } else {
      navigate({pathname: basePath, search: location.search}, {replace: true, preventScrollReset: true});
    }
  };
  const last = useRef<{item: T, index: number} | null>(null);

  const index = (openId) ? items.findIndex((item) => getId(item) === openId) : -1;
  if (index !== -1) {
    last.current = {item: items[index], index};
  } else if (!openId || (last.current && getId(last.current.item) !== openId)) {
    last.current = null;
  }

  const openItem = (index !== -1) ? items[index] : last.current?.item ?? null;
  const at = (index !== -1) ? index : Math.min(last.current?.index ?? 0, items.length);
  const previous = (openItem && 0 < at) ? items[at - 1] : undefined;
  const next = (openItem) ? items[(index !== -1) ? at + 1 : at] : undefined;

  return {
    openId,
    openItem,
    previousId: (previous) ? getId(previous) : null,
    nextId: (next) ? getId(next) : null,
    open: setOpenId,
    close: () => setOpenId(null),
  };
}


// a quick flick counts once it's moved this far, a slow drag once it's past this much of the width
const SWIPE_MIN_DISTANCE = 60;
const SWIPE_MAX_DURATION = 600;
const SWIPE_COMMIT_FRACTION = 0.35;
// how far it has to move before it's decided whether it's a swipe or a scroll
const SWIPE_INTENT_DISTANCE = 10;
// dragging towards the end of the page only stretches a bit
const SWIPE_EDGE_RESISTANCE = 0.25;
// how far the next item slides in from
const SLIDE_IN_DISTANCE = 96;

// Whether a swipe from `target` belongs to something else: a text field, or anything that scrolls sideways itself.
function swipeHandledBy(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }
  if (target.closest('input, textarea, select, [contenteditable], video, audio')) {
    return true;
  }
  for (let element: Element | null = target; element && element !== document.body; element = element.parentElement) {
    const { overflowX } = getComputedStyle(element);
    if ((overflowX === 'auto' || overflowX === 'scroll') && element.clientWidth < element.scrollWidth) {
      return true;
    }
  }
  return false;
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// While the content slides it's clipped to the dialog, and once it stops nothing is left on it: a transform would
// make it the containing block of the `fixed` dialogs opened from inside it.
function setSliding(element: HTMLElement, sliding: boolean) {
  const dialog = element.closest<HTMLElement>('[role=dialog]');
  if (dialog) {
    // `clip` rather than `hidden`, which would break the sticky footer
    dialog.style.overflow = (sliding) ? 'clip' : '';
  }
  if (!sliding) {
    element.style.transform = '';
    element.style.opacity = '';
  }
}

// `AdminModalFooter`'s Previous / Next go through the modal so they slide too
const SlideNavigation = createContext<((id: string) => void) | null>(null);


// One admin tag over the list, like the dashboard's own tag modal: the full card, with ← / → (or swiping on touch
// screens) stepping through the page. Swiping drags the item along, and every step slides the next one in.
// `footer={false}` leaves the footer to the children, for an `AdminModalFooter` with the item's own actions in it.
export function AdminTagModal({ labelledBy, previousId, nextId, onNavigate, onClose, footer = true, children }: {
  labelledBy: string,
  previousId: string | null,
  nextId: string | null,
  onNavigate: (id: string) => void,
  onClose: () => void,
  footer?: boolean,
  children: ReactNode,
}) {
  const navigation = useRef({previousId, nextId, onNavigate});
  navigation.current = {previousId, nextId, onNavigate};
  const slideRef = useRef<HTMLDivElement>(null);
  // the direction to slide the next render in from, 1 for the next item and -1 for the previous one
  const slideIn = useRef<1 | -1 | null>(null);

  // `dragged`: a swipe left the content off to one side, it slides the rest of the way out first
  const step = useRef(async (id: string, dragged = false) => {
    const direction = (id === navigation.current.previousId) ? -1 : 1;
    const element = slideRef.current;
    if (!element || prefersReducedMotion()) {
      if (element) {
        setSliding(element, false);
      }
      navigation.current.onNavigate(id);
      return;
    }
    if (dragged) {
      const { transform, opacity } = element.style;
      element.getAnimations().forEach((animation) => animation.cancel());
      // held at the end until the next item replaces it
      await element.animate(
        [{transform, opacity}, {transform: `translateX(${-direction * element.offsetWidth}px)`, opacity: 0}],
        {duration: 140, easing: 'ease-in', fill: 'forwards'},
      ).finished.catch(() => {});
    }
    slideIn.current = direction;
    navigation.current.onNavigate(id);
  });

  // before the next item is painted, so it never shows in place first
  useLayoutEffect(() => {
    const element = slideRef.current;
    const direction = slideIn.current;
    if (!element || direction === null) {
      return;
    }
    slideIn.current = null;
    element.getAnimations().forEach((animation) => animation.cancel());
    setSliding(element, true);
    element.style.transform = '';
    element.style.opacity = '';
    const animation = element.animate(
      [{transform: `translateX(${direction * SLIDE_IN_DISTANCE}px)`, opacity: 0}, {transform: 'none', opacity: 1}],
      {duration: 220, easing: 'cubic-bezier(0.2, 0.9, 0.3, 1)'},
    );
    // a newer slide cancelling this one takes over from here
    animation.finished.then(() => setSliding(element, false), () => {});
  });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      // not while a dialog is open over this one (a confirm, the media viewer)
      if (event.altKey || event.ctrlKey || event.metaKey || 1 < openModalCount() || (target instanceof Element && target.closest('input, textarea, select, [contenteditable]'))) {
        return;
      }
      const { previousId, nextId } = navigation.current;
      if (event.key === 'ArrowLeft' && previousId) {
        step.current(previousId);
      } else if (event.key === 'ArrowRight' && nextId) {
        step.current(nextId);
      }
    };

    // Swipe left for the next one, right for the previous one. The content follows the finger once the touch has
    // gone sideways more than down, and springs back if it's let go too soon.
    let swipe: {x: number, y: number, time: number, dragging: boolean} | null = null;
    const springBack = () => {
      const element = slideRef.current;
      if (!element) {
        return;
      }
      const { transform, opacity } = element.style;
      element.style.transform = '';
      element.style.opacity = '';
      if (!transform) {
        setSliding(element, false);
        return;
      }
      element.animate([{transform, opacity}, {transform: 'none', opacity: 1}], {duration: 200, easing: 'ease-out'})
        .finished.then(() => setSliding(element, false), () => {});
    };
    const onTouchStart = (event: TouchEvent) => {
      // not pinch zooms, or while a dialog is open over this one
      swipe = (event.touches.length === 1 && openModalCount() <= 1 && !swipeHandledBy(event.target))
        ? {x: event.touches[0].clientX, y: event.touches[0].clientY, time: event.timeStamp, dragging: false}
        : null;
    };
    const onTouchMove = (event: TouchEvent) => {
      const element = slideRef.current;
      if (!swipe || !element) {
        return;
      }
      // a second finger joining in cancels it
      if (1 < event.touches.length) {
        swipe = null;
        springBack();
        return;
      }
      const dx = event.touches[0].clientX - swipe.x;
      const dy = event.touches[0].clientY - swipe.y;
      if (!swipe.dragging) {
        if (Math.abs(dx) < SWIPE_INTENT_DISTANCE && Math.abs(dy) < SWIPE_INTENT_DISTANCE) {
          return;
        }
        // scrolling, or selecting text by dragging
        if (Math.abs(dx) <= Math.abs(dy) || !document.getSelection()?.isCollapsed) {
          swipe = null;
          return;
        }
        swipe.dragging = true;
        element.getAnimations().forEach((animation) => animation.cancel());
        setSliding(element, true);
      }
      const { previousId, nextId } = navigation.current;
      const offset = (((dx < 0) ? nextId : previousId) ? 1 : SWIPE_EDGE_RESISTANCE) * dx;
      element.style.transform = `translateX(${offset}px)`;
      element.style.opacity = String(1 - 0.5 * Math.min(1, Math.abs(offset) / element.offsetWidth));
    };
    const onTouchEnd = (event: TouchEvent) => {
      const start = swipe;
      swipe = null;
      if (!start) {
        return;
      }
      const element = slideRef.current;
      const dx = event.changedTouches[0].clientX - start.x;
      const dy = event.changedTouches[0].clientY - start.y;
      const target = (dx < 0) ? navigation.current.nextId : navigation.current.previousId;
      const sideways = Math.abs(dy) < Math.abs(dx);
      const flicked = SWIPE_MIN_DISTANCE <= Math.abs(dx) && event.timeStamp - start.time <= SWIPE_MAX_DURATION;
      const far = !!element && SWIPE_COMMIT_FRACTION * element.offsetWidth < Math.abs(dx);
      if (target && sideways && (flicked || far) && !event.touches.length && document.getSelection()?.isCollapsed) {
        step.current(target, start.dragging);
      } else if (start.dragging) {
        springBack();
      }
    };
    const onTouchCancel = () => {
      if (swipe?.dragging) {
        springBack();
      }
      swipe = null;
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('touchstart', onTouchStart, {passive: true});
    document.addEventListener('touchmove', onTouchMove, {passive: true});
    document.addEventListener('touchend', onTouchEnd, {passive: true});
    document.addEventListener('touchcancel', onTouchCancel, {passive: true});
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
      document.removeEventListener('touchcancel', onTouchCancel);
    };
  }, []);

  return (
    <Modal labelledBy={labelledBy} onClose={onClose}>
      <SlideNavigation.Provider value={(id) => step.current(id)}>
        <div ref={slideRef}>
          {children}
          {(footer) ? <AdminModalFooter previousId={previousId} nextId={nextId} onNavigate={onNavigate}/> : null}
        </div>
      </SlideNavigation.Provider>
    </Modal>
  );
}


// Previous / Next for `AdminTagModal`. With `children` (the item's actions) they go between the two and the footer
// stays at the bottom of the window while scrolling, so the actions and the next item are always a click away. The
// negative `bottom` is `Modal`'s bottom padding, which sticky positioning would otherwise leave as a gap under it.
export function AdminModalFooter({ previousId, nextId, onNavigate, children }: {
  previousId: string | null,
  nextId: string | null,
  onNavigate: (id: string) => void,
  children?: ReactNode,
}) {
  const slide = useContext(SlideNavigation);
  const navigate = slide ?? onNavigate;
  const ref = useRef<HTMLElement>(null);
  // toasts (e.g. a status change's undo) would otherwise land on top of Next
  useToastClearance(ref);
  if (!children && !previousId && !nextId) {
    return null;
  }
  return (
    <footer
      ref={ref}
      className={cn(
        'flex items-center justify-between gap-3 border-t border-line',
        (children) ? 'sticky -bottom-6 z-10 rounded-b-xl bg-bg/95 px-3 py-3 backdrop-blur sm:-bottom-10 sm:px-4' : 'px-6 py-3',
      )}
    >
      <button
        type='button'
        className='btn btn-ghost shrink-0 px-2'
        aria-label='Previous'
        title='Previous (←)'
        disabled={!previousId}
        onClick={() => previousId && navigate(previousId)}
      >
        <ChevronLeft className='size-4'/>
        <span className={cn(children && 'hidden lg:inline')}>Previous</span>
      </button>
      {(children) ? (
        <div className='flex min-w-0 flex-1 justify-center gap-2'>{children}</div>
      ) : (
        <span className='hidden text-xs text-subtle sm:block'>Use ← → to browse this page</span>
      )}
      <button
        type='button'
        className='btn btn-ghost shrink-0 px-2'
        aria-label='Next'
        title='Next (→)'
        disabled={!nextId}
        onClick={() => nextId && navigate(nextId)}
      >
        <span className={cn(children && 'hidden lg:inline')}>Next</span>
        <ChevronRight className='size-4'/>
      </button>
    </footer>
  );
}
