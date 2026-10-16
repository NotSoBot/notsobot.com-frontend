import { ArrowLeft, ArrowRight, Eye, EyeOff, ImagePlus, Lock, Music, Play, Star, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';

import { Spinner } from '@/components/ui/Spinner';
import {
  TAG_DIRECTORY_ASSET_SIZE_MAX,
  TAG_DIRECTORY_ASSETS_MAX,
  TagDirectoryVerificationStates,
  type TagDirectoryAsset,
} from '@/lib/api';
import { errorMessage, useMeTagDirectoryAssetMutation } from '@/lib/api/dashboardQueries';
import { cn } from '@/lib/utils';
import { InlineError } from '@/pages/dashboard/ui';


// A listing's assets (`TagDirectoryAssets`): images, videos and audio, in order, the first is the cover on the directory.
// The owner can only change them while verification is pending, so staff review them with the listing; the public
// directory only gets them once it's verified.

type AssetKind = 'image' | 'video' | 'audio';

export function assetKind(asset: TagDirectoryAsset): AssetKind {
  const { mimetype } = asset.metadata;
  if (mimetype.startsWith('video/')) {
    return 'video';
  }
  if (mimetype.startsWith('audio/')) {
    return 'audio';
  }
  return 'image';
}

function formatSize(bytes: number): string {
  return (bytes < 1024 * 1024) ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function assetLabel(index: number, count: number, tagName: string): string {
  return `Example ${index + 1} of ${count} for ${tagName}`;
}


// The card's thumbnail: the first asset, cropped to a small square next to the name so cards with media stay the
// same height as the ones without (a full-width band made its whole grid row stretch). Audio gets a note icon and
// NSFW tags a plain tile instead of the media. Videos play (muted) while `playing`, the card tracks the hover.
export function AssetThumbnail({ assets, nsfw, playing }: {assets: Array<TagDirectoryAsset>, nsfw: boolean, playing: boolean}) {
  const cover = assets[0];
  if (!cover) {
    return null;
  }
  const kind = assetKind(cover);
  return (
    <div className='relative size-16 shrink-0 overflow-hidden rounded-md border border-line bg-deep'>
      {(nsfw || kind === 'audio') ? (
        <div className='flex size-full items-center justify-center text-subtle' title={(nsfw) ? 'NSFW media, open the tag to view' : undefined}>
          {(nsfw) ? <EyeOff aria-hidden className='size-5'/> : <Music aria-hidden className='size-5'/>}
        </div>
      ) : (kind === 'video') ? (
        <CoverVideo src={cover.urls.cdn} playing={playing}/>
      ) : (
        <img
          src={cover.urls.cdn}
          alt=''
          loading='lazy'
          decoding='async'
          width={cover.metadata.width || undefined}
          height={cover.metadata.height || undefined}
          className='size-full object-cover'
        />
      )}
      {(kind === 'video' && !nsfw) ? (
        <span className='pointer-events-none absolute bottom-1 left-1 grid size-4 place-items-center rounded-full bg-black/70 text-white'>
          <Play aria-hidden className='size-2.5 fill-current'/>
        </span>
      ) : null}
      {(1 < assets.length) ? (
        <span className='pointer-events-none absolute right-1 bottom-1 rounded bg-black/70 px-1 text-[10px] leading-4 font-medium text-white tabular-nums'>
          +{assets.length - 1}
        </span>
      ) : null}
    </div>
  );
}

function CoverVideo({ src, playing }: {src: string, playing: boolean}) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = ref.current;
    if (!video) {
      return;
    }
    if (playing) {
      // autoplay can still be refused (data saver, etc), the first frame stays up
      video.play().catch(() => undefined);
    } else {
      video.pause();
    }
  }, [playing]);
  // `preload='metadata'` shows the first frame without downloading the whole thing
  return <video ref={ref} src={src} muted loop playsInline preload='metadata' aria-hidden className='size-full object-cover'/>;
}


export interface MediaManage {
  tagId: string,
  verified: number,
}

// The modal's (and dashboard's) media: a big viewer and the thumbnails in order. With `manage` (the owner) it also uploads,
// reorders and removes them while the listing is pending, and explains why it can't otherwise.
export function MediaSection({ assets, nsfw, tagName, manage, headingClassName = 'section-label' }: {
  assets: Array<TagDirectoryAsset>,
  nsfw: boolean,
  tagName: string,
  manage?: MediaManage,
  headingClassName?: string,
}) {
  const [ selectedId, setSelectedId ] = useState<string | null>(null);
  const [ revealed, setRevealed ] = useState(!nsfw);
  if (!assets.length && !manage) {
    return null;
  }

  const selectedIndex = Math.max(0, assets.findIndex((asset) => asset.id === selectedId));
  const selected = assets[selectedIndex] as TagDirectoryAsset | undefined;

  return (
    <section>
      <div className='mb-2 flex items-baseline justify-between gap-3'>
        <h3 className={headingClassName}>Media</h3>
        {(manage) ? <span className='ml-auto text-xs text-subtle tabular-nums'>{assets.length}/{TAG_DIRECTORY_ASSETS_MAX}</span> : null}
      </div>

      {(selected) ? (
        <>
          <MediaStage asset={selected} label={assetLabel(selectedIndex, assets.length, tagName)} revealed={revealed} onReveal={() => setRevealed(true)}/>
          {(1 < assets.length || manage) ? (
            <ul className='mt-2 flex gap-2 overflow-x-auto pb-1' aria-label='Media'>
              {assets.map((asset, index) => (
                <li key={asset.id} className='shrink-0'>
                  <button
                    type='button'
                    aria-pressed={asset.id === selected.id}
                    aria-label={assetLabel(index, assets.length, tagName)}
                    onClick={() => setSelectedId(asset.id)}
                    className={cn(
                      'relative flex h-12 w-18 cursor-pointer items-center justify-center overflow-hidden rounded-md border bg-deep text-subtle transition-colors',
                      (asset.id === selected.id) ? 'border-brand ring-1 ring-brand' : 'border-line hover:border-line-strong',
                    )}
                  >
                    <AssetThumb asset={asset} revealed={revealed}/>
                    {(index === 0 && manage) ? (
                      <span className='absolute top-0.5 left-0.5 rounded bg-black/70 px-1 text-[10px] font-medium text-white'>Cover</span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : null}

      {(manage) ? <MediaManager assets={assets} selected={selected} selectedIndex={selectedIndex} manage={manage} onUploaded={setSelectedId}/> : null}
    </section>
  );
}


function MediaStage({ asset, label, revealed, onReveal }: {asset: TagDirectoryAsset, label: string, revealed: boolean, onReveal: () => void}) {
  const kind = assetKind(asset);
  const { width, height } = asset.metadata;
  if (!revealed) {
    return (
      <div className='flex aspect-video flex-col items-center justify-center gap-3 rounded-lg border border-line bg-deep text-center'>
        <EyeOff aria-hidden className='size-6 text-subtle'/>
        <p className='text-sm text-muted'>This tag is marked NSFW.</p>
        <button type='button' className='btn btn-secondary btn-sm' onClick={onReveal}>
          <Eye className='size-3.5'/>
          Show media
        </button>
      </div>
    );
  }
  if (kind === 'audio') {
    return (
      <div className='flex flex-col items-center justify-center gap-4 rounded-lg border border-line bg-deep px-4 py-8'>
        <Music aria-hidden className='size-8 text-subtle'/>
        {/* keyed so switching assets loads the new source */}
        <audio key={asset.id} src={asset.urls.cdn} controls preload='metadata' aria-label={label} className='w-full max-w-md'/>
      </div>
    );
  }
  return (
    <div className='flex max-h-[60vh] items-center justify-center overflow-hidden rounded-lg border border-line bg-deep'>
      {(kind === 'video') ? (
        <video
          key={asset.id}
          src={asset.urls.cdn}
          controls
          playsInline
          preload='metadata'
          aria-label={label}
          width={width || undefined}
          height={height || undefined}
          className='max-h-[60vh] w-full object-contain'
        />
      ) : (
        <a href={asset.urls.cdn} target='_blank' rel='noreferrer' title='Open full size' className='block size-full'>
          <img
            key={asset.id}
            src={asset.urls.cdn}
            alt={label}
            width={width || undefined}
            height={height || undefined}
            className='mx-auto max-h-[60vh] w-auto max-w-full object-contain'
          />
        </a>
      )}
    </div>
  );
}


function AssetThumb({ asset, revealed }: {asset: TagDirectoryAsset, revealed: boolean}) {
  const kind = assetKind(asset);
  if (!revealed) {
    return <EyeOff aria-hidden className='size-4'/>;
  }
  if (kind === 'audio') {
    return <Music aria-hidden className='size-4'/>;
  }
  if (kind === 'video') {
    return (
      <>
        <video src={asset.urls.cdn} muted playsInline preload='metadata' aria-hidden className='size-full object-cover'/>
        <Play aria-hidden className='absolute size-4 text-white drop-shadow'/>
      </>
    );
  }
  return <img src={asset.urls.cdn} alt='' loading='lazy' className='size-full object-cover'/>;
}


const ACCEPTED_TYPES = 'image/*,video/*,audio/*';

function MediaManager({ assets, selected, selectedIndex, manage, onUploaded }: {
  assets: Array<TagDirectoryAsset>,
  selected: TagDirectoryAsset | undefined,
  selectedIndex: number,
  manage: MediaManage,
  onUploaded: (assetId: string) => void,
}) {
  const mutation = useMeTagDirectoryAssetMutation(manage.tagId);
  const input = useRef<HTMLInputElement>(null);
  const [ localError, setLocalError ] = useState<string | null>(null);

  if (manage.verified !== TagDirectoryVerificationStates.PENDING_VERIFICATION) {
    const verified = manage.verified === TagDirectoryVerificationStates.VERIFIED;
    return (
      <p className={cn('flex gap-2 rounded-md border border-line bg-deep px-3 py-2 text-sm text-muted', assets.length && 'mt-3')}>
        <Lock aria-hidden className='mt-0.5 size-4 shrink-0 text-subtle'/>
        <span>
          {(verified) ?
            'Media is locked now that the listing is verified.' :
            `Request verification to add up to ${TAG_DIRECTORY_ASSETS_MAX} images, videos or audio files. NotSoBot staff review them with the listing, and they show on the directory once it’s verified.`}
        </span>
      </p>
    );
  }

  const full = TAG_DIRECTORY_ASSETS_MAX <= assets.length;
  const busy = mutation.isPending;
  const uploading = busy && !!mutation.variables && 'upload' in mutation.variables;

  const onFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }
    mutation.reset();
    if (!/^(image|video|audio)\//.test(file.type)) {
      setLocalError('That file type isn’t supported. Use an image, video or audio file.');
      return;
    }
    if (TAG_DIRECTORY_ASSET_SIZE_MAX < file.size) {
      setLocalError(`That file is ${formatSize(file.size)}, files can be up to ${formatSize(TAG_DIRECTORY_ASSET_SIZE_MAX)}.`);
      return;
    }
    setLocalError(null);
    mutation.mutate({upload: file}, {
      // the new one is last, show it
      onSuccess: (directory) => {
        const added = directory.assets[directory.assets.length - 1];
        if (added) {
          onUploaded(added.id);
        }
      },
    });
  };

  const move = (position: number) => {
    if (selected) {
      setLocalError(null);
      mutation.mutate({move: selected.id, position});
    }
  };

  return (
    <div className={cn(assets.length && 'mt-3')}>
      {(!assets.length) ? (
        <button
          type='button'
          disabled={busy}
          onClick={() => input.current?.click()}
          className='flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-line-strong bg-deep px-4 py-8 text-center text-muted transition-colors hover:border-brand hover:text-white disabled:cursor-default'
        >
          {(uploading) ? <Spinner className='size-5'/> : <ImagePlus aria-hidden className='size-6'/>}
          <span className='text-sm font-medium'>{(uploading) ? 'Uploading…' : 'Add images, videos or audio'}</span>
          <span className='text-xs text-subtle'>Up to {TAG_DIRECTORY_ASSETS_MAX} files, {formatSize(TAG_DIRECTORY_ASSET_SIZE_MAX)} each. The first one is the cover on the directory.</span>
        </button>
      ) : (
        <div className='flex flex-wrap items-center gap-2'>
          <button type='button' className='btn btn-secondary btn-sm' disabled={busy || full} title={(full) ? `Listings can have up to ${TAG_DIRECTORY_ASSETS_MAX} files.` : undefined} onClick={() => input.current?.click()}>
            {(uploading) ? <Spinner className='size-3.5'/> : <ImagePlus className='size-3.5'/>}
            {(uploading) ? 'Uploading…' : 'Add media'}
          </button>
          {(selected) ? (
            <>
              <span aria-hidden className='mx-1 h-5 w-px bg-line-strong'/>
              <button type='button' className='btn btn-ghost btn-sm' disabled={busy || selectedIndex === 0} onClick={() => move(0)}>
                <Star className='size-3.5'/>
                Make cover
              </button>
              <button type='button' className='btn btn-ghost btn-sm px-2' aria-label='Move earlier' title='Move earlier' disabled={busy || selectedIndex === 0} onClick={() => move(selectedIndex - 1)}>
                <ArrowLeft className='size-3.5'/>
              </button>
              <button type='button' className='btn btn-ghost btn-sm px-2' aria-label='Move later' title='Move later' disabled={busy || selectedIndex === assets.length - 1} onClick={() => move(selectedIndex + 1)}>
                <ArrowRight className='size-3.5'/>
              </button>
              <button type='button' className='btn btn-ghost btn-sm text-danger' disabled={busy} onClick={() => mutation.mutate({remove: selected.id})}>
                <Trash2 className='size-3.5'/>
                Remove
              </button>
            </>
          ) : null}
        </div>
      )}
      <input ref={input} type='file' accept={ACCEPTED_TYPES} className='hidden' onChange={onFile}/>
      <p className='mt-2 flex items-center gap-1.5 text-xs text-subtle'>
        <EyeOff aria-hidden className='size-3.5'/>
        Only you and NotSoBot staff can see these until the listing is verified. They can’t be changed after that.
      </p>
      {(localError) ? <InlineError>{localError}</InlineError> : null}
      {(mutation.isError) ? <InlineError>{errorMessage(mutation.error, 'Couldn’t update the media.')}</InlineError> : null}
    </div>
  );
}

