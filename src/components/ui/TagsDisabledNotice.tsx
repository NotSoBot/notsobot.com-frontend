import { ChevronDown, TriangleAlert } from 'lucide-react';
import { Link } from 'react-router';

import { Routes } from '@/config';
import { cn } from '@/lib/utils';


const TIMELINE: Array<{date: string, text: string}> = [
  {date: 'August', text: 'Discord’s Developer Compliance team contacted us about content moderation in NotSoBot, including the tag system, .edit, and our AI image features. We replied on August 13th with the fixes we had made.'},
  {date: 'August 18th', text: 'Discord asked us to formally certify those fixes by August 21st. We replied with our changes, but the reply was missing the formal certification they needed.'},
  {date: 'Early September', text: 'Discord sent a follow-up with a September 4th deadline. We mistook it for a copy of the first notice and missed the deadline, and NotSoBot was quarantined.'},
  {date: 'September 16th', text: 'We sent the full certification and asked Discord to review the quarantine.'},
  {date: 'September 28th', text: 'Discord told us to remove the tag system by October 9th.'},
  {date: 'October 1st', text: 'We responded, and we are still waiting to hear back.'},
  {date: 'October 9th', text: 'We disabled the tag system on the deadline to stay compliant while we wait.'},
];

const CHANGES = [
  'All NSFW-specific commands are disabled.',
  'AI image commands like .imagine, .edit, .reimagine, and .mashup always generate safely. The safe toggle is gone, and NSFW output is blocked in every channel, including age-restricted ones.',
  'Every media command scans its output before posting, and all media is checked for gore and child safety in every channel. If a scan fails, the output is blocked.',
  'NSFW detection now uses ShieldStral, a content safety model we run locally on our own servers.',
  'Prompts, search queries, and tag text are checked against Discord’s Community Guidelines, and are blocked if the check fails.',
  'Files produced by the code runner are scanned for gore and child safety in every channel, and for NSFW content in non-age-restricted channels.',
  'Search commands like .image now download, scan, and upload results instead of posting a link.',
  'Before tags were disabled, every tag output, including text inside buttons, menus, and other components, was checked for NSFW content.',
  'Repeat offenders are now flagged and dealt with.',
  'There is now a report system: use /report to report a user or server abusing NotSoBot to the developers.',
];


export function TagsDisabledNotice({ className }: {className?: string}) {
  return (
    <details role='alert' className={cn('group rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-left text-sm text-fg', className)}>
      <summary className='flex cursor-pointer list-none items-start gap-3 [&::-webkit-details-marker]:hidden'>
        <TriangleAlert aria-hidden className='mt-0.5 size-5 shrink-0 text-warning'/>
        <span className='min-w-0 flex-1 font-semibold text-white'>The tag system has been disabled at this time at Discord’s request.</span>
        <ChevronDown aria-hidden className='mt-0.5 size-4 shrink-0 text-fg transition-transform group-open:rotate-180'/>
      </summary>
      <div className='mt-1 pl-8'>
        <p>
          On September 28th, Discord told us to remove the tag system by October 9th due to content moderation concerns. We responded on October 1st, have since added new safety filters, and are still waiting to hear back from Discord about keeping the feature. While we wait, we had to disable it on the October 9th deadline to stay compliant. We’re sorry for the disruption, especially to everyone who built games and collections with tags. For updates or questions, join our{' '}
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
      </div>
    </details>
  );
}
