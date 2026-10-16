import { AlertTriangle, ArrowLeft, BookOpen, Trash2, Upload } from 'lucide-react';
import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';

import { isStaff, useAuth } from '@/auth';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { Routes } from '@/config';
import { ApiErrorCodes, ApiRequestError, type Tag, type TagStorageScope } from '@/lib/api';
import { errorMessage, useDeleteMeTagMutation, useMeGuildsQuery, useMeTagDirectoryQuery, useMeTagQuery, usePatchMeTagMutation } from '@/lib/api/dashboardQueries';
import { cn, formatDate, formatDateTime } from '@/lib/utils';

import { CharCounter, Field, InlineError, Panel, PanelSkeleton, ReadOnlyNote, SaveBar, Skeleton, Toggle, UnsavedChangesGuard } from '../ui';
import { CodeEditor } from './CodeEditor';
import { TagBlobsEditor } from './TagBlobsEditor';
import { TagDirectoryPanel } from './TagDirectoryPanel';
import { dashboardTagEditPath, TAG_CONTENT_MAX, TAG_NAME_MAX, TagBadges, tagLocation, TagLocationChip, tagServerPath } from './tagMeta';
import { StorageScopeForm } from './StorageScopeForm';
import { TagVariablesEditor } from './TagVariablesEditor';


const TABS = [
  {id: 'content', label: 'Content'},
  {id: 'variables', label: 'Variables'},
  {id: 'blobs', label: 'Blobs'},
  {id: 'directory', label: 'Directory'},
] as const;
type TabId = (typeof TABS)[number]['id'];


const TITLE_ID = 'dashboard-tag-editor-title';


// One of your tags' editor over the tag list (`/dashboard/tags/:tagId/edit`). Closing it, or going back to the tag's
// details (`onBack`), with unsaved edits asks first (`UnsavedChangesGuard`, the url leaves the editor's path).
export function TagEditorModal({ tagId, onBack, onClose }: {tagId: string, onBack: (id: string) => void, onClose: () => void}) {
  const { data: tag, isPending, isError, error, refetch, isRefetching } = useMeTagQuery(tagId);
  const notFound = error instanceof ApiRequestError && (error.status === 404 || error.code === ApiErrorCodes.UNKNOWN_TAG);

  return (
    <Modal labelledBy={TITLE_ID} onClose={onClose}>
      {(tag) ? (
        // keyed so switching tags starts with a clean form
        <TagEditor key={tag.id} tag={tag} onBack={onBack}/>
      ) : (isPending) ? (
        <TagEditorSkeleton/>
      ) : (
        <div className='px-6 py-16 text-center'>
          <AlertTriangle className='mx-auto mb-4 size-14 text-danger'/>
          <h2 id={TITLE_ID} className='mb-3 text-2xl font-bold text-white'>{(notFound) ? 'Tag not found' : 'Couldn’t load this tag'}</h2>
          <p className='mb-6 text-muted'>{(notFound) ? 'It may have been deleted, or it belongs to someone else.' : errorMessage(error)}</p>
          {(isError && !notFound) ? <button type='button' className='btn btn-secondary' disabled={isRefetching} onClick={() => refetch()}>Retry</button> : null}
        </div>
      )}
    </Modal>
  );
}


function TagEditor({ tag, onBack }: {tag: Tag, onBack: (id: string) => void}) {
  const { user } = useAuth();
  const [ searchParams, setSearchParams ] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const tab: TabId = (TABS.some((item) => item.id === tabParam)) ? tabParam as TabId : 'content';
  const tabsId = useId();

  const setTab = (value: TabId) => {
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      if (value === 'content') {
        next.delete('tab');
      } else {
        next.set('tab', value);
      }
      return next;
    }, {replace: true, preventScrollReset: true});
  };

  const onTabKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = TABS.findIndex((item) => item.id === tab);
    let next = -1;
    if (event.key === 'ArrowRight') {
      next = (index + 1) % TABS.length;
    } else if (event.key === 'ArrowLeft') {
      next = (index - 1 + TABS.length) % TABS.length;
    } else if (event.key === 'Home') {
      next = 0;
    } else if (event.key === 'End') {
      next = TABS.length - 1;
    }
    if (next !== -1) {
      event.preventDefault();
      setTab(TABS[next].id);
      document.getElementById(`${tabsId}-${TABS[next].id}`)?.focus();
    }
  };

  // staff can still edit their own tags while they're locked (pending/verified in the directory)
  const readOnly = tag.locked && !isStaff(user);

  // which storage ids variables/blobs are read for; global needs none, user defaults to you
  const [ scope, setScope ] = useState<TagStorageScope>(() => ({user_id: user?.id ?? ''}));

  const [ contentDirty, setContentDirty ] = useState(false);
  const [ variablesDirty, setVariablesDirty ] = useState(false);
  const [ blobsDirty, setBlobsDirty ] = useState(false);
  const [ directoryDirty, setDirectoryDirty ] = useState(false);
  const { data: directory } = useMeTagDirectoryQuery(tag.id);
  const { data: guilds } = useMeGuildsQuery();
  const guildNames = useMemo(() => new Map((guilds ?? []).map((guild) => [guild.id, guild.name])), [guilds]);
  const location = tagLocation(tag, user, guildNames);

  return (
    <>
      <header className='rounded-t-xl border-b border-line bg-surface px-6 pt-6 sm:pr-14'>
        <p className='section-label pr-8 sm:pr-0'>Editing</p>
        <div className='mt-1 flex flex-wrap items-center gap-2 pr-8 sm:pr-0'>
          <h2 id={TITLE_ID} className='min-w-0 text-2xl font-bold break-all text-white'>{tag.name}</h2>
          <TagBadges tag={tag}/>
          <div className='flex flex-wrap gap-2 sm:ml-auto'>
            <button type='button' className='btn btn-ghost btn-sm' onClick={() => onBack(tag.id)}>
              <ArrowLeft className='size-3.5'/>
              Back to tag
            </button>
            {(directory !== undefined && !tag.reference_tag) ? (
              <button type='button' className='btn btn-secondary btn-sm' onClick={() => setTab('directory')}>
                {(directory) ? <BookOpen className='size-3.5'/> : <Upload className='size-3.5'/>}
                {(directory) ? 'Directory listing' : 'Publish to directory'}
              </button>
            ) : null}
          </div>
        </div>
        <div className='mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-subtle'>
          <TagLocationChip location={location} to={tagServerPath(location)}/>
          <span className='tabular-nums'>{tag.uses.toLocaleString()} uses</span>
          <span title={formatDateTime(tag.created)}>Created {formatDate(tag.created)}</span>
          {(tag.edited) ? <span title={formatDateTime(tag.edited)}>Edited {formatDate(tag.edited)}</span> : null}
          {(tag.last_used) ? <span title={formatDateTime(tag.last_used)}>Last used {formatDate(tag.last_used)}</span> : null}
        </div>

        <div role='tablist' aria-label='Tag sections' onKeyDown={onTabKeyDown} className='-mb-px mt-4 flex gap-1 overflow-x-auto'>
          {TABS.map((item) => {
            const dirty = {content: contentDirty, variables: variablesDirty, blobs: blobsDirty, directory: directoryDirty}[item.id];
            return (
              <button
                key={item.id}
                id={`${tabsId}-${item.id}`}
                type='button'
                role='tab'
                aria-selected={tab === item.id}
                aria-controls={`${tabsId}-${item.id}-panel`}
                tabIndex={(tab === item.id) ? 0 : -1}
                onClick={() => setTab(item.id)}
                className={cn(
                  'flex shrink-0 cursor-pointer items-center gap-1.5 border-b-2 px-3 py-2 text-sm whitespace-nowrap transition-colors',
                  (tab === item.id) ? 'border-brand text-white' : 'border-transparent text-muted hover:text-white',
                )}
              >
                {item.label}
                {(dirty) ? <span aria-label='(unsaved changes)' className='size-1.5 rounded-full bg-warning'/> : null}
              </button>
            );
          })}
        </div>
      </header>

      <div className='p-4 sm:p-6'>
        {/* panels stay mounted so unsaved edits survive switching tabs */}
        <div id={`${tabsId}-content-panel`} role='tabpanel' aria-labelledby={`${tabsId}-content`} hidden={tab !== 'content'}>
          <TagContentForm tag={tag} readOnly={readOnly} onDirtyChange={setContentDirty}/>
        </div>
        <div id={`${tabsId}-variables-panel`} role='tabpanel' aria-labelledby={`${tabsId}-variables`} hidden={tab !== 'variables'} className='space-y-4'>
          {(tag.reference_tag) ? <AliasStorageNote tag={tag} kind='variables'/> : (
            <>
              <StorageScopeForm scope={scope} onChange={setScope}/>
              {(tab === 'variables' || variablesDirty) ? (
                <TagVariablesEditor tag={tag} scope={scope} readOnly={readOnly} onDirtyChange={setVariablesDirty}/>
              ) : null}
            </>
          )}
        </div>
        <div id={`${tabsId}-blobs-panel`} role='tabpanel' aria-labelledby={`${tabsId}-blobs`} hidden={tab !== 'blobs'} className='space-y-4'>
          {(tag.reference_tag) ? <AliasStorageNote tag={tag} kind='blobs'/> : (
            <>
              <StorageScopeForm scope={scope} onChange={setScope}/>
              {(tab === 'blobs' || blobsDirty) ? (
                <TagBlobsEditor tag={tag} scope={scope} readOnly={readOnly} onDirtyChange={setBlobsDirty}/>
              ) : null}
            </>
          )}
        </div>

        <div id={`${tabsId}-directory-panel`} role='tabpanel' aria-labelledby={`${tabsId}-directory`} hidden={tab !== 'directory'}>
          {(tab === 'directory' || directoryDirty) ? <TagDirectoryPanel tag={tag} onDirtyChange={setDirectoryDirty}/> : null}
        </div>
      </div>

      <UnsavedChangesGuard when={contentDirty || variablesDirty || blobsDirty || directoryDirty}/>
    </>
  );
}


// aliases have no storage of their own: the bot reads and writes the parent tag's variables and blobs
function AliasStorageNote({ tag, kind }: {tag: Tag, kind: 'variables' | 'blobs'}) {
  const { user } = useAuth();
  const parent = tag.reference_tag!;
  // the editor only loads tags you own (or any tag, for staff)
  const canOpenParent = parent.user.id === user?.id || isStaff(user);
  return (
    <ReadOnlyNote>
      This tag is an alias of “{parent.name}”. Alias tags use their parent tag’s {kind}, so there’s nothing to edit here.
      {(canOpenParent) ? (
        <> <Link to={`${dashboardTagEditPath(parent.id)}?tab=${kind}`} className='font-medium text-brand hover:underline'>Edit them on “{parent.name}”</Link></>
      ) : null}
    </ReadOnlyNote>
  );
}


interface Draft {
  name: string,
  content: string,
  nsfw: boolean,
}


function TagContentForm({ tag, readOnly, onDirtyChange }: {tag: Tag, readOnly: boolean, onDirtyChange: (dirty: boolean) => void}) {
  const toast = useToast();
  const navigate = useNavigate();
  const patch = usePatchMeTagMutation(tag.id);
  const remove = useDeleteMeTagMutation(tag.id);
  const [ confirmingDelete, setConfirmingDelete ] = useState(false);

  // null = showing the saved tag; edits create a draft, saving/discarding drops it
  const [ draft, setDraft ] = useState<Draft | null>(null);
  const base: Draft = useMemo(() => ({name: tag.name, content: tag.content, nsfw: tag.nsfw}), [tag]);
  const values = draft ?? base;
  const dirty = !!draft && (draft.name !== base.name || draft.content !== base.content || draft.nsfw !== base.nsfw);

  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);

  const update = (changes: Partial<Draft>) => {
    patch.reset();
    setDraft((previous) => ({...(previous ?? base), ...changes}));
  };

  const trimmedName = values.name.trim();
  const nameError = (!trimmedName) ? 'A tag needs a name.'
    : (TAG_NAME_MAX < trimmedName.length) ? `Names can be up to ${TAG_NAME_MAX} characters.`
    : (patch.error instanceof ApiRequestError && patch.error.code === ApiErrorCodes.TAG_NAME_TAKEN) ? 'You already have a tag with this name here.'
    : null;
  const contentError = (TAG_CONTENT_MAX < values.content.length) ? `Content can be up to ${TAG_CONTENT_MAX.toLocaleString()} characters.` : null;
  const invalid = !trimmedName || TAG_NAME_MAX < trimmedName.length || !!contentError;

  const save = () => {
    if (!dirty || invalid || patch.isPending || readOnly) {
      return;
    }
    const body: {name?: string, content?: string, nsfw?: boolean} = {};
    if (trimmedName !== base.name) {
      body.name = trimmedName;
    }
    if (values.content !== base.content) {
      body.content = values.content;
    }
    if (values.nsfw !== base.nsfw) {
      body.nsfw = values.nsfw;
    }
    patch.mutate(body, {
      onSuccess: () => {
        setDraft(null);
        toast('Tag saved');
      },
      onError: (error) => {
        if (!(error instanceof ApiRequestError && error.code === ApiErrorCodes.TAG_NAME_TAKEN)) {
          toast(errorMessage(error, 'Couldn’t save the tag.'), 'error');
        }
      },
    });
  };

  const saveRef = useRef(save);
  saveRef.current = save;
  const onEditorSave = useCallback(() => saveRef.current(), []);

  const confirmDelete = () => {
    remove.mutate(undefined, {
      onSuccess: () => {
        toast(`Deleted “${tag.name}”`);
        // replace: the tag's page doesn't exist anymore, Back shouldn't return to it
        navigate(Routes.DASHBOARD_TAGS, {replace: true, preventScrollReset: true, state: {skipUnsavedGuard: true}});
      },
    });
  };

  return (
    <>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        <Panel
          title='Tag'
          accent='#3ba55c'
          actions={(!readOnly) ? (
            <button type='button' className='btn btn-ghost btn-sm text-danger hover:text-danger' onClick={() => setConfirmingDelete(true)}>
              <Trash2 aria-hidden className='size-4'/>
              Delete
            </button>
          ) : null}
        >
          {(readOnly) ? (
            <ReadOnlyNote>This tag is locked, so it can’t be edited or deleted right now. Ask in the support server if you think that’s a mistake.</ReadOnlyNote>
          ) : (tag.locked) ? (
            <ReadOnlyNote>This tag is locked, you can edit it because you’re staff.</ReadOnlyNote>
          ) : null}

          <div className='space-y-5'>
            <Field
              label='Name'
              counter={<CharCounter length={trimmedName.length} max={TAG_NAME_MAX}/>}
              hint='Names are saved in lowercase and must be unique where the tag lives.'
              error={(draft) ? nameError : null}
            >
              {(props) => (
                <input
                  {...props}
                  value={values.name}
                  onChange={(event) => update({name: event.target.value.replace(/[\r\n]/g, '')})}
                  disabled={readOnly}
                  autoComplete='off'
                  spellCheck={false}
                  className='input font-mono'
                />
              )}
            </Field>

            <Field
              label='Content'
              counter={<CharCounter length={values.content.length} max={TAG_CONTENT_MAX}/>}
              error={contentError}
              hint={(tag.reference_tag) ? `This tag is an alias of “${tag.reference_tag.name}”. Saving content here turns it into a normal tag.` : 'Tag script is supported. Ctrl/⌘ + S saves.'}
            >
              {(props) => (
                <CodeEditor
                  {...props}
                  value={values.content}
                  onChange={(content) => update({content})}
                  onSave={onEditorSave}
                  readOnly={readOnly}
                  maxLength={TAG_CONTENT_MAX}
                />
              )}
            </Field>

            <Toggle
              label='NSFW'
              description='NSFW tags only run in age-restricted channels.'
              checked={values.nsfw}
              onChange={(nsfw) => update({nsfw})}
              disabled={readOnly}
            />
          </div>

          {(patch.isError && !nameError) ? <InlineError>{errorMessage(patch.error, 'Couldn’t save the tag.')}</InlineError> : null}

          {(!readOnly) ? (
            <SaveBar dirty={dirty} pending={patch.isPending} disabled={invalid} onDiscard={() => {
              patch.reset();
              setDraft(null);
            }}/>
          ) : null}
        </Panel>
      </form>

      {/* outside the form: the dialog has its own */}
      {(confirmingDelete) ? (
        <ConfirmDialog
          title={`Delete “${tag.name}”?`}
          description='This deletes the tag along with its variables and blobs. It can’t be undone.'
          confirmLabel='Delete tag'
          pending={remove.isPending}
          error={(remove.isError) ? errorMessage(remove.error, 'Couldn’t delete the tag.') : null}
          onConfirm={confirmDelete}
          onClose={() => {
            remove.reset();
            setConfirmingDelete(false);
          }}
        />
      ) : null}
    </>
  );
}


function TagEditorSkeleton() {
  return (
    <div aria-busy='true'>
      <h2 id={TITLE_ID} className='sr-only'>Loading tag</h2>
      <div className='border-b border-line px-6 pt-6 pb-4'>
        <Skeleton className='h-8 w-48'/>
        <Skeleton className='mt-3 h-4 w-72 max-w-full bg-surface-2'/>
        <Skeleton className='mt-5 h-7 w-64 bg-surface-2'/>
      </div>
      <div className='p-6'><PanelSkeleton rows={4}/></div>
    </div>
  );
}
