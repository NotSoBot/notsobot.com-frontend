import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';

import { useToast } from '@/components/ui/Toast';
import type { UserSettings, UserSettingsPatch } from '@/lib/api';
import { errorMessage, useMeSettingsQuery, usePatchMeSettingsMutation } from '@/lib/api/dashboardQueries';

import { CharCounter, DashboardHeader, ErrorPanel, Field, InlineError, Panel, PanelSkeleton, SaveBar, UnsavedChangesGuard } from '../ui';
import { ChoiceSelect } from './ChoiceSelect';
import { PersonalityHint } from './PersonalityHint';
import {
  APPLICATION_COMMAND_RESPONSE_CHOICES,
  DIFFUSION_MODEL_CHOICES,
  DOWNLOAD_QUALITY_CHOICES,
  FALLBACK_IMAGE_CHOICES,
  LLM_MODEL_CHOICES,
  LOCALE_CHOICES,
  PERSONALITY_MAX,
  RESPONSE_DISPLAY_CHOICES,
  TIMEZONE_CHOICES,
  TTS_VOICE_CHOICES,
  UNITS_CHOICES,
  UPLOAD_THRESHOLD_CHOICES,
  UPLOAD_TYPE_CHOICES,
} from './settingsChoices';
import { useDraft } from './useDraft';
import { DEFAULT_VANITY, describeVanity, exampleVanityLink, vanityError } from './vanity';


type Values = Omit<UserSettings, 'opted_out_content' | 'file_upload_name'>;
type SectionProps = {settings: UserSettings, onDirtyChange: (section: string, dirty: boolean) => void};


export function SettingsPage() {
  const { data: settings, isPending, isError, error, refetch, isRefetching } = useMeSettingsQuery();
  const [ dirtySections, setDirtySections ] = useState<ReadonlySet<string>>(new Set());

  const onDirtyChange = useCallback((section: string, dirty: boolean) => {
    setDirtySections((previous) => {
      if (previous.has(section) === dirty) {
        return previous;
      }
      const next = new Set(previous);
      if (dirty) {
        next.add(section);
      } else {
        next.delete(section);
      }
      return next;
    });
  }, []);

  return (
    <>
      <DashboardHeader
        title='Settings'
        description='Your personal NotSoBot settings. They follow you to every server, and override server defaults where both exist.'
      />
      {(isPending) ? (
        <div className='space-y-4' aria-busy='true' aria-label='Loading settings'>
          <PanelSkeleton rows={3}/>
          <PanelSkeleton rows={3}/>
          <PanelSkeleton rows={4}/>
        </div>
      ) : (isError) ? (
        <ErrorPanel title='Couldn’t load your settings' message={errorMessage(error)} onRetry={() => refetch()} retrying={isRefetching}/>
      ) : (
        <div className='space-y-4'>
          <AiSection settings={settings} onDirtyChange={onDirtyChange}/>
          <RegionSection settings={settings} onDirtyChange={onDirtyChange}/>
          <MediaSection settings={settings} onDirtyChange={onDirtyChange}/>
          <DisplaySection settings={settings} onDirtyChange={onDirtyChange}/>
          <VoiceSection settings={settings} onDirtyChange={onDirtyChange}/>
        </div>
      )}
      <UnsavedChangesGuard when={0 < dirtySections.size}/>
    </>
  );
}


// One independently saved group of settings. Saving is optimistic (the cache updates right away);
// if the API refuses, the cache rolls back and the edits come back so nothing typed is lost.
function useSettingsSection<K extends keyof Values>(name: string, settings: UserSettings, keys: ReadonlyArray<K>, onDirtyChange: SectionProps['onDirtyChange']) {
  const toast = useToast();
  const mutation = usePatchMeSettingsMutation();
  // same object identity while the values are the same, so the draft's memos hold
  const savedKey = JSON.stringify(keys.map((key) => settings[key]));
  const saved = useMemo(() => Object.fromEntries(keys.map((key) => [key, settings[key]])) as unknown as Pick<Values, K>, [savedKey]);
  const draft = useDraft(saved);

  useEffect(() => {
    onDirtyChange(name, draft.dirty);
  }, [name, draft.dirty, onDirtyChange]);
  useEffect(() => () => onDirtyChange(name, false), [name, onDirtyChange]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!draft.dirty || mutation.isPending) {
      return;
    }
    const changes = draft.changes;
    mutation.mutate(changes as UserSettingsPatch, {
      onSuccess: () => toast(`${name} settings saved`),
      onError: (error) => {
        draft.restore(changes);
        toast(errorMessage(error, 'Couldn’t save your settings.'), 'error');
      },
    });
    draft.reset();
  };

  const set = <F extends K>(key: F, value: Values[F]) => {
    if (mutation.isError) {
      mutation.reset();
    }
    draft.set(key, value as Pick<Values, K>[F]);
  };

  return {values: draft.values, dirty: draft.dirty, set, submit, discard: draft.reset, mutation};
}


function SectionForm({ title, description, accent, section, children }: {
  title: string,
  description: string,
  accent: string,
  section: {dirty: boolean, submit: (event: FormEvent) => void, discard: () => void, mutation: ReturnType<typeof usePatchMeSettingsMutation>},
  children: ReactNode,
}) {
  return (
    <form onSubmit={section.submit}>
      <Panel title={title} description={description} accent={accent}>
        <div className='grid grid-cols-1 gap-x-4 gap-y-5 md:grid-cols-2'>{children}</div>
        {(section.mutation.isError) ? <InlineError>{errorMessage(section.mutation.error, 'Couldn’t save your settings.')}</InlineError> : null}
        <SaveBar
          dirty={section.dirty}
          pending={section.mutation.isPending}
          onDiscard={section.discard}
          status={(section.mutation.isPending) ? <span className='text-muted'>Saving…</span> : (section.mutation.isSuccess && !section.dirty) ? <span className='text-success'>Saved</span> : undefined}
        />
      </Panel>
    </form>
  );
}


function AiSection({ settings, onDirtyChange }: SectionProps) {
  const section = useSettingsSection('AI', settings, ['ml_llm_personality', 'ml_llm_model', 'ml_diffusion_model'], onDirtyChange);
  const personality = section.values.ml_llm_personality ?? '';
  return (
    <SectionForm title='AI' accent='#5865f2' description='How NotSoBot’s AI commands talk to you and which models they use.' section={section}>
      <Field
        className='md:col-span-2'
        label='Personality prompt'
        hint={<PersonalityHint>Describe how the AI should behave when you talk to it. Leave empty for the default.</PersonalityHint>}
        counter={<CharCounter length={personality.length} max={PERSONALITY_MAX}/>}
        error={(PERSONALITY_MAX < personality.length) ? `Up to ${PERSONALITY_MAX.toLocaleString()} characters.` : null}
      >
        {(props) => (
          <textarea
            {...props}
            rows={5}
            maxLength={PERSONALITY_MAX}
            className='input resize-y leading-relaxed'
            placeholder='e.g. You are a pirate who answers every question in rhymes.'
            value={personality}
            onChange={(event) => section.set('ml_llm_personality', event.target.value || null)}
          />
        )}
      </Field>
      <Field label='AI model'>
        {(props) => <ChoiceSelect {...props} noneLabel='Default' choices={LLM_MODEL_CHOICES} value={section.values.ml_llm_model} onChange={(value) => section.set('ml_llm_model', value)}/>}
      </Field>
      <Field label='Image model' hint='Used by image generation commands.'>
        {(props) => <ChoiceSelect {...props} noneLabel='Default' choices={DIFFUSION_MODEL_CHOICES} value={section.values.ml_diffusion_model} onChange={(value) => section.set('ml_diffusion_model', value)}/>}
      </Field>
    </SectionForm>
  );
}


function RegionSection({ settings, onDirtyChange }: SectionProps) {
  const section = useSettingsSection('Language & region', settings, ['locale', 'timezone', 'units'], onDirtyChange);
  return (
    <SectionForm title='Language & region' accent='#3ba55c' description='Used for translations, times and measurements in command responses.' section={section}>
      <Field label='Language' hint='Defaults to your Discord language.'>
        {(props) => <ChoiceSelect {...props} noneLabel='Automatic (from Discord)' choices={LOCALE_CHOICES} value={section.values.locale} onChange={(value) => section.set('locale', value)}/>}
      </Field>
      <Field label='Timezone'>
        {(props) => <ChoiceSelect {...props} noneLabel='Not set (UTC)' choices={TIMEZONE_CHOICES} value={section.values.timezone} onChange={(value) => section.set('timezone', value)}/>}
      </Field>
      <Field label='Units'>
        {(props) => <ChoiceSelect {...props} noneLabel='Automatic' choices={UNITS_CHOICES} value={section.values.units} onChange={(value) => section.set('units', value)}/>}
      </Field>
    </SectionForm>
  );
}


function MediaSection({ settings, onDirtyChange }: SectionProps) {
  const section = useSettingsSection('Media', settings, [
    'download_quality',
    'file_upload_threshold',
    'file_upload_type',
    'file_upload_vanity',
    'fallbacks_media_image',
  ], onDirtyChange);
  const vanity = section.values.file_upload_vanity ?? '';
  const vanityProblem = vanityError(vanity);
  // the API would reject an invalid pattern, so don't send it
  const guardedSection = {
    ...section,
    submit: (event: FormEvent) => {
      if (vanityProblem) {
        event.preventDefault();
        return;
      }
      section.submit(event);
    },
  };
  return (
    <SectionForm title='Media' accent='#faa81a' description='Downloads, uploads to NotSoBot’s file host, and what to do when a command needs an image you didn’t give it.' section={guardedSection}>
      <Field label='Download quality' hint='Preferred video quality for downloads.'>
        {(props) => <ChoiceSelect {...props} noneLabel='Default' choices={DOWNLOAD_QUALITY_CHOICES} value={section.values.download_quality} onChange={(value) => section.set('download_quality', value)}/>}
      </Field>
      <Field label='Image fallback' hint='When a command needs an image and none was found.'>
        {(props) => <ChoiceSelect {...props} choices={FALLBACK_IMAGE_CHOICES} value={section.values.fallbacks_media_image} onChange={(value) => section.set('fallbacks_media_image', value ?? 0)}/>}
      </Field>
      <Field label='Upload to the file host' hint='When results are uploaded instead of attached.'>
        {(props) => <ChoiceSelect {...props} choices={UPLOAD_THRESHOLD_CHOICES} value={section.values.file_upload_threshold} onChange={(value) => section.set('file_upload_threshold', value ?? 0)}/>}
      </Field>
      <Field label='Upload type'>
        {(props) => <ChoiceSelect {...props} choices={UPLOAD_TYPE_CHOICES} value={section.values.file_upload_type} onChange={(value) => section.set('file_upload_type', value ?? 0)}/>}
      </Field>
      <Field label='Upload file name' hint='Set from Discord; it can’t be changed here.'>
        {(props) => <input {...props} className='input' readOnly disabled value={settings.file_upload_name ?? ''} placeholder='Not set'/>}
      </Field>
      <Field
        className='md:col-span-2'
        label='Upload vanity'
        hint={<VanityHelp pattern={vanity}/>}
        error={vanityProblem}
        counter={<CharCounter length={vanity.length} max={512}/>}
      >
        {(props) => (
          <input
            {...props}
            className='input font-mono'
            maxLength={512}
            placeholder={`${DEFAULT_VANITY} (default)`}
            value={vanity}
            onChange={(event) => section.set('file_upload_vanity', event.target.value || null)}
            autoComplete='off'
            spellCheck={false}
          />
        )}
      </Field>
    </SectionForm>
  );
}


function DisplaySection({ settings, onDirtyChange }: SectionProps) {
  const section = useSettingsSection('Display', settings, ['response_display', 'application_command_response_type'], onDirtyChange);
  return (
    <SectionForm title='Display' accent='#00b0f4' description='How NotSoBot’s replies look.' section={section}>
      <Field label='Response display'>
        {(props) => <ChoiceSelect {...props} noneLabel='Server default' choices={RESPONSE_DISPLAY_CHOICES} value={section.values.response_display} onChange={(value) => section.set('response_display', value)}/>}
      </Field>
      <Field label='Slash command responses' hint='Ephemeral replies are only visible to you.'>
        {(props) => <ChoiceSelect {...props} choices={APPLICATION_COMMAND_RESPONSE_CHOICES} value={section.values.application_command_response_type} onChange={(value) => section.set('application_command_response_type', value ?? 0)}/>}
      </Field>
    </SectionForm>
  );
}


function VoiceSection({ settings, onDirtyChange }: SectionProps) {
  const section = useSettingsSection('Text-to-speech', settings, ['tts_voice'], onDirtyChange);
  return (
    <SectionForm title='Text-to-speech' accent='#eb459e' description='The voice used by the tts commands.' section={section}>
      <Field label='Voice' hint='Cloned voices are picked from Discord with the tts commands.'>
        {(props) => <ChoiceSelect {...props} noneLabel='Default' choices={TTS_VOICE_CHOICES} value={section.values.tts_voice} onChange={(value) => section.set('tts_voice', value)}/>}
      </Field>
    </SectionForm>
  );
}


function VanityHelp({ pattern }: {pattern: string}) {
  return (
    <span className='block space-y-1'>
      <span className='block'>
        The random part of links to your uploads on the file host. Write it as parts separated by <code className='font-mono text-fg'>/</code>,
        each a length (<code className='font-mono text-fg'>5</code>) or a range (<code className='font-mono text-fg'>3-8</code>) of random
        letters and numbers. Leave it empty for <code className='font-mono text-fg'>{DEFAULT_VANITY}</code>. Temporary uploads get{' '}
        <code className='font-mono text-fg'>tmp/</code> in front.
      </span>
      {(vanityError(pattern)) ? null : (
        <span className='block'>
          This gives {describeVanity(pattern)}, like <code className='font-mono text-code'>{exampleVanityLink(pattern)}</code>
        </span>
      )}
    </span>
  );
}
