import { CircleAlert, Lock, RefreshCw } from 'lucide-react';
import { useEffect, useId, type ReactNode } from 'react';
import { useBlocker } from 'react-router';

import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Spinner } from '@/components/ui/Spinner';
import { cn } from '@/lib/utils';


// Section heading inside a dashboard page.
export function DashboardHeader({ title, description, children }: {title: ReactNode, description?: ReactNode, children?: ReactNode}) {
  return (
    <header className='mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between'>
      <div className='min-w-0'>
        <h1 className='text-2xl font-bold break-words text-white sm:text-3xl'>{title}</h1>
        {(description) ? <div className='mt-1.5 text-muted'>{description}</div> : null}
      </div>
      {(children) ? <div className='flex shrink-0 flex-wrap items-center gap-2'>{children}</div> : null}
    </header>
  );
}


// A titled card. `accent` is a CSS color for the little bar next to the title (matches the commands page).
// `readOnly` (the reason) marks the whole card as view only: dashed border, a badge, the reason up top and the
// contents dimmed, so it's obvious at a glance which sections can't be changed.
export function Panel({ title, description, accent, actions, className, children, headingLevel = 2, readOnly }: {
  title: ReactNode,
  description?: ReactNode,
  accent?: string,
  actions?: ReactNode,
  className?: string,
  children: ReactNode,
  headingLevel?: 2 | 3,
  readOnly?: ReactNode,
}) {
  const Heading = (headingLevel === 2) ? 'h2' : 'h3';
  return (
    <section
      aria-readonly={(readOnly) ? true : undefined}
      className={cn('card p-4 sm:p-5', readOnly && 'border-dashed border-line-strong bg-surface/60', className)}
    >
      <div className='mb-4 flex flex-wrap items-start justify-between gap-x-3 gap-y-2'>
        <div className='min-w-0'>
          <Heading className='flex items-center gap-2 text-lg font-semibold text-white'>
            {(accent) ? <span aria-hidden className='h-4 w-1 shrink-0 rounded-full' style={{background: accent}}/> : null}
            {title}
            {(readOnly) ? (
              <span className='inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-xs font-medium text-warning'>
                <Lock aria-hidden className='size-3'/>
                View only
              </span>
            ) : null}
          </Heading>
          {(description) ? <p className='mt-1 text-sm text-muted'>{description}</p> : null}
        </div>
        {(actions) ? <div className='flex shrink-0 flex-wrap items-center gap-2'>{actions}</div> : null}
      </div>
      {(readOnly) ? <ReadOnlyNote>{readOnly}</ReadOnlyNote> : null}
      {(readOnly) ? <div className='opacity-70'>{children}</div> : children}
    </section>
  );
}


export function ReadOnlyNote({ children }: {children: ReactNode}) {
  return (
    <p className='mb-4 flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-fg'>
      <Lock aria-hidden className='mt-0.5 size-4 shrink-0 text-warning'/>
      <span>{children}</span>
    </p>
  );
}


export function ErrorPanel({ title = 'Couldn’t load this', message, onRetry, retrying = false }: {
  title?: ReactNode,
  message?: ReactNode,
  onRetry?: () => void,
  retrying?: boolean,
}) {
  return (
    <div role='alert' className='card flex flex-col items-center gap-3 p-8 text-center sm:p-10'>
      <CircleAlert aria-hidden className='size-8 text-danger'/>
      <div>
        <p className='font-medium text-white'>{title}</p>
        {(message) ? <p className='mt-1 text-sm text-muted'>{message}</p> : null}
      </div>
      {(onRetry) ? (
        <button type='button' className='btn btn-secondary' onClick={onRetry} disabled={retrying}>
          {(retrying) ? <Spinner className='size-4'/> : <RefreshCw className='size-4'/>}
          Retry
        </button>
      ) : null}
    </div>
  );
}


export function InlineError({ children }: {children: ReactNode}) {
  return (
    <p role='alert' className='mt-2 flex items-start gap-1.5 text-sm text-danger'>
      <CircleAlert aria-hidden className='mt-0.5 size-4 shrink-0'/>
      <span className='min-w-0 break-words'>{children}</span>
    </p>
  );
}


export function Skeleton({ className }: {className?: string}) {
  return <div aria-hidden className={cn('animate-pulse rounded bg-surface-3', className)}/>;
}


export function PanelSkeleton({ rows = 3 }: {rows?: number}) {
  return (
    <div aria-hidden className='card p-5'>
      <Skeleton className='h-5 w-40'/>
      <Skeleton className='mt-2 h-3 w-64 max-w-full bg-surface-2'/>
      <div className='mt-5 space-y-3'>
        {Array.from({length: rows}, (_, i) => <Skeleton key={i} className='h-9 w-full bg-surface-2'/>)}
      </div>
    </div>
  );
}


// Label + control + hint/error, wired up with ids for screen readers.
export function Field({ label, hint, error, counter, children, className }: {
  label: ReactNode,
  hint?: ReactNode,
  error?: ReactNode,
  counter?: ReactNode,
  children: (props: {id: string, 'aria-describedby'?: string, 'aria-invalid'?: boolean}) => ReactNode,
  className?: string,
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  const describedBy = (hint || error) ? hintId : undefined;
  return (
    <div className={cn('min-w-0', className)}>
      <div className='mb-1.5 flex items-baseline justify-between gap-3'>
        <label htmlFor={id} className='text-sm font-medium text-fg'>{label}</label>
        {(counter) ? <span className='shrink-0 text-xs text-subtle tabular-nums'>{counter}</span> : null}
      </div>
      {children({id, 'aria-describedby': describedBy, 'aria-invalid': (error) ? true : undefined})}
      {(error) ? (
        <p id={hintId} className='mt-1.5 text-xs text-danger'>{error}</p>
      ) : (hint) ? (
        <p id={hintId} className='mt-1.5 text-xs text-subtle'>{hint}</p>
      ) : null}
    </div>
  );
}


export function CharCounter({ length, max }: {length: number, max: number}) {
  return (
    <span className={cn(max < length ? 'text-danger' : (max * 0.9 < length) ? 'text-warning' : undefined)}>
      {length.toLocaleString()} / {max.toLocaleString()}
    </span>
  );
}


export function Toggle({ checked, onChange, label, description, disabled = false }: {
  checked: boolean,
  onChange: (value: boolean) => void,
  label: ReactNode,
  description?: ReactNode,
  disabled?: boolean,
}) {
  const id = useId();
  return (
    <div className='flex items-start justify-between gap-4'>
      <div className='min-w-0'>
        <label htmlFor={id} className={cn('text-sm font-medium text-fg', !disabled && 'cursor-pointer')}>{label}</label>
        {(description) ? <p className='mt-0.5 text-xs text-subtle'>{description}</p> : null}
      </div>
      <button
        id={id}
        type='button'
        role='switch'
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-60',
          checked ? 'bg-success' : 'bg-[#72767d]',
        )}
      >
        <span className={cn('inline-block size-[1.125rem] rounded-full bg-white shadow transition-transform', checked ? 'translate-x-[1.375rem]' : 'translate-x-[0.1875rem]')}/>
      </button>
    </div>
  );
}


// Save/discard row shown under a form; `dirty` drives the "Unsaved changes" hint.
export function SaveBar({ dirty, pending, onDiscard, saveLabel = 'Save changes', disabled = false, status, standalone = false }: {
  dirty: boolean,
  pending: boolean,
  onDiscard?: () => void,
  saveLabel?: string,
  disabled?: boolean,
  status?: ReactNode,
  // its own card instead of a divider at the bottom of one
  standalone?: boolean,
}) {
  return (
    <div
      className={cn(
        'flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between',
        (standalone) ? cn('card p-4', dirty && 'sticky bottom-3 z-10 shadow-xl shadow-black/40') : 'mt-5 border-t border-line pt-4',
      )}
    >
      <div aria-live='polite' className='min-h-5 text-sm'>
        {(status) ? status : (dirty) ? <span className='text-warning'>Unsaved changes</span> : null}
      </div>
      <div className='flex flex-wrap gap-2 sm:justify-end'>
        {(onDiscard) ? (
          <button type='button' className='btn btn-ghost' onClick={onDiscard} disabled={!dirty || pending}>Discard</button>
        ) : null}
        <button type='submit' className='btn btn-primary' disabled={!dirty || pending || disabled}>
          {(pending) ? <Spinner className='size-4 border-white/40 border-t-white'/> : null}
          {(pending) ? 'Saving…' : saveLabel}
        </button>
      </div>
    </div>
  );
}


// Warns before leaving with unsaved edits: in-app navigation gets a dialog, closing the tab the
// browser's own prompt. Navigations that pass `state: {skipUnsavedGuard: true}` (e.g. after a delete) go through.
export function UnsavedChangesGuard({ when }: {when: boolean}) {
  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    const skip = (nextLocation.state as {skipUnsavedGuard?: boolean} | null)?.skipUnsavedGuard;
    return when && !skip && currentLocation.pathname !== nextLocation.pathname;
  });

  useEffect(() => {
    if (!when) {
      return;
    }
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [when]);

  if (blocker.state !== 'blocked') {
    return null;
  }
  return (
    <ConfirmDialog
      title='Discard unsaved changes?'
      description='You have edits that haven’t been saved. If you leave now, they’ll be lost.'
      confirmLabel='Discard and leave'
      onConfirm={() => blocker.proceed()}
      onClose={() => blocker.reset()}
    />
  );
}


export function EmptyState({ icon, title, children }: {icon?: ReactNode, title: ReactNode, children?: ReactNode}) {
  return (
    <div className='rounded-lg border border-dashed border-line-strong p-8 text-center'>
      {(icon) ? <div className='mx-auto mb-3 flex justify-center text-subtle'>{icon}</div> : null}
      <p className='font-medium text-white'>{title}</p>
      {(children) ? <div className='mt-1 text-sm text-muted'>{children}</div> : null}
    </div>
  );
}
