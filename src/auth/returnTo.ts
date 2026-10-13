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
