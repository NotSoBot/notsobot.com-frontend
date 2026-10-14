// Remembers where the user was before being sent to Discord, so the callback can bring them back.
// sessionStorage survives the full-page round trip through discord.com but stays scoped to the tab.

import { Routes } from '@/config';

const STORAGE_KEY = 'auth:return-to';


// Only allow same-origin paths, never protocol-relative (`//evil.com`) or back-slash tricks,
// and never the auth routes themselves (would loop).
export function sanitizeReturnTo(value: string | null | undefined): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) {
    return null;
  }
  if (value.startsWith('/auth/')) {
    return null;
  }
  return value;
}


export function saveReturnTo(value: string | null | undefined): void {
  const path = sanitizeReturnTo(value);
  try {
    if (path) {
      window.sessionStorage.setItem(STORAGE_KEY, path);
    } else {
      window.sessionStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // storage unavailable
  }
}


export function peekReturnTo(): string {
  try {
    return sanitizeReturnTo(window.sessionStorage.getItem(STORAGE_KEY)) || Routes.HOME;
  } catch {
    return Routes.HOME;
  }
}


export function clearReturnTo(): void {
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // storage unavailable
  }
}


// Set when this tab starts a login, the callback only accepts a token if it's there. Otherwise anyone could send a
// `/auth/login/callback#<their token>` link and silently log the visitor into their account (login csrf).
const PENDING_KEY = 'auth:login-pending';
const PENDING_MAX_AGE = 15 * 60 * 1000; // the api's oauth state is valid for 15 minutes too


export function markLoginPending(): void {
  try {
    window.sessionStorage.setItem(PENDING_KEY, String(Date.now()));
  } catch {
    // storage unavailable
  }
}


// one use, returns whether this tab started a login recently
export function consumeLoginPending(): boolean {
  try {
    const started = Number(window.sessionStorage.getItem(PENDING_KEY));
    window.sessionStorage.removeItem(PENDING_KEY);
    return !!started && Date.now() - started < PENDING_MAX_AGE;
  } catch {
    return false;
  }
}
