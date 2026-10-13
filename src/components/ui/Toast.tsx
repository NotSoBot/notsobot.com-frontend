import { CheckCircle2, CircleAlert, X } from 'lucide-react';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { cn } from '@/lib/utils';


export type ToastTone = 'success' | 'error';

interface ToastItem {
  id: number,
  tone: ToastTone,
  message: string,
}

type ShowToast = (message: string, tone?: ToastTone) => void;

const ToastContext = createContext<ShowToast | null>(null);


export function useToast(): ShowToast {
  const value = useContext(ToastContext);
  if (!value) {
    throw new Error('useToast must be used inside <ToastProvider>');
  }
  return value;
}


// Small stack of transient messages in the bottom corner. Announced politely to screen readers
// (errors assertively); each one dismisses itself after a few seconds or on click.
export function ToastProvider({ children }: {children: ReactNode}) {
  const [ toasts, setToasts ] = useState<Array<ToastItem>>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((items) => items.filter((item) => item.id !== id));
  }, []);

  const show = useCallback<ShowToast>((message, tone = 'success') => {
    const id = nextId.current++;
    setToasts((items) => [...items.slice(-3), {id, tone, message}]);
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
    const timer = window.setTimeout(() => onDismiss(toast.id), (toast.tone === 'error') ? 7000 : 3500);
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
