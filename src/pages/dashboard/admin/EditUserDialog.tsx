import { Save } from 'lucide-react';
import { useId, useState } from 'react';

import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { UserFlags, UserPremiumTypes, type AdminUser } from '@/lib/api';
import { errorMessage, usePatchAdminUserMutation } from '@/lib/api/dashboardQueries';

import { premiumLabel } from '../premium';
import { Toggle } from '../ui';
import { UserCell } from './adminUi';


// flags owners can hand out from the dashboard; OWNER itself is database-only (the API ignores changes to it)
const EDITABLE_FLAGS: Array<{flag: number, label: string, description: string}> = [
  {flag: UserFlags.MODERATOR, label: 'Moderator', description: 'Can use the admin panel: review tags, content flags and reports, and block users.'},
  {flag: UserFlags.API_ACCESS, label: 'API access', description: 'Can create API applications. Their applications’ tokens only work while they have it.'},
];

const PREMIUM_TYPES = Object.values(UserPremiumTypes);


// Owner only: edits a user's flags and premium type
export function EditUserDialog({ user, onClose }: {user: AdminUser, onClose: () => void}) {
  const titleId = useId();
  const premiumId = useId();
  const toast = useToast();
  const mutation = usePatchAdminUserMutation();
  const [ flags, setFlags ] = useState(user.flags);
  const [ premiumType, setPremiumType ] = useState(user.premium_type ?? UserPremiumTypes.NONE);

  const changed = flags !== user.flags || premiumType !== (user.premium_type ?? UserPremiumTypes.NONE);

  const submit = () => {
    mutation.mutate({userId: user.id, patch: {flags, premium_type: premiumType}}, {
      onSuccess: () => {
        toast(`Updated ${user.username}`);
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
          if (!mutation.isPending && changed) {
            submit();
          }
        }}
      >
        <h2 id={titleId} className='pr-10 text-lg font-semibold text-white'>Edit {user.username}</h2>

        <div className='mt-3 rounded-md border border-line bg-deep p-3'>
          <UserCell user={user}/>
        </div>

        <label htmlFor={premiumId} className='mt-4 mb-1.5 block text-sm text-muted'>Premium</label>
        <select
          id={premiumId}
          className='input'
          value={premiumType}
          disabled={mutation.isPending}
          onChange={(event) => setPremiumType(Number(event.target.value))}
        >
          {PREMIUM_TYPES.map((value) => <option key={value} value={value}>{premiumLabel(value)}</option>)}
        </select>

        <h3 className='mt-5 mb-2 text-sm text-muted'>Flags</h3>
        <div className='space-y-3 rounded-md border border-line bg-surface p-3'>
          <Toggle
            label='Owner'
            description='Can only be changed in the database.'
            checked={(flags & UserFlags.OWNER) === UserFlags.OWNER}
            onChange={() => {}}
            disabled
          />
          {EDITABLE_FLAGS.map(({ flag, label, description }) => (
            <Toggle
              key={flag}
              label={label}
              description={description}
              checked={(flags & flag) === flag}
              disabled={mutation.isPending}
              onChange={(value) => setFlags((current) => (value) ? (current | flag) : (current & ~flag))}
            />
          ))}
        </div>

        {(mutation.isError) ? (
          <p role='alert' className='mt-4 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-fg'>
            {errorMessage(mutation.error, 'Couldn’t update the user.')}
          </p>
        ) : null}

        <div className='mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end'>
          <button type='button' className='btn btn-secondary' onClick={onClose} disabled={mutation.isPending}>Cancel</button>
          <button type='submit' className='btn btn-primary' disabled={mutation.isPending || !changed}>
            {(mutation.isPending) ? <Spinner className='size-4 border-white/40 border-t-white'/> : <Save className='size-4'/>}
            Save
          </button>
        </div>
      </form>
    </Modal>
  );
}
