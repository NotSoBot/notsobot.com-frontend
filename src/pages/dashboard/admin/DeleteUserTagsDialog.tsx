import { Trash2 } from 'lucide-react';
import { useId, useState } from 'react';
import { Link } from 'react-router';

import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import type { AdminUserRef } from '@/lib/api';
import { errorMessage, useAdminTagsQuery, useDeleteAdminUserTagsMutation } from '@/lib/api/dashboardQueries';

import { adminTagsPath, UserCell } from './adminUi';


// how many tags `userId` owns, from the same search the Tags tab's `user:<id>` uses
export function useUserTagCount(userId: string | null): number | null {
  const { data, isPlaceholderData } = useAdminTagsQuery({
    query: (userId) ? `user:${userId}` : '',
    searchContent: false,
    sortBy: 'newest',
    nsfw: null,
    page: 0,
  });
  return (userId && data && !isPlaceholderData) ? data.count : null;
}


export function tagCountLabel(count: number | null): string {
  return (count === null) ? 'all their tags' : `${count.toLocaleString()} ${(count === 1) ? 'tag' : 'tags'}`;
}


// The last step before deleting every tag someone owns, on top of whichever dialog asked for it
export function ConfirmDeleteUserTags({ username, count, onConfirm, onClose }: {
  username: string,
  count: number | null,
  onConfirm: () => void,
  onClose: () => void,
}) {
  return (
    <ConfirmDialog
      title={`Permanently delete ${tagCountLabel(count)}?`}
      description={
        <>
          Every tag <span className='text-white'>{username}</span> owns is deleted for good, in every server, their DMs
          and the directory, with their variables and everyone’s aliases of them. <span className='font-medium text-white'>This is permanent and can’t be undone.</span>
        </>
      }
      confirmLabel={`Yes, delete ${tagCountLabel(count)}`}
      onConfirm={onConfirm}
      onClose={onClose}
    />
  );
}


// Deletes every tag a user owns, everywhere, from the Users tab
export function DeleteUserTagsDialog({ user, onClose }: {user: AdminUserRef, onClose: () => void}) {
  const titleId = useId();
  const toast = useToast();
  const mutation = useDeleteAdminUserTagsMutation();
  const count = useUserTagCount(user.id);
  const [ confirming, setConfirming ] = useState(false);

  const submit = () => {
    mutation.mutate({userId: user.id}, {
      onSuccess: ({ count: deleted }) => {
        toast(`Deleted ${tagCountLabel(deleted)} by ${user.username}`);
        onClose();
      },
    });
  };

  return (
    <>
      <Modal labelledBy={titleId} onClose={() => !mutation.isPending && !confirming && onClose()} className='max-w-lg'>
        <form
          className='p-5 sm:p-6'
          onSubmit={(event) => {
            event.preventDefault();
            if (!mutation.isPending && count !== 0) {
              setConfirming(true);
            }
          }}
        >
          <h2 id={titleId} className='pr-10 text-lg font-semibold text-white'>Delete all of {user.username}’s tags?</h2>

          <div className='mt-3 flex flex-wrap items-center justify-between gap-3 rounded-md border border-line bg-deep p-3'>
            <UserCell user={user}/>
            <Link to={adminTagsPath(`user:${user.id}`)} className='text-sm text-brand hover:underline' onClick={onClose}>
              {(count === null) ? 'Counting tags…' : `Review ${tagCountLabel(count)}`}
            </Link>
          </div>

          <p className='mt-3 text-sm text-muted'>
            {(count === 0) ? 'They don’t own any tags.' : (
              <>
                Every tag they own is deleted, in every server, their DMs and the directory, along with its variables and
                everyone else’s aliases of it. This can’t be undone.
              </>
            )}
          </p>

          {(mutation.isError) ? (
            <p role='alert' className='mt-4 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-fg'>
              {errorMessage(mutation.error, 'Couldn’t delete their tags.')}
            </p>
          ) : null}

          <div className='mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end'>
            <button type='button' className='btn btn-secondary' onClick={onClose} disabled={mutation.isPending}>Cancel</button>
            <button type='submit' className='btn btn-danger' disabled={mutation.isPending || count === 0}>
              {(mutation.isPending) ? <Spinner className='size-4 border-white/40 border-t-white'/> : <Trash2 className='size-4'/>}
              Delete {tagCountLabel(count)}
            </button>
          </div>
        </form>
      </Modal>
      {(confirming) ? (
        <ConfirmDeleteUserTags
          username={user.username}
          count={count}
          onConfirm={() => {
            setConfirming(false);
            submit();
          }}
          onClose={() => setConfirming(false)}
        />
      ) : null}
    </>
  );
}
