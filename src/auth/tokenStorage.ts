// Persists the user token issued by notsobot.api after the Discord OAuth flow.
//
// Kept outside React so the API client can read it synchronously, and exposed as an external store
// (`subscribe`/`get`) so components re-render via `useSyncExternalStore`. Changes in other tabs are
// picked up through the `storage` event, so logging out in one tab logs out everywhere.
//
// The key/format (`token`, JSON-encoded string) matches the old frontend so existing sessions carry over.

const STORAGE_KEY = 'token';

type Listener = () => void;

const listeners = new Set<Listener>();


function read(): string | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const value: unknown = JSON.parse(raw);
    return (typeof value === 'string' && value) ? value : null;
  } catch {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // storage unavailable
    }
    return null;
  }
}


function write(token: string | null): void {
  try {
    if (token) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(token));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // storage unavailable (private mode, blocked); token still lives in memory for this tab
  }
}


let current: string | null = read();

function emit(): void {
  for (const listener of listeners) {
    listener();
  }
}


export const tokenStorage = {
  get(): string | null {
    return current;
  },

  set(token: string | null): void {
    if (token === current) {
      return;
    }
    current = token;
    write(token);
    emit();
  },

  clear(): void {
    tokenStorage.set(null);
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};


window.addEventListener('storage', (event) => {
  if (event.key === STORAGE_KEY || event.key === null) {
    const next = read();
    if (next !== current) {
      current = next;
      emit();
    }
  }
});
