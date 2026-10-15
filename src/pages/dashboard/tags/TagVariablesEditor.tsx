import { Braces, Pencil, Plus, Trash2, Variable } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import type { Tag, TagStorageScope, TagStorageType } from '@/lib/api';
import {
  errorMessage,
  useDeleteMeTagVariableMutation,
  useMeTagVariablesQuery,
  usePutMeTagVariableMutation,
} from '@/lib/api/dashboardQueries';
import { cn } from '@/lib/utils';

import { CharCounter, EmptyState, ErrorPanel, Field, InlineError, Panel, PanelSkeleton, ReadOnlyNote } from '../ui';
import { storageIdFor } from './StorageScopeForm';
import {
  formatJson,
  isJson,
  STORAGE_ORDER,
  TAG_VARIABLE_NAME_MAX,
  TAG_VARIABLE_VALUE_MAX,
  TAG_VARIABLES_PER_STORAGE,
  type StorageMeta,
} from './tagMeta';


export function TagVariablesEditor({ tag, scope, readOnly, onDirtyChange }: {
  tag: Tag,
  scope: TagStorageScope,
  readOnly: boolean,
  onDirtyChange: (dirty: boolean) => void,
}) {
  const { data, isPending, isError, error, refetch, isRefetching } = useMeTagVariablesQuery(tag.id, scope);

  // open editors with unsaved text, keyed `${type}:${name}`
  const [ dirtyKeys, setDirtyKeys ] = useState<ReadonlySet<string>>(new Set());
  const setDirty = useCallback((key: string, dirty: boolean) => {
    setDirtyKeys((previous) => {
      if (previous.has(key) === dirty) {
        return previous;
      }
      const next = new Set(previous);
      if (dirty) {
        next.add(key);
      } else {
        next.delete(key);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    onDirtyChange(0 < dirtyKeys.size);
  }, [dirtyKeys, onDirtyChange]);

  if (isPending) {
    return <div className='space-y-4'><PanelSkeleton rows={2}/><PanelSkeleton rows={2}/></div>;
  }
  if (isError) {
    return <ErrorPanel title='Couldn’t load variables' message={errorMessage(error)} onRetry={() => refetch()} retrying={isRefetching}/>;
  }

  return (
    <div className='space-y-4'>
      {(readOnly) ? <ReadOnlyNote>This tag is locked, so its variables are read-only.</ReadOnlyNote> : null}
      {STORAGE_ORDER.map((meta) => {
        const storageId = storageIdFor(scope, meta.type);
        return (
          <StorageGroup
            key={`${meta.type}:${storageId}`}
            tagId={tag.id}
            scope={scope}
            meta={meta}
            storageId={storageId}
            variables={data[`${meta.type}`] ?? {}}
            readOnly={readOnly}
            setDirty={setDirty}
          />
        );
      })}
    </div>
  );
}


function StorageGroup({ tagId, scope, meta, storageId, variables, readOnly, setDirty }: {
  tagId: string,
  scope: TagStorageScope,
  meta: StorageMeta,
  storageId: string | null,
  variables: Record<string, string>,
  readOnly: boolean,
  setDirty: (key: string, dirty: boolean) => void,
}) {
  const [ adding, setAdding ] = useState(false);
  const entries = Object.entries(variables).sort(([a], [b]) => a.localeCompare(b));
  const full = TAG_VARIABLES_PER_STORAGE <= entries.length;

  return (
    <Panel
      headingLevel={3}
      title={meta.label}
      accent={meta.color}
      description={(storageId && storageId !== '0') ? <>{meta.description} <span className='font-mono text-subtle'>{storageId}</span></> : meta.description}
      actions={(storageId) ? (
        <>
          <span className='text-xs text-subtle tabular-nums'>{entries.length} / {TAG_VARIABLES_PER_STORAGE}</span>
          {(!readOnly) ? (
            <button type='button' className='btn btn-secondary btn-sm' disabled={full || adding} onClick={() => setAdding(true)} title={full ? 'This storage is full' : undefined}>
              <Plus aria-hidden className='size-3.5'/> Add
            </button>
          ) : null}
        </>
      ) : null}
    >
      {(!storageId) ? (
        <p className='text-sm text-subtle'>Enter a {meta.label.toLowerCase()} ID above to see this storage.</p>
      ) : (
        <div className='space-y-2'>
          {(adding) ? (
            <VariableEditor
              tagId={tagId}
              scope={scope}
              storageType={meta.type}
              storageId={storageId}
              existingNames={Object.keys(variables)}
              onDone={() => setAdding(false)}
              setDirty={setDirty}
            />
          ) : null}
          {(entries.length) ? (
            <ul className='space-y-2'>
              {entries.map(([ name, value ]) => (
                <VariableRow
                  key={name}
                  tagId={tagId}
                  scope={scope}
                  storageType={meta.type}
                  storageId={storageId}
                  name={name}
                  value={value}
                  readOnly={readOnly}
                  setDirty={setDirty}
                />
              ))}
            </ul>
          ) : (!adding) ? (
            <EmptyState icon={<Variable className='size-7'/>} title='No variables here'>
              {(readOnly) ? null : 'Add one, or let the tag set them when it runs.'}
            </EmptyState>
          ) : null}
        </div>
      )}
    </Panel>
  );
}


function VariableRow({ tagId, scope, storageType, storageId, name, value, readOnly, setDirty }: {
  tagId: string,
  scope: TagStorageScope,
  storageType: TagStorageType,
  storageId: string,
  name: string,
  value: string,
  readOnly: boolean,
  setDirty: (key: string, dirty: boolean) => void,
}) {
  const toast = useToast();
  const [ editing, setEditing ] = useState(false);
  const [ confirming, setConfirming ] = useState(false);
  const remove = useDeleteMeTagVariableMutation(tagId, scope);
  const json = isJson(value);

  if (editing) {
    return (
      <li>
        <VariableEditor
          tagId={tagId}
          scope={scope}
          storageType={storageType}
          storageId={storageId}
          initialName={name}
          initialValue={value}
          onDone={() => setEditing(false)}
          setDirty={setDirty}
        />
      </li>
    );
  }

  return (
    <li className='rounded-md border border-line bg-surface-2 p-3'>
      <div className='flex items-start gap-3'>
        <div className='min-w-0 flex-1'>
          <div className='flex flex-wrap items-center gap-2'>
            <span className='font-mono text-sm break-all text-white'>{name}</span>
            {(json) ? <span className='inline-flex items-center gap-1 rounded bg-surface-3 px-1.5 py-0.5 text-[11px] text-muted'><Braces aria-hidden className='size-3'/>JSON</span> : null}
          </div>
          <pre className='mt-1.5 max-h-40 overflow-auto rounded bg-deep px-2.5 py-1.5 font-mono text-xs break-all whitespace-pre-wrap text-code'>{(json) ? formatJson(value) ?? value : value}</pre>
        </div>
        {(!readOnly) ? (
          <div className='flex shrink-0 gap-1'>
            <button type='button' className='btn btn-ghost btn-sm px-2' aria-label={`Edit ${name}`} onClick={() => setEditing(true)}>
              <Pencil aria-hidden className='size-4'/>
            </button>
            <button type='button' className='btn btn-ghost btn-sm px-2 hover:text-danger' aria-label={`Delete ${name}`} onClick={() => setConfirming(true)}>
              <Trash2 aria-hidden className='size-4'/>
            </button>
          </div>
        ) : null}
      </div>

      {(confirming) ? (
        <ConfirmDialog
          title={`Delete variable “${name}”?`}
          description='The tag will act as if it was never set.'
          confirmLabel='Delete'
          pending={remove.isPending}
          error={(remove.isError) ? errorMessage(remove.error) : null}
          onClose={() => {
            remove.reset();
            setConfirming(false);
          }}
          onConfirm={() => remove.mutate({storageType, storageId, name}, {
            onSuccess: () => {
              setConfirming(false);
              toast(`Deleted “${name}”`);
            },
          })}
        />
      ) : null}
    </li>
  );
}


// add (no initialName) or edit a variable
function VariableEditor({ tagId, scope, storageType, storageId, initialName, initialValue = '', existingNames = [], onDone, setDirty }: {
  tagId: string,
  scope: TagStorageScope,
  storageType: TagStorageType,
  storageId: string,
  initialName?: string,
  initialValue?: string,
  existingNames?: Array<string>,
  onDone: () => void,
  setDirty: (key: string, dirty: boolean) => void,
}) {
  const toast = useToast();
  const put = usePutMeTagVariableMutation(tagId, scope);
  const [ name, setName ] = useState(initialName ?? '');
  const [ value, setValue ] = useState(initialValue);
  const isNew = initialName === undefined;
  const dirtyKey = `${storageType}:${initialName ?? '\u0000new'}`;
  const dirty = name !== (initialName ?? '') || value !== initialValue;

  useEffect(() => {
    setDirty(dirtyKey, dirty);
  }, [dirtyKey, dirty, setDirty]);
  useEffect(() => () => setDirty(dirtyKey, false), [dirtyKey, setDirty]);

  const nameError = (isNew && name.trim() && existingNames.includes(name.trim())) ? 'A variable with this name already exists here.'
    : (TAG_VARIABLE_NAME_MAX < name.length) ? `Up to ${TAG_VARIABLE_NAME_MAX} characters.` : null;
  const valueError = (TAG_VARIABLE_VALUE_MAX < value.length) ? `Up to ${TAG_VARIABLE_VALUE_MAX.toLocaleString()} characters.` : null;
  const formatted = formatJson(value);
  // the API strips whitespace, so a blank value would delete the variable instead of saving it
  const canSave = !!name.trim() && !!value.trim() && !nameError && !valueError && dirty && !put.isPending;

  return (
    <form
      className='rounded-md border border-brand/60 bg-surface-2 p-3'
      onSubmit={(event) => {
        event.preventDefault();
        if (!canSave) {
          return;
        }
        put.mutate({storageType, storageId, name, value}, {
          onSuccess: (variable) => {
            toast((isNew) ? `Added “${variable.name}”` : `Saved “${variable.name}”`);
            setDirty(dirtyKey, false);
            onDone();
          },
        });
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && !dirty) {
          onDone();
        }
      }}
    >
      <div className='space-y-3'>
        {(isNew) ? (
          <Field label='Name' error={nameError} counter={<CharCounter length={name.length} max={TAG_VARIABLE_NAME_MAX}/>}>
            {(props) => <input {...props} autoFocus className='input font-mono' value={name} onChange={(event) => setName(event.target.value)} autoComplete='off' spellCheck={false}/>}
          </Field>
        ) : (
          <p className='font-mono text-sm text-white'>{name}</p>
        )}
        <Field
          label='Value'
          error={valueError}
          hint='Text or JSON. Saving an empty value isn’t allowed; delete the variable instead.'
          counter={<CharCounter length={value.length} max={TAG_VARIABLE_VALUE_MAX}/>}
        >
          {(props) => (
            <textarea
              {...props}
              autoFocus={!isNew}
              rows={Math.min(12, Math.max(3, value.split('\n').length + 1))}
              className='input resize-y font-mono text-xs leading-5'
              value={value}
              onChange={(event) => setValue(event.target.value)}
              spellCheck={false}
            />
          )}
        </Field>
      </div>

      {(put.isError) ? <InlineError>{errorMessage(put.error, 'Couldn’t save the variable.')}</InlineError> : null}

      <div className='mt-3 flex flex-wrap items-center justify-between gap-2'>
        <button
          type='button'
          className={cn('btn btn-ghost btn-sm', !formatted && 'invisible')}
          onClick={() => formatted && setValue(formatted)}
          disabled={!formatted || formatted === value}
        >
          <Braces aria-hidden className='size-3.5'/> Format JSON
        </button>
        <div className='flex gap-2'>
          <button type='button' className='btn btn-ghost btn-sm' onClick={onDone} disabled={put.isPending}>Cancel</button>
          <button type='submit' className='btn btn-primary btn-sm' disabled={!canSave}>
            {(put.isPending) ? <Spinner className='size-3.5 border-white/40 border-t-white'/> : null}
            {(isNew) ? 'Add variable' : 'Save'}
          </button>
        </div>
      </div>
    </form>
  );
}
