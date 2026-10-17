import {
  AudioLines,
  Crown,
  Download,
  Hash,
  Image,
  Info,
  PartyPopper,
  Puzzle,
  Search,
  Server,
  Shield,
  Sparkles,
  Tags,
  User,
  Wand2,
  Wrench,
  type LucideIcon,
} from 'lucide-react';

import { enabledCommandVariants } from '@/lib/commandAvailability';
import { commandPath as commandPathFor, commandTypeFromPath } from '@/lib/commandPaths';
import { CommandCategories, CommandTypes, LegacyCommandCategories, type Command, type CommandMetadata, type CommandStat, type CommandType } from '@/lib/api';


export interface TypeOption {
  param: string,
  label: string,
  types: Array<CommandType> | null,
}

export const TYPE_OPTIONS: Array<TypeOption> = [
  {param: 'all', label: 'All', types: null},
  {param: 'prefixed', label: 'Prefix', types: [CommandTypes.PREFIXED]},
  {param: 'slash', label: 'Slash', types: [CommandTypes.APPLICATION_SLASH]},
  {param: 'context', label: 'Context Menus', types: [CommandTypes.APPLICATION_MENU_USER, CommandTypes.APPLICATION_MENU_MESSAGE]},
];

export function typeOptionFromParam(param: string | null): TypeOption {
  // older links/saved filters used separate message/user values
  if (param === 'message' || param === 'user') {
    param = 'context';
  }
  return TYPE_OPTIONS.find((option) => option.param === param) || TYPE_OPTIONS[0];
}


export const PREFIXES: Record<CommandType, string> = {
  [CommandTypes.PREFIXED]: '.',
  [CommandTypes.APPLICATION_SLASH]: '/',
  [CommandTypes.APPLICATION_MENU_USER]: '',
  [CommandTypes.APPLICATION_MENU_MESSAGE]: '',
};

export const TYPE_LABELS: Record<CommandType, string> = {
  [CommandTypes.PREFIXED]: 'Prefix',
  [CommandTypes.APPLICATION_SLASH]: 'Slash',
  [CommandTypes.APPLICATION_MENU_USER]: 'User Menu',
  [CommandTypes.APPLICATION_MENU_MESSAGE]: 'Message Menu',
};


export interface CategoryMeta {
  label: string,
  icon: LucideIcon,
  // used through inline CSS vars, so arbitrary hex values are fine
  color: string,
}

// Order here is the sidebar order (roughly by how much they're used).
export const CATEGORY_META: Record<string, CategoryMeta> = {
  [CommandCategories.CONVERSION]: {label: 'Downloads & Media Tools', icon: Download, color: '#22c55e'},
  [CommandCategories.AI]: {label: 'AI', icon: Sparkles, color: '#a78bfa'},
  [CommandCategories.EFFECTS]: {label: 'Image & Video Effects', icon: Wand2, color: '#ec4899'},
  [CommandCategories.TAGS]: {label: 'Tags', icon: Tags, color: '#f59e0b'},
  [CommandCategories.SEARCH]: {label: 'Search', icon: Search, color: '#3b82f6'},
  [CommandCategories.AUDIO]: {label: 'Audio', icon: AudioLines, color: '#14b8a6'},
  [CommandCategories.FUN]: {label: 'Fun', icon: PartyPopper, color: '#fb923c'},
  [CommandCategories.INFO]: {label: 'Info', icon: Info, color: '#38bdf8'},
  [CommandCategories.MODERATION]: {label: 'Moderation', icon: Shield, color: '#ef4444'},
  [CommandCategories.SERVER]: {label: 'Server Setup', icon: Server, color: '#94a3b8'},
  [CommandCategories.PERSONAL]: {label: 'Personal Settings', icon: User, color: '#c084fc'},
  [CommandCategories.UTILITY]: {label: 'Utility', icon: Puzzle, color: '#eab308'},
  [CommandCategories.OWNER]: {label: 'Bot Owner', icon: Crown, color: '#a855f7'},

  // legacy values, only seen until the bot re-uploads its commands; hidden once unused
  [LegacyCommandCategories.IMAGE]: {label: 'Image Manipulation', icon: Image, color: '#ec4899'},
  [LegacyCommandCategories.TOOLS]: {label: 'Tools', icon: Wrench, color: '#22c55e'},
  [LegacyCommandCategories.SETTINGS]: {label: 'Server Settings', icon: Server, color: '#94a3b8'},
  [LegacyCommandCategories.UTILS]: {label: 'Utilities', icon: Puzzle, color: '#eab308'},
  [LegacyCommandCategories.SAY]: {label: 'Say', icon: Hash, color: '#14b8a6'},
};

// never listed on the public page
export const HIDDEN_CATEGORIES: ReadonlySet<string> = new Set([CommandCategories.OWNER]);

const UNKNOWN_CATEGORY: CategoryMeta = {label: 'Other', icon: Hash, color: '#72767d'};

export function categoryMeta(category: string): CategoryMeta {
  return CATEGORY_META[category] || UNKNOWN_CATEGORY;
}

export const CATEGORY_ORDER = Object.keys(CATEGORY_META).filter((category) => !HIDDEN_CATEGORIES.has(category));


export interface Entry {
  key: string,
  command: Command,
  metadata: CommandMetadata,
  // slash/context metadata has no category of its own; borrow it from a sibling
  category: string,
  // uses in the stats window (0 when unused or unknown)
  uses: number,
  // 1-based popularity rank among all entries with uses, null when unused
  rank: number | null,
}


export function entryKey(commandId: string, type: CommandType): string {
  return `${commandId}:${type}`;
}


function commandTypes(entries: Array<Entry>, commandId: string): Array<CommandType> {
  return entries.filter((entry) => entry.command.id === commandId).map((entry) => entry.metadata.type);
}

export function commandPath(entry: Entry, entries: Array<Entry>): string {
  return commandPathFor(entry.command.id, entry.metadata.type, commandTypes(entries, entry.command.id));
}

// the entry a /commands/:commandId(/:commandType) path points at, undefined for an unknown command or type
export function entryFromPath(entries: Array<Entry>, commandId: string, slug: string | undefined): Entry | undefined {
  const type = commandTypeFromPath(slug, commandTypes(entries, commandId));
  return (type === undefined) ? undefined : entries.find((entry) => entry.command.id === commandId && entry.metadata.type === type);
}


export function buildEntries(commands: Array<Command>, stats: Array<CommandStat> | undefined): Array<Entry> {
  const usage = new Map<string, number>();
  for (const stat of stats || []) {
    const key = entryKey(stat.id, stat.type);
    usage.set(key, (usage.get(key) || 0) + stat.count);
  }

  // disabled commands/variants (removed from the bot) aren't listed, so their pages act like unknown commands
  const entries: Array<Entry> = [];
  for (const command of commands) {
    // a disabled sibling can still lend its category
    const fallbackCategory = command.metadata.find((x) => x.category)?.category || '';
    for (const metadata of enabledCommandVariants(command)) {
      if (!metadata.name) {
        continue;
      }
      const category = metadata.category || fallbackCategory;
      if (HIDDEN_CATEGORIES.has(category)) {
        continue;
      }
      const key = entryKey(command.id, metadata.type);
      entries.push({
        key,
        command,
        metadata,
        category,
        uses: usage.get(key) || 0,
        rank: null,
      });
    }
  }

  const ranked = entries.filter((entry) => entry.uses).sort((x, y) => y.uses - x.uses);
  ranked.forEach((entry, i) => {
    entry.rank = i + 1;
  });
  return entries;
}


export function compareByName(x: Entry, y: Entry): number {
  return x.metadata.name.localeCompare(y.metadata.name) || x.metadata.type - y.metadata.type;
}

export function compareByUses(x: Entry, y: Entry): number {
  return (y.uses - x.uses) || compareByName(x, y);
}
