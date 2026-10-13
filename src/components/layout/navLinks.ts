import { Routes } from '@/config';


export const NAV_LINKS = [
  {to: Routes.COMMANDS, label: 'Commands'},
  {to: Routes.TAG_DIRECTORY, label: 'Tags'},
  {to: Routes.STATUS, label: 'Status'},
  {to: Routes.FAQ, label: 'FAQ'},
] as const;
