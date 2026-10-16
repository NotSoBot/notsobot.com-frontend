import { ArrowUpRight, BookOpen, Info, PencilLine, Send, ShieldCheck, Undo2, Upload, X } from 'lucide-react';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router';

import { useAuth } from '@/auth';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import {
  TAG_DIRECTORY_DESCRIPTION_MAX,
  TAG_DIRECTORY_TITLE_MAX,
  TagDirectoryCategories,
  TagDirectoryEditRequestStatuses,
  TagDirectoryVerificationStates,
  type Tag,
  type TagDirectoryCategory,
  type TagDirectoryEditRequest,
  type TagDirectoryItem,
} from '@/lib/api';
import {
  errorMessage,
  useCancelMeTagDirectoryVerificationMutation,
  useMeGuildsQuery,
  useMeTagDirectoryEditRequestMutation,
  useMeTagDirectoryQuery,
  usePatchMeTagDirectoryMutation,
  usePublishMeTagDirectoryMutation,
  useRequestMeTagDirectoryVerificationMutation,
} from '@/lib/api/dashboardQueries';
import { formatDate, formatDateTime } from '@/lib/utils';
import { CategorySelect, tagDirectoryItemPath, VerificationBadge, verificationInfo, verificationRequirement, VerificationWarning } from '@/pages/tags/tagDirectory';
import { MediaSection, ThumbnailManager } from '@/pages/tags/TagMedia';

import { CharCounter, ErrorPanel, Field, InlineError, Panel, PanelSkeleton, SaveBar, Toggle } from '../ui';
import { describeTagLocation, TAG_CONTENT_MAX, tagLocation } from './tagMeta';


// The "Directory" tab of the tag editor: publish the tag, or edit its listing once it's published.
// The title, description, category and whether the content is shown publicly are editable here, and the media while
// verification is pending.
export function TagDirectoryPanel({ tag, onDirtyChange }: {tag: Tag, onDirtyChange: (dirty: boolean) => void}) {
  const { data: directory, isPending, isError, error, refetch, isRefetching } = useMeTagDirectoryQuery(tag.id);
  // requesting verification would freeze unsaved listing edits, so the request waits until they're saved or discarded
  const [ listingDirty, setListingDirty ] = useState(false);
  const onListingDirtyChange = useCallback((dirty: boolean) => {
    setListingDirty(dirty);
    onDirtyChange(dirty);
  }, [onDirtyChange]);

  if (isPending) {
    return <PanelSkeleton rows={3}/>;
  }
  if (isError) {
    return <ErrorPanel title='Couldn’t load the directory listing' message={errorMessage(error)} onRetry={() => refetch()} retrying={isRefetching}/>;
  }
  if (!directory) {
    return <PublishForm tag={tag} onDirtyChange={onDirtyChange}/>;
  }
  // a verified listing's open change request takes over the thumbnail and media panels, they edit its proposal
  const verified = directory.verified === TagDirectoryVerificationStates.VERIFIED;
  const request = (verified && directory.edit_request && isOpenEditRequest(directory.edit_request)) ? directory.edit_request : null;
  const manage = {
    tagId: tag.id,
    verified: directory.verified,
    editRequest: (request) ? {status: request.status, thumbnailMode: request.thumbnail_mode, liveThumbnail: directory.thumbnail} : undefined,
  };
  return (
    <div className='space-y-4'>
      <VerificationPanel tag={tag} directory={directory} listingDirty={listingDirty}/>
      <ListingForm key={directory.id} tag={tag} directory={directory} onDirtyChange={onListingDirtyChange}/>
      {(verified) ? <EditRequestPanel tag={tag} directory={directory}/> : null}
      <Panel
        title={(request) ? 'Thumbnail · proposed' : 'Thumbnail'}
        description={(request) ?
          'The thumbnail your change request asks for. The listing keeps its current one until staff approve it.' :
          'The small picture on the directory card. Images and videos are shrunk to a small PNG (videos use their first frame). Without one, the cover is used.'}
      >
        <ThumbnailManager
          key={(request) ? `request-${request.id}` : 'listing'}
          assets={(request) ? request.assets : directory.assets}
          thumbnail={(request) ? request.thumbnail : directory.thumbnail}
          manage={manage}
        />
      </Panel>
      <Panel
        title={(request) ? 'Media · proposed' : 'Media'}
        description={(request) ?
          'The media your change request asks for, in order. The first one is the cover on the directory.' :
          'Images, videos or audio that show what the tag does. The first one is the cover on the directory.'}
      >
        <MediaSection
          key={(request) ? `request-${request.id}` : 'listing'}
          assets={(request) ? request.assets : directory.assets}
          nsfw={false}
          tagName={tag.name}
          manage={manage}
          headingClassName='sr-only'
        />
      </Panel>
    </div>
  );
}


function ListingFields({ title, description, category, contentPublic, onTitle, onDescription, onCategory, onContentPublic, disabled = false }: {
  title: string,
  description: string,
  category: TagDirectoryCategory,
  contentPublic: boolean,
  onTitle: (value: string) => void,
  onDescription: (value: string) => void,
  onCategory: (value: TagDirectoryCategory) => void,
  onContentPublic: (value: boolean) => void,
  disabled?: boolean,
}) {
  return (
    <div className='grid grid-cols-1 gap-y-5'>
      <Field
        label='Title'
        hint='A short line shown under the tag name, e.g. “Rolls dice with modifiers”. Optional.'
        counter={<CharCounter length={title.length} max={TAG_DIRECTORY_TITLE_MAX}/>}
      >
        {(props) => (
          <input
            {...props}
            className='input'
            maxLength={TAG_DIRECTORY_TITLE_MAX}
            value={title}
            disabled={disabled}
            onChange={(event) => onTitle(event.target.value)}
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
            disabled={disabled}
            onChange={(event) => onDescription(event.target.value)}
          />
        )}
      </Field>
      <Field label='Category' hint='Where the tag shows up when people browse the directory by category.'>
        {(props) => <CategorySelect {...props} value={category} disabled={disabled} onChange={onCategory}/>}
      </Field>
      <Toggle
        label='Show content publicly'
        description='Anyone browsing the directory can read the tag’s content. Hidden by default.'
        checked={contentPublic}
        disabled={disabled}
        onChange={onContentPublic}
      />
    </div>
  );
}


function PublishForm({ tag, onDirtyChange }: {tag: Tag, onDirtyChange: (dirty: boolean) => void}) {
  const { user } = useAuth();
  const { data: guilds } = useMeGuildsQuery();
  const toast = useToast();
  const publish = usePublishMeTagDirectoryMutation(tag.id);
  const [ title, setTitle ] = useState('');
  const [ description, setDescription ] = useState('');
  const [ category, setCategory ] = useState<TagDirectoryCategory>(TagDirectoryCategories.OTHER);
  const [ contentPublic, setContentPublic ] = useState(false);
  const [ confirming, setConfirming ] = useState(false);

  const dirty = !!(title || description || contentPublic) || category !== TagDirectoryCategories.OTHER;
  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);
  useEffect(() => () => onDirtyChange(false), [onDirtyChange]);

  const isAlias = !!tag.reference_tag;
  // publishing moves the tag into the owner's personal tags (the API sets server_id to the owner's id) and leaves an
  // alias of it in the server, DM or group DM it came from
  const guildNames = new Map((guilds ?? []).map((guild) => [guild.id, guild.name]));
  const location = tagLocation(tag, user, guildNames);
  const movesOutOfServer = location.kind === 'server' || location.kind === 'dm' || location.kind === 'group_dm';
  const serverLabel = describeTagLocation(location);

  const doPublish = () => {
    publish.mutate({title, description, category, content_public: contentPublic}, {
      onSuccess: () => {
        setConfirming(false);
        onDirtyChange(false);
        toast(`“${tag.name}” is now on the tag directory.`);
      },
    });
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (isAlias || publish.isPending) {
      return;
    }
    if (movesOutOfServer) {
      setConfirming(true);
    } else {
      doPublish();
    }
  };

  // the confirm dialog has its own form, so it sits next to this one rather than inside it (no nested forms)
  return (
    <>
      <form onSubmit={onSubmit}>
        <Panel
          title='Publish to the tag directory'
          accent='#3ba55c'
          description='List this tag publicly so anyone can find it and add it to their own servers.'
        >
          <ul className='mb-5 space-y-1.5 text-sm text-muted'>
            <li className='flex gap-2'><BookOpen aria-hidden className='mt-0.5 size-4 shrink-0 text-subtle'/>The listing shows the tag’s name, the title and description below, its uses and you as the creator. The tag’s content itself is only shown if you turn on “Show content publicly”.</li>
            <li className='flex gap-2'><Info aria-hidden className='mt-0.5 size-4 shrink-0 text-subtle'/>Listings start unverified. Once it’s published you can request verification from NotSoBot’s team, which locks the tag while it’s reviewed and after it’s verified.</li>
          </ul>

          {(isAlias) ? (
            <p className='mb-5 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-fg'>
              This tag is an alias of “{tag.reference_tag!.name}”, and aliases can’t be published. Publish the original tag instead.
            </p>
          ) : (movesOutOfServer) ? (
            <p className='mb-5 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-fg'>
              Publishing moves this tag into your personal tags and leaves an alias with the same name in{' '}
              <span className='font-medium text-white'>{serverLabel}</span>, so it keeps working there.
            </p>
          ) : null}

          <ListingFields
            title={title}
            description={description}
            category={category}
            contentPublic={contentPublic}
            onTitle={setTitle}
            onDescription={setDescription}
            onCategory={setCategory}
            onContentPublic={setContentPublic}
            disabled={isAlias}
          />

          {(publish.isError && !confirming) ? <InlineError>{errorMessage(publish.error, 'Couldn’t publish this tag.')}</InlineError> : null}

          <div className='mt-5 flex justify-end border-t border-line pt-4'>
            <button type='submit' className='btn btn-primary' disabled={isAlias || publish.isPending}>
              <Upload className='size-4'/>
              {(publish.isPending) ? 'Publishing…' : 'Publish to directory'}
            </button>
          </div>
        </Panel>
      </form>

      {(confirming) ? (
        <ConfirmDialog
          tone='primary'
          title={`Publish “${tag.name}”?`}
          description={<>This moves the tag into your personal tags, leaves an alias of it in <span className='font-medium text-white'>{serverLabel}</span> and lists it on the tag directory.</>}
          confirmLabel='Publish'
          pending={publish.isPending}
          error={(publish.isError) ? errorMessage(publish.error, 'Couldn’t publish this tag.') : undefined}
          onConfirm={doPublish}
          onClose={() => {
            setConfirming(false);
            publish.reset();
          }}
        />
      ) : null}
    </>
  );
}


function ListingForm({ tag, directory, onDirtyChange }: {
  tag: Tag,
  directory: TagDirectoryItem,
  onDirtyChange: (dirty: boolean) => void,
}) {
  const toast = useToast();
  const patch = usePatchMeTagDirectoryMutation(tag.id);
  const [ title, setTitle ] = useState(directory.title);
  const [ description, setDescription ] = useState(directory.description);
  const [ category, setCategory ] = useState(directory.category);
  const [ contentPublic, setContentPublic ] = useState(directory.content_public);

  const pending = directory.verified === TagDirectoryVerificationStates.PENDING_VERIFICATION;
  const dirty = !pending && (
    title !== directory.title || description !== directory.description || category !== directory.category || contentPublic !== directory.content_public
  );
  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);
  useEffect(() => () => onDirtyChange(false), [onDirtyChange]);

  const discard = () => {
    setTitle(directory.title);
    setDescription(directory.description);
    setCategory(directory.category);
    setContentPublic(directory.content_public);
    patch.reset();
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!dirty || patch.isPending) {
      return;
    }
    patch.mutate({title, description, category, content_public: contentPublic}, {
      onSuccess: (updated) => {
        setTitle(updated.title);
        setDescription(updated.description);
        setCategory(updated.category);
        setContentPublic(updated.content_public);
        onDirtyChange(false);
        toast('Directory listing saved.');
      },
    });
  };

  return (
    <form onSubmit={onSubmit}>
      <Panel
        title='Directory listing'
        accent='#3ba55c'
        description={verificationInfo(directory.verified).description}
        actions={(
          <Link to={tagDirectoryItemPath(directory.id)} className='btn btn-secondary btn-sm'>
            View in directory
            <ArrowUpRight className='size-3.5'/>
          </Link>
        )}
        readOnly={(pending) ? 'This listing is being reviewed for verification, so it can’t be edited until the review finishes.' : undefined}
      >
        <div className='mb-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-subtle'>
          <VerificationBadge verified={directory.verified}/>
          <span title={formatDateTime(directory.created)}>Listed {formatDate(directory.created)}</span>
          {(directory.edited) ? <span title={formatDateTime(directory.edited)}>Listing edited {formatDate(directory.edited)}</span> : null}
          <span className='tabular-nums'>{directory.server_count.toLocaleString()} servers</span>
        </div>

        <ListingFields
          title={title}
          description={description}
          category={category}
          contentPublic={contentPublic}
          onTitle={setTitle}
          onDescription={setDescription}
          onCategory={setCategory}
          onContentPublic={setContentPublic}
          disabled={pending}
        />

        {(patch.isError) ? <InlineError>{errorMessage(patch.error, 'Couldn’t save the listing.')}</InlineError> : null}
        {(!pending) ? (
          <SaveBar
            dirty={dirty}
            pending={patch.isPending}
            onDiscard={discard}
            saveLabel='Save listing'
            status={(patch.isPending) ? <span className='text-muted'>Saving…</span> : undefined}
          />
        ) : null}
      </Panel>
    </form>
  );
}


// request verification for an unverified listing, or cancel a pending request; nothing to do once it's verified
function VerificationPanel({ tag, directory, listingDirty }: {tag: Tag, directory: TagDirectoryItem, listingDirty: boolean}) {
  const toast = useToast();
  const request = useRequestMeTagDirectoryVerificationMutation(tag.id);
  const cancel = useCancelMeTagDirectoryVerificationMutation(tag.id);
  const [ confirming, setConfirming ] = useState(false);

  if (directory.verified === TagDirectoryVerificationStates.VERIFIED) {
    return null;
  }
  const pending = directory.verified === TagDirectoryVerificationStates.PENDING_VERIFICATION;
  // why the request can't be sent yet, shown next to the button
  const blocker = (listingDirty) ? 'Save or discard your listing changes before requesting verification.' : verificationRequirement(directory);

  const doRequest = () => {
    request.mutate(undefined, {
      onSuccess: () => {
        setConfirming(false);
        toast(`Requested verification for “${tag.name}”.`);
      },
    });
  };

  const doCancel = () => {
    cancel.mutate(undefined, {
      onSuccess: () => toast(`Canceled the verification request for “${tag.name}”.`),
    });
  };

  return (
    <>
      <Panel
        title='Verification'
        accent='#3ba55c'
        description={(pending) ?
          'Your verification request is waiting for NotSoBot’s team. The tag’s content stays locked until it’s reviewed or you cancel the request.' :
          'Ask NotSoBot’s team to review this tag. Verified tags are marked as safe to run on the directory.'}
      >
        <div className='text-sm text-muted'>
          {(pending) ? (
            <p>Once it’s verified, NotSoBot staff may change its content to make it more efficient and may move its media onto NotSoBot’s own servers.</p>
          ) : (
            <VerificationWarning/>
          )}
        </div>
        {(pending) ? (
          <div className='mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4'>
            <p className='text-sm text-subtle'>Canceling unlocks the tag so you can edit it again. You can request verification again later.</p>
            <button type='button' className='btn btn-danger btn-sm shrink-0' disabled={cancel.isPending} onClick={doCancel}>
              <X className='size-3.5'/>
              {(cancel.isPending) ? 'Canceling…' : 'Cancel request'}
            </button>
          </div>
        ) : (
          <div className='mt-4 flex flex-wrap items-center justify-end gap-3 border-t border-line pt-4'>
            {(blocker) ? <p className='mr-auto text-sm text-subtle'>{blocker}</p> : null}
            <button
              type='button'
              className='btn btn-primary btn-sm shrink-0'
              disabled={!!blocker}
              title={blocker ?? undefined}
              onClick={() => setConfirming(true)}
            >
              <ShieldCheck className='size-3.5'/>
              Request verification
            </button>
          </div>
        )}
        {(cancel.isError) ? <InlineError>{errorMessage(cancel.error, 'Couldn’t cancel the request.')}</InlineError> : null}
      </Panel>

      {(confirming) ? (
        <ConfirmDialog
          tone='primary'
          title={`Request verification for “${tag.name}”?`}
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
    </>
  );
}


function isOpenEditRequest(request: TagDirectoryEditRequest): boolean {
  return request.status === TagDirectoryEditRequestStatuses.DRAFT || request.status === TagDirectoryEditRequestStatuses.PENDING;
}

// A verified listing's content, media and thumbnail are locked, so the owner drafts the changes they want here and
// NotSoBot staff approve or reject them. The thumbnail/media panels edit the draft's proposal while one is open.
function EditRequestPanel({ tag, directory }: {tag: Tag, directory: TagDirectoryItem}) {
  const toast = useToast();
  const mutation = useMeTagDirectoryEditRequestMutation(tag.id);
  const [ discarding, setDiscarding ] = useState(false);
  const request = directory.edit_request ?? null;
  const open = !!request && isOpenEditRequest(request);

  if (!request || !open) {
    return (
      <Panel
        title='Request changes'
        accent='#3ba55c'
        description='This listing is verified, so its content, media and thumbnail are locked. Draft the changes you want and NotSoBot staff will review them. The listing stays as it is until they’re approved.'
        actions={(
          <button type='button' className='btn btn-primary btn-sm' disabled={mutation.isPending} onClick={() => mutation.mutate({start: true})}>
            <PencilLine className='size-3.5'/>
            {(mutation.isPending) ? 'Starting…' : 'Request changes'}
          </button>
        )}
      >
        {(request?.status === TagDirectoryEditRequestStatuses.REJECTED) ? (
          <div className='rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-fg'>
            <p className='font-medium'>Your last change request was rejected{(request.reviewed) ? ` on ${formatDate(request.reviewed)}` : ''}.</p>
            {(request.reason) ? <p className='mt-1 whitespace-pre-wrap text-muted'>{request.reason}</p> : null}
          </div>
        ) : (request?.status === TagDirectoryEditRequestStatuses.APPROVED) ? (
          <p className='text-sm text-muted'>Your last change request was approved{(request.reviewed) ? ` on ${formatDate(request.reviewed)}` : ''}.</p>
        ) : (
          <p className='text-sm text-muted'>Title, description, category and whether the content is public can still be changed above without a request.</p>
        )}
        {(mutation.isError) ? <InlineError>{errorMessage(mutation.error, 'Couldn’t start a change request.')}</InlineError> : null}
      </Panel>
    );
  }

  return (
    <>
      {(request.status === TagDirectoryEditRequestStatuses.DRAFT) ? (
        <EditRequestDraft key={request.id} tag={tag} request={request} onDiscard={() => setDiscarding(true)}/>
      ) : (
        <Panel
          title='Change request'
          accent='#faa61a'
          description={`Waiting for NotSoBot staff to review it${(request.submitted) ? `, submitted ${formatDateTime(request.submitted)}` : ''}. The listing stays as it is until it’s approved.`}
        >
          <dl className='space-y-3 text-sm'>
            <div>
              <dt className='text-subtle'>Note for staff</dt>
              <dd className='mt-0.5 whitespace-pre-wrap text-fg'>{request.note || <span className='text-subtle italic'>(none)</span>}</dd>
            </div>
            <div>
              <dt className='text-subtle'>Content</dt>
              <dd className='mt-0.5 text-fg'>{(request.content !== null) ? 'Changes the tag’s content.' : 'Leaves the content as it is.'}</dd>
            </div>
          </dl>
          <div className='mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4'>
            <p className='text-sm text-subtle'>Withdraw it to make more changes, then submit it again.</p>
            <div className='flex flex-wrap gap-2'>
              <button
                type='button'
                className='btn btn-secondary btn-sm'
                disabled={mutation.isPending}
                onClick={() => mutation.mutate({withdraw: true})}
              >
                <Undo2 className='size-3.5'/>
                Withdraw to edit
              </button>
              <button type='button' className='btn btn-danger btn-sm' disabled={mutation.isPending} onClick={() => setDiscarding(true)}>
                <X className='size-3.5'/>
                Cancel request
              </button>
            </div>
          </div>
          {(mutation.isError) ? <InlineError>{errorMessage(mutation.error, 'Couldn’t update the change request.')}</InlineError> : null}
        </Panel>
      )}

      {(discarding) ? (
        <ConfirmDialog
          title='Cancel this change request?'
          description='Its note, content and anything uploaded for it are deleted. The listing isn’t affected.'
          confirmLabel='Cancel request'
          pending={mutation.isPending}
          error={(mutation.isError) ? errorMessage(mutation.error, 'Couldn’t cancel the change request.') : undefined}
          onConfirm={() => mutation.mutate({discard: true}, {
            onSuccess: () => {
              setDiscarding(false);
              toast(`Canceled the change request for “${tag.name}”.`);
            },
          })}
          onClose={() => {
            setDiscarding(false);
            mutation.reset();
          }}
        />
      ) : null}
    </>
  );
}


function EditRequestDraft({ tag, request, onDiscard }: {tag: Tag, request: TagDirectoryEditRequest, onDiscard: () => void}) {
  const toast = useToast();
  const mutation = useMeTagDirectoryEditRequestMutation(tag.id);
  const [ note, setNote ] = useState(request.note);
  const [ content, setContent ] = useState(request.content ?? tag.content);
  const savedContent = request.content ?? tag.content;
  const dirty = note !== request.note || content !== savedContent;
  const invalid = !content.trim() || TAG_CONTENT_MAX < content.length || TAG_DIRECTORY_DESCRIPTION_MAX < note.length;

  // the current content means "leave it", so it isn't sent as a change
  const patch = () => ({note, content: (content === tag.content) ? null : content});

  const save = async () => {
    await mutation.mutateAsync({patch: patch()});
    toast('Saved the change request draft.');
  };

  const submit = async () => {
    if (dirty) {
      await mutation.mutateAsync({patch: patch()});
    }
    await mutation.mutateAsync({submit: true});
    toast(`Sent the change request for “${tag.name}” to NotSoBot staff.`);
  };

  const run = (action: () => Promise<void>) => {
    // the error shows under the form
    action().catch(() => undefined);
  };

  return (
    <Panel
      title='Change request'
      accent='#5865f2'
      description='A draft only you can see. Change the content here, and the thumbnail and media below, then submit it for NotSoBot staff to review.'
    >
      <div className='grid grid-cols-1 gap-y-5'>
        <Field
          label='Note for staff'
          hint='What you’re changing and why. Optional, but it helps the review.'
          counter={<CharCounter length={note.length} max={TAG_DIRECTORY_DESCRIPTION_MAX}/>}
        >
          {(props) => (
            <textarea
              {...props}
              className='input min-h-20 resize-y leading-relaxed'
              maxLength={TAG_DIRECTORY_DESCRIPTION_MAX}
              value={note}
              disabled={mutation.isPending}
              onChange={(event) => setNote(event.target.value)}
            />
          )}
        </Field>
        <Field
          label='Content'
          hint={(content === tag.content) ? 'Same as the tag’s content now, so it won’t change.' : 'Replaces the tag’s content once the request is approved.'}
          counter={<CharCounter length={content.length} max={TAG_CONTENT_MAX}/>}
        >
          {(props) => (
            <textarea
              {...props}
              className='input resize-y font-mono text-sm leading-relaxed'
              rows={Math.min(16, Math.max(5, content.split('\n').length + 1))}
              maxLength={TAG_CONTENT_MAX}
              value={content}
              disabled={mutation.isPending}
              onChange={(event) => setContent(event.target.value)}
            />
          )}
        </Field>
      </div>
      {(content !== tag.content) ? (
        <button type='button' className='mt-2 cursor-pointer text-xs text-brand hover:underline' onClick={() => setContent(tag.content)}>
          Reset to the current content
        </button>
      ) : null}

      <div className='mt-5 flex flex-col-reverse gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between'>
        <button type='button' className='btn btn-ghost btn-sm text-danger sm:self-center' disabled={mutation.isPending} onClick={onDiscard}>
          <X className='size-3.5'/>
          Discard draft
        </button>
        <div className='flex flex-wrap gap-2 sm:justify-end'>
          <button type='button' className='btn btn-secondary btn-sm' disabled={!dirty || invalid || mutation.isPending} onClick={() => run(save)}>
            Save draft
          </button>
          <button type='button' className='btn btn-primary btn-sm' disabled={invalid || mutation.isPending} onClick={() => run(submit)}>
            <Send className='size-3.5'/>
            {(mutation.isPending) ? 'Sending…' : 'Submit for review'}
          </button>
        </div>
      </div>
      {(mutation.isError) ? <InlineError>{errorMessage(mutation.error, 'Couldn’t update the change request.')}</InlineError> : null}
    </Panel>
  );
}
