import { useQueryClient } from '@tanstack/react-query';
import { ArrowUpRight, Clock, EyeOff, Pencil, ShieldCheck, ShieldX } from 'lucide-react';
import { useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router';

import { isStaff, useAuth } from '@/auth';
import { Spinner } from '@/components/ui/Spinner';
import { Routes } from '@/config';
import {
  TAG_DIRECTORY_DESCRIPTION_MAX,
  TAG_DIRECTORY_TITLE_MAX,
  TagDirectoryVerificationStates,
  type TagDirectoryItem,
  type TagDirectoryListingInput,
} from '@/lib/api';
import {
  errorMessage,
  useAdminTagDirectoryItemQuery,
  useMeTagQuery,
  usePatchAdminTagDirectoryMutation,
  usePatchMeTagDirectoryMutation,
} from '@/lib/api/dashboardQueries';
import { queryKeys } from '@/lib/api/queries';
import { cn } from '@/lib/utils';
import { CharCounter, Field, InlineError, Toggle } from '@/pages/dashboard/ui';


// The listing's owner and NotSoBot staff can manage a directory tag right from the public directory. Owners go through
// `/users/@me/tags/:id/directory` (same rules as the dashboard's Directory tab: title and description are frozen while
// verification is pending), staff through `/admin/tags/directory/:id`, which also rewrites the content and verifies.

// `Tag.content` is varchar(2000)
const CONTENT_MAX = 2000;

export interface ListingAccess {
  owner: boolean,
  staff: boolean,
}

export function useListingAccess(item: TagDirectoryItem): ListingAccess {
  const { user } = useAuth();
  return {owner: !!user && user.id === item.tag.user.id, staff: isStaff(user)};
}


// The tag's full content for whoever is allowed to see it, even when the listing hides it. Staff read it from the
// admin listing, owners from their own tag; `undefined` content means it isn't available (yet).
function useFullContent(item: TagDirectoryItem, access: ListingAccess) {
  const admin = useAdminTagDirectoryItemQuery(item.id, {enabled: access.staff});
  const own = useMeTagQuery(item.id, {enabled: access.owner && !access.staff && !item.content_public});
  if (access.staff) {
    return {
      content: admin.data?.tag.content,
      isPending: admin.isPending,
      isError: admin.isError || admin.data === null,
      error: admin.error,
      refetch: admin.refetch,
    };
  }
  if (item.content_public) {
    return {content: item.tag.content, isPending: false, isError: false, error: null, refetch: () => undefined};
  }
  return {content: own.data?.content, isPending: own.isPending, isError: own.isError, error: own.error, refetch: own.refetch};
}


// keeps the open modal in step with a save until its refetch lands, so it doesn't flash the old listing
function useMergeIntoDirectoryItem(id: string) {
  const queryClient = useQueryClient();
  return (changes: Partial<Pick<TagDirectoryItem, 'title' | 'description' | 'content_public' | 'verified'>>, content?: string) => {
    queryClient.setQueryData<TagDirectoryItem>(queryKeys.tagDirectoryItem(id), (old) => {
      if (!old) {
        return old;
      }
      const next = {...old, ...changes};
      const visibleContent = (next.content_public) ? (content ?? old.tag.content) : '';
      return {...next, tag: {...old.tag, content: visibleContent}};
    });
  };
}


// Shown in place of the public content section when the listing hides its content, to the owner and staff only.
export function HiddenContentSection({ item, access }: {item: TagDirectoryItem, access: ListingAccess}) {
  const { content, isPending, isError, error, refetch } = useFullContent(item, access);
  if (item.content_public || !(access.owner || access.staff)) {
    return null;
  }
  return (
    <section>
      <h3 className='section-label mb-2'>Content</h3>
      <p className='mb-2 flex gap-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-fg'>
        <EyeOff aria-hidden className='mt-0.5 size-4 shrink-0 text-warning'/>
        <span>
          {(access.owner) ? (
            <>Only you can see this because it’s your tag. Everyone else sees no content, since “Show content publicly” is off for this listing.</>
          ) : (
            <>Hidden from the public, the owner hasn’t turned on “Show content publicly”. You can see it because you’re NotSoBot staff, so please don’t share it.</>
          )}
        </span>
      </p>
      {(isPending) ? (
        <div className='flex h-24 items-center justify-center rounded-md border border-line bg-deep'><Spinner className='size-5'/></div>
      ) : (isError || content === undefined) ? (
        <div className='rounded-md border border-line bg-deep p-3 text-sm text-muted'>
          {errorMessage(error, 'Couldn’t load the content.')}{' '}
          <button type='button' className='cursor-pointer text-brand hover:underline' onClick={() => refetch()}>Retry</button>
        </div>
      ) : (
        <pre className='max-h-96 overflow-auto rounded-md border border-line bg-deep p-3 font-mono text-sm whitespace-pre-wrap break-words text-fg'>
          {content || <span className='text-subtle italic'>(empty)</span>}
        </pre>
      )}
    </section>
  );
}


// Owner/staff box in the modal's sidebar: start editing, jump to the dashboard and, for staff, set verification.
export function ManageListingCard({ item, access, editing, onEdit }: {
  item: TagDirectoryItem,
  access: ListingAccess,
  editing: boolean,
  onEdit: () => void,
}) {
  const verify = usePatchAdminTagDirectoryMutation();
  const merge = useMergeIntoDirectoryItem(item.id);
  if (!access.owner && !access.staff) {
    return null;
  }

  const setVerified = (verified: number) => {
    verify.mutate({tagId: item.id, verified}, {
      onSuccess: (updated) => merge({verified: updated.verified}),
    });
  };
  const pendingTarget = (verify.isPending) ? verify.variables?.verified : undefined;

  return (
    <section className='card p-5'>
      <h3 className='section-label mb-1'>{(access.owner) ? 'Your listing' : 'Staff tools'}</h3>
      <p className='mb-4 text-xs text-subtle'>
        {(access.owner) ? 'You published this tag, so you can change how it’s listed.' : 'You’re NotSoBot staff, so you can edit this listing.'}
      </p>
      <button type='button' className='btn btn-secondary w-full' disabled={editing} onClick={onEdit}>
        <Pencil className='size-4'/>
        Edit listing
      </button>
      {(access.owner) ? (
        <Link to={Routes.DASHBOARD_TAG.replace(':tagId', item.id)} className='btn btn-ghost mt-2 w-full'>
          Open in dashboard
          <ArrowUpRight className='size-3.5'/>
        </Link>
      ) : null}

      {(access.staff) ? (
        <div className='mt-4 border-t border-line pt-4'>
          <h4 className='section-label mb-2'>Verification</h4>
          <div className='grid gap-2'>
            <VerifyButton
              label='Verify'
              icon={<ShieldCheck className='size-4'/>}
              className='btn-primary'
              current={item.verified === TagDirectoryVerificationStates.VERIFIED}
              disabled={verify.isPending}
              pending={pendingTarget === TagDirectoryVerificationStates.VERIFIED}
              onClick={() => setVerified(TagDirectoryVerificationStates.VERIFIED)}
            />
            <VerifyButton
              label='Mark pending'
              icon={<Clock className='size-4'/>}
              className='btn-secondary'
              current={item.verified === TagDirectoryVerificationStates.PENDING_VERIFICATION}
              disabled={verify.isPending}
              pending={pendingTarget === TagDirectoryVerificationStates.PENDING_VERIFICATION}
              onClick={() => setVerified(TagDirectoryVerificationStates.PENDING_VERIFICATION)}
            />
            <VerifyButton
              label='Reject'
              icon={<ShieldX className='size-4'/>}
              className='btn-danger'
              current={item.verified === TagDirectoryVerificationStates.NOT_VERIFIED}
              disabled={verify.isPending}
              pending={pendingTarget === TagDirectoryVerificationStates.NOT_VERIFIED}
              onClick={() => setVerified(TagDirectoryVerificationStates.NOT_VERIFIED)}
            />
          </div>
          {(verify.isError) ? <InlineError>{errorMessage(verify.error, 'Couldn’t change the verification.')}</InlineError> : null}
          <Link
            to={{pathname: Routes.DASHBOARD_ADMIN_TAGS, search: `?q=${encodeURIComponent(`id:${item.id}`)}&status=all`}}
            className='btn btn-ghost mt-2 w-full'
          >
            Open in admin
            <ArrowUpRight className='size-3.5'/>
          </Link>
        </div>
      ) : null}
    </section>
  );
}


function VerifyButton({ label, icon, className, current, disabled, pending, onClick }: {
  label: string,
  icon: ReactNode,
  className: string,
  current: boolean,
  disabled: boolean,
  pending: boolean,
  onClick: () => void,
}) {
  return (
    <button type='button' className={cn('btn btn-sm', className)} disabled={disabled || current} onClick={onClick}>
      {(pending) ? <Spinner className='size-4 border-white/40 border-t-white'/> : icon}
      {label}
    </button>
  );
}


// Replaces the listing's description/content in the modal while editing. Owners get the title, description and the
// "show content publicly" switch; staff get the title, description and the content itself.
export function ListingEditForm({ item, access, onDone }: {item: TagDirectoryItem, access: ListingAccess, onDone: () => void}) {
  const full = useFullContent(item, access);
  const ownerPatch = usePatchMeTagDirectoryMutation(item.id);
  const adminPatch = usePatchAdminTagDirectoryMutation();
  const merge = useMergeIntoDirectoryItem(item.id);
  const [ title, setTitle ] = useState(item.title);
  const [ description, setDescription ] = useState(item.description);
  const [ contentPublic, setContentPublic ] = useState(item.content_public);
  // staff edit the content once it's loaded; null until then (or for owners)
  const [ content, setContent ] = useState<string | null>(null);
  const [ saving, setSaving ] = useState(false);
  const [ error, setError ] = useState<string | null>(null);

  if (access.staff && content === null && full.content !== undefined) {
    setContent(full.content);
  }

  // the owner's API freezes the title and description while a review is pending (the switch still works); staff aren't blocked
  const listingFrozen = !access.staff && item.verified === TagDirectoryVerificationStates.PENDING_VERIFICATION;
  const titleChanged = title !== item.title;
  const descriptionChanged = description !== item.description;
  const contentChanged = access.staff && content !== null && content !== full.content;
  const contentPublicChanged = access.owner && contentPublic !== item.content_public;
  const dirty = titleChanged || descriptionChanged || contentChanged || contentPublicChanged;
  const invalid = TAG_DIRECTORY_TITLE_MAX < title.length || TAG_DIRECTORY_DESCRIPTION_MAX < description.length ||
    (contentChanged && (!content!.trim() || CONTENT_MAX < content!.length));

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!dirty || invalid || saving) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      let changes: Partial<Pick<TagDirectoryItem, 'title' | 'description' | 'content_public' | 'verified'>> = {};
      // staff edits go through the admin route (it ignores the pending freeze); only the owner can flip content_public
      if (access.staff && (titleChanged || descriptionChanged || contentChanged)) {
        const updated = await adminPatch.mutateAsync({
          tagId: item.id,
          title: (titleChanged) ? title : undefined,
          description: (descriptionChanged) ? description : undefined,
          content: (contentChanged) ? content! : undefined,
        });
        changes = {title: updated.title, description: updated.description, verified: updated.verified};
      }
      const ownerBody: TagDirectoryListingInput = {};
      if (access.owner && !access.staff) {
        if (titleChanged) {
          ownerBody.title = title;
        }
        if (descriptionChanged) {
          ownerBody.description = description;
        }
      }
      if (contentPublicChanged) {
        ownerBody.content_public = contentPublic;
      }
      if (Object.keys(ownerBody).length) {
        const updated = await ownerPatch.mutateAsync(ownerBody);
        changes = {title: updated.title, description: updated.description, content_public: updated.content_public, verified: updated.verified};
      }
      merge(changes, (access.staff) ? (content ?? undefined) : full.content);
      onDone();
    } catch (caught) {
      setError(errorMessage(caught, 'Couldn’t save the listing.'));
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className='space-y-5 rounded-lg border border-line bg-surface p-4'>
      <div className='flex items-center justify-between gap-3'>
        <h3 className='font-semibold text-white'>Edit listing</h3>
        {(access.staff && !access.owner) ? <span className='rounded bg-brand/15 px-2 py-0.5 text-xs font-medium text-brand'>Staff</span> : null}
      </div>

      {(listingFrozen) ? (
        <p className='rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-fg'>
          This listing is being reviewed for verification, so its title and description can’t change until the review finishes.
        </p>
      ) : null}

      <Field
        label='Title'
        hint='A short line shown under the tag name. Optional.'
        counter={<CharCounter length={title.length} max={TAG_DIRECTORY_TITLE_MAX}/>}
      >
        {(props) => (
          <input
            {...props}
            className='input'
            maxLength={TAG_DIRECTORY_TITLE_MAX}
            value={title}
            disabled={listingFrozen || saving}
            onChange={(event) => setTitle(event.target.value)}
          />
        )}
      </Field>
      <Field
        label='Description'
        hint='What the tag does and how to use it. Optional.'
        counter={<CharCounter length={description.length} max={TAG_DIRECTORY_DESCRIPTION_MAX}/>}
      >
        {(props) => (
          <textarea
            {...props}
            className='input min-h-32 resize-y leading-relaxed'
            maxLength={TAG_DIRECTORY_DESCRIPTION_MAX}
            value={description}
            disabled={listingFrozen || saving}
            onChange={(event) => setDescription(event.target.value)}
          />
        )}
      </Field>

      {(access.owner) ? (
        <Toggle
          label='Show content publicly'
          description='Anyone browsing the directory can read the tag’s content. Hidden by default.'
          checked={contentPublic}
          disabled={saving}
          onChange={setContentPublic}
        />
      ) : null}

      {(access.staff) ? (
        <Field
          label='Content'
          hint='Saving bypasses the lock. The owner isn’t notified and the tag’s edited date stays the same.'
          counter={(content !== null) ? <CharCounter length={content.length} max={CONTENT_MAX}/> : undefined}
        >
          {(props) => (full.isPending) ? (
            <div className='flex h-32 items-center justify-center rounded-md border border-line bg-deep'><Spinner className='size-5'/></div>
          ) : (content === null) ? (
            <p className='text-sm text-muted'>{errorMessage(full.error, 'Couldn’t load the content, so it can’t be edited here.')}</p>
          ) : (
            <textarea
              {...props}
              className='input resize-y font-mono text-sm leading-relaxed'
              rows={Math.min(20, Math.max(6, content.split('\n').length + 1))}
              value={content}
              disabled={saving}
              onChange={(event) => setContent(event.target.value)}
            />
          )}
        </Field>
      ) : (
        <p className='text-xs text-subtle'>
          To change the tag’s content, edit it in your{' '}
          <Link to={Routes.DASHBOARD_TAG.replace(':tagId', item.id)} className='text-brand hover:underline'>dashboard</Link>
          {(item.tag.locked) ? ' (it’s locked while it’s pending or verified).' : '.'}
        </p>
      )}

      {(error) ? <InlineError>{error}</InlineError> : null}

      <div className='flex flex-col-reverse gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between'>
        <div aria-live='polite' className='min-h-5 text-sm'>
          {(dirty && !saving) ? <span className='text-warning'>Unsaved changes</span> : null}
        </div>
        <div className='flex flex-wrap gap-2 sm:justify-end'>
          <button type='button' className='btn btn-ghost' disabled={saving} onClick={onDone}>Cancel</button>
          <button type='submit' className='btn btn-primary' disabled={!dirty || invalid || saving}>
            {(saving) ? <Spinner className='size-4 border-white/40 border-t-white'/> : null}
            {(saving) ? 'Saving…' : 'Save listing'}
          </button>
        </div>
      </div>
    </form>
  );
}
