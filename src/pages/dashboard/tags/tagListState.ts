// The tag list's last search, so coming back to it (from the editor, the sidebar or after deleting a tag) lands
// the reader where they left off. The scroll position is the router's job (SiteLayout). Session-scoped.

const STORAGE_KEY = 'dashboard:tags:list';

export interface TagListState {
  search: string,
}


export function readTagListState(): TagListState | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return (raw) ? JSON.parse(raw) as TagListState : null;
  } catch {
    return null;
  }
}


export function writeTagListState(state: TagListState): void {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // storage unavailable
  }
}
