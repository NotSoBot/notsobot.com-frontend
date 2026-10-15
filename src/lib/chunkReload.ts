// After a deploy, a tab that loaded the old index.html still asks for the old hashed chunks. Those are gone,
// and Cloudflare's SPA fallback answers with index.html (200 text/html), so the lazy route's import() rejects
// and the page lands on the error screen until a manual reload picks up the new build.

const RELOAD_KEY = 'chunkReloadAt';
// a second failure this soon after reloading means the chunk is really broken, so let the error page show
const RELOAD_COOLDOWN = 10 * 1000;


// Chrome: "Failed to fetch dynamically imported module", Firefox: "error loading dynamically imported module",
// Safari: "Importing a module script failed."
export function isChunkLoadError(error: unknown): boolean {
  return error instanceof Error && /dynamically imported module|importing a module script failed/i.test(error.message);
}


// reloads once to pick up the new build; returns false if it already tried just now
export function reloadForNewBuild(): boolean {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY));
    if (last && Date.now() - last < RELOAD_COOLDOWN) {
      return false;
    }
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    // no sessionStorage: still reload, the cooldown is only a loop guard
  }
  window.location.reload();
  return true;
}
