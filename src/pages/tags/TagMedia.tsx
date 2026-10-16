import { ArrowLeft, ArrowRight, Eye, EyeOff, ImagePlus, Lock, Music, Play, Star, Trash2, Undo2, Upload } from 'lucide-react';
import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react';

import { Spinner } from '@/components/ui/Spinner';
import {
  TAG_DIRECTORY_ASSET_SIZE_MAX,
  TAG_DIRECTORY_ASSETS_MAX,
  TagDirectoryEditRequestStatuses,
  TagDirectoryEditRequestThumbnailModes,
  TagDirectoryVerificationStates,
  type TagDirectoryAsset,
  type TagDirectoryItem,
  type TagDirectoryThumbnail,
} from '@/lib/api';
import {
  errorMessage,
  useMeTagDirectoryAssetMutation,
  useMeTagDirectoryEditRequestMutation,
  useMeTagDirectoryThumbnailMutation,
} from '@/lib/api/dashboardQueries';
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


// The card's thumbnail: the listing's own `thumbnail` when it has one, otherwise the first asset, cropped to a small
// square next to the name so cards with media stay the same height as the ones without (a full-width band made its
// whole grid row stretch). Audio gets a note icon and NSFW tags a plain tile instead of the media. Video covers play
// (muted) while `playing`, the card tracks the hover.
export function AssetThumbnail({ assets, thumbnail, nsfw, playing }: {
  assets: Array<TagDirectoryAsset>,
  thumbnail: TagDirectoryThumbnail | null,
  nsfw: boolean,
  playing: boolean,
}) {
  if (thumbnail) {
    return (
      <div className='relative size-16 shrink-0 overflow-hidden rounded-md border border-line bg-deep'>
        {(nsfw) ? (
          <div className='flex size-full items-center justify-center text-subtle' title='NSFW media, open the tag to view'>
            <EyeOff aria-hidden className='size-5'/>
          </div>
        ) : (
          <img src={thumbnail.urls.cdn} alt='' loading='lazy' decoding='async' className='size-full object-cover'/>
        )}
        {(assets.length) ? (
          <span className='pointer-events-none absolute right-1 bottom-1 rounded bg-black/70 px-1 text-[10px] leading-4 font-medium text-white tabular-nums'>
            +{assets.length}
          </span>
        ) : null}
      </div>
    );
  }

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
  // managing a verified listing's change request instead of the listing itself: its proposed media/thumbnail
  editRequest?: {
    status: number,
    thumbnailMode: number,
    // the listing's thumbnail today, what KEEP keeps
    liveThumbnail: TagDirectoryThumbnail | null,
  },
}

// The modal's (and dashboard's) media: a big viewer and the thumbnails in order. With `manage` (the owner) it also uploads
// (picked, pasted or dropped), reorders and removes them while they can change, and explains why they can't otherwise.
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

  const viewer = (
    <>
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
                    {('is_new' in asset && asset.is_new) ? (
                      <span className='absolute top-0.5 right-0.5 rounded bg-brand px-1 text-[10px] font-medium text-white'>New</span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : null}
    </>
  );

  if (!manage) {
    return <section>{viewer}</section>;
  }
  return (
    <MediaManager assets={assets} selected={selected} selectedIndex={selectedIndex} manage={manage} onUploaded={setSelectedId}>
      {viewer}
    </MediaManager>
  );
}


// A box that takes a file pasted into it (click it first, then Ctrl/⌘+V) or dropped on it, along with its own buttons.
function FileDropZone({ enabled, label, onFile, className, children }: {
  enabled: boolean,
  label: string,
  onFile: (file: File) => void,
  className?: string,
  children: ReactNode,
}) {
  const [ dragging, setDragging ] = useState(false);
  if (!enabled) {
    return <section className={className}>{children}</section>;
  }

  const firstFile = (data: DataTransfer | null): File | null => {
    if (!data) {
      return null;
    }
    if (data.files.length) {
      return data.files[0];
    }
    // some apps only put the image on the clipboard as an item
    for (const item of Array.from(data.items)) {
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) {
          return file;
        }
      }
    }
    return null;
  };

  return (
    <section
      tabIndex={0}
      aria-label={label}
      className={cn(
        'rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-brand',
        dragging && 'ring-2 ring-brand ring-offset-2 ring-offset-surface',
        className,
      )}
      onPaste={(event) => {
        // pasting text into a field inside the box stays a text paste
        const target = event.target;
        if (target instanceof HTMLInputElement && target.type !== 'file' || target instanceof HTMLTextAreaElement) {
          return;
        }
        const file = firstFile(event.clipboardData);
        if (file) {
          event.preventDefault();
          onFile(file);
        }
      }}
      onDragOver={(event) => {
        if (Array.from(event.dataTransfer.types).includes('Files')) {
          event.preventDefault();
          event.dataTransfer.dropEffect = 'copy';
          setDragging(true);
        }
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setDragging(false);
        }
      }}
      onDrop={(event) => {
        const file = firstFile(event.dataTransfer);
        setDragging(false);
        if (file) {
          event.preventDefault();
          onFile(file);
        }
      }}
    >
      {children}
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
const PASTE_HINT = 'Click here and paste (Ctrl/⌘+V), or drop a file.';

type MediaAction = {upload: File} | {move: string, position: number} | {remove: string};

// the listing's own media, or (`manage.editRequest`) its change request's proposed media; both answer with the listing
function useMediaMutation(manage: MediaManage) {
  const listing = useMeTagDirectoryAssetMutation(manage.tagId);
  const draft = useMeTagDirectoryEditRequestMutation(manage.tagId);
  const active = (manage.editRequest) ? draft : listing;
  return {
    isPending: active.isPending,
    isError: active.isError,
    error: active.error,
    reset: active.reset,
    uploading: active.isPending && !!active.variables && ('upload' in active.variables),
    mutate: (action: MediaAction, onSuccess?: (assets: Array<TagDirectoryAsset>) => void) => {
      const options = {
        onSuccess: (directory: TagDirectoryItem) => onSuccess?.((manage.editRequest) ? (directory.edit_request?.assets ?? []) : directory.assets),
      };
      if (manage.editRequest) {
        draft.mutate(action, options);
      } else {
        listing.mutate(action, options);
      }
    },
  };
}

function MediaManager({ assets, selected, selectedIndex, manage, onUploaded, children }: {
  assets: Array<TagDirectoryAsset>,
  selected: TagDirectoryAsset | undefined,
  selectedIndex: number,
  manage: MediaManage,
  onUploaded: (assetId: string) => void,
  children: ReactNode,
}) {
  const mutation = useMediaMutation(manage);
  const input = useRef<HTMLInputElement>(null);
  const [ localError, setLocalError ] = useState<string | null>(null);

  const editable = (manage.editRequest) ?
    manage.editRequest.status === TagDirectoryEditRequestStatuses.DRAFT :
    manage.verified === TagDirectoryVerificationStates.PENDING_VERIFICATION;
  const full = TAG_DIRECTORY_ASSETS_MAX <= assets.length;
  const busy = mutation.isPending;
  const uploading = mutation.uploading;

  const upload = (file: File) => {
    mutation.reset();
    if (full) {
      setLocalError(`Listings can have up to ${TAG_DIRECTORY_ASSETS_MAX} files, remove one first.`);
      return;
    }
    if (!/^(image|video|audio)\//.test(file.type)) {
      setLocalError('That file type isn’t supported. Use an image, video or audio file.');
      return;
    }
    if (TAG_DIRECTORY_ASSET_SIZE_MAX < file.size) {
      setLocalError(`That file is ${formatSize(file.size)}, files can be up to ${formatSize(TAG_DIRECTORY_ASSET_SIZE_MAX)}.`);
      return;
    }
    setLocalError(null);
    // the new one is last, show it
    mutation.mutate({upload: file}, (updated) => {
      const added = updated[updated.length - 1];
      if (added) {
        onUploaded(added.id);
      }
    });
  };

  const onFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) {
      upload(file);
    }
  };

  const move = (position: number) => {
    if (selected) {
      setLocalError(null);
      mutation.mutate({move: selected.id, position});
    }
  };

  let controls: ReactNode;
  if (!editable) {
    let message: string;
    if (manage.editRequest) {
      message = 'Your change request is waiting for review. Withdraw it to change its media.';
    } else if (manage.verified === TagDirectoryVerificationStates.VERIFIED) {
      message = 'Media is locked now that the listing is verified. Request changes to update it.';
    } else {
      message = `Request verification to add up to ${TAG_DIRECTORY_ASSETS_MAX} images, videos or audio files. NotSoBot staff review them with the listing, and they show on the directory once it’s verified.`;
    }
    controls = (
      <p className={cn('flex gap-2 rounded-md border border-line bg-deep px-3 py-2 text-sm text-muted', assets.length && 'mt-3')}>
        <Lock aria-hidden className='mt-0.5 size-4 shrink-0 text-subtle'/>
        <span>{message}</span>
      </p>
    );
  } else {
    controls = (
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
            <span className='text-xs text-subtle'>Up to {TAG_DIRECTORY_ASSETS_MAX} files, {formatSize(TAG_DIRECTORY_ASSET_SIZE_MAX)} each. The first one is the cover on the directory. You can also paste or drop them here.</span>
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
          <EyeOff aria-hidden className='size-3.5 shrink-0'/>
          {(manage.editRequest) ?
            'Staff review these with your request. The listing keeps its current media until it’s approved.' :
            'Only you and NotSoBot staff can see these until the listing is verified. They can’t be changed after that.'}
        </p>
        {(assets.length) ? <p className='mt-1 text-xs text-subtle'>{PASTE_HINT}</p> : null}
      </div>
    );
  }

  return (
    <FileDropZone enabled={editable && !busy} label='Media, paste or drop a file to add it' onFile={upload}>
      {children}
      {controls}
      {(localError) ? <InlineError>{localError}</InlineError> : null}
      {(mutation.isError) ? <InlineError>{errorMessage(mutation.error, 'Couldn’t update the media.')}</InlineError> : null}
    </FileDropZone>
  );
}


const THUMBNAIL_ACCEPTED_TYPES = 'image/*,video/*';

// The owner's thumbnail for the directory card, with a preview of the card's tile. Same rules as the media: while
// verification is pending, or in a change request's draft once it's verified. The api shrinks it to a small png (a video
// gives its first frame); without one the card shows the cover.
export function ThumbnailManager({ assets, thumbnail, manage }: {
  assets: Array<TagDirectoryAsset>,
  // the listing's, or for a change request its proposed one (REPLACE) and nothing else, see `effective` below
  thumbnail: TagDirectoryThumbnail | null,
  manage: MediaManage,
}) {
  const listing = useMeTagDirectoryThumbnailMutation(manage.tagId);
  const draft = useMeTagDirectoryEditRequestMutation(manage.tagId);
  const request = manage.editRequest;
  const active = (request) ? draft : listing;
  const input = useRef<HTMLInputElement>(null);
  const [ localError, setLocalError ] = useState<string | null>(null);

  const editable = (request) ?
    request.status === TagDirectoryEditRequestStatuses.DRAFT :
    manage.verified === TagDirectoryVerificationStates.PENDING_VERIFICATION;
  const busy = active.isPending;
  const uploading = busy && !!active.variables && ('upload' in active.variables || 'uploadThumbnail' in active.variables);

  // what the card would show
  let effective = thumbnail;
  if (request) {
    if (request.thumbnailMode === TagDirectoryEditRequestThumbnailModes.KEEP) {
      effective = request.liveThumbnail;
    } else if (request.thumbnailMode === TagDirectoryEditRequestThumbnailModes.REMOVE) {
      effective = null;
    }
  }

  const upload = (file: File) => {
    active.reset();
    if (!/^(image|video)\//.test(file.type)) {
      setLocalError('That file type isn’t supported. Use an image or video.');
      return;
    }
    if (TAG_DIRECTORY_ASSET_SIZE_MAX < file.size) {
      setLocalError(`That file is ${formatSize(file.size)}, files can be up to ${formatSize(TAG_DIRECTORY_ASSET_SIZE_MAX)}.`);
      return;
    }
    setLocalError(null);
    if (request) {
      draft.mutate({uploadThumbnail: file});
    } else {
      listing.mutate({upload: file});
    }
  };

  const onFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) {
      upload(file);
    }
  };

  const remove = () => {
    setLocalError(null);
    if (request) {
      draft.mutate({patch: {thumbnail_mode: TagDirectoryEditRequestThumbnailModes.REMOVE}});
    } else {
      listing.mutate({remove: true});
    }
  };

  let status: string;
  if (request && request.thumbnailMode === TagDirectoryEditRequestThumbnailModes.REPLACE) {
    status = 'Using your new thumbnail.';
  } else if (request && request.thumbnailMode === TagDirectoryEditRequestThumbnailModes.REMOVE) {
    status = (assets.length) ? 'Removing your thumbnail, the card will use the cover.' : 'Removing your thumbnail.';
  } else if (effective) {
    status = (request) ? 'Keeping your current thumbnail.' : 'Using your thumbnail.';
  } else {
    status = (assets.length) ? 'Using the cover, the first of the media.' : 'No thumbnail or media yet.';
  }

  const preview = (effective || assets.length) ? (
    <AssetThumbnail assets={assets} thumbnail={effective} nsfw={false} playing={false}/>
  ) : (
    <div className='flex size-16 shrink-0 items-center justify-center rounded-md border border-dashed border-line-strong bg-deep text-subtle'>
      <ImagePlus aria-hidden className='size-5'/>
    </div>
  );

  let lockedMessage: string | null = null;
  if (!editable) {
    if (request) {
      lockedMessage = 'Your change request is waiting for review. Withdraw it to change the thumbnail.';
    } else if (manage.verified === TagDirectoryVerificationStates.VERIFIED) {
      lockedMessage = 'The thumbnail is locked now that the listing is verified. Request changes to update it.';
    } else {
      lockedMessage = 'Request verification to set a thumbnail. NotSoBot staff review it with the listing.';
    }
  }

  return (
    <FileDropZone enabled={editable && !busy} label='Thumbnail, paste or drop a file to use it' onFile={upload}>
      <div className='flex items-center gap-4'>
        {preview}
        <div className='min-w-0 flex-1 space-y-2'>
          <p className='text-sm text-muted'>{status}</p>
          {(editable) ? (
            <div className='flex flex-wrap items-center gap-2'>
              <button type='button' className='btn btn-secondary btn-sm' disabled={busy} onClick={() => input.current?.click()}>
                {(uploading) ? <Spinner className='size-3.5'/> : <Upload className='size-3.5'/>}
                {(uploading) ? 'Uploading…' : (effective) ? 'Replace' : 'Upload thumbnail'}
              </button>
              {(effective) ? (
                <button type='button' className='btn btn-ghost btn-sm text-danger' disabled={busy} onClick={remove}>
                  <Trash2 className='size-3.5'/>
                  Remove
                </button>
              ) : null}
              {(request && request.thumbnailMode !== TagDirectoryEditRequestThumbnailModes.KEEP) ? (
                <button
                  type='button'
                  className='btn btn-ghost btn-sm'
                  disabled={busy}
                  onClick={() => draft.mutate({patch: {thumbnail_mode: TagDirectoryEditRequestThumbnailModes.KEEP}})}
                >
                  <Undo2 className='size-3.5'/>
                  Keep current
                </button>
              ) : null}
            </div>
          ) : null}
          {(editable) ? <p className='text-xs text-subtle'>{PASTE_HINT}</p> : null}
        </div>
      </div>
      <input ref={input} type='file' accept={THUMBNAIL_ACCEPTED_TYPES} className='hidden' onChange={onFile}/>
      {(lockedMessage) ? (
        <p className='mt-3 flex gap-2 rounded-md border border-line bg-deep px-3 py-2 text-sm text-muted'>
          <Lock aria-hidden className='mt-0.5 size-4 shrink-0 text-subtle'/>
          <span>{lockedMessage}</span>
        </p>
      ) : null}
      {(localError) ? <InlineError>{localError}</InlineError> : null}
      {(active.isError) ? <InlineError>{errorMessage(active.error, 'Couldn’t update the thumbnail.')}</InlineError> : null}
    </FileDropZone>
  );
}
