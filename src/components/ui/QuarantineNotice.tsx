import { Link } from 'react-router';

import { CollapsibleNotice } from '@/components/ui/CollapsibleNotice';
import { Routes } from '@/config';


const TIMELINE: Array<{date: string, text: string}> = [
  {date: 'August', text: 'Discord’s Developer Compliance team contacted us about content moderation in NotSoBot, including the tag system, .edit, and our AI image features. We replied on August 13th with the fixes we had made.'},
  {date: 'August 18th', text: 'Discord asked us to formally certify those fixes by August 21st. We replied with our changes, but the reply was missing the formal certification they needed.'},
  {date: 'Early September', text: 'Discord sent a follow-up with a September 4th deadline. We mistook it for a copy of the first notice and missed the deadline, and NotSoBot was quarantined.'},
  {date: 'September 16th', text: 'We sent the full certification and asked Discord to review the quarantine.'},
  {date: 'September 28th', text: 'Discord told us to remove the tag system by October 9th.'},
  {date: 'October 1st', text: 'We responded with our new safety filters and asked to keep the tag system.'},
  {date: 'October 9th', text: 'We disabled the tag system on the deadline to stay compliant.'},
  {date: 'October 13th', text: 'Discord asked us to also certify that NotSoBot is protected against child safety and gore content, and that it contains no adult content. We made the changes below and sent the new certification.'},
  {date: 'October 14th', text: 'Discord reviewed our certification and lifted the quarantine. We brought the tag system back with stricter media rules.'},
];

const CHANGES = [
  'All NSFW-specific commands have been removed for good, along with commands featuring adult branding.',
  'Every command now runs in safe mode everywhere, including age-restricted channels and DMs.',
  'AI image commands like .imagine, .edit, .reimagine, and .mashup can’t produce sexual content in any channel.',
  'Every media command scans its output before posting, and all media is checked for NSFW content, gore, and child safety in every channel. If a scan fails, the output is blocked.',
  'NSFW detection uses two models we run locally on our own servers, ShieldStral and NudeNet. Content flagged by either one is blocked.',
  'Prompts, search queries, and text output are checked against Discord’s Community Guidelines, and are blocked if the check fails.',
  'Files produced by the code runner are scanned for NSFW content, gore, and child safety in every channel.',
  'Search commands like .image now download, scan, and upload results instead of posting a link.',
  'Results from sources with user-written content, like Reddit, 4chan, and Urban Dictionary, are filtered or scanned before they’re shown. Flagged results are hidden.',
  'Tags can no longer show media from outside links. Embeds and components can only show files the tag uploaded through NotSoBot, or Discord’s own images like avatars and emojis.',
  'All tag text is checked against Discord’s Community Guidelines, including text inside embeds, buttons, menus, and other components.',
  'Flagged content is logged to a review queue, and repeat offenders are flagged and dealt with.',
  'There is now a report system: use /report to report a user or server abusing NotSoBot to the developers.',
];


export function QuarantineNotice({ className }: {className?: string}) {
  return (
    <CollapsibleNotice className={className} title='NotSoBot’s quarantine has been lifted, and tags are back!' tone='success'>
      <p>
        On October 14th, Discord lifted NotSoBot’s quarantine, so it can be added to servers and used in DMs again. The tag system is back on too, with one big change: tags can no longer show media from outside links. To show an image or video in a tag, upload it with <code className='font-mono text-code'>{'{attach}'}</code> first, then use <code className='font-mono text-code'>$FILE_1</code> as the URL in your embed or component. Discord’s own images, like avatars, emojis, and server icons, can still be used directly. Check out the{' '}
        <Link to={Routes.TAG_DOCS} className='text-code hover:underline'>tag documentation</Link> for examples, and the new{' '}
        <Link to={Routes.TAG_DIRECTORY} className='text-code hover:underline'>tag directory</Link> for official verified tags. For questions, join our{' '}
        <Link to={Routes.SUPPORT_INVITE} className='text-code hover:underline'>support server</Link>.
      </p>
      <p className='mt-3 font-medium text-white'>What happened</p>
      <ol className='mt-1 space-y-1.5'>
        {TIMELINE.map((item) => (
          <li key={item.date}>
            <span className='font-semibold text-white'>{item.date}:</span> {item.text}
          </li>
        ))}
      </ol>
      <p className='mt-3 font-medium text-white'>What we’ve changed</p>
      <ul className='mt-1 list-disc space-y-1 pl-5'>
        {CHANGES.map((change) => (
          <li key={change}>{change}</li>
        ))}
      </ul>
    </CollapsibleNotice>
  );
}
