import { Plus, X } from 'lucide-react';
import { useId, useMemo, useState, type FormEvent, type ReactNode } from 'react';

import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import type { GuildAdminBypassSetting, GuildListEntry, GuildListKind, UserGuild } from '@/lib/api';
import { errorField, errorMessage, useGuildMutation, type GuildAction } from '@/lib/api/dashboardQueries';
import { useCommandsQuery } from '@/lib/api/queries';
import { formatDate } from '@/lib/utils';

import { isSnowflake } from '../tags/tagMeta';
import { EmptyState, Field, Panel, Toggle } from '../ui';
import {
  COMMAND_LIST_TYPES,
  ENTRY_TYPE_LABELS,
  EntryMention,
  LIST_TYPES,
  loggerTypeLabel,
  readOnlyMessage,
} from './guildMeta';


// Runs one server edit at a time per section, tracking which row is busy and reporting the result.
function useGuildEdit(guildId: string) {
  const toast = useToast();
  const mutation = useGuildMutation(guildId);
  const [ busyKey, setBusyKey ] = useState<string | null>(null);

  const [ failedField, setFailedField ] = useState<string | null>(null);

  const run = async (key: string, action: GuildAction, success: string): Promise<boolean> => {
    setBusyKey(key);
    setFailedField(null);
    try {
      await mutation.mutateAsync(action);
      toast(success);
      return true;
    } catch (error) {
      const field = errorField(error);
      setFailedField(field);
      // field errors show next to the field instead
      if (!field) {
        toast(errorMessage(error, 'Couldn’t save that change.'), 'error');
      }
      return false;
    } finally {
      setBusyKey(null);
    }
  };

  return {run, busyKey, pending: mutation.isPending, failedField, clearFailedField: () => setFailedField(null)};
}


function RemoveButton({ label, busy, disabled, onClick }: {label: string, busy: boolean, disabled: boolean, onClick: () => void}) {
  return (
    <button
      type='button'
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className='flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-subtle transition-colors hover:bg-surface-3 hover:text-danger disabled:cursor-not-allowed disabled:opacity-50'
    >
      {(busy) ? <Spinner className='size-3.5'/> : <X aria-hidden className='size-4'/>}
    </button>
  );
}


function AddRow({ onSubmit, children, pending, disabled, label = 'Add' }: {
  onSubmit: () => void,
  children: ReactNode,
  pending: boolean,
  disabled: boolean,
  label?: string,
}) {
  return (
    <form
      className='mt-4 flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:flex-wrap sm:items-start'
      onSubmit={(event: FormEvent) => {
        event.preventDefault();
        if (!disabled && !pending) {
          onSubmit();
        }
      }}
    >
      {children}
      {/* lines up with the inputs (below their labels), not with the hints under them */}
      <button type='submit' className='btn btn-secondary shrink-0 sm:mt-[1.625rem] sm:h-[2.375rem]' disabled={disabled || pending}>
        {(pending) ? <Spinner className='size-4'/> : <Plus aria-hidden className='size-4'/>}
        {label}
      </button>
    </form>
  );
}


/* owner/admin bypass */

// the server owner and admins skip every list unless it (or an entry) says otherwise
function AdminBypassToggle({ guild, setting, listName, edit }: {
  guild: UserGuild,
  setting: GuildAdminBypassSetting,
  listName: string,
  edit: ReturnType<typeof useGuildEdit>,
}) {
  const editable = guild.editable.admin_bypass;
  const checked = guild.settings[setting];
  return (
    <div className='mb-4 rounded-md border border-line bg-deep px-3 py-2.5'>
      <Toggle
        checked={checked}
        disabled={!editable || edit.pending}
        label={`Server owner and admins skip the ${listName}`}
        description={(editable)
          ? 'Turn off to make them follow it too, like turning a command off for everyone. Entries can override this.'
          : `Only the server owner and admins can change this.`}
        onChange={(value) => void edit.run(
          '\u0000bypass',
          {kind: 'settings', patch: {[setting]: value}},
          (value) ? `The server owner and admins skip the ${listName} again` : `The server owner and admins now follow the ${listName}`,
        )}
      />
    </div>
  );
}


// an entry's own bypass, or the list's setting (empty value)
function EntryAdminBypass({ entry, serverValue, editable, busy, disabled, label, onChange }: {
  entry: GuildListEntry,
  serverValue: boolean,
  editable: boolean,
  busy: boolean,
  disabled: boolean,
  label: string,
  onChange: (value: boolean | null) => void,
}) {
  if (!editable) {
    if (entry.admin_bypass === null) {
      return null;
    }
    return <span className='shrink-0 text-xs text-subtle'>{(entry.admin_bypass) ? 'Admins skip' : 'Admins follow'}</span>;
  }
  const value = (entry.admin_bypass === null) ? '' : String(entry.admin_bypass);
  return (
    <div className='flex shrink-0 items-center gap-1.5'>
      {(busy) ? <Spinner className='size-3.5'/> : null}
      <select
        aria-label={label}
        title={label}
        className='input h-7 w-auto py-0 pr-7 pl-2 text-xs'
        value={value}
        disabled={disabled}
        onChange={(event) => onChange((event.target.value === '') ? null : event.target.value === 'true')}
      >
        <option value=''>{`Default (admins ${(serverValue) ? 'skip' : 'follow'})`}</option>
        <option value='true'>Admins skip</option>
        <option value='false'>Admins follow</option>
      </select>
    </div>
  );
}


/* prefixes */

export function PrefixesSection({ guild }: {guild: UserGuild}) {
  const editable = guild.editable.prefixes;
  const edit = useGuildEdit(guild.id);
  const [ prefix, setPrefix ] = useState('');
  // the API strips leading/trailing whitespace, so compare (and send) what it'll actually store
  const trimmed = prefix.trim();
  const exists = guild.prefixes.some((item) => item.prefix === trimmed);

  return (
    <Panel
      title='Prefixes'
      accent='#5865f2'
      description='What messages must start with to run NotSoBot commands here. Mentioning the bot always works.'
      readOnly={(editable) ? undefined : readOnlyMessage('prefixes')}
    >
      {(guild.prefixes.length) ? (
        <ul className='flex flex-wrap gap-2'>
          {guild.prefixes.map((item) => (
            <li key={item.prefix} className='flex items-center gap-1 rounded-md border border-line bg-deep py-1 pr-1 pl-3'>
              {/* show spaces, they matter in a prefix */}
              <code className='font-mono text-sm whitespace-pre text-code'>{item.prefix.replace(/ /g, '␣')}</code>
              {(editable) ? (
                <RemoveButton
                  label={`Remove prefix ${item.prefix}`}
                  busy={edit.busyKey === item.prefix}
                  disabled={edit.pending}
                  onClick={() => void edit.run(item.prefix, {kind: 'prefix', prefix: item.prefix, present: false}, `Removed prefix “${item.prefix}”`)}
                />
              ) : <span className='w-2'/>}
            </li>
          ))}
        </ul>
      ) : (
        <p className='text-sm text-muted'>No custom prefixes; the defaults are used.</p>
      )}
      {(editable) ? (
        <AddRow
          pending={edit.busyKey === '\u0000add'}
          disabled={!trimmed || exists || 128 < trimmed.length || edit.pending}
          label='Add prefix'
          onSubmit={async () => {
            if (await edit.run('\u0000add', {kind: 'prefix', prefix: trimmed, present: true}, `Added prefix “${trimmed}”`)) {
              setPrefix('');
            }
          }}
        >
          <Field className='flex-1' label='New prefix' hint={(exists) ? 'That prefix is already set.' : 'Up to 128 characters. Spaces at the start or end are removed.'}>
            {(props) => <input {...props} className='input font-mono' value={prefix} maxLength={128} onChange={(event) => setPrefix(event.target.value)} autoComplete='off' spellCheck={false}/>}
          </Field>
        </AddRow>
      ) : null}
    </Panel>
  );
}


/* allowlist / blocklist */

const LIST_COPY: Record<GuildListKind, {title: string, description: string, accent: string}> = {
  allowlist: {
    title: 'Allowlist',
    description: 'If anything is listed, NotSoBot only responds in these channels, to these roles and to these users.',
    accent: '#3ba55c',
  },
  blocklist: {
    title: 'Blocklist',
    description: 'NotSoBot ignores these channels, roles and users.',
    accent: '#ed4245',
  },
};


export function ListSection({ guild, list }: {guild: UserGuild, list: GuildListKind}) {
  const editable = guild.editable[list];
  const entries = guild[list];
  const copy = LIST_COPY[list];
  const edit = useGuildEdit(guild.id);
  const [ type, setType ] = useState<string>('channel');
  const [ id, setId ] = useState('');
  const idValid = isSnowflake(id);
  const exists = entries.some((entry) => entry.id === id && entry.type === type);

  return (
    <Panel title={copy.title} accent={copy.accent} description={copy.description} readOnly={(editable) ? undefined : readOnlyMessage(list)}>
      <AdminBypassToggle guild={guild} setting={`${list}_admin_bypass`} listName={list} edit={edit}/>
      {(entries.length) ? (
        <ul className='divide-y divide-line rounded-md border border-line'>
          {entries.map((entry) => {
            const key = `${entry.type}:${entry.id}`;
            const bypassKey = `${key}:bypass`;
            return (
              <li key={key} className='flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3 py-2'>
                <div className='min-w-[8rem] flex-1'>
                  <EntryMention type={entry.type} id={entry.id}/>
                </div>
                <span className='hidden text-xs text-subtle sm:inline'>{ENTRY_TYPE_LABELS[entry.type] ?? entry.type} · added {formatDate(entry.added)}</span>
                <EntryAdminBypass
                  entry={entry}
                  serverValue={guild.settings[`${list}_admin_bypass`]}
                  editable={guild.editable.admin_bypass}
                  busy={edit.busyKey === bypassKey}
                  disabled={edit.pending}
                  label={`Owner/admin bypass for ${entry.type} ${entry.id}`}
                  onChange={(adminBypass) => void edit.run(bypassKey, {kind: 'list-admin-bypass', list, id: entry.id, type: entry.type, adminBypass}, 'Updated the owner/admin bypass')}
                />
                {(editable) ? (
                  <RemoveButton
                    label={`Remove ${entry.type} ${entry.id} from the ${list}`}
                    busy={edit.busyKey === key}
                    disabled={edit.pending}
                    onClick={() => void edit.run(key, {kind: 'list', list, id: entry.id, type: entry.type, present: false}, `Removed from the ${list}`)}
                  />
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState title={`The ${list} is empty`}>
          {(list === 'allowlist') ? 'NotSoBot responds everywhere it can see.' : 'Nobody is blocked.'}
        </EmptyState>
      )}
      {(editable) ? (
        <AddRow
          pending={edit.busyKey === '\u0000add'}
          disabled={!idValid || exists || edit.pending}
          onSubmit={async () => {
            if (await edit.run('\u0000add', {kind: 'list', list, id, type, present: true}, `Added to the ${list}`)) {
              setId('');
            }
          }}
        >
          <TypeSelect value={type} onChange={setType} options={LIST_TYPES}/>
          <IdInput type={type} value={id} onChange={setId} exists={exists}/>
        </AddRow>
      ) : null}
    </Panel>
  );
}


function TypeSelect({ value, onChange, options }: {value: string, onChange: (value: string) => void, options: ReadonlyArray<string>}) {
  return (
    <Field label='Type' className='sm:w-40'>
      {(props) => (
        <select {...props} className='input' value={value} onChange={(event) => onChange(event.target.value)}>
          {options.map((option) => <option key={option} value={option}>{ENTRY_TYPE_LABELS[option]}</option>)}
        </select>
      )}
    </Field>
  );
}


function IdInput({ type, value, onChange, exists }: {type: string, value: string, onChange: (value: string) => void, exists: boolean}) {
  const label = `${ENTRY_TYPE_LABELS[type] ?? 'Item'} ID`;
  return (
    <Field
      className='flex-1'
      label={label}
      error={(value && !isSnowflake(value)) ? 'IDs are 15–21 digits. Turn on Developer Mode in Discord and use “Copy ID”.' : (exists) ? 'Already listed.' : null}
    >
      {(props) => (
        <input
          {...props}
          className='input font-mono'
          inputMode='numeric'
          placeholder='e.g. 123456789012345678'
          value={value}
          onChange={(event) => onChange(event.target.value.replace(/[<>#@&!\s]/g, ''))}
          autoComplete='off'
        />
      )}
    </Field>
  );
}


/* command allowlist / blocklist */

const COMMAND_LIST_COPY: Record<GuildListKind, {title: string, description: string, accent: string}> = {
  allowlist: {
    title: 'Command allowlist',
    description: 'Limit a command to specific channels, roles or users.',
    accent: '#00b0f4',
  },
  blocklist: {
    title: 'Command blocklist',
    description: 'Turn a command off for the whole server, or for specific channels, roles or users.',
    accent: '#faa81a',
  },
};


export function CommandListSection({ guild, list }: {guild: UserGuild, list: GuildListKind}) {
  const editable = guild.editable.commands;
  const entries = (list === 'allowlist') ? guild.commands_allowlist : guild.commands_blocklist;
  const copy = COMMAND_LIST_COPY[list];
  const edit = useGuildEdit(guild.id);
  const datalistId = useId();
  const { data: commands } = useCommandsQuery();
  const commandNames = useMemo(() => {
    const names = new Set<string>();
    for (const command of commands ?? []) {
      for (const metadata of command.metadata) {
        names.add(metadata.name);
      }
    }
    return [...names].sort();
  }, [commands]);

  const [ command, setCommand ] = useState('');
  const [ type, setType ] = useState<string>('guild');
  const [ id, setId ] = useState('');
  const targetId = (type === 'guild') ? guild.id : id;
  const normalizedCommand = command.trim().toLowerCase();
  const exists = entries.some((entry) => entry.command === normalizedCommand && entry.id === targetId && entry.type === type);
  const valid = !!normalizedCommand && isSnowflake(targetId) && !exists;

  const grouped = useMemo(() => {
    const map = new Map<string, typeof entries>();
    for (const entry of entries) {
      map.set(entry.command, [...(map.get(entry.command) ?? []), entry]);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [entries]);

  return (
    <Panel title={copy.title} accent={copy.accent} description={copy.description} readOnly={(editable) ? undefined : readOnlyMessage('commands')}>
      <AdminBypassToggle guild={guild} setting={`commands_${list}_admin_bypass`} listName={`command ${list}`} edit={edit}/>
      {(grouped.length) ? (
        <ul className='space-y-3'>
          {grouped.map(([ name, items ]) => (
            <li key={name} className='rounded-md border border-line'>
              <div className='border-b border-line bg-surface-2 px-3 py-1.5 font-mono text-sm text-white'>{name}</div>
              <ul className='divide-y divide-line'>
                {items.map((entry) => {
                  const key = `${entry.command}:${entry.type}:${entry.id}`;
                  const bypassKey = `${key}:bypass`;
                  return (
                    <li key={key} className='flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3 py-2'>
                      <div className='min-w-[8rem] flex-1'><EntryMention type={entry.type} id={entry.id}/></div>
                      <EntryAdminBypass
                        entry={entry}
                        serverValue={guild.settings[`commands_${list}_admin_bypass`]}
                        editable={guild.editable.admin_bypass}
                        busy={edit.busyKey === bypassKey}
                        disabled={edit.pending}
                        label={`Owner/admin bypass for ${entry.type} ${entry.id} on ${name}`}
                        onChange={(adminBypass) => void edit.run(bypassKey, {kind: 'command-list-admin-bypass', list, command: entry.command, id: entry.id, type: entry.type, adminBypass}, 'Updated the owner/admin bypass')}
                      />
                      {(editable) ? (
                        <RemoveButton
                          label={`Remove ${entry.type} ${entry.id} from the ${name} ${list}`}
                          busy={edit.busyKey === key}
                          disabled={edit.pending}
                          onClick={() => void edit.run(key, {kind: 'command-list', list, command: entry.command, id: entry.id, type: entry.type, present: false}, `Removed from ${entry.command}’s ${list}`)}
                        />
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title={`No command ${list} entries`}/>
      )}
      {(editable) ? (
        <AddRow
          pending={edit.busyKey === '\u0000add'}
          disabled={!valid || edit.pending}
          onSubmit={async () => {
            const action: GuildAction = {kind: 'command-list', list, command: normalizedCommand, id: targetId, type, present: true};
            if (await edit.run('\u0000add', action, `Added to ${normalizedCommand}’s ${list}`)) {
              setId('');
            }
          }}
        >
          <Field label='Command' className='sm:w-44'>
            {(props) => (
              <>
                <input {...props} list={datalistId} className='input font-mono' placeholder='e.g. image' value={command} onChange={(event) => setCommand(event.target.value)} autoComplete='off' spellCheck={false}/>
                <datalist id={datalistId}>
                  {commandNames.map((name) => <option key={name} value={name}/>)}
                </datalist>
              </>
            )}
          </Field>
          <TypeSelect value={type} onChange={setType} options={COMMAND_LIST_TYPES}/>
          {(type === 'guild') ? (
            <p className='flex-1 text-sm text-muted sm:pt-[2.125rem]'>{(exists) ? 'Already listed.' : 'Applies to everyone in the server.'}</p>
          ) : (
            <IdInput type={type} value={id} onChange={setId} exists={exists}/>
          )}
        </AddRow>
      ) : null}
    </Panel>
  );
}


/* loggers */

export function LoggersSection({ guild }: {guild: UserGuild}) {
  const editable = guild.editable.loggers;
  const edit = useGuildEdit(guild.id);
  const loggers = guild.loggers.slice().sort((a, b) => a.type - b.type);

  return (
    <Panel
      title='Loggers'
      accent='#eb459e'
      description='Post server events (message edits, joins, bans…) to a channel through a webhook.'
      readOnly={(editable) ? undefined : readOnlyMessage('loggers')}
    >
      {(loggers.length) ? (
        <ul className='divide-y divide-line rounded-md border border-line'>
          {loggers.map((logger) => {
            const key = `${logger.type}:${logger.channel_id}`;
            return (
              <li key={key} className='flex items-center gap-3 px-3 py-2'>
                <div className='min-w-0 flex-1'>
                  <div className='text-sm font-medium text-white'>{loggerTypeLabel(logger.type)}</div>
                  <EntryMention type='channel' id={logger.channel_id}/>
                </div>
                <span className='hidden text-xs text-subtle sm:inline'>added {formatDate(logger.added)}</span>
                {(editable) ? (
                  <RemoveButton
                    label={`Remove the ${loggerTypeLabel(logger.type)} logger in ${logger.channel_id}`}
                    busy={edit.busyKey === key}
                    disabled={edit.pending}
                    onClick={() => void edit.run(key, {kind: 'logger-remove', channelId: logger.channel_id, type: logger.type}, `Removed the ${loggerTypeLabel(logger.type)} logger`)}
                  />
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState title='No loggers set up'>Set one up with the loggers command in Discord.</EmptyState>
      )}
    </Panel>
  );
}
