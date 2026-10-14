import { CircleCheck, Download, Info, Trash2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';

import { useAuth } from '@/auth';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Spinner } from '@/components/ui/Spinner';
import { Routes, Urls } from '@/config';
import { errorMessage, isNotAvailableYet, useDeleteMeMutation, useRequestDataExportMutation } from '@/lib/api/dashboardQueries';

import { Panel } from '../ui';


const DELETE_PHRASE = 'delete my data';

const YOUR_DATA_ANCHOR = 'your-data';


// Export/delete, at the bottom of the settings page. Not tied to the settings loading, so it works even when they don't.
export function YourDataSection() {
  return (
    <section id={YOUR_DATA_ANCHOR} aria-labelledby={`${YOUR_DATA_ANCHOR}-title`} className='mt-10 scroll-mt-24'>
      <h2 id={`${YOUR_DATA_ANCHOR}-title`} className='text-xl font-bold text-white'>Your data</h2>
      <p className='mt-1 mb-4 text-muted'>
        What NotSoBot stores about you, and how to get or remove it. See the <Link to={Routes.LEGAL_PRIVACY} className='text-code hover:underline'>privacy policy</Link> for details.
      </p>
      <div className='space-y-4'>
        <ExportPanel/>
        <DeletePanel/>
      </div>
    </section>
  );
}


function NotAvailableYet() {
  return (
    <Notice tone='info'>
      This isn’t available yet. Email <a href={`mailto:${Urls.CONTACT_EMAIL}`} className='text-code hover:underline'>{Urls.CONTACT_EMAIL}</a> in the meantime.
    </Notice>
  );
}


function Notice({ tone, children }: {tone: 'info' | 'success' | 'error', children: ReactNode}) {
  const Icon = (tone === 'success') ? CircleCheck : Info;
  const color = (tone === 'success') ? 'border-success/40 bg-success/10' : (tone === 'error') ? 'border-danger/40 bg-danger/10' : 'border-brand/40 bg-brand/10';
  return (
    <p role={(tone === 'error') ? 'alert' : 'status'} className={`mt-4 flex items-start gap-2 rounded-md border px-3 py-2 text-sm text-fg ${color}`}>
      <Icon aria-hidden className='mt-0.5 size-4 shrink-0'/>
      <span className='min-w-0'>{children}</span>
    </p>
  );
}


function ExportPanel() {
  const exportData = useRequestDataExportMutation();
  return (
    <Panel headingLevel={3} title='Export my data' accent='#5865f2' description='Get a copy of everything NotSoBot stores about you.'>
      <ul className='list-disc space-y-1 pl-5 text-sm text-muted'>
        <li>Your account record and settings</li>
        <li>Your tags, including their variables and blobs</li>
        <li>Reminders, command usage and other records tied to your Discord ID</li>
      </ul>
      <p className='mt-3 text-sm text-muted'>Preparing an export can take a while.</p>
      <button type='button' className='btn btn-primary mt-4' disabled={exportData.isPending || exportData.isSuccess} onClick={() => exportData.mutate()}>
        {(exportData.isPending) ? <Spinner className='size-4 border-white/40 border-t-white'/> : <Download aria-hidden className='size-4'/>}
        {(exportData.isPending) ? 'Requesting…' : 'Request export'}
      </button>
      {(exportData.isSuccess) ? (
        <Notice tone='success'>Export requested. It can take a while to be ready.</Notice>
      ) : (isNotAvailableYet(exportData.error)) ? (
        <NotAvailableYet/>
      ) : (exportData.isError) ? (
        <Notice tone='error'>{errorMessage(exportData.error, 'Couldn’t request the export.')}</Notice>
      ) : null}
    </Panel>
  );
}


function DeletePanel() {
  const { logout } = useAuth();
  const remove = useDeleteMeMutation();
  const [ confirming, setConfirming ] = useState(false);
  const unavailable = isNotAvailableYet(remove.error);

  return (
    <Panel headingLevel={3} title='Delete my data' accent='#ed4245' description='Permanently remove what NotSoBot stores about you.'>
      <ul className='list-disc space-y-1 pl-5 text-sm text-muted'>
        <li>Your settings, tags (with their variables and blobs), reminders and saved voices are deleted.</li>
        <li>Tags others use in their servers stop working.</li>
        <li>You’ll be logged out everywhere. Using NotSoBot again later creates a fresh record.</li>
        <li>This can’t be undone. Export first if you want a copy.</li>
      </ul>
      <button type='button' className='btn btn-danger mt-4' onClick={() => setConfirming(true)}>
        <Trash2 aria-hidden className='size-4'/>
        Delete my data…
      </button>
      {(unavailable && !confirming) ? <NotAvailableYet/> : null}

      {(confirming) ? (
        <ConfirmDialog
          title='Delete all your NotSoBot data?'
          description='Everything listed under “Delete my data” is removed permanently and you’ll be logged out.'
          confirmLabel='Delete everything'
          confirmPhrase={DELETE_PHRASE}
          pending={remove.isPending}
          error={(unavailable) ? (
            <>This isn’t available yet. Email <a href={`mailto:${Urls.CONTACT_EMAIL}`} className='text-code hover:underline'>{Urls.CONTACT_EMAIL}</a> in the meantime.</>
          ) : (remove.isError) ? errorMessage(remove.error, 'Couldn’t delete your data.') : null}
          onClose={() => setConfirming(false)}
          onConfirm={() => remove.mutate(undefined, {
            onSuccess: () => {
              setConfirming(false);
              void logout();
            },
          })}
        />
      ) : null}
    </Panel>
  );
}
