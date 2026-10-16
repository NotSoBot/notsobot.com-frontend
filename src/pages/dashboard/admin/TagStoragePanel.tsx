import { ChevronDown, ChevronUp, Database } from 'lucide-react';
import { useState, type CSSProperties } from 'react';

import { SearchInput } from '@/components/ui/SearchInput';
import { Segmented } from '@/components/ui/Segmented';
import { Spinner } from '@/components/ui/Spinner';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { TagStorageTypes, type AdminTagBlob, type AdminTagStoragePage, type AdminTagVariable, type TagStorageType } from '@/lib/api';
import {
  ADMIN_TAG_BLOBS_PAGE_SIZE,
  ADMIN_TAG_VARIABLES_PAGE_SIZE,
  errorMessage,
  useAdminTagStorageQuery,
} from '@/lib/api/dashboardQueries';
import { cn, formatMemory } from '@/lib/utils';
import { formatJson, STORAGE_ORDER } from '@/pages/dashboard/tags/tagMeta';

import { CopyableValue, Pagination, selectAllScope } from './adminUi';


type Kind = 'variables' | 'blobs';


// Staff-only, read-only look at everything a tag has stored, across every user/channel/server (the owner's editor only
// shows one scope at a time). Collapsed by default so the lists don't fetch it for every card.
export function TagStoragePanel({ tagId, className }: {tagId: string, className?: string}) {
  const [ open, setOpen ] = useState(false);
  return (
    <div className={className}>
      <button type='button' className='btn btn-ghost btn-sm -ml-2' onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        <Database aria-hidden className='size-4'/>
        Variables &amp; blobs
        {(open) ? <ChevronUp aria-hidden className='size-4'/> : <ChevronDown aria-hidden className='size-4'/>}
      </button>
      {(open) ? <StorageBrowser tagId={tagId}/> : null}
    </div>
  );
}


function StorageBrowser({ tagId }: {tagId: string}) {
  const [ kind, setKind ] = useState<Kind>('variables');
  const [ storageType, setStorageType ] = useState<TagStorageType | null>(null);
  const [ search, setSearch ] = useState('');
  const query = useDebouncedValue(search.trim(), 300);
  const [ page, setPage ] = useState(0);

  // back to the first page whenever the (debounced) search changes
  const [ pageQuery, setPageQuery ] = useState(query);
  if (pageQuery !== query) {
    setPageQuery(query);
    setPage(0);
  }

  // the other kind only needs its first page, for the counts on its tab (the search applies to both)
  const idle = {storageType: null, query, page: 0};
  const variables = useAdminTagStorageQuery(tagId, 'variables', (kind === 'variables') ? {storageType, query, page} : idle);
  const blobs = useAdminTagStorageQuery(tagId, 'blobs', (kind === 'blobs') ? {storageType, query, page} : idle);
  const current = (kind === 'variables') ? variables : blobs;
  const data = current.data as AdminTagStoragePage<AdminTagVariable | AdminTagBlob> | undefined;
  const pageSize = (kind === 'variables') ? ADMIN_TAG_VARIABLES_PAGE_SIZE : ADMIN_TAG_BLOBS_PAGE_SIZE;
  const total = (counts: Partial<Record<string, number>> | undefined) => Object.values(counts ?? {}).reduce<number>((sum, value) => sum + (value ?? 0), 0);

  const change = (next: {kind?: Kind, storageType?: TagStorageType | null}) => {
    if (next.kind !== undefined) {
      setKind(next.kind);
    }
    if (next.storageType !== undefined) {
      setStorageType(next.storageType);
    }
    setPage(0);
  };

  return (
    <div className='mt-2 rounded-md border border-line bg-surface-2 p-3'>
      <div className='flex flex-wrap items-center gap-3'>
        <Segmented
          label='Storage kind'
          value={kind}
          options={[
            {value: 'variables', label: `Variables${(variables.data) ? ` (${total(variables.data.counts).toLocaleString()})` : ''}`},
            {value: 'blobs', label: `Blobs${(blobs.data) ? ` (${total(blobs.data.counts).toLocaleString()})` : ''}`},
          ]}
          onChange={(value) => change({kind: value as Kind})}
        />
        <label className='flex items-center gap-2 text-sm text-muted'>
          Storage
          <select
            className='input w-40'
            value={(storageType === null) ? 'all' : `${storageType}`}
            onChange={(event) => change({storageType: (event.target.value === 'all') ? null : Number(event.target.value) as TagStorageType})}
          >
            <option value='all'>All ({total(data?.counts).toLocaleString()})</option>
            {STORAGE_ORDER.map((meta) => (
              <option key={meta.type} value={meta.type}>{meta.label} ({(data?.counts[`${meta.type}`] ?? 0).toLocaleString()})</option>
            ))}
          </select>
        </label>
        <SearchInput
          size='sm'
          className='min-w-48 flex-1 sm:max-w-80'
          value={search}
          onValueChange={setSearch}
          placeholder={(kind === 'variables') ? 'Search IDs, names or values...' : 'Search IDs...'}
          aria-label={(kind === 'variables') ? 'Search variables by storage ID, name or value' : 'Search blobs by storage ID'}
        />
        {(current.isFetching) ? <Spinner className='size-4'/> : null}
        <span className='text-xs text-subtle sm:ml-auto'>Read-only. User storage can hold other people’s data.</span>
      </div>

      <div className='mt-3'>
        {(current.isPending) ? (
          <p className='flex items-center gap-2 text-sm text-muted'><Spinner className='size-4'/> Loading…</p>
        ) : (current.isError && !data) ? (
          <p className='text-sm text-danger'>
            {errorMessage(current.error)}{' '}
            <button type='button' className='cursor-pointer text-brand hover:underline' onClick={() => current.refetch()}>Retry</button>
          </p>
        ) : (!data?.items.length) ? (
          <p className='text-sm text-subtle italic'>
            {(query) ? `No ${kind} match “${query}”.` : (storageType === null) ? `No ${kind} stored.` : `No ${STORAGE_ORDER.find((meta) => meta.type === storageType)?.label.toLowerCase()} ${kind} stored.`}
          </p>
        ) : (
          <>
            <ul className={cn('space-y-2 transition-opacity', current.isPlaceholderData && 'opacity-60')}>
              {(kind === 'variables') ? (
                (data.items as Array<AdminTagVariable>).map((item) => (
                  <VariableRow key={`${item.storage_type}:${item.storage_id}:${item.name}`} item={item}/>
                ))
              ) : (
                (data.items as Array<AdminTagBlob>).map((item) => (
                  <BlobRow key={`${item.storage_type}:${item.storage_id}`} item={item}/>
                ))
              )}
            </ul>
            {(pageSize < data.count) ? (
              <Pagination page={page} count={data.count} pageSize={pageSize} onChange={setPage} fetching={current.isFetching && current.isPlaceholderData} className='mt-3'/>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}


function StorageLabel({ type, id }: {type: TagStorageType, id: string}) {
  const meta = STORAGE_ORDER.find((item) => item.type === type);
  return (
    <span className='inline-flex min-w-0 items-center gap-1.5 text-xs' style={{'--cat': meta?.color} as CSSProperties}>
      <span aria-hidden className='size-2 shrink-0 rounded-full bg-[var(--cat)]'/>
      <span className='shrink-0 font-medium text-fg'>{meta?.label ?? `Type ${type}`}</span>
      {(type === TagStorageTypes.GLOBAL) ? null : <CopyableValue value={id} truncate={0} className='text-subtle'/>}
    </span>
  );
}


function ValueBlock({ text }: {text: string}) {
  return (
    <pre
      className='mt-1.5 max-h-48 overflow-auto rounded-md border border-line bg-deep p-2 font-mono text-xs whitespace-pre-wrap break-words text-fg focus:border-line-strong focus:outline-none'
      {...selectAllScope}
    >
      {text || <span className='text-subtle italic'>(empty)</span>}
    </pre>
  );
}


function VariableRow({ item }: {item: AdminTagVariable}) {
  return (
    <li className='rounded-md border border-line bg-surface p-2.5'>
      <div className='flex flex-wrap items-center gap-x-3 gap-y-1'>
        <StorageLabel type={item.storage_type} id={item.storage_id}/>
        <code className='min-w-0 truncate font-mono text-sm text-code'>{item.name}</code>
        <span className='ml-auto text-xs text-subtle tabular-nums'>{item.value.length.toLocaleString()} chars</span>
      </div>
      <ValueBlock text={formatJson(item.value) ?? item.value}/>
    </li>
  );
}


// the preview can end mid character, so drop up to 3 trailing bytes before giving up on it being text
function decodePreview(base64: string, truncated: boolean): string | null {
  let bytes: Uint8Array;
  try {
    bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  } catch {
    return null;
  }
  const decoder = new TextDecoder('utf-8', {fatal: true});
  for (let cut = 0; cut <= ((truncated) ? 3 : 0); cut++) {
    try {
      return decoder.decode(bytes.subarray(0, bytes.length - cut));
    } catch {
      // try a shorter cut
    }
  }
  return null;
}


function BlobRow({ item }: {item: AdminTagBlob}) {
  const text = decodePreview(item.value, item.truncated);
  return (
    <li className='rounded-md border border-line bg-surface p-2.5'>
      <div className='flex flex-wrap items-center gap-x-3 gap-y-1'>
        <StorageLabel type={item.storage_type} id={item.storage_id}/>
        <span className='ml-auto text-xs text-subtle tabular-nums'>
          {formatMemory(item.size, (item.size < 1024) ? 0 : 1)}
          {(text === null) ? ' · binary' : null}
          {(item.truncated) ? ' · showing the first 16 KB' : null}
        </span>
      </div>
      {(text === null) ? (
        <p className='mt-1.5 text-xs text-subtle italic'>Binary data, not shown.</p>
      ) : (
        <ValueBlock text={(item.truncated) ? text : (formatJson(text) ?? text)}/>
      )}
    </li>
  );
}
