import { ArrowRight, AudioLines, Clapperboard, Image, Search, Sparkles, Tags, Upload, Wand2, type LucideIcon } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router';

import { QuarantineNotice } from '@/components/ui/QuarantineNotice';
import { Routes } from '@/config';
import { ApiEndpoints, apiUrl } from '@/lib/api';
import { useCommandsQuery, useInfoDiscordQuery } from '@/lib/api/queries';
import { enabledCommandVariants } from '@/lib/commandAvailability';


const FEATURES: Array<{icon: LucideIcon, title: string, description: string}> = [
  {
    icon: Wand2,
    title: 'Image Effects',
    description: 'Magik, deep fry, swirl, explode, pixelate, caption and dozens more filters for any image or avatar.',
  },
  {
    icon: Clapperboard,
    title: 'Gifs & Video',
    description: 'Every effect works on animated gifs and videos too. Reverse, speed up, loop, trim and remix frame by frame.',
  },
  {
    icon: AudioLines,
    title: 'Audio',
    description: 'Bass boost, pitch shift, slow down, extract audio from videos or slap a new soundtrack on a clip.',
  },
  {
    icon: Image,
    title: 'Conversion',
    description: 'Turn videos into gifs, gifs into videos, resize, crop and compress media to fit Discord upload limits.',
  },
  {
    icon: Search,
    title: 'Search',
    description: 'Pull images and results from Google, YouTube, Urban Dictionary, Wolfram Alpha and more without leaving chat.',
  },
  {
    icon: Tags,
    title: 'Custom Tags',
    description: 'Chain commands into your own tags, or grab community-made ones from the tag directory.',
  },
];

const STEPS: Array<{icon: LucideIcon, title: string, description: string}> = [
  {
    icon: Upload,
    title: 'Post some media',
    description: 'Upload an image, gif or video, paste a link, or mention a user to use their avatar.',
  },
  {
    icon: Wand2,
    title: 'Run a command',
    description: 'Use a prefix or slash command, or right-click a message and pick an effect from the apps menu.',
  },
  {
    icon: Sparkles,
    title: 'Get it back',
    description: 'NotSoBot replies with the result in seconds, ready to post, save, or run through another effect.',
  },
];

// Popular effects shown as a teaser; each links to a search on the commands page.
const SHOWCASE_COMMANDS = ['magik', 'deepfry', 'caption', 'explode', 'jpeg', 'reverse', 'speed', 'pixelate'];


function compactNumber(value: number): string {
  return new Intl.NumberFormat(undefined, {notation: 'compact', maximumFractionDigits: 1}).format(value);
}


export function HomePage() {
  const inviteUrl = apiUrl(ApiEndpoints.HELP_DISCORD_BOT);

  return (
    <>
      {/* Hero */}
      <section className='container-page py-20 text-center'>
        <QuarantineNotice className='mx-auto mb-10 max-w-3xl'/>
        <div className='mb-4 inline-block rounded-full border border-brand/30 bg-brand/10 px-4 py-1.5'>
          <span className='text-sm font-medium text-brand'>Images, gifs, video and audio</span>
        </div>
        <h1 className='mb-6 text-5xl leading-tight font-medium text-balance text-white md:text-6xl'>
          Media manipulation,<br className='hidden sm:block'/> right inside Discord
        </h1>
        <p className='mx-auto mb-4 max-w-2xl text-xl text-balance text-muted'>
          NotSoBot distorts, deep fries, captions, converts and remixes anything you throw at it, with hundreds
          of commands for effects, search, and server utilities on top.
        </p>
        <p className='mb-8 text-sm text-muted italic'>"It just works" - kyle</p>
        <div className='flex flex-col items-center justify-center gap-4 sm:flex-row'>
          <a href={inviteUrl} className='btn btn-discord btn-lg'>
            Add to Discord
            <ArrowRight className='size-5'/>
          </a>
          <Link to={Routes.COMMANDS} className='btn btn-secondary btn-lg'>
            View Commands
          </Link>
        </div>
        <div className='mx-auto mt-10 flex max-w-2xl flex-wrap justify-center gap-2'>
          {SHOWCASE_COMMANDS.map((name) => (
            <Link
              key={name}
              to={`${Routes.COMMANDS}?q=${encodeURIComponent(name)}`}
              className='chip font-mono transition-colors hover:bg-brand/20 hover:text-brand'
            >
              .{name}
            </Link>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className='container-page py-16'>
        <h2 className='mb-4 text-center text-3xl text-white'>What can it do?</h2>
        <p className='mx-auto mb-12 max-w-2xl text-center text-muted'>
          If it's an image, a gif, a video or a sound, there's a command to mess with it.
        </p>
        <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-3'>
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <div key={title} className='card card-hover p-6'>
              <div className='mb-4 flex size-12 items-center justify-center rounded-lg bg-brand/10'>
                <Icon className='size-6 text-brand'/>
              </div>
              <h3 className='mb-2 text-xl text-white'>{title}</h3>
              <p className='text-muted'>{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className='container-page py-16'>
        <h2 className='mb-12 text-center text-3xl text-white'>How it works</h2>
        <ol className='grid gap-6 md:grid-cols-3'>
          {STEPS.map(({ icon: Icon, title, description }, index) => (
            <li key={title} className='flex gap-4'>
              <div className='flex size-10 shrink-0 items-center justify-center rounded-full border border-brand/30 bg-brand/10 font-semibold text-brand tabular-nums'>
                {index + 1}
              </div>
              <div>
                <h3 className='mb-1 flex items-center gap-2 text-lg text-white'>
                  {title}
                  <Icon className='size-4 text-muted' aria-hidden/>
                </h3>
                <p className='text-muted'>{description}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Live stats */}
      <section className='container-page py-16'>
        <LiveStats/>
      </section>

      {/* CTA */}
      <section className='container-page py-16'>
        <div className='rounded-lg border border-brand/30 bg-gradient-to-r from-brand/20 to-brand/5 p-8 text-center md:p-12'>
          <h2 className='mb-4 text-3xl text-white md:text-4xl'>Add NotSoBot to your server</h2>
          <p className='mx-auto mb-8 max-w-2xl text-xl text-muted'>
            Edit images, gifs and videos without leaving chat. Setup takes about ten seconds.
          </p>
          <a href={inviteUrl} className='btn btn-discord btn-lg'>
            Add to Discord
            <ArrowRight className='size-5'/>
          </a>
        </div>
      </section>
    </>
  );
}


function LiveStats() {
  const { data: info } = useInfoDiscordQuery({poll: false});
  const { data: commands } = useCommandsQuery();

  const totals = useMemo(() => {
    if (!info) {
      return null;
    }
    let guilds = 0;
    let users = 0;
    for (const cluster of info.clusters) {
      for (const shard of cluster.shards) {
        guilds += shard.counts.guilds;
        users += shard.counts.users;
      }
    }
    return {guilds, users};
  }, [info]);

  const commandCount = commands?.filter((command) => enabledCommandVariants(command).length).length;

  const stats = [
    {label: 'Servers', value: (totals) ? compactNumber(totals.guilds) : null},
    {label: 'Users', value: (totals) ? compactNumber(totals.users) : null},
    {label: 'Commands', value: (commandCount) ? commandCount.toLocaleString() : null},
  ];

  return (
    <div className='card p-8 md:p-12'>
      <div className='grid gap-8 text-center md:grid-cols-3'>
        {stats.map((stat) => (
          <div key={stat.label}>
            {(stat.value) ? (
              <div className='mb-2 text-4xl font-bold text-brand tabular-nums md:text-5xl'>{stat.value}</div>
            ) : (
              <div className='mx-auto mb-2 h-12 w-32 animate-pulse rounded bg-surface-3 md:h-14'/>
            )}
            <div className='text-muted'>{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
