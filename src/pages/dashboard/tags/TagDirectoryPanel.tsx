import { ArrowUpRight, BookOpen, Info, Upload } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router';

import { useAuth } from '@/auth';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import {
  TAG_DIRECTORY_DESCRIPTION_MAX,
  TAG_DIRECTORY_TITLE_MAX,
  TagDirectoryVerificationStates,
  type Tag,
  type TagDirectoryItem,
} from '@/lib/api';
import {
  errorMessage,
  useMeGuildsQuery,
  useMeTagDirectoryQuery,
  usePatchMeTagDirectoryMutation,
  usePublishMeTagDirectoryMutation,
} from '@/lib/api/dashboardQueries';
import { formatDate, formatDateTime } from '@/lib/utils';
import { tagDirectoryItemPath, VerificationBadge, verificationInfo } from '@/pages/tags/tagDirectory';

import { CharCounter, ErrorPanel, Field, InlineError, Panel, PanelSkeleton, SaveBar } from '../ui';
import { describeTagLocation, tagLocation } from './tagMeta';


// The "Directory" tab of the tag editor: publish the tag, or edit its listing once it's published.
// Only the title and description are editable here; images aren't supported yet.
export function TagDirectoryPanel({ tag, onDirtyChange }: {tag: Tag, onDirtyChange: (dirty: boolean) => void}) {
  const { data: directory, isPending, isError, error, refetch, isRefetching } = useMeTagDirectoryQuery(tag.id);

  if (isPending) {
    return <PanelSkeleton rows={3}/>;
  }
  if (isError) {
    return <ErrorPanel title='Couldn’t load the directory listing' message={errorMessage(error)} onRetry={() => refetch()} retrying={isRefetching}/>;
  }
  if (!directory) {
    return <PublishForm tag={tag} onDirtyChange={onDirtyChange}/>;
  }
  return <ListingForm key={directory.id} tag={tag} directory={directory} onDirtyChange={onDirtyChange}/>;
}


function ListingFields({ title, description, onTitle, onDescription, disabled = false }: {
  title: string,
  description: string,
  onTitle: (value: string) => void,
  onDescription: (value: string) => void,
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
  const [ confirming, setConfirming ] = useState(false);

  const dirty = !!(title || description);
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
    publish.mutate({title, description}, {
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
            <li className='flex gap-2'><BookOpen aria-hidden className='mt-0.5 size-4 shrink-0 text-subtle'/>The listing shows the tag’s name, the title and description below, its uses and you as the creator. The tag’s content itself isn’t shown.</li>
            <li className='flex gap-2'><Info aria-hidden className='mt-0.5 size-4 shrink-0 text-subtle'/>Listings start unverified. NotSoBot’s team can verify safe tags, and a listing can’t be edited while it’s being reviewed.</li>
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

          <ListingFields title={title} description={description} onTitle={setTitle} onDescription={setDescription} disabled={isAlias}/>

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

  const pending = directory.verified === TagDirectoryVerificationStates.PENDING_VERIFICATION;
  const dirty = !pending && (title !== directory.title || description !== directory.description);
  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);
  useEffect(() => () => onDirtyChange(false), [onDirtyChange]);

  const discard = () => {
    setTitle(directory.title);
    setDescription(directory.description);
    patch.reset();
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!dirty || patch.isPending) {
      return;
    }
    patch.mutate({title, description}, {
      onSuccess: (updated) => {
        setTitle(updated.title);
        setDescription(updated.description);
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

        <ListingFields title={title} description={description} onTitle={setTitle} onDescription={setDescription} disabled={pending}/>

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
