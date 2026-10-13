import { Ban } from 'lucide-react';
import { useId, useState } from 'react';

import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import type { AdminTagDirectoryItem } from '@/lib/api';
import { errorMessage, useDeleteAdminTagDirectoryMutation, usePatchAdminUserMutation } from '@/lib/api/dashboardQueries';
import { NsfwBadge, VerificationBadge } from '@/pages/tags/tagDirectory';

import { selectAllScope } from './adminUi';
import { BLOCK_REASON_MAX } from './BlockUserDialog';


// One dialog for deleting a directory listing and (optionally) blocking whoever published it, decided while the tag
// is still on screen. `item` is the page's copy, so the details stay here even after the listing leaves the list
// (e.g. the delete worked but the block didn't and needs a retry).
export function DeleteDirectoryTagFlow({ item, onClose }: {item: AdminTagDirectoryItem, onClose: () => void}) {
  const titleId = useId();
  const deleteTagId = useId();
  const blockId = useId();
  const reasonId = useId();
  const toast = useToast();
  const remove = useDeleteAdminTagDirectoryMutation();
  const block = usePatchAdminUserMutation();

  const { tag, user } = item;
  const name = item.title || tag.name;
  const [ deleteTag, setDeleteTag ] = useState(false);
  const [ blockUser, setBlockUser ] = useState(false);
  const [ reason, setReason ] = useState(`Tag directory: ${name}`);
  // the listing is gone once this is set, a failed block can be retried without deleting again
  const [ deleted, setDeleted ] = useState(false);

  const pending = remove.isPending || block.isPending;

  const runBlock = () => {
    if (!user) {
      return;
    }
    block.mutate({userId: user.id, blocked: true, reason: reason.trim()}, {
      onSuccess: () => {
        toast(`Blocked ${user.username}`);
        onClose();
      },
    });
  };

  const submit = () => {
    if (deleted) {
      runBlock();
      return;
    }
    remove.mutate({tagId: item.id, deleteTag}, {
      onSuccess: () => {
        setDeleted(true);
        toast((deleteTag) ? `Deleted ${name}` : `Removed ${name} from the directory`);
        if (blockUser && user) {
          runBlock();
        } else {
          onClose();
        }
      },
    });
  };

  const content = tag.content ?? '';
  const error = (remove.isError) ?
    errorMessage(remove.error, 'Couldn’t delete the listing.') :
    (block.isError) ? `The listing was deleted, but blocking failed: ${errorMessage(block.error, 'Couldn’t block the user.')}` : null;

  return (
    <Modal labelledBy={titleId} onClose={() => !pending && onClose()} className='max-w-xl'>
      <form
        className='p-5 sm:p-6'
        onSubmit={(event) => {
          event.preventDefault();
          if (!pending) {
            submit();
          }
        }}
      >
        <h2 id={titleId} className='pr-10 text-lg font-semibold text-white'>Delete “{name}” from the directory?</h2>

        {/* what's being deleted, so the block reason can be decided with it in front of you */}
        <section aria-label='Tag' className='mt-3 rounded-md border border-line bg-deep p-3'>
          <div className='flex flex-wrap items-center gap-2'>
            <span className='font-semibold text-white'>{item.title || <span className='text-subtle italic'>Untitled</span>}</span>
            <VerificationBadge verified={item.verified}/>
            {(tag.nsfw) ? <NsfwBadge/> : null}
          </div>
          <p className='mt-0.5 text-sm'>
            <span className='font-mono text-code'>{tag.name}</span>
            <span className='text-subtle'> · by </span>
            <span className='text-fg'>{user?.username ?? tag.user_id ?? 'unknown'}</span>
            {(user) ? <span className='font-mono text-xs text-subtle'> ({user.id})</span> : null}
          </p>
          {(item.description) ? <p className='mt-2 text-sm whitespace-pre-wrap break-words text-muted'>{item.description}</p> : null}
          <pre className='mt-2 max-h-48 overflow-auto rounded border border-line bg-surface p-2 font-mono text-xs whitespace-pre-wrap break-words text-fg focus:border-line-strong focus:outline-none' {...selectAllScope}>
            {content || <span className='text-subtle italic'>(empty)</span>}
          </pre>
        </section>

        <p className='mt-3 text-sm text-muted'>
          The listing is removed and <span className='font-mono text-white'>{tag.name}</span> goes back to being a normal tag its owner can edit.
        </p>

        <label htmlFor={deleteTagId} className='mt-3 flex cursor-pointer items-start gap-2 rounded-md border border-line p-3 text-sm'>
          <input
            id={deleteTagId}
            type='checkbox'
            checked={deleteTag}
            onChange={(event) => setDeleteTag(event.target.checked)}
            disabled={pending || deleted}
            className='mt-0.5'
          />
          <span>
            <span className='font-medium text-white'>Also delete the tag itself</span>
            <span className='mt-0.5 block text-muted'>Every alias of it, in every server, is deleted too. This can’t be undone.</span>
          </span>
        </label>

        {(user) ? (
          <div className='mt-3 rounded-md border border-line p-3 text-sm'>
            <label htmlFor={blockId} className='flex cursor-pointer items-start gap-2'>
              <input
                id={blockId}
                type='checkbox'
                checked={blockUser}
                onChange={(event) => setBlockUser(event.target.checked)}
                disabled={pending || deleted}
                className='mt-0.5'
              />
              <span>
                <span className='flex items-center gap-1.5 font-medium text-white'>
                  <Ban aria-hidden className='size-4 text-danger'/>
                  Block {user.username} from NotSoBot
                </span>
                <span className='mt-0.5 block text-muted'>Stops them from using NotSoBot anywhere.</span>
              </span>
            </label>
            {(blockUser) ? (
              <div className='mt-3'>
                <label htmlFor={reasonId} className='mb-1.5 block text-muted'>Block reason</label>
                <textarea
                  id={reasonId}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  maxLength={BLOCK_REASON_MAX}
                  rows={2}
                  disabled={pending}
                  className='input'
                />
              </div>
            ) : null}
          </div>
        ) : null}

        {(error) ? (
          <p role='alert' className='mt-4 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-fg'>{error}</p>
        ) : null}

        <div className='mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end'>
          <button type='button' className='btn btn-secondary' onClick={onClose} disabled={pending}>
            {(deleted) ? 'Close' : 'Cancel'}
          </button>
          <button type='submit' className='btn btn-danger' disabled={pending}>
            {(pending) ? <Spinner className='size-4 border-white/40 border-t-white'/> : null}
            {(deleted) ? 'Retry block' : `${(deleteTag) ? 'Delete tag' : 'Remove listing'}${(blockUser && user) ? ' and block' : ''}`}
          </button>
        </div>
      </form>
    </Modal>
  );
}
