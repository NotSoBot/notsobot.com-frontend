import { useEffect, useState } from 'react';


// Per-browser UI preference kept in localStorage. Storage can be unavailable (private mode,
// blocked site data), so every access is guarded and the default is used instead.
export function readStored<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return (raw === null) ? fallback : JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}


export function writeStored(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage unavailable; the value just won't survive a reload
  }
}


export function usePersistentState<T>(key: string, fallback: T) {
  const [ value, setValue ] = useState<T>(() => readStored(key, fallback));

  useEffect(() => {
    writeStored(key, value);
  }, [key, value]);

  return [ value, setValue ] as const;
}
