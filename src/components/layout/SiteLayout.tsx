import { useEffect } from 'react';
import { Outlet, ScrollRestoration, useMatches } from 'react-router';

import { Routes } from '@/config';
import type { RouteHandle } from '@/router';

import { Footer } from './Footer';
import { Navbar } from './Navbar';


const SCROLL_BY_PATH: ReadonlySet<string> = new Set([Routes.DASHBOARD_TAGS]);


function usePageTitle(): string {
  const matches = useMatches();
  for (let i = matches.length - 1; 0 <= i; i--) {
    const handle = matches[i].handle as RouteHandle | undefined;
    if (handle?.title) {
      return `${handle.title} · NotSoBot`;
    }
  }
  return 'NotSoBot';
}


export function SiteLayout() {
  const title = usePageTitle();
  useEffect(() => {
    document.title = title;
  }, [title]);

  return (
    <div className='flex min-h-dvh flex-col'>
      <Navbar/>
      <main className='flex-1'>
        <Outlet/>
      </main>
      <Footer/>
      {/* Normally each history entry keeps its own scroll position. Pages listed here keep one position per
          path instead, so coming back to them any way (link, sidebar, back button) lands where you left off. */}
      <ScrollRestoration getKey={(location) => (SCROLL_BY_PATH.has(location.pathname)) ? location.pathname : location.key}/>
    </div>
  );
}
