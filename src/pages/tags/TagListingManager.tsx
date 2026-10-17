import { useQueryClient } from '@tanstack/react-query';
import { ArrowUpRight, Clock, EyeOff, Pencil, ShieldCheck, ShieldX, X } from 'lucide-react';
import { useId, useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router';

import { isStaff, useAuth } from '@/auth';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Modal } from '@/components/ui/Modal';
import { SearchInput } from '@/components/ui/SearchInput';
import { Spinner } from '@/components/ui/Spinner';
import { Routes } from '@/config';
import {
  TAG_DIRECTORY_DESCRIPTION_MAX,
  TAG_DIRECTORY_TITLE_MAX,
  TagDirectoryVerificationStates,
  type TagDirectoryItem,
  type TagDirectoryListingInput,
  type TagServer,
} from '@/lib/api';
import {
  errorMessage,
  useAdminTagDirectoryItemQuery,
  useCancelMeTagDirectoryVerificationMutation,
  useMeTagQuery,
  usePatchAdminTagDirectoryMutation,
  usePatchMeTagDirectoryMutation,
  useRequestMeTagDirectoryVerificationMutation,
  useAdminTagServersQuery,
  useTagServerCountsQuery,
} from '@/lib/api/dashboardQueries';
import { queryKeys } from '@/lib/api/queries';
import { cn, formatDate } from '@/lib/utils';
import { adminTagDirectoryPath } from '@/pages/dashboard/admin/adminUi';
import { TagAssetsPanel } from '@/pages/dashboard/admin/TagAssetsPanel';
import { GuildIcon } from '@/pages/dashboard/servers/GuildIcon';
import { CharCounter, Field, InlineError, Toggle } from '@/pages/dashboard/ui';

import { CategorySelect, DescriptionEditor, verificationRequirement, VerificationWarning } from './tagDirectory';


// The listing's owner and NotSoBot staff can manage a directory tag right from the public directory. Owners go through
// `/users/@me/tags/:id/directory` (same rules as the dashboard's Directory tab: title, description and category are frozen while
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
  return (changes: Partial<Pick<TagDirectoryItem, 'title' | 'description' | 'category' | 'content_public' | 'verified'>>, content?: string) => {
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


// past this many servers the list gets a filter box
const SERVERS_FILTER_MIN = 8;

// Where the tag has been added (as an alias). Staff get the servers, its owner only counts: server admins adding a
// directory tag don't expect its author to see their server. Everyone else just sees the listing's server count.
export function TagServersSection({ item, access }: {item: TagDirectoryItem, access: ListingAccess}) {
  if (access.staff) {
    return <TagServersList item={item}/>;
  }
  if (access.owner) {
    return <TagServerCounts item={item}/>;
  }
  return null;
}


function ServersHeading({ note }: {note: string}) {
  return (
    <div className='mb-2 flex items-baseline justify-between gap-3'>
      <h3 className='section-label'>Servers</h3>
      <span className='flex items-center gap-1.5 text-xs text-subtle'>
        <EyeOff aria-hidden className='size-3.5'/>
        {note}
      </span>
    </div>
  );
}


// the loading / error box for either query, null once there's data
function ServersQueryState({ query }: {query: {isPending: boolean, isError: boolean, error: unknown, refetch: () => unknown}}) {
  if (query.isPending) {
    return <div className='flex h-24 items-center justify-center rounded-md border border-line bg-deep'><Spinner className='size-5'/></div>;
  }
  if (query.isError) {
    return (
      <div className='rounded-md border border-line bg-deep p-3 text-sm text-muted'>
        {errorMessage(query.error, 'Couldn’t load the servers.')}{' '}
        <button type='button' className='cursor-pointer text-brand hover:underline' onClick={() => query.refetch()}>Retry</button>
      </div>
    );
  }
  return null;
}


function TagServerCounts({ item }: {item: TagDirectoryItem}) {
  const query = useTagServerCountsQuery(item.id);
  const { data } = query;
  return (
    <section>
      <ServersHeading note='Only you and NotSoBot staff can see this'/>
      {(data) ? (
        <>
          <div className='grid grid-cols-2 gap-2'>
            <div className='rounded-md border border-line bg-deep p-3'>
              <p className='text-xs text-subtle'>Servers</p>
              <p className='text-xl font-semibold text-white tabular-nums'>{data.server_count.toLocaleString()}</p>
            </div>
            <div className='rounded-md border border-line bg-deep p-3'>
              <p className='text-xs text-subtle'>Names</p>
              <p className='text-xl font-semibold text-white tabular-nums'>{data.alias_count.toLocaleString()}</p>
            </div>
          </div>
          <p className='mt-2 text-xs text-subtle'>
            {(data.server_count) ? (
              <>
                Added to {data.server_count.toLocaleString()} server{(data.server_count === 1) ? '' : 's'} or DM{(data.server_count === 1) ? '' : 's'}
                {(data.alias_count > data.server_count) ? ', some of them under more than one name' : null}.{' '}
              </>
            ) : 'No servers have added this tag yet. '}
            Which servers added it is kept private.
          </p>
        </>
      ) : <ServersQueryState query={query}/>}
    </section>
  );
}


function TagServersList({ item }: {item: TagDirectoryItem}) {
  const query = useAdminTagServersQuery(item.id);
  const { data } = query;
  const [ filter, setFilter ] = useState('');
  const [ namesOf, setNamesOf ] = useState<TagServer | null>(null);

  const search = filter.trim().toLowerCase();
  const servers = (data && search) ? data.servers.filter((server) => {
    return server.name.toLowerCase().includes(search) || server.id === search || server.names.some((name) => name.includes(search));
  }) : data?.servers;

  return (
    <section>
      <ServersHeading note='Only NotSoBot staff can see this'/>
      {(!data) ? (
        <ServersQueryState query={query}/>
      ) : (!data.servers.length) ? (
        <p className='rounded-md border border-line bg-deep p-3 text-sm text-muted'>
          {(data.other_count) ? 'No servers NotSoBot knows about have added this tag yet.' : 'No servers have added this tag yet.'}
        </p>
      ) : (
        <>
          {(SERVERS_FILTER_MIN < data.servers.length) ? (
            <SearchInput
              className='mb-2'
              value={filter}
              onValueChange={setFilter}
              placeholder='Filter by server, id or tag name'
              aria-label='Filter servers'
            />
          ) : null}
          {(servers?.length) ? (
            <ul className='max-h-72 divide-y divide-line overflow-auto rounded-md border border-line bg-deep'>
              {servers.map((server) => {
                // a lone alias under the original name isn't worth spelling out, anything else is
                const named = (server.names.length > 1 || server.names[0] !== item.tag.name);
                // the name the filter matched, so a server found by one of its other names shows why
                const shown = (search && server.names.find((name) => name.includes(search))) || server.names[0];
                return (
                  <li key={server.id} className='flex items-center gap-3 px-3 py-2'>
                    <GuildIcon guild={server} size={32} className='size-8 rounded-lg text-xs'/>
                    <div className='min-w-0 flex-1'>
                      <p className='truncate text-sm text-white' title={server.name}>{server.name}</p>
                      <p className='truncate text-xs text-subtle'>Added {formatDate(server.added)}</p>
                    </div>
                    {/* tag names can be very long, so the chip caps the one it shows and the dialog has them all */}
                    {(named) ? (
                      <button
                        type='button'
                        className='flex max-w-32 shrink-0 cursor-pointer items-center gap-1 rounded bg-surface-3 px-1.5 py-0.5 text-[11px] text-muted transition-colors hover:text-white sm:max-w-48'
                        title={(server.names.length > 1) ? `Added under ${server.names.length.toLocaleString()} names, click to see them` : `Added as ${shown}`}
                        onClick={() => setNamesOf(server)}
                      >
                        as <span className='truncate font-mono'>{shown}</span>
                        {(server.names.length > 1) ? (
                          <span className='shrink-0 font-medium tabular-nums'>+{(server.names.length - 1).toLocaleString()}</span>
                        ) : null}
                      </button>
                    ) : null}
                    <span className='hidden shrink-0 font-mono text-xs text-subtle sm:block'>{server.id}</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className='rounded-md border border-line bg-deep p-3 text-sm text-muted'>No servers match “{filter.trim()}”.</p>
          )}
        </>
      )}
      {(data && (data.truncated || data.other_count)) ? (
        <p className='mt-2 text-xs text-subtle'>
          {(data.truncated) ? `Showing the ${data.servers.length.toLocaleString()} servers that added it most recently. ` : null}
          {(data.other_count) ? `Also in ${data.other_count.toLocaleString()} DM${(data.other_count === 1) ? '' : 's'} or server${(data.other_count === 1) ? '' : 's'} NotSoBot has no details for.` : null}
        </p>
      ) : null}
      {(namesOf) ? <ServerNamesDialog server={namesOf} onClose={() => setNamesOf(null)}/> : null}
    </section>
  );
}


// Every name a server added the tag under, in full, since its row only fits a shortened one.
function ServerNamesDialog({ server, onClose }: {server: TagServer, onClose: () => void}) {
  const titleId = useId();
  return (
    <Modal labelledBy={titleId} onClose={onClose} className='max-w-md'>
      <div className='p-5 sm:p-6'>
        <h2 id={titleId} className='flex items-center gap-3 pr-10 text-lg font-semibold text-white'>
          <GuildIcon guild={server} size={32} className='size-8 shrink-0 rounded-lg text-xs'/>
          <span className='truncate' title={server.name}>{server.name}</span>
        </h2>
        <p className='mt-2 text-sm text-muted'>
          {(server.names.length > 1) ? `Added the tag ${server.names.length.toLocaleString()} times, under these names. Newest first.` : 'Added the tag under this name.'}
        </p>
        <ul className='mt-4 max-h-80 divide-y divide-line overflow-auto rounded-md border border-line bg-deep'>
          {server.names.map((name) => (
            <li key={name} className='px-3 py-2 font-mono text-sm break-all text-fg'>{name}</li>
          ))}
        </ul>
        <div className='mt-6 flex justify-end'>
          <button type='button' className='btn btn-secondary' onClick={onClose}>Done</button>
        </div>
      </div>
    </Modal>
  );
}


// Owner/staff box in the modal's sidebar: start editing, jump to the dashboard, request verification (owners) or set it (staff).
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
        <Link to={Routes.DASHBOARD_TAG_EDIT.replace(':tagId', item.id)} className='btn btn-ghost mt-2 w-full'>
          Open in dashboard
          <ArrowUpRight className='size-3.5'/>
        </Link>
      ) : null}

      {/* staff who own the tag verify it themselves below */}
      {(access.owner && !access.staff) ? <OwnerVerificationSection item={item} editing={editing}/> : null}

      {(access.staff) ? (
        <div className='mt-4 border-t border-line pt-4'>
          <h4 className='section-label mb-2'>Verification</h4>
          {/* the current status' slot turns into "Mark pending", like the content flags modal, so nothing sits greyed out */}
          <div className='grid gap-2'>
            {VERIFY_SLOTS.map((slot) => {
              const value = (item.verified === slot) ? TagDirectoryVerificationStates.PENDING_VERIFICATION : slot;
              const action = VERIFY_ACTIONS[value];
              return (
                <button key={slot} type='button' className={cn('btn btn-sm', action.className)} disabled={verify.isPending} onClick={() => setVerified(value)}>
                  {(pendingTarget === value) ? <Spinner className='size-4 border-white/40 border-t-white'/> : <action.icon className='size-4'/>}
                  {action.label}
                </button>
              );
            })}
          </div>
          {(verify.isError) ? <InlineError>{errorMessage(verify.error, 'Couldn’t change the verification.')}</InlineError> : null}
          <Link
            to={adminTagDirectoryPath(item.id)}
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


// the owner's side of verification, the same as the dashboard's Directory tab: request it for an unverified listing, or
// cancel a pending request; nothing to do once it's verified. No toasts, the directory isn't inside the dashboard's
// `ToastProvider`, the section switching over shows it worked
function OwnerVerificationSection({ item, editing }: {item: TagDirectoryItem, editing: boolean}) {
  const merge = useMergeIntoDirectoryItem(item.id);
  const request = useRequestMeTagDirectoryVerificationMutation(item.id);
  const cancel = useCancelMeTagDirectoryVerificationMutation(item.id);
  const [ confirming, setConfirming ] = useState(false);

  if (item.verified === TagDirectoryVerificationStates.VERIFIED) {
    return null;
  }
  const pending = item.verified === TagDirectoryVerificationStates.PENDING_VERIFICATION;
  // requesting verification would freeze unsaved listing edits, so it waits until the edit form is closed
  const blocker = (editing) ? 'Save or cancel your listing changes before requesting verification.' : verificationRequirement(item);

  const doRequest = () => {
    request.mutate(undefined, {
      onSuccess: (updated) => {
        merge({verified: updated.verified});
        setConfirming(false);
      },
    });
  };

  const doCancel = () => {
    cancel.mutate(undefined, {
      onSuccess: (updated) => merge({verified: updated.verified}),
    });
  };

  return (
    <div className='mt-4 border-t border-line pt-4'>
      <h4 className='section-label mb-2'>Verification</h4>
      {(pending) ? (
        <>
          <p className='mb-3 text-xs text-subtle'>Waiting for NotSoBot’s team to review it. Canceling unlocks the tag so you can edit it again.</p>
          <button type='button' className='btn btn-danger w-full' disabled={cancel.isPending} onClick={doCancel}>
            <X className='size-4'/>
            {(cancel.isPending) ? 'Canceling…' : 'Cancel request'}
          </button>
          {(cancel.isError) ? <InlineError>{errorMessage(cancel.error, 'Couldn’t cancel the request.')}</InlineError> : null}
        </>
      ) : (
        <>
          <p className='mb-3 text-xs text-subtle'>{blocker ?? 'Ask NotSoBot’s team to review it. Verified tags are marked as safe to run on the directory.'}</p>
          <button type='button' className='btn btn-primary w-full' disabled={!!blocker} onClick={() => setConfirming(true)}>
            <ShieldCheck className='size-4'/>
            Request verification
          </button>
        </>
      )}

      {(confirming) ? (
        <ConfirmDialog
          tone='primary'
          title={`Request verification for “${item.tag.name}”?`}
          description={<VerificationWarning/>}
          confirmLabel='Request verification'
          pending={request.isPending}
          error={(request.isError) ? errorMessage(request.error, 'Couldn’t request verification.') : undefined}
          onConfirm={doRequest}
          onClose={() => {
            setConfirming(false);
            request.reset();
          }}
        />
      ) : null}
    </div>
  );
}


const VERIFY_SLOTS = [ TagDirectoryVerificationStates.VERIFIED, TagDirectoryVerificationStates.NOT_VERIFIED ] as const;

const VERIFY_ACTIONS: Record<number, {label: string, icon: typeof ShieldCheck, className: string}> = {
  [TagDirectoryVerificationStates.VERIFIED]: {label: 'Verify', icon: ShieldCheck, className: 'btn-primary'},
  [TagDirectoryVerificationStates.PENDING_VERIFICATION]: {label: 'Mark pending', icon: Clock, className: 'btn-secondary'},
  [TagDirectoryVerificationStates.NOT_VERIFIED]: {label: 'Reject', icon: ShieldX, className: 'btn-danger'},
};


// Replaces the listing's description/content in the modal while editing. Owners get the title, description, category
// and the "show content publicly" switch; staff get the title, description, category and the content itself, with
// `media` (the thumbnail/media managers, which save on their own) slotted in above the content.
export function ListingEditForm({ item, access, media, onDone }: {item: TagDirectoryItem, access: ListingAccess, media?: ReactNode, onDone: () => void}) {
  const full = useFullContent(item, access);
  // same query `useFullContent` reads, for the tag's archived files
  const admin = useAdminTagDirectoryItemQuery(item.id, {enabled: access.staff});
  const ownerPatch = usePatchMeTagDirectoryMutation(item.id);
  const adminPatch = usePatchAdminTagDirectoryMutation();
  const merge = useMergeIntoDirectoryItem(item.id);
  const [ title, setTitle ] = useState(item.title);
  const [ description, setDescription ] = useState(item.description);
  const [ category, setCategory ] = useState(item.category);
  const [ contentPublic, setContentPublic ] = useState(item.content_public);
  // staff edit the content once it's loaded; null until then (or for owners)
  const [ content, setContent ] = useState<string | null>(null);
  const [ saving, setSaving ] = useState(false);
  const [ error, setError ] = useState<string | null>(null);

  if (access.staff && content === null && full.content !== undefined) {
    setContent(full.content);
  }

  // the owner's API freezes the title, description and category while a review is pending (the switch still works); staff aren't blocked
  const listingFrozen = !access.staff && item.verified === TagDirectoryVerificationStates.PENDING_VERIFICATION;
  const titleChanged = title !== item.title;
  const descriptionChanged = description !== item.description;
  const categoryChanged = category !== item.category;
  const contentChanged = access.staff && content !== null && content !== full.content;
  const contentPublicChanged = access.owner && contentPublic !== item.content_public;
  const dirty = titleChanged || descriptionChanged || categoryChanged || contentChanged || contentPublicChanged;
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
      let changes: Partial<Pick<TagDirectoryItem, 'title' | 'description' | 'category' | 'content_public' | 'verified'>> = {};
      // staff edits go through the admin route (it ignores the pending freeze); only the owner can flip content_public
      if (access.staff && (titleChanged || descriptionChanged || categoryChanged || contentChanged)) {
        const updated = await adminPatch.mutateAsync({
          tagId: item.id,
          title: (titleChanged) ? title : undefined,
          description: (descriptionChanged) ? description : undefined,
          category: (categoryChanged) ? category : undefined,
          content: (contentChanged) ? content! : undefined,
        });
        changes = {title: updated.title, description: updated.description, category: updated.category, verified: updated.verified};
      }
      const ownerBody: TagDirectoryListingInput = {};
      if (access.owner && !access.staff) {
        if (titleChanged) {
          ownerBody.title = title;
        }
        if (descriptionChanged) {
          ownerBody.description = description;
        }
        if (categoryChanged) {
          ownerBody.category = category;
        }
      }
      if (contentPublicChanged) {
        ownerBody.content_public = contentPublic;
      }
      if (Object.keys(ownerBody).length) {
        const updated = await ownerPatch.mutateAsync(ownerBody);
        changes = {
          title: updated.title,
          description: updated.description,
          category: updated.category,
          content_public: updated.content_public,
          verified: updated.verified,
        };
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
          This listing is being reviewed for verification, so its title, description and category can’t change until the review finishes.
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
          <DescriptionEditor
            {...props}
            className='input min-h-32 resize-y leading-relaxed'
            maxLength={TAG_DIRECTORY_DESCRIPTION_MAX}
            value={description}
            disabled={listingFrozen || saving}
            onChange={setDescription}
          />
        )}
      </Field>
      <Field label='Category' hint='Where the tag shows up when people browse the directory by category.'>
        {(props) => <CategorySelect {...props} value={category} disabled={listingFrozen || saving} onChange={setCategory}/>}
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

      {media}

      {(access.staff) ? (
        <>
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
          {/* archiving a link that's in the content swaps it for the permanent one in the draft, saved with the listing */}
          {(admin.data) ? (
            <TagAssetsPanel
              tagId={item.id}
              assets={admin.data.tag.assets ?? []}
              className=''
              onArchived={(asset, sourceUrl) => {
                if (sourceUrl) {
                  setContent((current) => current?.replaceAll(sourceUrl, asset.urls.cdn) ?? current);
                }
              }}
            />
          ) : null}
        </>
      ) : (
        <p className='text-xs text-subtle'>
          To change the tag’s content, edit it in your{' '}
          <Link to={Routes.DASHBOARD_TAG_EDIT.replace(':tagId', item.id)} className='text-brand hover:underline'>dashboard</Link>
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
