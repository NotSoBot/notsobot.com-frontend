import { Ban, ShieldCheck } from 'lucide-react';
import { useId, useState } from 'react';

import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import type { AdminUserRef } from '@/lib/api';
import { errorMessage, usePatchAdminUserMutation } from '@/lib/api/dashboardQueries';

import { UserCell } from './adminUi';


export const BLOCK_REASON_MAX = 2000;


// Blocks (with a reason) or unblocks someone from NotSoBot. `blocked` is the user's current state, so the
// dialog does the opposite of it.
export function BlockUserDialog({ user, blocked, blockedReason, defaultReason = '', onClose }: {
  user: AdminUserRef,
  blocked: boolean,
  blockedReason?: string | null,
  defaultReason?: string,
  onClose: () => void,
}) {
  const titleId = useId();
  const reasonId = useId();
  const toast = useToast();
  const mutation = usePatchAdminUserMutation();
  const [ reason, setReason ] = useState(defaultReason);

  const submit = () => {
    const patch = (blocked) ? {blocked: false, blocked_reason: null} : {blocked: true, blocked_reason: reason.trim() || null};
    mutation.mutate({userId: user.id, patch}, {
      onSuccess: () => {
        toast((blocked) ? `Unblocked ${user.username}` : `Blocked ${user.username}`);
        onClose();
      },
    });
  };

  return (
    <Modal labelledBy={titleId} onClose={() => !mutation.isPending && onClose()} className='max-w-lg'>
      <form
        className='p-5 sm:p-6'
        onSubmit={(event) => {
          event.preventDefault();
          if (!mutation.isPending) {
            submit();
          }
        }}
      >
        <h2 id={titleId} className='pr-10 text-lg font-semibold text-white'>
          {(blocked) ? `Unblock ${user.username}?` : `Block ${user.username} from NotSoBot?`}
        </h2>

        <div className='mt-3 rounded-md border border-line bg-deep p-3'>
          <UserCell user={user}/>
          {(blocked && blockedReason) ? (
            <p className='mt-2 text-sm break-words text-muted'><span className='text-subtle'>Blocked for: </span>{blockedReason}</p>
          ) : null}
        </div>

        {(blocked) ? (
          <p className='mt-3 text-sm text-muted'>They’ll be able to use NotSoBot again.</p>
        ) : (
          <>
            <p className='mt-3 text-sm text-muted'>Stops them from using NotSoBot anywhere.</p>
            <label htmlFor={reasonId} className='mt-3 mb-1.5 block text-sm text-muted'>Block reason</label>
            <textarea
              id={reasonId}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={BLOCK_REASON_MAX}
              rows={2}
              disabled={mutation.isPending}
              className='input'
              autoFocus
            />
          </>
        )}

        {(mutation.isError) ? (
          <p role='alert' className='mt-4 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-fg'>
            {errorMessage(mutation.error, (blocked) ? 'Couldn’t unblock the user.' : 'Couldn’t block the user.')}
          </p>
        ) : null}

        <div className='mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end'>
          <button type='button' className='btn btn-secondary' onClick={onClose} disabled={mutation.isPending}>Cancel</button>
          <button type='submit' className={(blocked) ? 'btn btn-primary' : 'btn btn-danger'} disabled={mutation.isPending}>
            {(mutation.isPending) ? <Spinner className='size-4 border-white/40 border-t-white'/> : (blocked) ? <ShieldCheck className='size-4'/> : <Ban className='size-4'/>}
            {(blocked) ? 'Unblock' : 'Block'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
