import { Routes } from '@/config';


// `also` are other paths the link shows as active on
export const NAV_LINKS: ReadonlyArray<{to: string, label: string, also?: ReadonlyArray<string>}> = [
  {to: Routes.COMMANDS, label: 'Commands'},
  {to: Routes.TAG_DIRECTORY, label: 'Tags'},
  {to: Routes.TAG_DOCS, label: 'Docs', also: [Routes.TAG_DOCS_MEDIASCRIPT]},
  {to: Routes.STATUS, label: 'Status'},
  {to: Routes.FAQ, label: 'FAQ'},
];
