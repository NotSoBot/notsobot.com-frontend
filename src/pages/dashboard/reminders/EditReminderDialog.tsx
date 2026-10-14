import type { UseMutationResult } from '@tanstack/react-query';
import { Save } from 'lucide-react';
import { useEffect, useId, useState } from 'react';

import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import type { Reminder } from '@/lib/api';
import { errorMessage, type ReminderEdit } from '@/lib/api/dashboardQueries';

import { CharCounter, Field, Toggle } from '../ui';


export const REMINDER_CONTENT_MAX_LENGTH = 512;


// Changes a reminder's text and/or moves a server reminder to the user's dms (the time is still changed with the bot)
export function EditReminderDialog({ reminder, where, mutation, onClose }: {
  reminder: Reminder,
  // "Cool Gamers Club", shown on the move-to-dms toggle
  where: string,
  mutation: UseMutationResult<Reminder, Error, ReminderEdit>,
  onClose: () => void,
}) {
  const titleId = useId();
  const toast = useToast();
  const [ content, setContent ] = useState(reminder.content);
  const [ moveToDms, setMoveToDms ] = useState(false);

  // the mutation belongs to the page, so drop an error left over from the last reminder edited
  useEffect(() => {
    mutation.reset();
    // only when the dialog opens
  }, []);

  const tooLong = REMINDER_CONTENT_MAX_LENGTH < content.length;
  const contentChanged = content !== reminder.content;
  const changed = contentChanged || moveToDms;

  const submit = () => {
    const edit: ReminderEdit = {reminderId: reminder.id};
    if (contentChanged) {
      edit.content = content;
    }
    if (moveToDms) {
      edit.move_to_dms = true;
    }
    mutation.mutate(edit, {
      onSuccess: () => {
        toast((moveToDms) ? 'Reminder saved and moved to your DMs' : 'Reminder saved');
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
          if (!mutation.isPending && !tooLong && changed) {
            submit();
          }
        }}
      >
        <h2 id={titleId} className='pr-10 text-lg font-semibold text-white'>Edit reminder</h2>

        <Field
          className='mt-4'
          label='Message'
          hint='What the bot reminds you of. Leave it empty to just get pinged.'
          error={(tooLong) ? `Reminders can be up to ${REMINDER_CONTENT_MAX_LENGTH} characters.` : undefined}
          counter={<CharCounter length={content.length} max={REMINDER_CONTENT_MAX_LENGTH}/>}
        >
          {(props) => (
            <textarea
              {...props}
              className='input min-h-28 resize-y'
              value={content}
              disabled={mutation.isPending}
              onChange={(event) => setContent(event.target.value)}
            />
          )}
        </Field>

        {(reminder.guild_id) ? (
          <div className='mt-5'>
            <Toggle
              checked={moveToDms}
              onChange={setMoveToDms}
              disabled={mutation.isPending}
              label='Send it in my DMs instead'
              description={<>It won’t be sent in {where} anymore. This can’t be undone from here.</>}
            />
          </div>
        ) : null}

        {(mutation.isError) ? (
          <p role='alert' className='mt-4 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-fg'>
            {errorMessage(mutation.error, 'Couldn’t save the reminder.')}
          </p>
        ) : null}

        <div className='mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end'>
          <button type='button' className='btn btn-secondary' onClick={onClose} disabled={mutation.isPending}>Cancel</button>
          <button type='submit' className='btn btn-primary' disabled={mutation.isPending || tooLong || !changed}>
            {(mutation.isPending) ? <Spinner className='size-4 border-white/40 border-t-white'/> : <Save className='size-4'/>}
            Save
          </button>
        </div>
      </form>
    </Modal>
  );
}
