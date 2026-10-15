import { CheckCircle2, CircleAlert, X } from 'lucide-react';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { cn } from '@/lib/utils';


export type ToastTone = 'success' | 'error';

// a button on the toast, e.g. undo; clicking it also dismisses the toast
export interface ToastAction {
  label: string,
  onClick: () => void,
}

interface ToastItem {
  id: number,
  tone: ToastTone,
  message: string,
  action?: ToastAction,
}

type ShowToast = (message: string, tone?: ToastTone, action?: ToastAction) => void;

const ToastContext = createContext<ShowToast | null>(null);


export function useToast(): ShowToast {
  const value = useContext(ToastContext);
  if (!value) {
    throw new Error('useToast must be used inside <ToastProvider>');
  }
  return value;
}


// Small stack of transient messages in the bottom corner. Announced politely to screen readers
// (errors assertively); each one dismisses itself after a few seconds (longer with an action, so there's time to
// reach it) or on click.
export function ToastProvider({ children }: {children: ReactNode}) {
  const [ toasts, setToasts ] = useState<Array<ToastItem>>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((items) => items.filter((item) => item.id !== id));
  }, []);

  const show = useCallback<ShowToast>((message, tone = 'success', action) => {
    const id = nextId.current++;
    setToasts((items) => [...items.slice(-3), {id, tone, message, action}]);
  }, []);

  const value = useMemo(() => show, [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className='pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:items-end'>
        {toasts.map((toast) => <Toast key={toast.id} toast={toast} onDismiss={dismiss}/>)}
      </div>
    </ToastContext.Provider>
  );
}


function Toast({ toast, onDismiss }: {toast: ToastItem, onDismiss: (id: number) => void}) {
  useEffect(() => {
    const timer = window.setTimeout(() => onDismiss(toast.id), (toast.tone === 'error' || toast.action) ? 7000 : 3500);
    return () => window.clearTimeout(timer);
  }, [toast, onDismiss]);

  const Icon = (toast.tone === 'error') ? CircleAlert : CheckCircle2;
  return (
    <div
      role={(toast.tone === 'error') ? 'alert' : 'status'}
      className={cn(
        'pointer-events-auto flex w-full max-w-sm animate-fade-in items-start gap-3 rounded-lg border bg-surface px-4 py-3 text-sm shadow-2xl shadow-black/50',
        (toast.tone === 'error') ? 'border-danger/60' : 'border-success/60',
      )}
    >
      <Icon className={cn('mt-0.5 size-4 shrink-0', (toast.tone === 'error') ? 'text-danger' : 'text-success')}/>
      <span className='min-w-0 flex-1 break-words text-fg'>{toast.message}</span>
      {(toast.action) ? (
        <button
          type='button'
          onClick={() => {
            toast.action?.onClick();
            onDismiss(toast.id);
          }}
          className='-my-1 shrink-0 cursor-pointer rounded px-1.5 py-1 font-semibold text-brand hover:bg-surface-3 hover:text-fg'
        >
          {toast.action.label}
        </button>
      ) : null}
      <button
        type='button'
        aria-label='Dismiss'
        onClick={() => onDismiss(toast.id)}
        className='-m-1 cursor-pointer rounded p-1 text-subtle hover:text-fg'
      >
        <X className='size-4'/>
      </button>
    </div>
  );
}
