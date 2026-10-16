import { AlertTriangle, Check, Eye, PencilLine, Plus, Shield, type LucideIcon } from 'lucide-react';
import { useEffect, useRef, useState, type ComponentProps } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router';

import { useAuth } from '@/auth';
import { Markdown } from '@/components/ui/Markdown';
import { config, Routes, TAG_ADD_PARAM } from '@/config';
import { TagDirectoryCategories, TagDirectoryVerificationStates, type Tag, type TagDirectoryCategory } from '@/lib/api';
import { cn } from '@/lib/utils';

import { AddTagDialog } from './AddTagDialog';


export function tagDirectoryItemPath(id: string): string {
  return Routes.TAG_DIRECTORY_ITEM.replace(':tagId', id);
}


// `param` is what the directory puts in its URL; alphabetical, except `Other` goes last
export const TAG_DIRECTORY_CATEGORY_OPTIONS: Array<{param: string, label: string, value: TagDirectoryCategory}> = [
  {param: 'ai', label: 'AI', value: TagDirectoryCategories.AI},
  {param: 'clips', label: 'Clips', value: TagDirectoryCategories.CLIPS},
  {param: 'filters', label: 'Filters', value: TagDirectoryCategories.FILTERS},
  {param: 'games', label: 'Games', value: TagDirectoryCategories.GAMES},
  {param: 'memes', label: 'Memes', value: TagDirectoryCategories.MEMES},
  {param: 'utility', label: 'Utility', value: TagDirectoryCategories.UTILITY},
  {param: 'other', label: 'Other', value: TagDirectoryCategories.OTHER},
];

// links made before images/audio were merged into filters keep working
const LEGACY_CATEGORY_PARAMS: Record<string, string> = {audio: 'filters', images: 'filters'};

export function categoryOptionFromParam(param: string | null) {
  const value = (param && LEGACY_CATEGORY_PARAMS[param]) || param;
  return TAG_DIRECTORY_CATEGORY_OPTIONS.find((option) => option.param === value) ?? null;
}

export function categoryLabel(category: number): string {
  return TAG_DIRECTORY_CATEGORY_OPTIONS.find((option) => option.value === category)?.label ?? 'Other';
}


export function CategoryBadge({ category }: {category: number}) {
  // same height as the `VerificationBadge` next to it on cards
  return <span className='inline-flex shrink-0 items-center rounded bg-surface-3 px-2 py-0.5 text-xs text-fg'>{categoryLabel(category)}</span>;
}


// the listing description's textarea with a Write/Preview switch, spread the `Field` props into it
export function DescriptionEditor({ value, onChange, className, ...props }: Omit<ComponentProps<'textarea'>, 'value' | 'onChange'> & {
  value: string,
  onChange: (value: string) => void,
}) {
  const [ preview, setPreview ] = useState(false);
  // the preview keeps the textarea's height so the form doesn't jump around when switching
  const textarea = useRef<HTMLTextAreaElement>(null);
  const [ height, setHeight ] = useState<number | undefined>();
  const tabClass = (active: boolean) => cn(
    'inline-flex cursor-pointer items-center gap-1.5 rounded px-2 py-1 text-xs font-medium transition-colors',
    (active) ? 'bg-surface-3 text-white' : 'text-muted hover:text-white',
  );

  return (
    <div>
      <div className='mb-1.5 flex items-center justify-between gap-3'>
        <div role='tablist' aria-label='Description view' className='flex gap-1 rounded-md border border-line bg-deep p-0.5'>
          <button type='button' role='tab' aria-selected={!preview} className={tabClass(!preview)} onClick={() => setPreview(false)}>
            <PencilLine aria-hidden className='size-3.5'/>
            Write
          </button>
          <button
            type='button'
            role='tab'
            aria-selected={preview}
            className={tabClass(preview)}
            onClick={() => {
              setHeight(textarea.current?.offsetHeight);
              setPreview(true);
            }}
          >
            <Eye aria-hidden className='size-3.5'/>
            Preview
          </button>
        </div>
        <span className='text-xs text-subtle'>Markdown supported</span>
      </div>
      <textarea
        {...props}
        ref={textarea}
        hidden={preview}
        className={className}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {(preview) ? (
        <div className='rounded-md border border-line bg-deep px-3 py-2 text-sm leading-relaxed text-fg' style={{minHeight: height}}>
          {(value.trim()) ? <Markdown text={value}/> : <p className='text-subtle italic'>Nothing to preview</p>}
        </div>
      ) : null}
    </div>
  );
}


// a plain select for the listing forms, spread the `Field` props into it
export function CategorySelect({ value, onChange, ...props }: Omit<ComponentProps<'select'>, 'value' | 'onChange'> & {
  value: TagDirectoryCategory,
  onChange: (value: TagDirectoryCategory) => void,
}) {
  return (
    <select {...props} className='input' value={value} onChange={(event) => onChange(Number(event.target.value) as TagDirectoryCategory)}>
      {TAG_DIRECTORY_CATEGORY_OPTIONS.map((option) => <option key={option.param} value={option.value}>{option.label}</option>)}
    </select>
  );
}


// what requesting verification means, shown before confirming (the bot's `/tag directory verify` says the same)
export function VerificationWarning() {
  return (
    <ul className='list-disc space-y-1.5 pl-5'>
      <li>Requesting verification locks the tag’s content, so it can’t be edited while the review is pending or after it’s verified.</li>
      <li>If it’s verified, NotSoBot staff may change its content to make it more efficient, and may move its media onto NotSoBot’s own servers.</li>
      <li>You can cancel the request while it’s still pending.</li>
    </ul>
  );
}


// mirrors the api's `check_can_verify_tag_directory`, null when the listing can be verified
export function verificationRequirement(listing: {description: string | null, category: number | null}): string | null {
  if (!listing.description?.trim()) {
    return 'Add a description before it can be verified.';
  }
  if (!listing.category || listing.category === TagDirectoryCategories.OTHER) {
    return 'Pick a category other than Other before it can be verified.';
  }
  return null;
}


interface Verification {
  label: string,
  shortLabel: string,
  description: string,
  icon: LucideIcon,
  className: string,
  // for the status as plain text instead of a badge
  textClassName: string,
}

export function verificationInfo(verified: number): Verification {
  switch (verified) {
    case TagDirectoryVerificationStates.VERIFIED:
      return {
        label: 'Verified',
        shortLabel: 'Verified',
        description: 'This tag has been manually verified and is completely safe to execute. It is currently immutable.',
        icon: Shield,
        className: 'bg-success',
        textClassName: 'text-success',
      };
    case TagDirectoryVerificationStates.PENDING_VERIFICATION:
      return {
        label: 'Pending Verification',
        shortLabel: 'Pending',
        description: 'This tag is pending verification and is currently immutable.',
        icon: Check,
        className: 'bg-warning',
        textClassName: 'text-warning',
      };
    default:
      return {
        label: 'Unverified',
        shortLabel: 'Unverified',
        description: 'This tag has not been verified. Use at your own discretion.',
        icon: AlertTriangle,
        className: 'bg-subtle',
        textClassName: 'text-subtle',
      };
  }
}


export function VerificationBadge({ verified, size = 'sm', hideUnverified = false }: {
  verified: number,
  size?: 'sm' | 'lg',
  hideUnverified?: boolean,
}) {
  if (hideUnverified && verified === TagDirectoryVerificationStates.NOT_VERIFIED) {
    return null;
  }
  const info = verificationInfo(verified);
  const Icon = info.icon;
  return (
    <span
      title={info.description}
      className={cn(
        'inline-flex shrink-0 items-center text-white',
        info.className,
        (size === 'lg') ? 'gap-2 rounded-lg px-3 py-1.5 font-medium' : 'gap-1 rounded px-2 py-0.5 text-xs',
      )}
    >
      <Icon className={(size === 'lg') ? 'size-5' : 'size-3'}/>
      {(size === 'lg') ? info.label : info.shortLabel}
    </span>
  );
}


export function NsfwBadge({ size = 'sm' }: {size?: 'sm' | 'lg'}) {
  return (
    <span className={cn(
      'rounded bg-danger font-medium text-white',
      (size === 'lg') ? 'px-2 py-1 text-sm' : 'px-1.5 py-0.5 text-[10px]',
    )}>
      NSFW
    </span>
  );
}


// Opens the add dialog (logging in first if needed); the dialog lives outside the card so its clicks
// don't hit the card's stretched link. `verified` lets the dialog warn about unverified tags.
// `openFromUrl` opens it straight away when the page has `?add=1` (TAG_ADD_PARAM), only the tag's own modal sets it
export function AddTagButton({ tag, verified, size = 'sm', className, openFromUrl = false }: {
  tag: Pick<Tag, 'id' | 'name'>,
  verified: number,
  size?: 'sm' | 'lg',
  className?: string,
  openFromUrl?: boolean,
}) {
  const { status, isAuthenticated, login } = useAuth();
  const [ open, setOpen ] = useState(false);
  const [ searchParams, setSearchParams ] = useSearchParams();
  const requested = openFromUrl && searchParams.has(TAG_ADD_PARAM);

  useEffect(() => {
    if (!requested || status === 'loading' || !config.authEnabled) {
      return;
    }
    if (status === 'anonymous') {
      // comes back to this same url, param included, so the dialog opens after logging in. the callback only
      // returns here on success, so a failed login can't loop
      login();
      return;
    }
    // dropped so closing the dialog, or stepping to another tag, doesn't open it again
    setSearchParams((params) => {
      params.delete(TAG_ADD_PARAM);
      return params;
    }, {replace: true});
    if (isAuthenticated) {
      setOpen(true);
    }
  }, [isAuthenticated, login, requested, setSearchParams, status]);

  // adding needs an account, and with auth off there's no way to log in
  if (!isAuthenticated && !config.authEnabled) {
    return null;
  }
  return (
    <>
      <button
        type='button'
        onClick={() => (isAuthenticated) ? setOpen(true) : login()}
        title={(isAuthenticated) ? 'Add to a server or your DMs' : 'Log in to add this tag'}
        className={cn(
          'relative z-10 flex shrink-0 cursor-pointer items-center gap-1 whitespace-nowrap rounded bg-brand font-medium text-white transition-colors hover:bg-brand-hover',
          (size === 'lg') ? 'gap-2 rounded-lg px-6 py-3' : 'px-3 py-1.5 text-sm',
          className,
        )}
      >
        <Plus className={(size === 'lg') ? 'size-5' : 'size-4'}/>
        {(size === 'lg') ? 'Add Tag' : 'Add'}
      </button>
      {(open) ? createPortal(<AddTagDialog tag={tag} verified={verified} onClose={() => setOpen(false)}/>, document.body) : null}
    </>
  );
}
