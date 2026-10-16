import { Menu, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router';

import logo from '@/assets/logos/NotSoLogo.svg';
import { config, Routes } from '@/config';
import { ApiEndpoints, apiUrl } from '@/lib/api';
import { cn } from '@/lib/utils';

import { AuthControls } from './AuthControls';
import { NAV_LINKS } from './navLinks';


// the logo run through every media iv effect that keeps its transparency (see assets/logos/effects/README.md)
const LOGO_EFFECTS = Object.values(import.meta.glob<string>('@/assets/logos/effects/*.webp', {
  eager: true,
  import: 'default',
  query: '?no-inline',
}));

// effects go out in a shuffled order so every one is shown before any repeats, then it reshuffles
let logoEffectQueue: string[] = [];

function peekLogoEffect(previous?: string): string {
  if (!logoEffectQueue.length) {
    logoEffectQueue = [...LOGO_EFFECTS];
    for (let i = logoEffectQueue.length - 1; 0 < i; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ logoEffectQueue[i], logoEffectQueue[j] ] = [ logoEffectQueue[j], logoEffectQueue[i] ];
    }
    // don't show the same effect twice in a row across a reshuffle
    if (1 < logoEffectQueue.length && logoEffectQueue[0] === previous) {
      logoEffectQueue.push(logoEffectQueue.shift()!);
    }
  }
  return logoEffectQueue[0];
}

function takeLogoEffect(previous?: string): string {
  const effect = peekLogoEffect(previous);
  logoEffectQueue.shift();
  return effect;
}


export function Navbar() {
  const [ mobileOpen, setMobileOpen ] = useState(false);
  const location = useLocation();

  // close the mobile menu whenever we navigate
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <header className='sticky top-0 z-40 border-b border-line bg-surface'>
      <nav className='container-page flex h-16 items-center gap-4' aria-label='Main'>
        <button
          type='button'
          className='btn btn-ghost -ml-2 px-2 md:hidden'
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((value) => !value)}
        >
          {mobileOpen ? <X className='size-5'/> : <Menu className='size-5'/>}
        </button>

        <HomeLink/>

        <div className='ml-auto flex items-center gap-5'>
          <ul className='hidden items-center gap-5 md:flex'>
            {NAV_LINKS.map((link) => (
              <li key={link.to}>
                <NavLink
                  to={link.to}
                  className={({ isActive }) => cn('text-sm transition-colors', isActive ? 'text-white' : 'text-muted hover:text-white')}
                >
                  {link.label}
                </NavLink>
              </li>
            ))}
          </ul>
          {config.authEnabled ? <AuthControls compact/> : null}
        </div>
      </nav>

      {(mobileOpen) ? (
        <div className='animate-fade-in border-t border-line md:hidden'>
          <ul className='container-page flex flex-col gap-1 py-3'>
            {NAV_LINKS.map((link) => (
              <li key={link.to}>
                <NavLink
                  to={link.to}
                  className={({ isActive }) => cn(
                    'block rounded-md px-3 py-2.5 text-base transition-colors',
                    isActive ? 'bg-surface-3 text-white' : 'text-muted hover:bg-surface-2 hover:text-white',
                  )}
                >
                  {link.label}
                </NavLink>
              </li>
            ))}
            <li className='pt-2'>
              <a href={apiUrl(ApiEndpoints.HELP_DISCORD_BOT)} className='btn btn-discord w-full'>Add to Discord</a>
            </li>
          </ul>
        </div>
      ) : null}
    </header>
  );
}


// the logo swaps to the next effect while anywhere on the link (logo or title) is hovered
function HomeLink() {
  // the effect being shown, null while not hovered
  const [ effect, setEffect ] = useState<string | null>(null);
  const lastEffect = useRef<string | undefined>(undefined);

  // load the upcoming effect ahead of time so the hover swap doesn't flash empty
  useEffect(() => {
    new Image().src = peekLogoEffect(lastEffect.current);
  }, [effect]);

  return (
    <Link
      to={Routes.HOME}
      className='flex items-center gap-2 transition-opacity hover:opacity-80'
      onPointerEnter={(event) => {
        if (event.pointerType !== 'touch') {
          lastEffect.current = takeLogoEffect(lastEffect.current);
          setEffect(lastEffect.current);
        }
      }}
      onPointerLeave={() => setEffect(null)}
    >
      <img src={effect ?? logo} alt='' className='size-8 object-contain'/>
      <span className='text-2xl font-semibold text-white'>NotSoBot</span>
    </Link>
  );
}
