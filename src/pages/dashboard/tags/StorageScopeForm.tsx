import { useEffect, useState } from 'react';

import type { TagStorageScope } from '@/lib/api';

import { Field } from '../ui';
import { isSnowflake } from './tagMeta';


// Tags store variables/blobs per user, channel and server id (plus one global slot). The API has no
// list of every id a tag was used with, so the dashboard asks which ones to look at.
export function StorageScopeForm({ scope, onChange }: {scope: TagStorageScope, onChange: (scope: TagStorageScope) => void}) {
  const [ userId, setUserId ] = useState(scope.user_id ?? '');
  const [ guildId, setGuildId ] = useState(scope.guild_id ?? '');
  const [ channelId, setChannelId ] = useState(scope.channel_id ?? '');

  // keep both copies of this form (variables + blobs tabs) in sync
  useEffect(() => {
    setUserId(scope.user_id ?? '');
    setGuildId(scope.guild_id ?? '');
    setChannelId(scope.channel_id ?? '');
  }, [scope]);

  const errors = {
    user: (userId && !isSnowflake(userId)) ? 'Not a valid user ID' : null,
    guild: (guildId && !isSnowflake(guildId)) ? 'Not a valid server ID' : null,
    channel: (channelId && !isSnowflake(channelId)) ? 'Not a valid channel ID' : null,
  };
  const changed = userId !== (scope.user_id ?? '') || guildId !== (scope.guild_id ?? '') || channelId !== (scope.channel_id ?? '');
  const valid = !errors.user && !errors.guild && !errors.channel;

  return (
    <form
      className='card p-4'
      onSubmit={(event) => {
        event.preventDefault();
        if (valid) {
          onChange({user_id: userId || undefined, guild_id: guildId || undefined, channel_id: channelId || undefined});
        }
      }}
    >
      <p className='mb-3 text-sm text-muted'>
        Global storage is always shown. Enter the IDs of where the tag runs to see user, server and channel storage.
      </p>
      <div className='grid grid-cols-1 gap-3 sm:grid-cols-3'>
        <Field label='User ID' error={errors.user} hint='Defaults to you.'>
          {(props) => <input {...props} className='input font-mono' inputMode='numeric' value={userId} onChange={(event) => setUserId(event.target.value.trim())}/>}
        </Field>
        <Field label='Server ID' error={errors.guild}>
          {(props) => <input {...props} className='input font-mono' inputMode='numeric' placeholder='Optional' value={guildId} onChange={(event) => setGuildId(event.target.value.trim())}/>}
        </Field>
        <Field label='Channel ID' error={errors.channel}>
          {(props) => <input {...props} className='input font-mono' inputMode='numeric' placeholder='Optional' value={channelId} onChange={(event) => setChannelId(event.target.value.trim())}/>}
        </Field>
      </div>
      <div className='mt-3 flex justify-end'>
        <button type='submit' className='btn btn-secondary btn-sm' disabled={!changed || !valid}>Load storage</button>
      </div>
    </form>
  );
}


// storage id per type for a scope (global is always 0); null when that id wasn't given
export function storageIdFor(scope: TagStorageScope, type: number): string | null {
  switch (type) {
    case 0: return scope.user_id || null;
    case 1: return scope.channel_id || null;
    case 2: return scope.guild_id || null;
    default: return '0';
  }
}
