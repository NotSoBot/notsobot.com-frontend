import { AlertTriangle, ArrowUpRight, BarChart3, Calendar, ChevronLeft, ChevronRight, Clock, Pencil, PencilLine, type LucideIcon } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
import { Link } from 'react-router';

import { useAuth } from '@/auth';
import { stripMarkdown } from '@/components/ui/Markdown';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import type { Tag } from '@/lib/api';
import { errorMessage, useMeTagDirectoryQuery, useMeTagQuery } from '@/lib/api/dashboardQueries';
import { formatDate, formatDateTime } from '@/lib/utils';
import { tagDirectoryItemPath, VerificationBadge } from '@/pages/tags/tagDirectory';
import { MediaSection } from '@/pages/tags/TagMedia';

import { CopyButton } from '../admin/adminUi';
import { TagBadges, tagLocation, TagLocationChip, tagServerPath } from './tagMeta';


const TITLE_ID = 'dashboard-tag-modal-title';


// One of your tags over the tag list, like the public directory's modal: the full content and details, with the editor
// a click away. ← / → step through the tags loaded behind it.
export function TagDetailsModal({ tagId, guildNames, previousId, nextId, onNavigate, onEdit, onClose }: {
  tagId: string,
  guildNames: Map<string, string>,
  previousId: string | null,
  nextId: string | null,
  onNavigate: (id: string) => void,
  onEdit: (id: string) => void,
  onClose: () => void,
}) {
  // shows the list's copy right away (`placeholderData`), then the fresh one
  const { data: tag, isPending, isError, error, refetch } = useMeTagQuery(tagId);

  const navigation = useRef({previousId, nextId, onNavigate});
  navigation.current = {previousId, nextId, onNavigate};
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (event.altKey || event.ctrlKey || event.metaKey || (target instanceof Element && target.closest('input, textarea, select, [contenteditable]'))) {
        return;
      }
      const { previousId, nextId, onNavigate } = navigation.current;
      if (event.key === 'ArrowLeft' && previousId) {
        onNavigate(previousId);
      } else if (event.key === 'ArrowRight' && nextId) {
        onNavigate(nextId);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <Modal labelledBy={TITLE_ID} onClose={onClose}>
      {(tag) ? (
        <TagDetails tag={tag} guildNames={guildNames} onEdit={onEdit}/>
      ) : (isPending) ? (
        <div className='flex h-80 items-center justify-center'>
          <h2 id={TITLE_ID} className='sr-only'>Loading tag</h2>
          <Spinner/>
        </div>
      ) : (
        <div className='px-6 py-16 text-center'>
          <AlertTriangle className='mx-auto mb-4 size-14 text-danger'/>
          <h2 id={TITLE_ID} className='mb-3 text-2xl font-bold text-white'>{(isError) ? 'Couldn’t load this tag' : 'Tag not found'}</h2>
          <p className='mb-6 text-muted'>{errorMessage(error, 'It may have been deleted.')}</p>
          {(isError) ? <button type='button' className='btn btn-secondary' onClick={() => refetch()}>Retry</button> : null}
        </div>
      )}

      {(previousId || nextId) ? (
        <footer className='flex items-center justify-between gap-3 border-t border-line px-6 py-3'>
          <button type='button' className='btn btn-ghost px-2' disabled={!previousId} onClick={() => previousId && onNavigate(previousId)}>
            <ChevronLeft className='size-4'/>
            Previous
          </button>
          <span className='hidden text-xs text-subtle sm:block'>Use ← → to browse</span>
          <button type='button' className='btn btn-ghost px-2' disabled={!nextId} onClick={() => nextId && onNavigate(nextId)}>
            Next
            <ChevronRight className='size-4'/>
          </button>
        </footer>
      ) : null}
    </Modal>
  );
}


function TagDetails({ tag, guildNames, onEdit }: {tag: Tag, guildNames: Map<string, string>, onEdit: (id: string) => void}) {
  const { user } = useAuth();
  const location = tagLocation(tag, user, guildNames);

  return (
    <>
      <header className='rounded-t-xl border-b border-line bg-surface px-6 pt-6 pb-5 sm:pr-14'>
        <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
          <div className='min-w-0 flex-1'>
            <div className='flex flex-wrap items-center gap-2 pr-8 sm:pr-0'>
              <h2 id={TITLE_ID} className='text-2xl font-bold break-words text-white sm:text-3xl'>{tag.name}</h2>
              <TagBadges tag={tag}/>
            </div>
            <div className='mt-2 flex min-w-0'>
              <TagLocationChip location={location} to={tagServerPath(location)}/>
            </div>
          </div>
          <button type='button' className='btn btn-primary w-full justify-center sm:w-auto' onClick={() => onEdit(tag.id)}>
            <Pencil className='size-4'/>
            Edit tag
          </button>
        </div>
      </header>

      <div className='grid gap-6 p-6 md:grid-cols-[minmax(0,1fr)_260px]'>
        <div className='min-w-0 space-y-5'>
          <section>
            <div className='mb-2 flex items-center justify-between gap-3'>
              <h3 className='section-label'>Content</h3>
              {(!tag.reference_tag && tag.content) ? <CopyButton value={tag.content} label='Copy'/> : null}
            </div>
            {(tag.reference_tag) ? (
              <p className='rounded-md border border-line bg-deep p-3 text-sm text-muted'>
                An alias of <span className='font-medium text-white'>{tag.reference_tag.name}</span>, it runs that tag’s content.
              </p>
            ) : (
              <pre className='max-h-96 overflow-auto rounded-md border border-line bg-deep p-3 font-mono text-sm whitespace-pre-wrap break-words text-fg'>
                {tag.content || <span className='text-subtle italic'>(empty)</span>}
              </pre>
            )}
          </section>

          {(tag.is_on_directory) ? <DirectorySection tag={tag}/> : null}

          <div className='grid grid-cols-2 gap-3'>
            <StatTile icon={BarChart3} label='Uses'><span className='text-2xl font-bold'>{tag.uses.toLocaleString()}</span></StatTile>
            <StatTile icon={Clock} label='Last used'><span className='text-sm font-medium'>{(tag.last_used) ? formatDate(tag.last_used) : 'Never'}</span></StatTile>
            <StatTile icon={Calendar} label='Created'><span className='text-sm font-medium'>{formatDate(tag.created)}</span></StatTile>
            <StatTile icon={PencilLine} label='Edited'><span className='text-sm font-medium'>{(tag.edited) ? formatDate(tag.edited) : 'Never'}</span></StatTile>
          </div>
        </div>

        <aside>
          <section className='card p-5'>
            <h3 className='section-label mb-1'>Details</h3>
            <dl className='divide-y divide-line'>
              <InfoRow label='Tag ID'><span className='font-mono text-xs'>{tag.id}</span></InfoRow>
              <InfoRow label='Location'>
                {(tagServerPath(location)) ? (
                  <Link to={tagServerPath(location)!} className='text-brand hover:underline'>{location.label}</Link>
                ) : location.label}
              </InfoRow>
              {(location.id) ? <InfoRow label='Server ID'><span className='font-mono text-xs'>{location.id}</span></InfoRow> : null}
              <InfoRow label='Created'>{formatDateTime(tag.created)}</InfoRow>
              {(tag.last_used) ? <InfoRow label='Last used'>{formatDateTime(tag.last_used)}</InfoRow> : null}
              <InfoRow label='Locked'>{(tag.locked) ? 'Yes' : 'No'}</InfoRow>
              <InfoRow label='Command tag'>{(tag.is_command) ? 'Yes' : 'No'}</InfoRow>
              <InfoRow label='NSFW'>{(tag.nsfw) ? 'Yes' : 'No'}</InfoRow>
            </dl>
          </section>
        </aside>
      </div>
    </>
  );
}


// the tag's directory listing at a glance, it's managed from the editor's Directory tab
function DirectorySection({ tag }: {tag: Tag}) {
  const { data: directory, isPending } = useMeTagDirectoryQuery(tag.id);
  return (
    <section>
      <div className='mb-2 flex items-baseline justify-between gap-3'>
        <h3 className='section-label'>Tag directory</h3>
        <Link to={tagDirectoryItemPath(tag.id)} className='inline-flex items-center gap-1 text-xs text-brand hover:underline'>
          View in directory
          <ArrowUpRight className='size-3'/>
        </Link>
      </div>
      <div className='space-y-4 rounded-md border border-line bg-deep p-3'>
        {(isPending) ? (
          <div className='flex h-10 items-center justify-center'><Spinner className='size-4'/></div>
        ) : (directory) ? (
          <>
            <div className='flex flex-wrap items-center gap-2'>
              <VerificationBadge verified={directory.verified}/>
              {(directory.title) ? <span className='text-sm text-white'>{directory.title}</span> : null}
            </div>
            {(directory.description) ? <p className='line-clamp-3 text-sm whitespace-pre-wrap text-muted'>{stripMarkdown(directory.description)}</p> : null}
            {(directory.assets.length) ? <MediaSection assets={directory.assets} nsfw={tag.nsfw} tagName={tag.name}/> : null}
          </>
        ) : (
          <p className='text-sm text-muted'>Listed on the tag directory.</p>
        )}
      </div>
    </section>
  );
}


function StatTile({ icon: Icon, label, children }: {icon: LucideIcon, label: string, children: ReactNode}) {
  return (
    <div className='min-w-0 rounded-lg bg-deep p-4'>
      <div className='mb-2 flex items-center gap-2 text-muted'>
        <Icon className='size-4'/>
        <span className='text-xs'>{label}</span>
      </div>
      <div className='text-white tabular-nums'>{children}</div>
    </div>
  );
}


function InfoRow({ label, children }: {label: string, children: ReactNode}) {
  return (
    <div className='flex items-start justify-between gap-4 py-2.5 text-sm'>
      <dt className='shrink-0 text-muted'>{label}</dt>
      <dd className='min-w-0 text-right break-words text-white'>{children}</dd>
    </div>
  );
}
