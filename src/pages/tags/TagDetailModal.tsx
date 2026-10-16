import { AlertTriangle, BarChart3, Calendar, ChevronLeft, ChevronRight, Hash, Server, Tag as TagIcon, type LucideIcon } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';

import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { TagDirectoryVerificationStates, type TagDirectoryItem } from '@/lib/api';
import { useAdminTagDirectoryItemQuery, useMeTagDirectoryQuery } from '@/lib/api/dashboardQueries';
import { useTagDirectoryItemQuery } from '@/lib/api/queries';
import { userAvatarUrl, userDisplayTag } from '@/lib/discord';
import { cn, formatDate, formatDateTime } from '@/lib/utils';

import { AddTagButton, categoryLabel, NsfwBadge, verificationInfo } from './tagDirectory';
import { HiddenContentSection, ListingEditForm, ManageListingCard, TagServersSection, useListingAccess } from './TagListingManager';
import { MediaSection } from './TagMedia';


const TITLE_ID = 'tag-modal-title';


export function TagDetailModal({ tagId, initialItem, previousId, nextId, onNavigate, onClose }: {
  tagId: string,
  // the card's data from the directory list, so the modal opens instantly
  initialItem?: TagDirectoryItem,
  previousId: string | null,
  nextId: string | null,
  onNavigate: (id: string) => void,
  onClose: () => void,
}) {
  const { data: item, isPending, isError, refetch } = useTagDirectoryItemQuery(tagId, initialItem);
  // keyed on the tag so stepping to another one leaves edit mode
  const [ editingId, setEditingId ] = useState<string | null>(null);
  const editing = editingId === tagId;

  // ← / → step through the tags loaded behind the modal (ignored while typing or editing the listing)
  const navigation = useRef({previousId, nextId, onNavigate, editing});
  navigation.current = {previousId, nextId, onNavigate, editing};
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (event.altKey || event.ctrlKey || event.metaKey || (target instanceof Element && target.closest('input, textarea, [contenteditable]'))) {
        return;
      }
      const { previousId, nextId, onNavigate, editing } = navigation.current;
      if (editing) {
        return;
      }
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
      {(isPending) ? (
        <div className='flex h-80 items-center justify-center'>
          <h2 id={TITLE_ID} className='sr-only'>Loading tag</h2>
          <Spinner/>
        </div>
      ) : (isError) ? (
        <TagMessage title="Couldn't load this tag" description='Something went wrong talking to NotSoBot. Try again in a moment.'>
          <button type='button' className='btn btn-secondary' onClick={() => refetch()}>Retry</button>
        </TagMessage>
      ) : (!item) ? (
        <TagMessage title='Tag Not Found' description="The tag you're looking for doesn't exist or has been removed from the directory."/>
      ) : (
        <TagDetail item={item} editing={editing} onEditingChange={(value) => setEditingId((value) ? tagId : null)}/>
      )}

      {(previousId || nextId) ? (
        <footer className='flex items-center justify-between gap-3 border-t border-line px-6 py-3'>
          <button type='button' className='btn btn-ghost px-2' disabled={!previousId || editing} onClick={() => previousId && onNavigate(previousId)}>
            <ChevronLeft className='size-4'/>
            Previous
          </button>
          <span className='hidden text-xs text-subtle sm:block'>Use ← → to browse</span>
          <button type='button' className='btn btn-ghost px-2' disabled={!nextId || editing} onClick={() => nextId && onNavigate(nextId)}>
            Next
            <ChevronRight className='size-4'/>
          </button>
        </footer>
      ) : null}
    </Modal>
  );
}


function TagDetail({ item, editing, onEditingChange }: {item: TagDirectoryItem, editing: boolean, onEditingChange: (editing: boolean) => void}) {
  const { tag } = item;
  const verification = verificationInfo(item.verified);
  const access = useListingAccess(item);
  const canManage = access.owner || access.staff;
  // the public listing only has its media once it's verified, the owner and staff see it before that
  const own = useMeTagDirectoryQuery(item.id, {enabled: access.owner});
  const admin = useAdminTagDirectoryItemQuery(item.id, {enabled: access.staff && !access.owner});
  const privateItem = (access.owner) ? own.data : (access.staff) ? admin.data : undefined;
  const assets = privateItem?.assets ?? item.assets;

  return (
    <>
      <header className='rounded-t-xl border-b border-line bg-surface px-6 pt-6 pb-5 sm:pr-14'>
        <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
          <div className='min-w-0 flex-1'>
            {/* clear of the close button; on wider screens the whole header is */}
            <div className='flex flex-wrap items-center gap-2 pr-8 sm:pr-0'>
              <h2 id={TITLE_ID} className='text-2xl font-bold break-words text-white sm:text-3xl'>{tag.name}</h2>
              {(tag.nsfw) ? <NsfwBadge/> : null}
            </div>
            {(item.title) ? <p className='mt-1 text-muted'>{item.title}</p> : null}
            {/* one quiet line instead of a row of pills */}
            <p className='mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm'>
              {/* verified stands out as a solid pill, the other states stay plain text */}
              <span
                title={verification.description}
                className={cn(
                  'inline-flex items-center gap-1.5 font-medium',
                  (item.verified === TagDirectoryVerificationStates.VERIFIED) ?
                    'rounded-full bg-success px-2.5 py-0.5 text-white shadow-sm' :
                    verification.textClassName,
                )}
              >
                <verification.icon aria-hidden className='size-4'/>
                {verification.label}
              </span>
              <span aria-hidden className='text-subtle'>·</span>
              <span className='inline-flex items-center gap-1.5 text-muted'>
                <TagIcon aria-hidden className='size-4 text-subtle'/>
                {categoryLabel(item.category)}
              </span>
            </p>
          </div>
          <AddTagButton tag={tag} verified={item.verified} size='lg' className='w-full justify-center sm:w-auto'/>
        </div>
      </header>

      <div className='grid gap-6 p-6 md:grid-cols-[minmax(0,1fr)_280px]'>
        <div className='min-w-0 space-y-5'>
          <div className='rounded-lg bg-deep p-4'>
            <p className='text-sm text-muted'>{verification.description}</p>
          </div>

          {(editing && canManage) ? (
            <ListingEditForm item={item} access={access} onDone={() => onEditingChange(false)}/>
          ) : (
            <>
              {(item.description) ? (
                <section>
                  <h3 className='section-label mb-2'>Description</h3>
                  <p className='whitespace-pre-wrap text-white'>{item.description}</p>
                </section>
              ) : null}

              <MediaSection
                key={item.id}
                assets={assets}
                nsfw={tag.nsfw}
                tagName={tag.name}
                manage={(access.owner) ? {tagId: item.id, verified: own.data?.verified ?? item.verified} : undefined}
              />

              {/* only filled in when the owner chose to show it */}
              {(item.content_public && tag.content) ? (
                <section>
                  <h3 className='section-label mb-2'>Content</h3>
                  <pre className='max-h-96 overflow-auto rounded-md border border-line bg-deep p-3 font-mono text-sm whitespace-pre-wrap break-words text-fg'>{tag.content}</pre>
                </section>
              ) : null}

              {/* the owner and staff still see hidden content, with a note that nobody else can */}
              <HiddenContentSection item={item} access={access}/>
            </>
          )}

          <div className='grid grid-cols-2 gap-3'>
            <StatTile icon={BarChart3} label='Uses'><span className='text-2xl font-bold'>{tag.uses.toLocaleString()}</span></StatTile>
            <StatTile icon={Server} label='Servers'><span className='text-2xl font-bold'>{item.server_count.toLocaleString()}</span></StatTile>
            <StatTile icon={Calendar} label='Listed'><span className='text-sm font-medium'>{formatDate(item.created)}</span></StatTile>
            <StatTile icon={Hash} label='Tag ID'>
              <span className='block truncate font-mono text-sm' title={item.id}>{item.id}</span>
            </StatTile>
          </div>

          {/* who added it, the owner and staff only */}
          <TagServersSection item={item} access={access}/>

          <section>
            <h3 className='section-label mb-1'>Tag Information</h3>
            <dl className='divide-y divide-line'>
              <InfoRow label='Created'>{formatDateTime(tag.created)}</InfoRow>
              {(tag.edited) ? <InfoRow label='Last Edited'>{formatDateTime(tag.edited)}</InfoRow> : null}
              {(tag.last_used) ? <InfoRow label='Last Used'>{formatDateTime(tag.last_used)}</InfoRow> : null}
              <InfoRow label='Locked'>{tag.locked ? 'Yes' : 'No'}</InfoRow>
              <InfoRow label='Command Tag'>{tag.is_command ? 'Yes' : 'No'}</InfoRow>
              {(tag.reference_tag) ? <InfoRow label='Alias Of'>{tag.reference_tag.name}</InfoRow> : null}
            </dl>
          </section>
        </div>

        <aside className='space-y-4'>
          <ManageListingCard item={item} access={access} editing={editing} onEdit={() => onEditingChange(true)}/>
          <section className='card p-5'>
            <h3 className='section-label mb-4'>Created By</h3>
            <div className='flex items-center gap-3'>
              <img src={userAvatarUrl(tag.user, 128)} alt='' className='size-14 shrink-0 rounded-full bg-surface-3'/>
              <div className='min-w-0'>
                <div className='flex items-center gap-2'>
                  <span className='truncate font-medium text-white'>{userDisplayTag(tag.user)}</span>
                  {(tag.user.bot) ? <span className='rounded bg-brand px-1.5 py-0.5 text-[10px] font-medium text-white'>BOT</span> : null}
                </div>
                <p className='truncate font-mono text-xs text-subtle'>{tag.user.id}</p>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}


function TagMessage({ title, description, children }: {title: string, description: string, children?: ReactNode}) {
  return (
    <div className='px-6 py-16 text-center'>
      <AlertTriangle className='mx-auto mb-4 size-14 text-danger'/>
      <h2 id={TITLE_ID} className='mb-3 text-2xl font-bold text-white'>{title}</h2>
      <p className='mb-6 text-muted'>{description}</p>
      {children}
    </div>
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
      <dt className='text-muted'>{label}</dt>
      <dd className='text-right text-white'>{children}</dd>
    </div>
  );
}
