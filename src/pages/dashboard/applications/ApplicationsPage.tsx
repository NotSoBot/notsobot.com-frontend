import { Blocks, Eye, Pencil, Plus, RefreshCw, Trash2, TriangleAlert } from 'lucide-react';
import { useState } from 'react';

import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { Routes } from '@/config';
import type { Application, ApplicationWithToken } from '@/lib/api';
import {
  errorMessage,
  useCreateMeApplicationMutation,
  useDeleteMeApplicationMutation,
  useMeApplicationsQuery,
  usePatchMeApplicationMutation,
  useResetMeApplicationTokenMutation,
  useRevealMeApplicationTokenMutation,
} from '@/lib/api/dashboardQueries';
import { formatDate } from '@/lib/utils';

import { CopyableValue } from '../admin/adminUi';
import { DashboardHeader, EmptyState, ErrorPanel, Skeleton } from '../ui';
import { ApplicationChips, ApplicationNameDialog, ApplicationTokenDialog, isNotSoBotApplication } from './ApplicationDialogs';


type Dialog =
  | {kind: 'create'}
  | {kind: 'rename', application: Application}
  | {kind: 'reset', application: Application}
  | {kind: 'delete', application: Application}
  | {kind: 'token', application: ApplicationWithToken, heading: string};


export function ApplicationsPage() {
  const { data, isPending, isError, error, isRefetching, refetch } = useMeApplicationsQuery();
  const create = useCreateMeApplicationMutation();
  const rename = usePatchMeApplicationMutation();
  const remove = useDeleteMeApplicationMutation();
  const reveal = useRevealMeApplicationTokenMutation();
  const reset = useResetMeApplicationTokenMutation();
  const toast = useToast();
  const [ dialog, setDialog ] = useState<Dialog | null>(null);

  const items = data?.items ?? [];
  const canCreate = !!data?.can_create;
  const atLimit = !!data && data.limit <= data.count;

  const close = () => {
    create.reset();
    rename.reset();
    remove.reset();
    reset.reset();
    setDialog(null);
  };

  const showToken = (application: Application) => {
    reveal.mutate(application.id, {
      onSuccess: (withToken) => setDialog({kind: 'token', application: withToken, heading: 'Application token'}),
      onError: (revealError) => toast(errorMessage(revealError, 'Couldn’t load the token.'), 'error'),
    });
  };

  return (
    <>
      <DashboardHeader
        title='Applications'
        description='Applications let your own code call the NotSoBot API with a bot token.'
      >
        {(data) ? (
          <button
            type='button'
            className='btn btn-primary'
            disabled={!canCreate || atLimit}
            title={(!canCreate) ? 'You don’t have API access yet' : (atLimit) ? `You can have up to ${data.limit} applications` : undefined}
            onClick={() => setDialog({kind: 'create'})}
          >
            <Plus className='size-4'/>
            New application
          </button>
        ) : null}
      </DashboardHeader>

      {(data && !canCreate) ? (
        <div role='alert' className='mb-4 flex items-start gap-3 rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-fg'>
          <TriangleAlert aria-hidden className='mt-0.5 size-5 shrink-0 text-warning'/>
          <div>
            <div className='font-semibold text-white'>You don’t have API access yet</div>
            <p className='mt-1'>
              API access is handed out by the NotSoBot team for now. Until you have it you can’t create applications or
              see their tokens, and the tokens of any you already have don’t work. Ask for it in the <a href={Routes.SUPPORT} className='font-medium text-white underline underline-offset-2 hover:text-code'>support server</a>.
            </p>
          </div>
        </div>
      ) : null}

      {(isPending) ? (
        <ListSkeleton/>
      ) : (isError) ? (
        <ErrorPanel title='Couldn’t load your applications' message={errorMessage(error)} onRetry={() => refetch()} retrying={isRefetching}/>
      ) : (!items.length) ? (
        <EmptyState icon={<Blocks className='size-10'/>} title='No applications yet'>
          {(canCreate) ? 'Create one to get a token for the NotSoBot API.' : null}
        </EmptyState>
      ) : (
        <>
          <ul className='card divide-y divide-line'>
            {items.map((application) => (
              <li key={application.id} className='flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center'>
                <div className='flex min-w-0 flex-1 items-center gap-3'>
                  <span aria-hidden className='flex size-9 shrink-0 items-center justify-center rounded-md bg-[#3ba55c]/15'>
                    <Blocks className='size-5 text-[#3ba55c]'/>
                  </span>
                  <div className='min-w-0 flex-1'>
                    <div className='flex min-w-0 items-center gap-2'>
                      <span className='truncate font-medium text-white'>{application.name}</span>
                      <ApplicationChips application={application}/>
                    </div>
                    <div className='mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-subtle'>
                      <CopyableValue value={application.id} truncate={0}/>
                      <span>Created {formatDate(application.created)}</span>
                    </div>
                  </div>
                </div>
                <div className='flex shrink-0 flex-wrap gap-1.5 sm:justify-end'>
                  <button
                    type='button'
                    className='btn btn-sm btn-secondary'
                    disabled={!canCreate || reveal.isPending}
                    title={(!canCreate) ? 'You need API access to see tokens' : undefined}
                    onClick={() => showToken(application)}
                  >
                    {(reveal.isPending && reveal.variables === application.id) ? <Spinner className='size-4'/> : <Eye className='size-4'/>}
                    Token
                  </button>
                  <button
                    type='button'
                    className='btn btn-sm btn-ghost'
                    disabled={!canCreate}
                    title={(!canCreate) ? 'You need API access to reset tokens' : 'Reset token'}
                    onClick={() => setDialog({kind: 'reset', application})}
                  >
                    <RefreshCw className='size-4'/>
                    <span className='sr-only sm:not-sr-only'>Reset</span>
                  </button>
                  <button type='button' className='btn btn-sm btn-ghost' title='Rename' onClick={() => setDialog({kind: 'rename', application})}>
                    <Pencil className='size-4'/>
                    <span className='sr-only'>Rename</span>
                  </button>
                  <button type='button' className='btn btn-sm btn-ghost text-danger' title='Delete' onClick={() => setDialog({kind: 'delete', application})}>
                    <Trash2 className='size-4'/>
                    <span className='sr-only'>Delete</span>
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <p className='mt-3 text-xs text-subtle'>
            {items.length} of {data?.limit} applications.
          </p>
        </>
      )}

      {(dialog?.kind === 'create') ? (
        <ApplicationNameDialog
          title='New application'
          submitLabel='Create'
          pending={create.isPending}
          error={(create.isError) ? errorMessage(create.error, 'Couldn’t create the application.') : null}
          onSubmit={(name) => create.mutate(name, {
            onSuccess: (application) => setDialog({kind: 'token', application, heading: 'Application created'}),
          })}
          onClose={close}
        />
      ) : (dialog?.kind === 'rename') ? (
        <ApplicationNameDialog
          title='Rename application'
          initialName={dialog.application.name}
          submitLabel='Save'
          pending={rename.isPending}
          error={(rename.isError) ? errorMessage(rename.error, 'Couldn’t rename the application.') : null}
          onSubmit={(name) => rename.mutate({applicationId: dialog.application.id, name}, {
            onSuccess: (updated) => {
              toast(`Renamed to ${updated.name}`);
              close();
            },
          })}
          onClose={close}
        />
      ) : (dialog?.kind === 'reset') ? (
        <ConfirmDialog
          title={`Reset ${dialog.application.name}’s token?`}
          description={
            <>
              The current token stops working right away, anything still using it will need the new one.
              {(isNotSoBotApplication(dialog.application)) ? <strong className='mt-2 block text-white'>This is NotSoBot’s own application: the bot loses API access until it’s given the new token.</strong> : null}
            </>
          }
          confirmLabel='Reset token'
          confirmPhrase={(isNotSoBotApplication(dialog.application)) ? dialog.application.name : undefined}
          pending={reset.isPending}
          error={(reset.isError) ? errorMessage(reset.error, 'Couldn’t reset the token.') : null}
          onConfirm={() => reset.mutate(dialog.application.id, {
            onSuccess: (application) => setDialog({kind: 'token', application, heading: 'New token'}),
          })}
          onClose={close}
        />
      ) : (dialog?.kind === 'delete') ? (
        <ConfirmDialog
          title={`Delete ${dialog.application.name}?`}
          description={
            <>
              Its token stops working right away. This can’t be undone.
              {(isNotSoBotApplication(dialog.application)) ? <strong className='mt-2 block text-white'>This is NotSoBot’s own application: the bot loses API access.</strong> : null}
            </>
          }
          confirmLabel='Delete application'
          confirmPhrase={(isNotSoBotApplication(dialog.application)) ? dialog.application.name : undefined}
          pending={remove.isPending}
          error={(remove.isError) ? errorMessage(remove.error, 'Couldn’t delete the application.') : null}
          onConfirm={() => remove.mutate(dialog.application.id, {
            onSuccess: () => {
              toast(`Deleted ${dialog.application.name}`);
              close();
            },
          })}
          onClose={close}
        />
      ) : (dialog?.kind === 'token') ? (
        <ApplicationTokenDialog application={dialog.application} heading={dialog.heading} onClose={close}/>
      ) : null}
    </>
  );
}


function ListSkeleton() {
  return (
    <div aria-hidden className='card divide-y divide-line'>
      {Array.from({length: 2}, (_, i) => (
        <div key={i} className='flex items-center gap-3 px-4 py-3'>
          <Skeleton className='size-9 rounded-md'/>
          <div className='flex-1'>
            <Skeleton className='h-4 w-40'/>
            <Skeleton className='mt-1.5 h-3 w-28 bg-surface-2'/>
          </div>
          <Skeleton className='h-8 w-24 bg-surface-2'/>
        </div>
      ))}
    </div>
  );
}
