import { Ban, Blocks, CircleCheck, KeyRound, Pencil, Plus, RefreshCw, Trash2, UserMinus, X } from 'lucide-react';
import { useId, useState } from 'react';

import { isOwner, useAuth } from '@/auth';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Modal } from '@/components/ui/Modal';
import { SearchInput } from '@/components/ui/SearchInput';
import { Segmented } from '@/components/ui/Segmented';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import type { AdminApplication, ApplicationAccessItem } from '@/lib/api';
import {
  ADMIN_PAGE_SIZE,
  errorMessage,
  useAdminApplicationAccessQuery,
  useAdminApplicationsQuery,
  useDeleteAdminApplicationMutation,
  useGrantApplicationAccessMutation,
  usePatchAdminApplicationMutation,
  useRenameAdminApplicationMutation,
  useResetAdminApplicationTokenMutation,
  useRevokeApplicationAccessMutation,
} from '@/lib/api/dashboardQueries';
import { cn, NO_AUTOFILL } from '@/lib/utils';

import { ApplicationChips, ApplicationNameDialog, isApplicationDisabled, isNotSoBotApplication } from '../applications/ApplicationDialogs';
import { DashboardHeader, EmptyState, ErrorPanel, Field, Skeleton } from '../ui';
import { CopyableValue, ExactDate, Pagination, useSearchParamState, useStepBackFromEmptyPage, UserCell } from './adminUi';


type Tab = 'applications' | 'access';

const TABS: Array<{value: Tab, label: string}> = [
  {value: 'applications', label: 'Applications'},
  {value: 'access', label: 'API access'},
];

const STATUSES = [
  {value: '', label: 'All'},
  {value: 'enabled', label: 'Enabled'},
  {value: 'disabled', label: 'Disabled'},
];


export function AdminApplicationsPage() {
  const state = useSearchParamState();
  const tab: Tab = (state.searchParams.get('tab') === 'access') ? 'access' : 'applications';

  return (
    <>
      <DashboardHeader
        title='Applications'
        description='Every API application, and who can make them. Staff never see tokens: resetting one only revokes the old token.'
      />
      <div className='mb-4 flex'>
        <Segmented
          label='Show'
          value={tab}
          options={TABS}
          onChange={(value) => state.update({tab: (value === 'access') ? 'access' : null, q: null, user_id: null, status: null})}
        />
      </div>
      {(tab === 'access') ? <AccessTab state={state}/> : <ApplicationsTab state={state}/>}
    </>
  );
}


type SearchParamState = ReturnType<typeof useSearchParamState>;

type ApplicationDialog =
  | {kind: 'rename', application: AdminApplication}
  | {kind: 'disable', application: AdminApplication}
  | {kind: 'reset', application: AdminApplication}
  | {kind: 'delete', application: AdminApplication};


function ApplicationsTab({ state }: {state: SearchParamState}) {
  const { searchParams, page, update, setPage } = state;
  const { user: me } = useAuth();
  const toast = useToast();
  const query = searchParams.get('q') || '';
  const userId = searchParams.get('user_id') || '';
  const status = searchParams.get('status') || '';
  const debouncedQuery = useDebouncedValue(query.trim(), 300);

  const { data, isPending, isError, error, isPlaceholderData, isFetching, isRefetching, refetch } = useAdminApplicationsQuery({
    query: debouncedQuery,
    userId,
    disabled: (status === 'disabled') ? true : (status === 'enabled') ? false : null,
    page,
  });
  const patch = usePatchAdminApplicationMutation();
  const rename = useRenameAdminApplicationMutation();
  const reset = useResetAdminApplicationTokenMutation();
  const remove = useDeleteAdminApplicationMutation();
  const [ dialog, setDialog ] = useState<ApplicationDialog | null>(null);

  const items = data?.items ?? [];
  const steppingBack = useStepBackFromEmptyPage({page, setPage, data, isPlaceholderData, pageSize: ADMIN_PAGE_SIZE});
  const pagination = {
    page,
    count: data?.count ?? 0,
    pageSize: ADMIN_PAGE_SIZE,
    onChange: setPage,
    fetching: isFetching && isPlaceholderData,
  };

  const close = () => {
    patch.reset();
    rename.reset();
    reset.reset();
    remove.reset();
    setDialog(null);
  };

  const setDisabled = (application: AdminApplication, disabled: boolean) => {
    patch.mutate({applicationId: application.id, patch: {disabled}}, {
      onSuccess: () => {
        toast((disabled) ? `Disabled ${application.name}` : `Enabled ${application.name}`);
        close();
      },
      onError: (patchError) => {
        if (!disabled) {
          toast(errorMessage(patchError, 'Couldn’t enable the application.'), 'error');
        }
      },
    });
  };

  return (
    <>
      <div className='mb-4 space-y-3'>
        <div className='flex flex-col gap-3 sm:flex-row sm:items-center'>
          <SearchInput
            className='flex-1'
            value={query}
            onValueChange={(value) => update({q: value})}
            placeholder='Search by name, owner, or id...'
            aria-label='Search applications'
          />
          <Segmented label='Status' value={status} options={STATUSES} onChange={(value) => update({status: value || null})}/>
        </div>
        {(userId) ? (
          <div className='flex items-center gap-2 text-sm text-muted'>
            Owner
            <button
              type='button'
              className='inline-flex items-center gap-1 rounded-md border border-line bg-surface-2 px-2 py-1 font-mono text-xs text-fg hover:border-line-strong'
              onClick={() => update({user_id: null})}
              title='Clear the owner filter'
            >
              {userId}
              <X aria-label='Clear' className='size-3.5'/>
            </button>
          </div>
        ) : null}
      </div>

      {(isPending || steppingBack) ? (
        <TableSkeleton/>
      ) : (isError && !items.length) ? (
        <ErrorPanel title='Couldn’t load applications' message={errorMessage(error)} onRetry={() => refetch()} retrying={isRefetching}/>
      ) : (!items.length) ? (
        <EmptyState icon={<Blocks className='size-10'/>} title='No applications found'>
          {(debouncedQuery || userId || status) ? 'Try a different search.' : null}
        </EmptyState>
      ) : (
        <>
          <Pagination {...pagination} className='mt-0 mb-4'/>
          <div className={cn('card overflow-x-auto transition-opacity', isPlaceholderData && 'opacity-60')}>
            <table className='w-full min-w-[820px] text-left text-sm'>
              <thead className='border-b border-line text-xs text-subtle uppercase'>
                <tr>
                  <th scope='col' className='px-4 py-2.5 font-medium'>Application</th>
                  <th scope='col' className='px-4 py-2.5 font-medium'>Owner</th>
                  <th scope='col' className='px-4 py-2.5 font-medium'>Created</th>
                  <th scope='col' className='px-4 py-2.5 font-medium'><span className='sr-only'>Actions</span></th>
                </tr>
              </thead>
              <tbody className='divide-y divide-line'>
                {items.map((application) => {
                  const notsobot = isNotSoBotApplication(application);
                  const disabled = isApplicationDisabled(application);
                  // the bot's own applications are owners only, and can only be renamed from here
                  const locked = notsobot && !isOwner(me);
                  return (
                    <tr key={application.id} className='align-middle hover:bg-surface-2'>
                      <td className='max-w-72 px-4 py-3'>
                        <div className='flex min-w-0 items-center gap-2'>
                          <span className='truncate font-medium text-white' title={application.name}>{application.name}</span>
                          <ApplicationChips application={application}/>
                        </div>
                        <CopyableValue value={application.id} truncate={0} className='mt-0.5'/>
                      </td>
                      <td className='px-4 py-3'>
                        {(application.user) ? (
                          <button
                            type='button'
                            className='-m-1 cursor-pointer rounded-md p-1 text-left hover:bg-surface-3'
                            title='Show only this user’s applications'
                            onClick={() => update({user_id: application.user?.id ?? null, q: null})}
                          >
                            <UserCell user={application.user}/>
                          </button>
                        ) : <UserCell user={null} fallbackId={application.owner_id}/>}
                      </td>
                      <td className='px-4 py-3 whitespace-nowrap text-muted'>
                        <ExactDate value={application.created}/>
                      </td>
                      <td className='px-4 py-3'>
                        {(locked) ? (
                          <span className='block text-right text-xs text-subtle'>Owners only</span>
                        ) : (
                          <div className='flex justify-end gap-1'>
                            <button type='button' className='btn btn-sm btn-ghost' title='Rename' onClick={() => setDialog({kind: 'rename', application})}>
                              <Pencil className='size-4'/>
                              <span className='sr-only'>Rename</span>
                            </button>
                            {(!notsobot) ? (
                              <>
                                {(disabled) ? (
                                  <button
                                    type='button'
                                    className='btn btn-sm btn-ghost'
                                    disabled={patch.isPending}
                                    onClick={() => setDisabled(application, false)}
                                  >
                                    {(patch.isPending && patch.variables?.applicationId === application.id) ? <Spinner className='size-4'/> : <CircleCheck className='size-4'/>}
                                    Enable
                                  </button>
                                ) : (
                                  <button type='button' className='btn btn-sm btn-ghost' onClick={() => setDialog({kind: 'disable', application})}>
                                    <Ban className='size-4'/>
                                    Disable
                                  </button>
                                )}
                                <button type='button' className='btn btn-sm btn-ghost' title='Reset token' onClick={() => setDialog({kind: 'reset', application})}>
                                  <RefreshCw className='size-4'/>
                                  <span className='sr-only'>Reset token</span>
                                </button>
                                <button type='button' className='btn btn-sm btn-ghost text-danger' title='Delete' onClick={() => setDialog({kind: 'delete', application})}>
                                  <Trash2 className='size-4'/>
                                  <span className='sr-only'>Delete</span>
                                </button>
                              </>
                            ) : null}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination {...pagination}/>
        </>
      )}

      {(dialog?.kind === 'rename') ? (
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
      ) : (dialog?.kind === 'disable') ? (
        <ConfirmDialog
          title={`Disable ${dialog.application.name}?`}
          description='Its token stops working until it’s enabled again. The owner can still see it, but can’t turn it back on.'
          confirmLabel='Disable'
          pending={patch.isPending}
          error={(patch.isError) ? errorMessage(patch.error, 'Couldn’t disable the application.') : null}
          onConfirm={() => setDisabled(dialog.application, true)}
          onClose={close}
        />
      ) : (dialog?.kind === 'reset') ? (
        <ConfirmDialog
          title={`Reset ${dialog.application.name}’s token?`}
          description='The current token stops working right away. You won’t see the new one; the owner can get it from their dashboard.'
          confirmLabel='Reset token'
          pending={reset.isPending}
          error={(reset.isError) ? errorMessage(reset.error, 'Couldn’t reset the token.') : null}
          onConfirm={() => reset.mutate(dialog.application.id, {
            onSuccess: () => {
              toast(`Reset ${dialog.application.name}’s token`);
              close();
            },
          })}
          onClose={close}
        />
      ) : (dialog?.kind === 'delete') ? (
        <ConfirmDialog
          title={`Delete ${dialog.application.name}?`}
          description='Its token stops working and the owner loses the application. This can’t be undone.'
          confirmLabel='Delete application'
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
      ) : null}
    </>
  );
}


function AccessTab({ state }: {state: SearchParamState}) {
  const { searchParams, page, update, setPage } = state;
  const { user: me } = useAuth();
  // moderators can see who has API access, only owners can give or take it
  const canEdit = isOwner(me);
  const toast = useToast();
  const query = searchParams.get('q') || '';
  const debouncedQuery = useDebouncedValue(query.trim(), 300);

  const { data, isPending, isError, error, isPlaceholderData, isFetching, isRefetching, refetch } = useAdminApplicationAccessQuery({
    query: debouncedQuery,
    page,
  });
  const revoke = useRevokeApplicationAccessMutation();
  const [ granting, setGranting ] = useState(false);
  const [ revoking, setRevoking ] = useState<ApplicationAccessItem | null>(null);

  const items = data?.items ?? [];
  const steppingBack = useStepBackFromEmptyPage({page, setPage, data, isPlaceholderData, pageSize: ADMIN_PAGE_SIZE});
  const pagination = {
    page,
    count: data?.count ?? 0,
    pageSize: ADMIN_PAGE_SIZE,
    onChange: setPage,
    fetching: isFetching && isPlaceholderData,
  };

  return (
    <>
      <div className='mb-4 flex flex-col gap-3 sm:flex-row sm:items-center'>
        <SearchInput
          className='flex-1'
          value={query}
          onValueChange={(value) => update({q: value})}
          placeholder='Search by username or id...'
          aria-label='Search users with API access'
        />
        {(canEdit) ? (
          <button type='button' className='btn btn-primary shrink-0' onClick={() => setGranting(true)}>
            <Plus className='size-4'/>
            Grant access
          </button>
        ) : null}
      </div>
      <p className='mb-4 text-sm text-muted'>
        Users here can create applications, and their applications’ tokens work. Taking access away pauses their
        applications until it’s given back. Bot owners always have it, so they aren’t listed.
        {(!canEdit) ? ' Only bot owners can give or take API access.' : null}
      </p>

      {(isPending || steppingBack) ? (
        <TableSkeleton/>
      ) : (isError && !items.length) ? (
        <ErrorPanel title='Couldn’t load users with API access' message={errorMessage(error)} onRetry={() => refetch()} retrying={isRefetching}/>
      ) : (!items.length) ? (
        <EmptyState icon={<KeyRound className='size-10'/>} title={(debouncedQuery) ? 'No users found' : 'Nobody has API access yet'}>
          {(debouncedQuery) ? 'Try a different search.' : (canEdit) ? 'Grant it to a user by their id.' : null}
        </EmptyState>
      ) : (
        <>
          <Pagination {...pagination} className='mt-0 mb-4'/>
          <div className={cn('card overflow-x-auto transition-opacity', isPlaceholderData && 'opacity-60')}>
            <table className='w-full min-w-[560px] text-left text-sm'>
              <thead className='border-b border-line text-xs text-subtle uppercase'>
                <tr>
                  <th scope='col' className='px-4 py-2.5 font-medium'>User</th>
                  <th scope='col' className='px-4 py-2.5 font-medium'>Applications</th>
                  <th scope='col' className='px-4 py-2.5 font-medium'><span className='sr-only'>Actions</span></th>
                </tr>
              </thead>
              <tbody className='divide-y divide-line'>
                {items.map((item) => (
                  <tr key={item.user.id} className='align-middle hover:bg-surface-2'>
                    <td className='px-4 py-3'><UserCell user={item.user}/></td>
                    <td className='px-4 py-3'>
                      {(item.applications) ? (
                        <button
                          type='button'
                          className='cursor-pointer text-fg tabular-nums underline-offset-2 hover:underline'
                          title='Show their applications'
                          onClick={() => update({tab: null, q: null, user_id: item.user.id})}
                        >
                          {item.applications.toLocaleString()}
                        </button>
                      ) : <span className='text-subtle'>None</span>}
                    </td>
                    <td className='px-4 py-3 text-right'>
                      {(canEdit) ? (
                        <button type='button' className='btn btn-sm btn-ghost text-danger' onClick={() => setRevoking(item)}>
                          <UserMinus className='size-4'/>
                          Revoke
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination {...pagination}/>
        </>
      )}

      {(granting) ? <GrantAccessDialog onClose={() => setGranting(false)}/> : null}
      {(revoking) ? (
        <ConfirmDialog
          title={`Revoke ${revoking.user.username}’s API access?`}
          description={
            <>
              They won’t be able to create applications or see tokens.
              {(revoking.applications) ? ` Their ${revoking.applications.toLocaleString()} application${(revoking.applications === 1) ? '' : 's'} stop${(revoking.applications === 1) ? 's' : ''} working until access is given back.` : null}
            </>
          }
          confirmLabel='Revoke access'
          pending={revoke.isPending}
          error={(revoke.isError) ? errorMessage(revoke.error, 'Couldn’t revoke API access.') : null}
          onConfirm={() => revoke.mutate(revoking.user.id, {
            onSuccess: () => {
              toast(`Revoked ${revoking.user.username}’s API access`);
              revoke.reset();
              setRevoking(null);
            },
          })}
          onClose={() => {
            revoke.reset();
            setRevoking(null);
          }}
        />
      ) : null}
    </>
  );
}


function GrantAccessDialog({ onClose }: {onClose: () => void}) {
  const titleId = useId();
  const toast = useToast();
  const grant = useGrantApplicationAccessMutation();
  const [ userId, setUserId ] = useState('');

  const trimmed = userId.trim();
  const valid = /^\d{15,21}$/.test(trimmed);

  return (
    <Modal labelledBy={titleId} onClose={() => !grant.isPending && onClose()} className='max-w-md'>
      <form
        className='p-5 sm:p-6'
        onSubmit={(event) => {
          event.preventDefault();
          if (!grant.isPending && valid) {
            grant.mutate(trimmed, {
              onSuccess: (item) => {
                toast(`Gave ${item.user.username} API access`);
                onClose();
              },
            });
          }
        }}
      >
        <h2 id={titleId} className='pr-10 text-lg font-semibold text-white'>Grant API access</h2>
        <p className='mt-1 text-sm text-muted'>They’ll be able to create applications from their dashboard.</p>

        <Field
          className='mt-4'
          label='User id'
          hint='They need to have used NotSoBot or logged in to the site before.'
          error={(trimmed && !valid) ? 'That doesn’t look like a Discord user id.' : undefined}
        >
          {(props) => (
            <input
              {...props}
              {...NO_AUTOFILL}
              className='input font-mono'
              inputMode='numeric'
              autoComplete='off'
              value={userId}
              disabled={grant.isPending}
              onChange={(event) => setUserId(event.target.value)}
            />
          )}
        </Field>

        {(grant.isError) ? (
          <p role='alert' className='mt-4 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-fg'>
            {errorMessage(grant.error, 'Couldn’t grant API access.')}
          </p>
        ) : null}

        <div className='mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end'>
          <button type='button' className='btn btn-secondary' onClick={onClose} disabled={grant.isPending}>Cancel</button>
          <button type='submit' className='btn btn-primary' disabled={grant.isPending || !valid}>
            {(grant.isPending) ? <Spinner className='size-4 border-white/40 border-t-white'/> : <KeyRound className='size-4'/>}
            Grant access
          </button>
        </div>
      </form>
    </Modal>
  );
}


function TableSkeleton() {
  return (
    <div aria-hidden className='card divide-y divide-line'>
      {Array.from({length: 6}, (_, i) => (
        <div key={i} className='flex items-center gap-3 px-4 py-3'>
          <div className='flex-1'>
            <Skeleton className='h-4 w-36'/>
            <Skeleton className='mt-1.5 h-3 w-44 bg-surface-2'/>
          </div>
          <Skeleton className='size-8 rounded-full'/>
          <Skeleton className='h-4 w-28 bg-surface-2'/>
          <Skeleton className='h-4 w-20 bg-surface-2'/>
        </div>
      ))}
    </div>
  );
}
