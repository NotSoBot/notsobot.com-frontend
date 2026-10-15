import { ArrowUpRight, BookOpen, Info, ShieldCheck, Upload, X } from 'lucide-react';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router';

import { useAuth } from '@/auth';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import {
  TAG_DIRECTORY_DESCRIPTION_MAX,
  TAG_DIRECTORY_TITLE_MAX,
  TagDirectoryCategories,
  TagDirectoryVerificationStates,
  type Tag,
  type TagDirectoryCategory,
  type TagDirectoryItem,
} from '@/lib/api';
import {
  errorMessage,
  useCancelMeTagDirectoryVerificationMutation,
  useMeGuildsQuery,
  useMeTagDirectoryQuery,
  usePatchMeTagDirectoryMutation,
  usePublishMeTagDirectoryMutation,
  useRequestMeTagDirectoryVerificationMutation,
} from '@/lib/api/dashboardQueries';
import { formatDate, formatDateTime } from '@/lib/utils';
import { CategorySelect, tagDirectoryItemPath, VerificationBadge, verificationInfo } from '@/pages/tags/tagDirectory';

import { CharCounter, ErrorPanel, Field, InlineError, Panel, PanelSkeleton, SaveBar, Toggle } from '../ui';
import { describeTagLocation, tagLocation } from './tagMeta';


// The "Directory" tab of the tag editor: publish the tag, or edit its listing once it's published.
// The title, description, category and whether the content is shown publicly are editable here; images aren't supported yet.
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
  return (
    <div className='space-y-4'>
      <ListingForm key={directory.id} tag={tag} directory={directory} onDirtyChange={onListingDirtyChange}/>
      <VerificationPanel tag={tag} directory={directory} listingDirty={listingDirty}/>
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
  // publishing moves the tag into the owner's personal tags (the API sets server_id to the owner's id), so a
  // server, DM or group DM tag stops being one there
  const guildNames = new Map((guilds ?? []).map((guild) => [guild.id, guild.name]));
  const location = tagLocation(tag, user, guildNames);
  const movesOutOfServer = location.kind === 'server' || location.kind === 'dm' || location.kind === 'group_dm';
  const serverLabel = describeTagLocation(location);
  const stopsBeing = (location.kind === 'server') ? 'a tag in that server' : (location.kind === 'dm') ? 'a tag in your DM' : 'a tag in that group DM';

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
              Publishing moves this tag out of <span className='font-medium text-white'>{serverLabel}</span> into your personal
              tags, so it stops being {stopsBeing}.
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
          description={<>This moves the tag out of <span className='font-medium text-white'>{serverLabel}</span> into your personal tags and lists it on the tag directory.</>}
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


// what requesting verification means, shown before confirming (the bot's `/tag directory verify` says the same)
function VerificationWarning() {
  return (
    <ul className='list-disc space-y-1.5 pl-5'>
      <li>Requesting verification locks the tag’s content, so it can’t be edited while the review is pending or after it’s verified.</li>
      <li>If it’s verified, NotSoBot staff may change its content to make it more efficient, and may move its media onto NotSoBot’s own servers.</li>
      <li>You can cancel the request while it’s still pending.</li>
    </ul>
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
        actions={(pending) ? (
          <button type='button' className='btn btn-secondary btn-sm' disabled={cancel.isPending} onClick={doCancel}>
            <X className='size-3.5'/>
            {(cancel.isPending) ? 'Canceling…' : 'Cancel request'}
          </button>
        ) : (
          <button
            type='button'
            className='btn btn-primary btn-sm'
            disabled={listingDirty}
            title={(listingDirty) ? 'Save or discard your listing changes first.' : undefined}
            onClick={() => setConfirming(true)}
          >
            <ShieldCheck className='size-3.5'/>
            Request verification
          </button>
        )}
      >
        <div className='text-sm text-muted'>
          {(pending) ? (
            <p>Once it’s verified, NotSoBot staff may change its content to make it more efficient and may move its media onto NotSoBot’s own servers.</p>
          ) : (
            <VerificationWarning/>
          )}
        </div>
        {(listingDirty && !pending) ? <p className='mt-3 text-sm text-subtle'>Save or discard your listing changes before requesting verification.</p> : null}
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
