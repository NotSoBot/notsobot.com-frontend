import { Check, Copy, Link2, Trash2, Upload } from 'lucide-react';
import { useRef, useState, type FormEvent } from 'react';

import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import type { TagAsset } from '@/lib/api';
import { errorMessage, useDeleteAdminTagAssetMutation, useUploadAdminTagAssetMutation } from '@/lib/api/dashboardQueries';
import { cn, formatMemory } from '@/lib/utils';


/**
 * Archives files for a tag onto `cdn.nsb.gg/assets/tags/...` (an upload, or whatever a url points at) so staff can
 * swap the tag's expiring links for permanent ones. Nothing here edits the content, `onArchived` gets both urls so
 * the card can offer the replacement in its editor.
 */
export function TagAssetsPanel({ tagId, assets, onArchived }: {
  tagId: string,
  assets: Array<TagAsset>,
  onArchived: (asset: TagAsset, sourceUrl: string | null) => void,
}) {
  const toast = useToast();
  const upload = useUploadAdminTagAssetMutation();
  const fileInput = useRef<HTMLInputElement>(null);
  const [ url, setUrl ] = useState('');

  const archive = (source: {file: File} | {url: string}) => {
    upload.mutate({tagId, source}, {
      onSuccess: (asset) => {
        if ('url' in source) {
          setUrl('');
        }
        onArchived(asset, ('url' in source) ? source.url : null);
      },
      onError: (error) => toast(errorMessage(error), 'error'),
    });
  };

  const onSubmitUrl = (event: FormEvent) => {
    event.preventDefault();
    const value = url.trim();
    if (value) {
      archive({url: value});
    }
  };

  const uploadingUrl = upload.isPending && upload.variables && 'url' in upload.variables.source;
  const uploadingFile = upload.isPending && !uploadingUrl;

  return (
    <div className='mt-4'>
      <h3 className='section-label mb-1.5'>
        Tag assets <span className='normal-case tracking-normal text-subtle'>(permanent copies on cdn.nsb.gg)</span>
      </h3>

      {(assets.length) ? (
        <ul className='mb-2 space-y-1.5'>
          {assets.map((asset) => <TagAssetRow key={asset.id} tagId={tagId} asset={asset}/>)}
        </ul>
      ) : (
        <p className='mb-2 text-sm text-subtle'>No archived files yet.</p>
      )}

      <form className='flex flex-wrap gap-2' onSubmit={onSubmitUrl}>
        <input
          type='url'
          className='input min-w-56 flex-1 font-mono'
          placeholder='https://cdn.discordapp.com/attachments/...'
          aria-label='URL to archive'
          value={url}
          disabled={upload.isPending}
          onChange={(event) => setUrl(event.target.value)}
        />
        <button type='submit' className='btn btn-sm btn-secondary' disabled={upload.isPending || !url.trim()}>
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
      </form>
    </div>
  );
}


function TagAssetRow({ tagId, asset }: {tagId: string, asset: TagAsset}) {
  const toast = useToast();
  const remove = useDeleteAdminTagAssetMutation();
  const [ copied, setCopied ] = useState(false);
  const [ confirming, setConfirming ] = useState(false);
  const [ previewFailed, setPreviewFailed ] = useState(false);

  const meta = asset.metadata;
  const isImage = meta?.mimetype?.startsWith('image/') && !previewFailed;
  const details = [
    meta?.mimetype,
    (meta?.width && meta?.height) ? `${meta.width}×${meta.height}` : null,
    (meta?.size) ? formatMemory(meta.size, 1) : null,
  ].filter(Boolean).join(' · ');

  return (
    <li className='flex items-center gap-3 rounded-md border border-line bg-deep p-2'>
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
      </div>
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
            onError: (error) => {
              setConfirming(false);
              toast(errorMessage(error), 'error');
            },
          });
        }}
      >
        {(remove.isPending) ? <Spinner className='size-4 border-white/40 border-t-white'/> : <Trash2 className='size-4'/>}
        <span className={cn(!confirming && 'sr-only')}>{(confirming) ? 'Confirm' : 'Delete'}</span>
      </button>
    </li>
  );
}
