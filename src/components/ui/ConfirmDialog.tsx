import { useId, useState, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

import { Modal } from './Modal';
import { Spinner } from './Spinner';


// Yes/no dialog for destructive actions. With `confirmPhrase`, the confirm button stays disabled
// until that exact text is typed.
export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  tone = 'danger',
  confirmPhrase,
  pending = false,
  error,
  onConfirm,
  onClose,
}: {
  title: ReactNode,
  description?: ReactNode,
  confirmLabel: string,
  tone?: 'danger' | 'primary',
  confirmPhrase?: string,
  pending?: boolean,
  error?: ReactNode,
  onConfirm: () => void,
  onClose: () => void,
}) {
  const titleId = useId();
  const inputId = useId();
  const [ typed, setTyped ] = useState('');
  const ready = !confirmPhrase || typed.trim() === confirmPhrase;

  return (
    <Modal labelledBy={titleId} onClose={() => !pending && onClose()} className='max-w-md'>
      <form
        className='p-5 sm:p-6'
        onSubmit={(event) => {
          event.preventDefault();
          if (ready && !pending) {
            onConfirm();
          }
        }}
      >
        <h2 id={titleId} className='pr-10 text-lg font-semibold text-white'>{title}</h2>
        {(description) ? <div className='mt-2 text-sm text-muted'>{description}</div> : null}

        {(confirmPhrase) ? (
          <div className='mt-4'>
            <label htmlFor={inputId} className='mb-1.5 block text-sm text-muted'>
              Type <span className='font-mono text-white select-all'>{confirmPhrase}</span> to confirm
            </label>
            <input
              id={inputId}
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              autoComplete='off'
              spellCheck={false}
              className='input'
            />
          </div>
        ) : null}

        {(error) ? <p role='alert' className='mt-4 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-fg'>{error}</p> : null}

        <div className='mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end'>
          <button type='button' className='btn btn-secondary' onClick={onClose} disabled={pending}>Cancel</button>
          <button
            type='submit'
            disabled={!ready || pending}
            className={cn('btn', (tone === 'danger') ? 'btn-danger' : 'btn-primary')}
          >
            {(pending) ? <Spinner className='size-4 border-white/40 border-t-white'/> : null}
            {confirmLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}
