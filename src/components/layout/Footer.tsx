import { Github, MessageSquare } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';

import { Routes, Urls } from '@/config';
import { ApiEndpoints, apiUrl } from '@/lib/api';
import { shuffle } from '@/lib/utils';


const QUOTES: Array<[quote: string, author: string]> = [
  ['coolest bot on discord', 'jesse'],
  ['wheres my airpod command', 'sal'],
  ['it just works', 'kyle'],
  ['it\'s the best bot, bud', 'chris'],
  ['saved my marriage', 'tess'],
  ['this bot almost got me fired from my job', 'spencer'],
  ['spencer loves notsobot!! (real customer not actor)', 'napkins'],
  ['how did you get into my house', 'jakkeri'],
  ['gets banned too much', 'arcs'],
  ['🦎', 'stryxo'],
];

const QUOTE_INTERVAL = 5000;


export function Footer() {
  return (
    <footer className='mt-16 border-t border-line bg-surface'>
      <div className='container-page flex flex-col items-start justify-between gap-6 py-8 md:flex-row md:items-center'>
        <div>
          <h2 className='mb-1 text-xl text-white'>NotSoBot</h2>
          <FooterQuote/>
          <div className='mb-3 flex gap-3'>
            <a href={apiUrl(ApiEndpoints.HELP_DISCORD_SERVER)} aria-label='Support server' className='text-muted transition-colors hover:text-brand'>
              <MessageSquare className='size-5'/>
            </a>
            <a href={Urls.GITHUB} target='_blank' rel='noreferrer' aria-label='GitHub' className='text-muted transition-colors hover:text-white'>
              <Github className='size-5'/>
            </a>
          </div>
          <p className='text-xs text-subtle'>© 2016–{new Date().getFullYear()} NotSoCompany. All rights reserved.</p>
        </div>

        <nav aria-label='Footer'>
          <h3 className='section-label mb-3'>Company</h3>
          <ul className='space-y-2 text-sm'>
            <li><Link to={Routes.FAQ} className='text-muted transition-colors hover:text-white'>FAQ</Link></li>
            <li><Link to={Routes.TAG_DOCS} className='text-muted transition-colors hover:text-white'>Tag Docs</Link></li>
            <li><Link to={Routes.LEGAL_PRIVACY} className='text-muted transition-colors hover:text-white'>Privacy Policy</Link></li>
            <li><Link to={Routes.LEGAL_TERMS_OF_SERVICE} className='text-muted transition-colors hover:text-white'>Terms of Service</Link></li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}


function FooterQuote() {
  const [ state, setState ] = useState(() => ({quotes: shuffle(QUOTES), index: 0}));

  useEffect(() => {
    const timer = window.setInterval(() => {
      setState(({ quotes, index }) => {
        return (index + 1 < quotes.length) ? {quotes, index: index + 1} : {quotes: shuffle(QUOTES), index: 0};
      });
    }, QUOTE_INTERVAL);
    return () => window.clearInterval(timer);
  }, []);

  const [ quote, author ] = state.quotes[state.index];
  return (
    <p key={`${quote}-${author}`} className='mb-3 min-h-5 animate-fade-in text-sm text-muted' aria-live='polite'>
      "{quote}" - {author}
    </p>
  );
}
