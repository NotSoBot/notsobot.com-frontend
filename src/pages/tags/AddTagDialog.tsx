import { CheckCircle2, TriangleAlert } from 'lucide-react';
import { useId, useState } from 'react';

import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { ApiErrorCodes, ApiRequestError, TagDirectoryVerificationStates, type Tag } from '@/lib/api';
import { errorMessage, isDiscordGrantError, isScopeMismatch, useAddMeTagMutation, useMeGuildsQuery } from '@/lib/api/dashboardQueries';
import { CharCounter } from '@/pages/dashboard/ui';


const DM_DESTINATION = 'dm';
const NAME_MAX = 64;


// the api's own message is more specific than the dashboard's generic one for these
function addErrorMessage(error: unknown): string {
  if (error instanceof ApiRequestError && error.body?.message) {
    if (error.code === ApiErrorCodes.TAG_NAME_TAKEN || (error.code === ApiErrorCodes.MISSING_ACCESS && error.status === 400)) {
      return error.body.message;
    }
  }
  return errorMessage(error, 'Couldn’t add the tag.');
}


// Adds a directory tag to one of your servers or your DMs with NotSoBot, as an alias (same as the bot's `tag get`).
// `verified` is the listing's `TagDirectoryVerificationStates`, anything short of verified gets a warning first.
export function AddTagDialog({ tag, verified, onClose }: {tag: Pick<Tag, 'id' | 'name'>, verified: number, onClose: () => void}) {
  const titleId = useId();
  const destinationId = useId();
  const nameId = useId();

  const guilds = useMeGuildsQuery();
  const add = useAddMeTagMutation(tag.id);
  const [ destination, setDestination ] = useState(DM_DESTINATION);
  const [ name, setName ] = useState(tag.name);
  const [ added, setAdded ] = useState<{tag: Tag, where: string} | null>(null);

  const trimmedName = name.trim();
  const guildsError = (guilds.isError) ? (
    (isScopeMismatch(guilds.error) || isDiscordGrantError(guilds.error)) ?
      'Log in again to see your servers.' :
      errorMessage(guilds.error, 'Couldn’t load your servers.')
  ) : null;

  const submit = () => {
    const guild = guilds.data?.find((item) => item.id === destination);
    add.mutate({
      guild_id: (destination === DM_DESTINATION) ? undefined : destination,
      name: (trimmedName && trimmedName.toLowerCase() !== tag.name) ? trimmedName : undefined,
    }, {
      onSuccess: (created) => setAdded({tag: created, where: (guild) ? guild.name : 'your DMs'}),
    });
  };

  return (
    <Modal labelledBy={titleId} onClose={() => !add.isPending && onClose()} className='max-w-md'>
      {(added) ? (
        <div className='p-5 sm:p-6'>
          <h2 id={titleId} className='flex items-center gap-2 pr-10 text-lg font-semibold text-white'>
            <CheckCircle2 aria-hidden className='size-5 text-success'/>
            Tag added
          </h2>
          <p className='mt-2 text-sm text-muted'>
            Added <span className='font-mono text-white'>{added.tag.name}</span> to <span className='text-white'>{added.where}</span>.
            Run it with <span className='font-mono text-white'>/tag show {added.tag.name}</span>.
          </p>
          <div className='mt-6 flex justify-end'>
            <button type='button' className='btn btn-primary' onClick={onClose}>Done</button>
          </div>
        </div>
      ) : (
        <form
          className='p-5 sm:p-6'
          onSubmit={(event) => {
            event.preventDefault();
            if (trimmedName && !add.isPending) {
              submit();
            }
          }}
        >
          <h2 id={titleId} className='pr-10 text-lg font-semibold text-white'>Add “{tag.name}”</h2>
          <p className='mt-2 text-sm text-muted'>Adds the tag as an alias, so it stays up to date when its owner edits it.</p>

          {(verified !== TagDirectoryVerificationStates.VERIFIED) ? (
            <p role='alert' className='mt-4 flex gap-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-fg'>
              <TriangleAlert aria-hidden className='mt-0.5 size-4 shrink-0 text-warning'/>
              <span>
                <span className='font-medium text-white'>
                  {(verified === TagDirectoryVerificationStates.PENDING_VERIFICATION) ? 'This tag is still waiting for review.' : 'This tag is unverified.'}
                </span>{' '}
                NotSoBot staff haven’t checked it, so it might be harmful or spam, and its owner can change what it does at any
                time. Only add it if you trust it.
              </span>
            </p>
          ) : null}

          <div className='mt-5 space-y-4'>
            <div>
              <label htmlFor={destinationId} className='mb-1.5 block text-sm text-muted'>Add to</label>
              <select
                id={destinationId}
                value={destination}
                onChange={(event) => setDestination(event.target.value)}
                disabled={add.isPending}
                className='input'
              >
                <option value={DM_DESTINATION}>Your DMs with NotSoBot</option>
                {(guilds.data?.length) ? (
                  <optgroup label='Servers'>
                    {guilds.data.map((guild) => <option key={guild.id} value={guild.id}>{guild.name}</option>)}
                  </optgroup>
                ) : null}
              </select>
              {(guilds.isPending) ? (
                <p className='mt-1.5 flex items-center gap-2 text-xs text-subtle'><Spinner className='size-3'/> Loading your servers…</p>
              ) : (guildsError) ? (
                <p className='mt-1.5 text-xs text-warning'>{guildsError}</p>
              ) : (!guilds.data?.length) ? (
                <p className='mt-1.5 text-xs text-subtle'>NotSoBot isn’t in any of your servers.</p>
              ) : null}
            </div>

            <div>
              <div className='mb-1.5 flex items-baseline justify-between gap-3'>
                <label htmlFor={nameId} className='text-sm text-muted'>Name</label>
                <span className='shrink-0 text-xs text-subtle tabular-nums'><CharCounter length={name.length} max={NAME_MAX}/></span>
              </div>
              <input
                id={nameId}
                value={name}
                onChange={(event) => setName(event.target.value.replace(/[\r\n]/g, ''))}
                maxLength={NAME_MAX}
                disabled={add.isPending}
                autoComplete='off'
                spellCheck={false}
                className='input font-mono'
              />
              <p className='mt-1.5 text-xs text-subtle'>Change it if the name is already taken where you’re adding it.</p>
            </div>
          </div>

          {(add.isError) ? (
            <p role='alert' className='mt-4 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-fg'>{addErrorMessage(add.error)}</p>
          ) : null}

          <div className='mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end'>
            <button type='button' className='btn btn-secondary' onClick={onClose} disabled={add.isPending}>Cancel</button>
            <button type='submit' className='btn btn-primary' disabled={!trimmedName || add.isPending}>
              {(add.isPending) ? <Spinner className='size-4 border-white/40 border-t-white'/> : null}
              Add tag
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
