import type { Choice } from './botChoices';


// <select> over fixed choices. `noneLabel` adds an "unset" option that maps to null (bot default).
export function ChoiceSelect<T extends string | number>({ value, choices, onChange, noneLabel, disabled, ...props }: {
  value: T | null,
  choices: ReadonlyArray<Choice<T>>,
  onChange: (value: T | null) => void,
  noneLabel?: string,
  disabled?: boolean,
  id?: string,
  'aria-describedby'?: string,
  'aria-invalid'?: boolean,
}) {
  const numeric = typeof choices[0]?.value === 'number';
  const known = value === null || choices.some((choice) => choice.value === value);
  return (
    <select
      {...props}
      disabled={disabled}
      className='input'
      value={(value === null) ? '' : String(value)}
      onChange={(event) => {
        const raw = event.target.value;
        onChange((raw === '') ? null : ((numeric) ? Number(raw) : raw) as T);
      }}
    >
      {(noneLabel !== undefined || value === null) ? <option value=''>{noneLabel ?? 'Not set'}</option> : null}
      {/* keep a stored value the list doesn't know about (e.g. a retired model) visible instead of silently changing it */}
      {(!known) ? <option value={String(value)}>{String(value)}</option> : null}
      {choices.map((choice) => <option key={String(choice.value)} value={String(choice.value)}>{choice.label}</option>)}
    </select>
  );
}
