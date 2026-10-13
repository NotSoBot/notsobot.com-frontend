import { useEffect, useMemo } from 'react';

import { useToast } from '@/components/ui/Toast';
import type { UserGuild, UserGuildPatch } from '@/lib/api';
import { errorMessage, useMeGuildMutation } from '@/lib/api/dashboardQueries';

import { ChoiceSelect } from '../settings/ChoiceSelect';
import {
  DIFFUSION_MODEL_CHOICES,
  LLM_MODEL_CHOICES,
  LOCALE_CHOICES,
  PERSONALITY_MAX,
  RESPONSE_DISPLAY_CHOICES,
  TIMEZONE_CHOICES,
} from '../settings/settingsChoices';
import { useDraft } from '../settings/useDraft';
import { CharCounter, Field, InlineError, Panel, SaveBar } from '../ui';
import { readOnlyMessage } from './guildMeta';


type Values = Required<{[K in keyof UserGuildPatch]: Exclude<UserGuildPatch[K], undefined>}>;


export function ServerSettingsForm({ guild, onDirtyChange }: {guild: UserGuild, onDirtyChange: (dirty: boolean) => void}) {
  const toast = useToast();
  const editable = guild.editable.settings;
  const mutation = useMeGuildMutation(guild.id);

  const saved: Values = useMemo(() => ({
    locale: guild.locale,
    timezone: guild.timezone,
    ml_llm_personality: guild.settings.ml_llm_personality,
    ml_llm_model: guild.settings.ml_llm_model,
    ml_diffusion_model: guild.settings.ml_diffusion_model,
    response_display: guild.settings.response_display,
  }), [guild]);
  const draft = useDraft(saved);
  const { values } = draft;
  const personality = values.ml_llm_personality ?? '';

  useEffect(() => {
    onDirtyChange(draft.dirty);
  }, [draft.dirty, onDirtyChange]);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (!draft.dirty || mutation.isPending || PERSONALITY_MAX < personality.length) {
          return;
        }
        mutation.mutate({kind: 'settings', patch: draft.changes}, {
          onSuccess: () => {
            draft.reset();
            toast('Server settings saved');
          },
          onError: (error) => toast(errorMessage(error, 'Couldn’t save the server settings.'), 'error'),
        });
      }}
    >
      <Panel
        title='Server settings'
        accent='#00b0f4'
        description='Defaults for everyone in this server. Members’ personal settings take priority.'
        readOnly={(editable) ? undefined : readOnlyMessage('settings')}
      >
        <fieldset disabled={!editable} className='grid min-w-0 grid-cols-1 gap-x-4 gap-y-5 md:grid-cols-2'>
          <Field label='Language'>
            {(props) => <ChoiceSelect {...props} noneLabel='Automatic (from Discord)' choices={LOCALE_CHOICES} value={values.locale} onChange={(value) => draft.set('locale', value)}/>}
          </Field>
          <Field label='Timezone'>
            {(props) => <ChoiceSelect {...props} noneLabel='Not set (UTC)' choices={TIMEZONE_CHOICES} value={values.timezone} onChange={(value) => draft.set('timezone', value)}/>}
          </Field>
          <Field
            className='md:col-span-2'
            label='AI personality prompt'
            counter={<CharCounter length={personality.length} max={PERSONALITY_MAX}/>}
            hint='How the AI behaves for people who haven’t set their own.'
          >
            {(props) => (
              <textarea
                {...props}
                rows={4}
                maxLength={PERSONALITY_MAX}
                className='input resize-y leading-relaxed'
                value={personality}
                onChange={(event) => draft.set('ml_llm_personality', event.target.value || null)}
              />
            )}
          </Field>
          <Field label='AI model'>
            {(props) => <ChoiceSelect {...props} noneLabel='Default' choices={LLM_MODEL_CHOICES} value={values.ml_llm_model} onChange={(value) => draft.set('ml_llm_model', value)}/>}
          </Field>
          <Field label='Image model'>
            {(props) => <ChoiceSelect {...props} noneLabel='Default' choices={DIFFUSION_MODEL_CHOICES} value={values.ml_diffusion_model} onChange={(value) => draft.set('ml_diffusion_model', value)}/>}
          </Field>
          <Field label='Response display'>
            {(props) => <ChoiceSelect {...props} noneLabel='Default' choices={RESPONSE_DISPLAY_CHOICES} value={values.response_display} onChange={(value) => draft.set('response_display', value)}/>}
          </Field>
        </fieldset>
        {(mutation.isError && draft.dirty) ? <InlineError>{errorMessage(mutation.error, 'Couldn’t save the server settings.')}</InlineError> : null}
        {(editable) ? <SaveBar dirty={draft.dirty} pending={mutation.isPending} onDiscard={draft.reset}/> : null}
      </Panel>
    </form>
  );
}
