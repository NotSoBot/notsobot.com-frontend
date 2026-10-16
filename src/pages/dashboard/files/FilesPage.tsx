// The files the bot uploaded to the file host (nsb.gg) for the user, when a result was too big for Discord or their
// settings say to always upload. They can be opened, copied and deleted here; uploads still come from the bot.
// Three views of the same page of files: a detailed list, a thumbnail grid, and a table with bulk delete.

import { ExternalLink, File as FileIcon, FileAudio, FileImage, Files, FileText, FileVideo, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';

import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SearchInput } from '@/components/ui/SearchInput';
import { Segmented } from '@/components/ui/Segmented';
import { useToast } from '@/components/ui/Toast';
import { Routes } from '@/config';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { usePersistentState } from '@/hooks/usePersistentState';
import type { UserFile, UserFilesSortBy } from '@/lib/api';
import { ME_FILES_PAGE_SIZE, errorMessage, useDeleteMeFilesMutation, useMeFilesQuery } from '@/lib/api/dashboardQueries';
import { cn, formatDate, formatDateTime, formatExactDateTime, formatMemory, formatNumber, toDate } from '@/lib/utils';

import { Chip, CopyButton, Pagination, useSearchParamState, useStepBackFromEmptyPage } from '../admin/adminUi';
import { DashboardHeader, EmptyState, ErrorPanel, Skeleton } from '../ui';


type FilesView = 'list' | 'grid' | 'table';

const VIEWS: Array<{value: FilesView, label: string}> = [
  {value: 'list', label: 'List'},
  {value: 'grid', label: 'Grid'},
  {value: 'table', label: 'Table'},
];

const SORTS: Array<{value: UserFilesSortBy, label: string}> = [
  {value: 'newest', label: 'Newest'},
  {value: 'oldest', label: 'Oldest'},
  {value: 'largest', label: 'Largest'},
  {value: 'name', label: 'Name'},
];

// bigger images just get the icon, so a page of huge gifs doesn't pull hundreds of megabytes
const PREVIEW_SIZE_MAX = 8 * 1024 * 1024;


function fileKind(mimetype: string): 'image' | 'video' | 'audio' | 'text' | 'other' {
  const [ type ] = mimetype.split('/');
  if (type === 'image' || type === 'video' || type === 'audio' || type === 'text') {
    return type;
  }
  return 'other';
}

const KIND_ICONS = {image: FileImage, video: FileVideo, audio: FileAudio, text: FileText, other: FileIcon};


function formatDuration(ms: number): string {
  const seconds = Math.round(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

function formatSize(bytes: number): string {
  return formatMemory(bytes, (bytes < 1024 * 1024) ? 0 : 1);
}

// `in 20h`, short enough for the grid and table; the exact time is on hover
function formatExpiresIn(value: string): string {
  const minutes = Math.floor((toDate(value).getTime() - Date.now()) / 60000);
  if (minutes < 1) {
    return 'in under a minute';
  }
  if (minutes < 60) {
    return `in ${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  return (hours < 48) ? `in ${hours}h` : `in ${Math.floor(hours / 24)}d`;
}


export function FilesPage() {
  const { searchParams, page, update, setPage } = useSearchParamState();
  const query = searchParams.get('q') || '';
  const sortBy = SORTS.find((sort) => sort.value === searchParams.get('sort'))?.value ?? 'newest';
  const debouncedQuery = useDebouncedValue(query.trim(), 300);
  const [ storedView, setView ] = usePersistentState<FilesView>('dashboard:files-view', 'list');
  const view = VIEWS.find((option) => option.value === storedView)?.value ?? 'list';

  const { data, isPending, isError, error, isPlaceholderData, isFetching, isRefetching, refetch } = useMeFilesQuery({
    query: debouncedQuery,
    sortBy,
    page,
  });
  const items = data?.items ?? [];
  const steppingBack = useStepBackFromEmptyPage({page, setPage, data, isPlaceholderData, pageSize: ME_FILES_PAGE_SIZE});
  const pagination = {
    page,
    count: data?.count ?? 0,
    pageSize: ME_FILES_PAGE_SIZE,
    onChange: setPage,
    fetching: isFetching && isPlaceholderData,
  };

  // the table's checkboxes; only ever the files on the page that's shown
  const [ selected, setSelected ] = useState<ReadonlySet<string>>(new Set());
  useEffect(() => setSelected(new Set()), [page, debouncedQuery, sortBy, view]);
  const selectedFiles = items.filter((file) => selected.has(file.id));

  const toast = useToast();
  const remove = useDeleteMeFilesMutation();
  const [ deleting, setDeleting ] = useState<Array<UserFile> | null>(null);
  const confirmDelete = () => {
    if (!deleting) {
      return;
    }
    remove.mutate(deleting.map((file) => file.id), {
      onSuccess: () => {
        toast((deleting.length === 1) ? 'File deleted' : `${deleting.length} files deleted`);
        setSelected((previous) => new Set([...previous].filter((id) => !deleting.some((file) => file.id === id))));
        setDeleting(null);
      },
    });
  };
  const askDelete = (file: UserFile) => setDeleting([file]);

  return (
    <>
      <DashboardHeader
        title='Your Files'
        description={<>Results the bot uploaded to its file host for you instead of attaching them. When that happens is in <Link to={Routes.DASHBOARD_SETTINGS} className='text-code hover:underline'>Settings → Media</Link>.</>}
      />

      <div className='mb-4 flex flex-col gap-3 sm:flex-row sm:items-center'>
        <SearchInput
          className='flex-1'
          size='sm'
          value={query}
          onValueChange={(value) => update({q: value})}
          placeholder='Search by file name or link...'
          aria-label='Search files'
        />
        <div className='flex flex-wrap items-center gap-3'>
          <label className='flex items-center gap-2 text-sm text-muted'>
            Sort
            <select className='input w-32' value={sortBy} onChange={(event) => update({sort: (event.target.value === 'newest') ? null : event.target.value})}>
              {SORTS.map((sort) => <option key={sort.value} value={sort.value}>{sort.label}</option>)}
            </select>
          </label>
          <Segmented label='View' value={view} options={VIEWS} onChange={(value) => setView(value as FilesView)}/>
        </div>
      </div>

      {(data) ? <StorageSummary count={data.count} size={data.size} total={data.total} searching={!!debouncedQuery}/> : null}

      {(isPending || steppingBack) ? (
        <ListSkeleton/>
      ) : (isError && !items.length) ? (
        <ErrorPanel title='Couldn’t load your files' message={errorMessage(error)} onRetry={() => refetch()} retrying={isRefetching}/>
      ) : (!items.length) ? (
        <EmptyState icon={<Files className='size-10'/>} title={(debouncedQuery) ? 'No files found' : 'No files yet'}>
          {(debouncedQuery) ? 'Try a different search.' : 'When a result is too big for Discord, the bot uploads it here instead.'}
        </EmptyState>
      ) : (
        <>
          {(pagination.count > ME_FILES_PAGE_SIZE) ? <Pagination {...pagination} className='mt-0 mb-4'/> : null}
          <div className={cn('transition-opacity', isPlaceholderData && 'opacity-60')}>
            {(view === 'grid') ? (
              <FilesGrid files={items} onDelete={askDelete}/>
            ) : (view === 'table') ? (
              <FilesTable
                files={items}
                selected={selected}
                onSelectedChange={setSelected}
                onDelete={askDelete}
                onDeleteSelected={() => setDeleting(selectedFiles)}
              />
            ) : (
              <FilesList files={items} onDelete={askDelete}/>
            )}
          </div>
          {(pagination.count > ME_FILES_PAGE_SIZE) ? <Pagination {...pagination}/> : null}
        </>
      )}

      {(deleting) ? (
        <ConfirmDialog
          title={(deleting.length === 1) ? 'Delete this file?' : `Delete ${deleting.length} files?`}
          description={(deleting.length === 1) ? (
            <>Its link <span className='font-mono text-fg break-all'>{deleting[0].urls.vanity}</span> stops working everywhere it was posted. This can’t be undone.</>
          ) : (
            <>Their links stop working everywhere they were posted. This can’t be undone.</>
          )}
          confirmLabel={(deleting.length === 1) ? 'Delete file' : `Delete ${deleting.length} files`}
          pending={remove.isPending}
          error={(remove.isError) ? errorMessage(remove.error, 'Couldn’t delete the files.') : null}
          onConfirm={confirmDelete}
          onClose={() => {
            remove.reset();
            setDeleting(null);
          }}
        />
      ) : null}
    </>
  );
}


/* shared pieces */

// how much the user has on the file host, and how much of it the search matched
function StorageSummary({ count, size, total, searching }: {count: number, size: number, total: {count: number, size: number}, searching: boolean}) {
  const files = (value: number) => `${formatNumber(value)} ${(value === 1) ? 'file' : 'files'}`;
  return (
    <p className='mb-4 text-sm text-muted'>
      {(searching) ? (
        <>
          <span className='text-fg'>{files(count)}</span> matched, <span className='text-fg'>{formatSize(size)}</span>
          <span className='text-subtle'> · {formatSize(total.size)} across all {files(total.count)}</span>
        </>
      ) : (
        <><span className='text-fg'>{formatSize(total.size)}</span> used across <span className='text-fg'>{files(total.count)}</span></>
      )}
    </p>
  );
}


// temporary uploads stop working at `expires_at`, so the badge says when
function ExpiryChip({ file }: {file: UserFile}) {
  if (!file.temporary || !file.expires_at) {
    return null;
  }
  return <Chip tone='warning' title={`Temporary, expires ${formatExactDateTime(file.expires_at)}`}>Expires {formatExpiresIn(file.expires_at)}</Chip>;
}


function FileLink({ file, className }: {file: UserFile, className?: string}) {
  return (
    <a href={file.urls.vanity} target='_blank' rel='noopener noreferrer' className={cn('truncate font-medium text-white hover:underline', className)} title={file.filename}>
      {file.filename}
    </a>
  );
}


function VanityLink({ file }: {file: UserFile}) {
  return (
    <span className='flex min-w-0 items-center gap-1 text-xs'>
      <span className='truncate font-mono text-subtle'>{file.urls.vanity.replace(/^https?:\/\//, '')}</span>
      <CopyButton value={file.urls.vanity}/>
    </span>
  );
}


function FilePreview({ file, className, iconClassName = 'size-6' }: {file: UserFile, className: string, iconClassName?: string}) {
  const [ failed, setFailed ] = useState(false);
  const kind = fileKind(file.metadata.mimetype);
  const Icon = KIND_ICONS[kind];

  if (kind === 'image' && file.metadata.size <= PREVIEW_SIZE_MAX && !failed) {
    return (
      <img
        src={file.urls.cdn}
        alt=''
        loading='lazy'
        decoding='async'
        onError={() => setFailed(true)}
        className={cn('shrink-0 bg-surface-3 object-cover', className)}
      />
    );
  }
  return (
    <span aria-hidden className={cn('flex shrink-0 items-center justify-center bg-[#00b0f4]/15', className)}>
      <Icon className={cn('text-[#00b0f4]', iconClassName)}/>
    </span>
  );
}


function OpenButton({ file, label = true }: {file: UserFile, label?: boolean}) {
  return (
    <a href={file.urls.vanity} target='_blank' rel='noopener noreferrer' className='btn btn-sm btn-secondary' aria-label='Open file' title='Open'>
      <ExternalLink className='size-4'/>
      {(label) ? <span className='hidden sm:inline'>Open</span> : null}
    </a>
  );
}


function DeleteButton({ onClick, label = true }: {onClick: () => void, label?: boolean}) {
  return (
    <button type='button' className='btn btn-sm btn-danger' onClick={onClick} aria-label='Delete file' title='Delete'>
      <Trash2 className='size-4'/>
      {(label) ? <span className='hidden sm:inline'>Delete</span> : null}
    </button>
  );
}


/* list */

function FilesList({ files, onDelete }: {files: Array<UserFile>, onDelete: (file: UserFile) => void}) {
  return (
    <ul className='card divide-y divide-line'>
      {files.map((file) => {
        const { metadata } = file;
        const kind = fileKind(metadata.mimetype);
        return (
          <li key={file.id} className='flex items-start gap-3 px-4 py-3'>
            <FilePreview file={file} className='size-12 rounded-md'/>
            <div className='min-w-0 flex-1'>
              <FileLink file={file} className='block'/>
              <div className='mt-0.5'><VanityLink file={file}/></div>
              <div className='mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-subtle'>
                <Chip>{metadata.extension.toUpperCase()}</Chip>
                <ExpiryChip file={file}/>
                <span>{formatSize(metadata.size)}</span>
                {((kind === 'image' || kind === 'video') && metadata.width && metadata.height) ? (
                  <span>{metadata.width}×{metadata.height}</span>
                ) : null}
                {(metadata.duration) ? <span>{formatDuration(metadata.duration)}</span> : null}
                <span title={formatExactDateTime(file.created)}>Uploaded {formatDateTime(file.created)}</span>
              </div>
            </div>
            <div className='flex shrink-0 flex-col gap-1.5 sm:flex-row'>
              <OpenButton file={file}/>
              <DeleteButton onClick={() => onDelete(file)}/>
            </div>
          </li>
        );
      })}
    </ul>
  );
}


/* grid */

function FilesGrid({ files, onDelete }: {files: Array<UserFile>, onDelete: (file: UserFile) => void}) {
  return (
    <ul className='grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4'>
      {files.map((file) => (
        <li key={file.id} className='card flex min-w-0 flex-col overflow-hidden'>
          <a href={file.urls.vanity} target='_blank' rel='noopener noreferrer' tabIndex={-1} aria-hidden>
            <FilePreview file={file} className='aspect-video w-full' iconClassName='size-10'/>
          </a>
          <div className='flex min-w-0 flex-1 flex-col gap-1 p-3'>
            <FileLink file={file} className='block text-sm'/>
            <div className='flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-subtle'>
              <span>{formatSize(file.metadata.size)}</span>
              <span title={formatExactDateTime(file.created)}>{formatDate(file.created)}</span>
            </div>
            <div className='mt-auto flex flex-wrap items-center justify-between gap-2 pt-1.5'>
              <div className='min-h-5'><ExpiryChip file={file}/></div>
              <div className='flex gap-1.5'>
                <OpenButton file={file} label={false}/>
                <DeleteButton onClick={() => onDelete(file)} label={false}/>
              </div>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}


/* table */

function FilesTable({ files, selected, onSelectedChange, onDelete, onDeleteSelected }: {
  files: Array<UserFile>,
  selected: ReadonlySet<string>,
  onSelectedChange: (selected: ReadonlySet<string>) => void,
  onDelete: (file: UserFile) => void,
  onDeleteSelected: () => void,
}) {
  const count = files.filter((file) => selected.has(file.id)).length;
  const all = count === files.length;
  const headerRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (headerRef.current) {
      headerRef.current.indeterminate = 0 < count && !all;
    }
  }, [count, all]);

  const toggle = (fileId: string) => {
    const next = new Set(selected);
    if (next.has(fileId)) {
      next.delete(fileId);
    } else {
      next.add(fileId);
    }
    onSelectedChange(next);
  };

  return (
    <>
      <div className='mb-3 flex min-h-9 flex-wrap items-center justify-between gap-2 text-sm text-muted'>
        <span>{(count) ? `${count} selected` : 'Select files to delete several at once.'}</span>
        {(count) ? (
          <div className='flex gap-2'>
            <button type='button' className='btn btn-sm btn-ghost' onClick={() => onSelectedChange(new Set())}>Clear</button>
            <button type='button' className='btn btn-sm btn-danger' onClick={onDeleteSelected}>
              <Trash2 className='size-4'/>
              Delete {count} {(count === 1) ? 'file' : 'files'}
            </button>
          </div>
        ) : null}
      </div>
      <div className='card overflow-x-auto'>
        <table className='w-full min-w-[760px] table-fixed text-left text-sm'>
          <thead className='border-b border-line text-xs text-subtle uppercase'>
            <tr>
              <th scope='col' className='w-11 py-2.5 pl-4'>
                <input
                  ref={headerRef}
                  type='checkbox'
                  className='size-4 cursor-pointer accent-brand'
                  aria-label='Select every file on this page'
                  checked={all}
                  onChange={() => onSelectedChange((all) ? new Set() : new Set(files.map((file) => file.id)))}
                />
              </th>
              <th scope='col' className='px-3 py-2.5 font-medium'>Name</th>
              <th scope='col' className='w-24 px-3 py-2.5 font-medium'>Size</th>
              <th scope='col' className='w-28 px-3 py-2.5 font-medium'>Uploaded</th>
              <th scope='col' className='w-48 px-3 py-2.5 font-medium'>Link</th>
              <th scope='col' className='w-28 px-3 py-2.5 font-medium'><span className='sr-only'>Actions</span></th>
            </tr>
          </thead>
          <tbody className='divide-y divide-line'>
            {files.map((file) => (
              <tr key={file.id} className={cn('align-middle hover:bg-surface-2', selected.has(file.id) && 'bg-surface-2')}>
                <td className='py-2 pl-4'>
                  <input
                    type='checkbox'
                    className='size-4 cursor-pointer accent-brand'
                    aria-label={`Select ${file.filename}`}
                    checked={selected.has(file.id)}
                    onChange={() => toggle(file.id)}
                  />
                </td>
                <td className='px-3 py-2'>
                  <div className='flex min-w-0 items-center gap-2.5'>
                    <FilePreview file={file} className='size-8 rounded' iconClassName='size-4'/>
                    <div className='flex min-w-0 flex-col items-start gap-0.5'>
                      <FileLink file={file} className='max-w-full'/>
                      <ExpiryChip file={file}/>
                    </div>
                  </div>
                </td>
                <td className='px-3 py-2 whitespace-nowrap text-muted'>{formatSize(file.metadata.size)}</td>
                <td className='px-3 py-2 whitespace-nowrap text-muted' title={formatExactDateTime(file.created)}>{formatDate(file.created)}</td>
                <td className='px-3 py-2'><VanityLink file={file}/></td>
                <td className='px-3 py-2'>
                  <div className='flex justify-end gap-1.5'>
                    <OpenButton file={file} label={false}/>
                    <DeleteButton onClick={() => onDelete(file)} label={false}/>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}


function ListSkeleton() {
  return (
    <div aria-hidden className='card divide-y divide-line'>
      {Array.from({length: 4}, (_, i) => (
        <div key={i} className='flex items-start gap-3 px-4 py-3'>
          <Skeleton className='size-12 rounded-md'/>
          <div className='flex-1'>
            <Skeleton className='h-4 w-48'/>
            <Skeleton className='mt-1.5 h-3 w-36 bg-surface-2'/>
            <Skeleton className='mt-1.5 h-3 w-64 bg-surface-2'/>
          </div>
          <Skeleton className='h-8 w-36 bg-surface-2'/>
        </div>
      ))}
    </div>
  );
}
