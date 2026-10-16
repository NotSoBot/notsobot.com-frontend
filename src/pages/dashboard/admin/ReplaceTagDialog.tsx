import { ArrowRight, Replace } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';

import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import type { AdminDirectoryTag, AdminTagMergeSummary, AdminUserRef } from '@/lib/api';
import { errorMessage, useAdminTagMergePreviewQuery, useMergeAdminTagMutation } from '@/lib/api/dashboardQueries';
import { NO_AUTOFILL } from '@/lib/utils';
import { tagLocation, TagLocationLabel } from '@/pages/dashboard/tags/tagMeta';

import { Field } from '../ui';
import { UserCell } from './adminUi';


// a bare tag id, or `id:<id>` as the Tags search takes it
const TARGET_ID = /^\s*(?:(?:id|tag):\s*)?(\d{15,20})\s*$/i;


function plural(count: number, one: string, many = `${one}s`): string {
  return `${count.toLocaleString()} ${(count === 1) ? one : many}`;
}


// Replaces a tag with another one everywhere, owners only: its uses are added onto the other tag's, and its use
// history, aliases, archived assets and storage move over before it's deleted. `onReplaced` gets the tag that's left.
export function ReplaceTagDialog({ tag, onReplaced, onClose }: {
  tag: AdminDirectoryTag,
  onReplaced: (targetId: string) => void,
  onClose: () => void,
}) {
  const titleId = useId();
  const toast = useToast();
  const [ input, setInput ] = useState('');
  // the preview being confirmed, so what's replaced is always what was shown
  const [ confirming, setConfirming ] = useState<AdminTagMergeSummary | null>(null);
  const debouncedInput = useDebouncedValue(input, 300);
  const targetId = TARGET_ID.exec(debouncedInput)?.[1] ?? null;
  const preview = useAdminTagMergePreviewQuery(tag.id, targetId);
  const mutation = useMergeAdminTagMutation();
  const summary = (targetId && preview.data && !preview.isFetching) ? preview.data : null;
  const invalid = !!input.trim() && !TARGET_ID.test(input);

  const submit = (target: AdminDirectoryTag) => {
    mutation.mutate({tagId: tag.id, targetId: target.id}, {
      onSuccess: ({ target }) => {
        toast(`Replaced ${tag.name} with ${target.name}`);
        onReplaced(target.id);
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
            if (summary && !mutation.isPending) {
              setConfirming(summary);
            }
          }}
        >
          <h2 id={titleId} className='pr-10 text-lg font-semibold text-white'>
            Replace <span className='font-mono text-code'>{tag.name}</span> with another tag
          </h2>
          <p className='mt-2 text-sm text-muted'>
            Its uses are added onto the other tag, and its use history, aliases, archived assets, variables and blobs move
            over to it. Then this tag is deleted.
          </p>

          <Field
            className='mt-4'
            label='Replacement tag id'
            error={(invalid) ? 'Paste a tag id, or id:<tag id>' : (targetId && preview.isError) ? errorMessage(preview.error) : null}
          >
            {(props) => (
              <input
                {...props}
                {...NO_AUTOFILL}
                className='input font-mono'
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder='Tag id'
                inputMode='numeric'
                autoFocus
              />
            )}
          </Field>

          {(targetId && !preview.isError && !summary) ? (
            <div className='mt-4 flex items-center gap-2 text-sm text-muted'>
              <Spinner className='size-4'/>
              Checking that tag…
            </div>
          ) : (summary) ? (
            <MergeSummary summary={summary}/>
          ) : null}

          {(mutation.isError) ? (
            <p role='alert' className='mt-4 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-fg'>
              {errorMessage(mutation.error, 'Couldn’t replace the tag.')}
            </p>
          ) : null}

          <div className='mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end'>
            <button type='button' className='btn btn-secondary' onClick={onClose} disabled={mutation.isPending}>Cancel</button>
            <button type='submit' className='btn btn-danger' disabled={!summary || mutation.isPending}>
              {(mutation.isPending) ? <Spinner className='size-4 border-white/40 border-t-white'/> : <Replace className='size-4'/>}
              Replace
            </button>
          </div>
        </form>
      </Modal>
      {(confirming) ? (
        <ConfirmDialog
          title={<>Replace {tag.name} with {confirming.target.name}?</>}
          description={
            <>
              <span className='font-mono text-white'>{tag.name}</span> is deleted and everything listed moves to{' '}
              <span className='font-mono text-white'>{confirming.target.name}</span>.{' '}
              <span className='font-medium text-white'>This can’t be undone.</span>
            </>
          }
          confirmLabel='Yes, replace it'
          confirmPhrase={tag.name}
          onConfirm={() => {
            setConfirming(null);
            submit(confirming.target);
          }}
          onClose={() => setConfirming(null)}
        />
      ) : null}
    </>
  );
}


function MergeSummary({ summary }: {summary: AdminTagMergeSummary}) {
  const { source, target } = summary;
  const rows: Array<ReactNode> = [
    <>{plural(summary.uses, 'use')} added onto its {target.uses.toLocaleString()}</>,
    <>{plural(summary.use_records, 'use history record')}</>,
    <>{plural(summary.aliases, 'alias', 'aliases')} pointed at it</>,
  ];
  if (summary.assets) {
    rows.push(<>{plural(summary.assets, 'archived asset')}, links to them in its content follow</>);
  }
  for (const [ label, counts ] of [['variable', summary.variables], ['blob', summary.blobs]] as const) {
    if (counts.moved || counts.dropped) {
      rows.push(
        <>
          {plural(counts.moved, label)}
          {(counts.dropped) ? <span className='text-warning'> ({plural(counts.dropped, label)} dropped, it already has its own there)</span> : null}
        </>,
      );
    }
  }

  return (
    <div className='mt-4 space-y-3'>
      <div className='flex items-center gap-2 rounded-md border border-line bg-deep p-3'>
        <TagSummary tag={source}/>
        <ArrowRight aria-hidden className='size-4 shrink-0 text-subtle'/>
        <TagSummary tag={target}/>
      </div>
      <div>
        <h3 className='section-label mb-1.5'>Moves to {target.name}</h3>
        <ul className='list-disc space-y-1 pl-5 text-sm text-fg'>
          {rows.map((row, i) => <li key={i}>{row}</li>)}
        </ul>
        {(summary.directory) ? (
          <p className='mt-2 text-sm text-warning'>Its directory listing is deleted with it, the listing doesn’t move.</p>
        ) : null}
      </div>
    </div>
  );
}


function TagSummary({ tag }: {tag: AdminDirectoryTag}) {
  const user = (tag.user as AdminUserRef | null | undefined) ?? null;
  const location = tagLocation({server_id: tag.server_id, guild_id: tag.guild_id ?? null}, (user) ? {id: user.id, channel_id: null} : null);
  return (
    <div className='min-w-0 flex-1 space-y-1'>
      <p className='truncate font-mono text-sm font-medium text-code' title={tag.name}>{tag.name}</p>
      <UserCell user={user} size='sm'/>
      <TagLocationLabel location={location} className='flex min-w-0 items-center gap-1 text-xs text-muted'/>
    </div>
  );
}
