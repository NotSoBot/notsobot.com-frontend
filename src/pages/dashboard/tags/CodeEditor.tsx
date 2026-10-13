import { useMemo, useRef, useState, type KeyboardEvent, type SyntheticEvent } from 'react';

import { cn } from '@/lib/utils';


// Plain <textarea> with a line-number gutter and a cursor/line status row. No wrapping, so gutter
// rows always line up with text rows; long lines scroll sideways inside the editor.
export function CodeEditor({ value, onChange, onSave, readOnly = false, maxLength, minRows = 12, className, ...props }: {
  value: string,
  onChange: (value: string) => void,
  onSave?: () => void,
  readOnly?: boolean,
  maxLength?: number,
  minRows?: number,
  className?: string,
  id?: string,
  'aria-describedby'?: string,
  'aria-invalid'?: boolean,
}) {
  const gutterRef = useRef<HTMLDivElement>(null);
  const [ cursor, setCursor ] = useState({line: 1, column: 1});
  const lineCount = useMemo(() => value.split('\n').length, [value]);
  const rows = Math.min(Math.max(minRows, lineCount + 1), 30);

  const updateCursor = (event: SyntheticEvent<HTMLTextAreaElement>) => {
    const { selectionStart, value: text } = event.currentTarget;
    const before = text.slice(0, selectionStart);
    const line = before.split('\n').length;
    setCursor({line, column: selectionStart - before.lastIndexOf('\n')});
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      onSave?.();
      return;
    }
    // Tab inserts two spaces; Escape first so keyboard users can still tab out (Esc, then Tab)
    if (event.key === 'Tab' && !event.shiftKey && !readOnly && !event.currentTarget.dataset.escaped) {
      event.preventDefault();
      const target = event.currentTarget;
      const { selectionStart, selectionEnd } = target;
      const next = value.slice(0, selectionStart) + '  ' + value.slice(selectionEnd);
      onChange(next);
      requestAnimationFrame(() => {
        target.selectionStart = target.selectionEnd = selectionStart + 2;
      });
      return;
    }
    if (event.key === 'Escape') {
      event.currentTarget.dataset.escaped = '1';
    } else {
      delete event.currentTarget.dataset.escaped;
    }
  };

  return (
    <div className={cn('overflow-hidden rounded-md border border-line bg-deep transition-colors focus-within:border-brand', className)}>
      <div className='flex'>
        <div
          ref={gutterRef}
          aria-hidden
          className='shrink-0 overflow-hidden border-r border-line bg-[#1b1c1f] py-2 pr-2 pl-3 text-right font-mono text-sm leading-6 text-subtle select-none'
          style={{height: `calc(${rows} * 1.5rem + 1rem)`}}
        >
          {Array.from({length: lineCount}, (_, i) => (
            <div key={i} className={cn((i + 1 === cursor.line) && 'text-muted')}>{i + 1}</div>
          ))}
        </div>
        <textarea
          {...props}
          value={value}
          rows={rows}
          wrap='off'
          readOnly={readOnly}
          spellCheck={false}
          autoCapitalize='off'
          autoComplete='off'
          autoCorrect='off'
          onChange={(event) => {
            onChange(event.target.value);
            updateCursor(event);
          }}
          onSelect={updateCursor}
          onKeyDown={onKeyDown}
          onScroll={(event) => {
            if (gutterRef.current) {
              gutterRef.current.scrollTop = event.currentTarget.scrollTop;
            }
          }}
          className={cn(
            'block min-w-0 flex-1 resize-none bg-transparent px-3 py-2 font-mono text-sm leading-6 text-fg outline-none',
            'placeholder:text-subtle',
            readOnly && 'cursor-default text-muted',
          )}
          style={{height: `calc(${rows} * 1.5rem + 1rem)`}}
        />
      </div>
      <div className='flex flex-wrap items-center justify-between gap-x-3 border-t border-line bg-[#1b1c1f] px-3 py-1 text-xs text-subtle tabular-nums'>
        <span>Ln {cursor.line}, Col {cursor.column}</span>
        <span>
          {lineCount.toLocaleString()} {lineCount === 1 ? 'line' : 'lines'}
          {(maxLength) ? <> · <span className={cn(maxLength < value.length && 'text-danger')}>{value.length.toLocaleString()} / {maxLength.toLocaleString()}</span></> : null}
        </span>
      </div>
    </div>
  );
}
