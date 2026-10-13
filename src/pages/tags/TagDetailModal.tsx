import { AlertTriangle, BarChart3, Calendar, ChevronLeft, ChevronRight, Hash, Server, type LucideIcon } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';

import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import type { TagDirectoryItem } from '@/lib/api';
import { useTagDirectoryItemQuery } from '@/lib/api/queries';
import { userAvatarUrl, userDisplayTag } from '@/lib/discord';
import { formatDate, formatDateTime } from '@/lib/utils';

import { AddTagButton, NsfwBadge, verificationInfo, VerificationBadge } from './tagDirectory';


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

  // ← / → step through the tags loaded behind the modal (ignored while typing)
  const navigation = useRef({previousId, nextId, onNavigate});
  navigation.current = {previousId, nextId, onNavigate};
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (event.altKey || event.ctrlKey || event.metaKey || (target instanceof Element && target.closest('input, textarea, [contenteditable]'))) {
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
        <TagDetail item={item}/>
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


function TagDetail({ item }: {item: TagDirectoryItem}) {
  const { tag } = item;
  const verification = verificationInfo(item.verified);

  return (
    <>
      <header className='rounded-t-xl border-b border-line bg-surface px-6 pt-6 pb-5 pr-14'>
        <div className='flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center'>
          <div className='min-w-0 flex-1'>
            <div className='mb-2 flex flex-wrap items-center gap-3'>
              <h2 id={TITLE_ID} className='text-3xl font-bold break-words text-white'>{tag.name}</h2>
              {(tag.nsfw) ? <NsfwBadge size='lg'/> : null}
            </div>
            {(item.title) ? <p className='mb-3 text-lg text-muted'>{item.title}</p> : null}
            <VerificationBadge verified={item.verified} size='lg'/>
          </div>
          <AddTagButton tag={tag} size='lg'/>
        </div>
      </header>

      <div className='grid gap-6 p-6 md:grid-cols-[minmax(0,1fr)_280px]'>
        <div className='min-w-0 space-y-5'>
          <div className='rounded-lg bg-deep p-4'>
            <p className='text-sm text-muted'>{verification.description}</p>
          </div>

          {(item.description) ? (
            <section>
              <h3 className='section-label mb-2'>Description</h3>
              <p className='whitespace-pre-wrap text-white'>{item.description}</p>
            </section>
          ) : null}

          <div className='grid grid-cols-2 gap-3'>
            <StatTile icon={BarChart3} label='Uses'><span className='text-2xl font-bold'>{tag.uses.toLocaleString()}</span></StatTile>
            <StatTile icon={Server} label='Servers'><span className='text-2xl font-bold'>{item.server_count.toLocaleString()}</span></StatTile>
            <StatTile icon={Calendar} label='Listed'><span className='text-sm font-medium'>{formatDate(item.created)}</span></StatTile>
            <StatTile icon={Hash} label='Tag ID'>
              <span className='block truncate font-mono text-sm' title={item.id}>{item.id}</span>
            </StatTile>
          </div>

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
