import { Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router';

import logo from '@/assets/logos/NotSoLogo.svg';
import { config, Routes } from '@/config';
import { ApiEndpoints, apiUrl } from '@/lib/api';
import { cn } from '@/lib/utils';

import { AuthControls } from './AuthControls';
import { NAV_LINKS } from './navLinks';


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

        <Link to={Routes.HOME} className='flex items-center gap-2 transition-opacity hover:opacity-80'>
          <img src={logo} alt='' className='size-8'/>
          <span className='text-2xl font-semibold text-white'>NotSoBot</span>
        </Link>

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
