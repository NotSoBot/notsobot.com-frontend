import { Braces, FileQuestion, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { useToast } from '@/components/ui/Toast';
import type { Tag, TagBlobs, TagBlobsPut, TagStorageScope, TagStorageType } from '@/lib/api';
import { errorMessage, useMeTagBlobsQuery, usePutMeTagBlobsMutation } from '@/lib/api/dashboardQueries';
import { cn, formatMemory } from '@/lib/utils';

import { ErrorPanel, Field, InlineError, Panel, PanelSkeleton, ReadOnlyNote, SaveBar } from '../ui';
import { storageIdFor } from './StorageScopeForm';
import { byteLength, decodeBlob, encodeBlob, formatJson, STORAGE_ORDER, TAG_BLOB_MAX_BYTES } from './tagMeta';


// One blob per storage. Text blobs are edited as text; binary ones can only be kept or removed.
type Slot =
  | {kind: 'text', text: string}
  | {kind: 'binary', base64: string, bytes: number}
  | {kind: 'empty'};

type Slots = Record<TagStorageType, Slot>;


function toSlots(blobs: TagBlobs): Slots {
  const slots = {} as Slots;
  for (const { type } of STORAGE_ORDER) {
    const value = blobs[`${type}`];
    if (!value) {
      slots[type] = {kind: 'empty'};
      continue;
    }
    const decoded = decodeBlob(value);
    slots[type] = (decoded.text !== null) ? {kind: 'text', text: decoded.text} : {kind: 'binary', base64: value, bytes: decoded.bytes};
  }
  return slots;
}

function slotText(slot: Slot): string {
  return (slot.kind === 'text') ? slot.text : '';
}

function sameSlot(a: Slot, b: Slot): boolean {
  if (a.kind === 'binary' || b.kind === 'binary') {
    return a.kind === b.kind;
  }
  return slotText(a) === slotText(b);
}


export function TagBlobsEditor({ tag, scope, readOnly, onDirtyChange }: {
  tag: Tag,
  scope: TagStorageScope,
  readOnly: boolean,
  onDirtyChange: (dirty: boolean) => void,
}) {
  const { data, isPending, isError, error, refetch, isRefetching } = useMeTagBlobsQuery(tag.id, scope);
  if (isPending) {
    return <div className='space-y-4'><PanelSkeleton rows={2}/><PanelSkeleton rows={2}/></div>;
  }
  if (isError) {
    return <ErrorPanel title='Couldn’t load blobs' message={errorMessage(error)} onRetry={() => refetch()} retrying={isRefetching}/>;
  }
  // a new scope/response starts a fresh form
  return <BlobsForm key={JSON.stringify(scope)} tag={tag} scope={scope} blobs={data} readOnly={readOnly} onDirtyChange={onDirtyChange}/>;
}


function BlobsForm({ tag, scope, blobs, readOnly, onDirtyChange }: {
  tag: Tag,
  scope: TagStorageScope,
  blobs: TagBlobs,
  readOnly: boolean,
  onDirtyChange: (dirty: boolean) => void,
}) {
  const toast = useToast();
  const put = usePutMeTagBlobsMutation(tag.id, scope);
  const saved = useMemo(() => toSlots(blobs), [blobs]);
  const [ draft, setDraft ] = useState<Slots>(saved);

  // after a save the query data changes; start from what the API stored
  useEffect(() => {
    setDraft(saved);
  }, [saved]);

  const dirty = STORAGE_ORDER.some(({ type }) => !sameSlot(draft[type], saved[type]));
  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);
  useEffect(() => () => onDirtyChange(false), [onDirtyChange]);

  const sizes = Object.fromEntries(STORAGE_ORDER.map(({ type }) => {
    const slot = draft[type];
    return [type, (slot.kind === 'text') ? byteLength(slot.text) : (slot.kind === 'binary') ? slot.bytes : 0];
  })) as Record<TagStorageType, number>;
  const tooBig = STORAGE_ORDER.some(({ type }) => TAG_BLOB_MAX_BYTES < sizes[type]);

  const save = () => {
    if (!dirty || tooBig || put.isPending) {
      return;
    }
    // PUT replaces every blob in the scope, so send all of them (unchanged ones included)
    const body: TagBlobsPut = {...scope, blobs: []};
    for (const { type } of STORAGE_ORDER) {
      const storageId = storageIdFor(scope, type);
      const slot = draft[type];
      if (!storageId || slot.kind === 'empty' || (slot.kind === 'text' && !slot.text)) {
        continue;
      }
      body.blobs.push({storage_id: storageId, storage_type: type, value: (slot.kind === 'text') ? encodeBlob(slot.text) : slot.base64});
    }
    put.mutate(body, {
      onSuccess: () => toast('Blobs saved'),
      onError: (saveError) => toast(errorMessage(saveError, 'Couldn’t save the blobs.'), 'error'),
    });
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
      className='space-y-4'
    >
      {(readOnly) ? <ReadOnlyNote>This tag is locked, so its blobs are read-only.</ReadOnlyNote> : null}
      <p className='text-sm text-muted'>
        Each storage holds one blob of up to {formatMemory(TAG_BLOB_MAX_BYTES)} that the tag can read and write.
        Clearing a blob and saving removes it.
      </p>

      {STORAGE_ORDER.map((meta) => {
        const storageId = storageIdFor(scope, meta.type);
        const slot = draft[meta.type];
        const size = sizes[meta.type];
        const formatted = (slot.kind === 'text') ? formatJson(slot.text) : null;
        const changed = !sameSlot(slot, saved[meta.type]);
        return (
          <Panel
            key={meta.type}
            headingLevel={3}
            title={<>{meta.label}{(changed) ? <span className='ml-1 text-xs font-normal text-warning'>(edited)</span> : null}</>}
            accent={meta.color}
            description={(storageId && storageId !== '0') ? <>{meta.description} <span className='font-mono text-subtle'>{storageId}</span></> : meta.description}
          >
            {(!storageId) ? (
              <p className='text-sm text-subtle'>Enter a {meta.label.toLowerCase()} ID above to see this storage.</p>
            ) : (slot.kind === 'binary') ? (
              <div className='flex flex-wrap items-center justify-between gap-3 rounded-md border border-line bg-surface-2 p-3'>
                <span className='flex items-center gap-2 text-sm text-muted'>
                  <FileQuestion aria-hidden className='size-4 shrink-0'/>
                  Binary data ({formatMemory(slot.bytes, 1)}); it can’t be edited as text.
                </span>
                {(!readOnly) ? (
                  <button type='button' className='btn btn-ghost btn-sm hover:text-danger' onClick={() => setDraft((previous) => ({...previous, [meta.type]: {kind: 'empty'}}))}>
                    <Trash2 aria-hidden className='size-3.5'/> Remove
                  </button>
                ) : null}
              </div>
            ) : (
              <Field
                label={`${meta.label} blob`}
                counter={<span className={cn(TAG_BLOB_MAX_BYTES < size && 'text-danger')}>{formatMemory(size, (size < 1024) ? 0 : 1)} / {formatMemory(TAG_BLOB_MAX_BYTES)}</span>}
                error={(TAG_BLOB_MAX_BYTES < size) ? `Blobs can be up to ${formatMemory(TAG_BLOB_MAX_BYTES)}.` : null}
              >
                {(props) => (
                  <textarea
                    {...props}
                    readOnly={readOnly}
                    rows={Math.min(14, Math.max(4, slotText(slot).split('\n').length + 1))}
                    placeholder={(readOnly) ? 'Empty' : 'Empty. Type or paste text/JSON to store it.'}
                    spellCheck={false}
                    className='input resize-y font-mono text-xs leading-5'
                    value={slotText(slot)}
                    onChange={(event) => {
                      put.reset();
                      const text = event.target.value;
                      setDraft((previous) => ({...previous, [meta.type]: (text) ? {kind: 'text', text} : {kind: 'empty'}}));
                    }}
                  />
                )}
              </Field>
            )}
            {(formatted && formatted !== slotText(slot) && !readOnly) ? (
              <button
                type='button'
                className='btn btn-ghost btn-sm mt-2'
                onClick={() => setDraft((previous) => ({...previous, [meta.type]: {kind: 'text', text: formatted}}))}
              >
                <Braces aria-hidden className='size-3.5'/> Format JSON
              </button>
            ) : null}
          </Panel>
        );
      })}

      {(put.isError) ? <InlineError>{errorMessage(put.error, 'Couldn’t save the blobs.')}</InlineError> : null}
      {(!readOnly) ? (
        <SaveBar standalone dirty={dirty} pending={put.isPending} disabled={tooBig} saveLabel='Save blobs' onDiscard={() => {
          put.reset();
          setDraft(saved);
        }}/>
      ) : null}
    </form>
  );
}
