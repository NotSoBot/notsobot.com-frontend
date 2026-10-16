import { Check, Copy, Link2, Pencil, Trash2, Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Spinner } from '@/components/ui/Spinner';
import type { TagAsset } from '@/lib/api';
import { errorMessage, useDeleteAdminTagAssetMutation, useUploadAdminTagAssetMutation } from '@/lib/api/dashboardQueries';
import { cn, formatMemory, NO_AUTOFILL } from '@/lib/utils';
import { InlineError } from '@/pages/dashboard/ui';


/**
 * Archives files for a tag onto `cdn.nsb.gg/assets/tags/...` (an upload, or whatever a url points at) so staff can
 * swap the tag's expiring links for permanent ones. Nothing here edits the content, `onArchived` gets both urls so
 * the card can offer the replacement in its editor. Text assets can be edited, saving archives the edit as a new
 * asset (urls are cached forever, so they never change bytes) and hands it to `onArchived` like any other. Errors show inline, not as toasts: the public directory's listing
 * editor uses this too and isn't inside the dashboard's `ToastProvider`. No `<form>` either, since that editor is one.
 */
export function TagAssetsPanel({ tagId, assets, onArchived, className = 'mt-4' }: {
  tagId: string,
  assets: Array<TagAsset>,
  onArchived?: (asset: TagAsset, sourceUrl: string | null) => void,
  className?: string,
}) {
  const upload = useUploadAdminTagAssetMutation();
  const fileInput = useRef<HTMLInputElement>(null);
  const [ url, setUrl ] = useState('');

  const archive = (source: {file: File} | {url: string}) => {
    upload.mutate({tagId, source}, {
      onSuccess: (asset) => {
        if ('url' in source) {
          setUrl('');
        }
        onArchived?.(asset, ('url' in source) ? source.url : null);
      },
    });
  };

  const archiveUrl = () => {
    const value = url.trim();
    if (value) {
      archive({url: value});
    }
  };

  const uploadingUrl = upload.isPending && upload.variables && 'url' in upload.variables.source;
  const uploadingFile = upload.isPending && !uploadingUrl;

  return (
    <div className={className}>
      <h3 className='section-label mb-1.5'>
        Tag assets <span className='normal-case tracking-normal text-subtle'>(permanent copies on cdn.nsb.gg)</span>
      </h3>

      {(assets.length) ? (
        <ul className='mb-2 space-y-1.5'>
          {assets.map((asset) => <TagAssetRow key={asset.id} tagId={tagId} asset={asset} onArchived={onArchived}/>)}
        </ul>
      ) : (
        <p className='mb-2 text-sm text-subtle'>No archived files yet.</p>
      )}

      <div className='flex flex-wrap gap-2'>
        <input
          type='url'
          className='input min-w-56 flex-1 font-mono'
          placeholder='https://cdn.discordapp.com/attachments/...'
          aria-label='URL to archive'
          autoComplete='off'
          {...NO_AUTOFILL}
          value={url}
          disabled={upload.isPending}
          onChange={(event) => setUrl(event.target.value)}
          onKeyDown={(event) => {
            // Enter archives instead of submitting a form this sits inside
            if (event.key === 'Enter') {
              event.preventDefault();
              archiveUrl();
            }
          }}
        />
        <button type='button' className='btn btn-sm btn-secondary' disabled={upload.isPending || !url.trim()} onClick={archiveUrl}>
          {(uploadingUrl) ? <Spinner className='size-4 border-white/40 border-t-white'/> : <Link2 className='size-4'/>}
          Archive URL
        </button>
        <button type='button' className='btn btn-sm btn-secondary' disabled={upload.isPending} onClick={() => fileInput.current?.click()}>
          {(uploadingFile) ? <Spinner className='size-4 border-white/40 border-t-white'/> : <Upload className='size-4'/>}
          Upload file
        </button>
        <input
          ref={fileInput}
          type='file'
          className='hidden'
          onChange={(event) => {
            const file = event.target.files?.[0];
            // cleared so picking the same file again still fires
            event.target.value = '';
            if (file) {
              archive({file});
            }
          }}
        />
      </div>
      {(upload.isError) ? <InlineError>{errorMessage(upload.error, 'Couldn’t archive the file.')}</InlineError> : null}
    </div>
  );
}


function TagAssetRow({ tagId, asset, onArchived }: {
  tagId: string,
  asset: TagAsset,
  onArchived?: (asset: TagAsset, sourceUrl: string | null) => void,
}) {
  const remove = useDeleteAdminTagAssetMutation();
  const [ copied, setCopied ] = useState(false);
  const [ confirming, setConfirming ] = useState(false);
  const [ editing, setEditing ] = useState(false);
  const [ previewFailed, setPreviewFailed ] = useState(false);

  const meta = asset.metadata;
  const isImage = meta?.mimetype?.startsWith('image/') && !previewFailed;
  const details = [
    meta?.mimetype,
    (meta?.width && meta?.height) ? `${meta.width}×${meta.height}` : null,
    (meta?.size) ? formatMemory(meta.size, 1) : null,
  ].filter(Boolean).join(' · ');

  return (
    <li className='rounded-md border border-line bg-deep p-2'>
      <div className='flex items-center gap-3'>
        <a href={asset.urls.cdn} target='_blank' rel='noreferrer noopener' className='shrink-0'>
          {(isImage) ? (
            <img src={asset.urls.cdn} alt='' loading='lazy' className='size-10 rounded object-cover' onError={() => setPreviewFailed(true)}/>
          ) : (
            <span className='flex size-10 items-center justify-center rounded bg-surface-3 font-mono text-[10px] text-muted uppercase'>
              {meta?.extension}
            </span>
          )}
        </a>
        <div className='min-w-0 flex-1'>
          <a href={asset.urls.cdn} target='_blank' rel='noreferrer noopener' className='block truncate font-mono text-sm text-brand hover:underline' title={asset.urls.cdn}>
            {asset.urls.cdn}
          </a>
          {(details) ? <span className='block truncate text-xs text-subtle'>{details}</span> : null}
          {(remove.isError) ? <InlineError>{errorMessage(remove.error, 'Couldn’t delete the file.')}</InlineError> : null}
        </div>
        {(asset.is_text) ? (
          <button
            type='button'
            className={cn('btn btn-sm', (editing) ? 'btn-secondary' : 'btn-ghost')}
            title='Edit the text (saving archives it as a new file)'
            aria-expanded={editing}
            onClick={() => setEditing(!editing)}
          >
            <Pencil className='size-4'/>
            <span className='sr-only sm:not-sr-only'>Edit</span>
          </button>
        ) : null}
        <button
          type='button'
          className='btn btn-sm btn-ghost'
          title='Copy URL'
          onClick={() => {
            void navigator.clipboard?.writeText(asset.urls.cdn).then(() => {
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1500);
            });
          }}
        >
          {(copied) ? <Check className='size-4 text-success'/> : <Copy className='size-4'/>}
          <span className='sr-only sm:not-sr-only'>Copy</span>
        </button>
        <button
          type='button'
          className={cn('btn btn-sm', (confirming) ? 'btn-danger' : 'btn-ghost')}
          title='Delete the file (swap its url out of the content first)'
          disabled={remove.isPending}
          onBlur={() => setConfirming(false)}
          onClick={() => {
            if (!confirming) {
              setConfirming(true);
              return;
            }
            remove.mutate({tagId, assetId: asset.id}, {
              onError: () => setConfirming(false),
            });
          }}
        >
          {(remove.isPending) ? <Spinner className='size-4 border-white/40 border-t-white'/> : <Trash2 className='size-4'/>}
          <span className={cn(!confirming && 'sr-only')}>{(confirming) ? 'Confirm' : 'Delete'}</span>
        </button>
      </div>
      {(editing) ? (
        <TagAssetTextEditor
          tagId={tagId}
          asset={asset}
          onClose={() => setEditing(false)}
          onSaved={(saved) => {
            setEditing(false);
            onArchived?.(saved, asset.urls.cdn);
          }}
        />
      ) : null}
    </li>
  );
}


/**
 * Loads the asset's text from the cdn (it allows any origin) and archives the edited copy as a new asset with the same
 * filename and mimetype, the old one stays until staff delete it, so it's also the undo.
 */
function TagAssetTextEditor({ tagId, asset, onClose, onSaved }: {
  tagId: string,
  asset: TagAsset,
  onClose: () => void,
  onSaved: (asset: TagAsset) => void,
}) {
  const upload = useUploadAdminTagAssetMutation();
  const [ original, setOriginal ] = useState<string | null>(null);
  const [ draft, setDraft ] = useState('');
  const [ loadError, setLoadError ] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(asset.urls.cdn, {signal: controller.signal})
      .then((response) => {
        if (!response.ok) {
          throw new Error(`The cdn returned ${response.status}`);
        }
        return response.text();
      })
      .then((text) => {
        setOriginal(text);
        setDraft(text);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setLoadError((error instanceof Error) ? error.message : String(error));
        }
      });
    return () => controller.abort();
  }, [asset.urls.cdn]);

  const save = () => {
    const file = new File([draft], asset.filename, {type: asset.metadata.mimetype});
    upload.mutate({tagId, source: {file}}, {onSuccess: onSaved});
  };

  if (loadError) {
    return <InlineError>{`Couldn’t load the file: ${loadError}`}</InlineError>;
  }
  if (original === null) {
    return (
      <div className='mt-2 flex items-center gap-2 text-sm text-subtle'>
        <Spinner className='size-4'/> Loading…
      </div>
    );
  }

  const changed = draft !== original;
  return (
    <div className='mt-2'>
      <textarea
        className='input resize-y font-mono text-sm leading-relaxed'
        rows={Math.min(24, Math.max(6, draft.split('\n').length + 1))}
        aria-label={`Contents of ${asset.filename}`}
        spellCheck={false}
        value={draft}
        disabled={upload.isPending}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          // ctrl/cmd+s saves instead of saving the page
          if (event.key === 's' && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            if (changed && !upload.isPending) {
              save();
            }
          }
        }}
      />
      <div className='mt-2 flex flex-wrap items-center gap-2'>
        <button type='button' className='btn btn-sm btn-primary' disabled={!changed || upload.isPending} onClick={save}>
          {(upload.isPending) ? <Spinner className='size-4 border-white/40 border-t-white'/> : <Check className='size-4'/>}
          Save as new file
        </button>
        <button type='button' className='btn btn-sm btn-ghost' disabled={upload.isPending} onClick={onClose}>
          Cancel
        </button>
        <span className='text-xs text-subtle'>
          Gets its own url, swapped into the content. Delete this one once nothing uses it.
        </span>
      </div>
      {(upload.isError) ? <InlineError>{errorMessage(upload.error, 'Couldn’t save the file.')}</InlineError> : null}
    </div>
  );
}
