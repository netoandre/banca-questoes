const RETRY_KEY = "banca:module-reload";
const RETRY_WINDOW_MS = 60_000;

export function isModuleLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return /Importing a module script failed|Failed to fetch dynamically imported module|error loading dynamically imported module|Failed to load module script|Loading chunk .+ failed/i.test(error.message);
}

// A full reload fetches the current chunk manifest; bound retries to avoid loops
// when the network remains unavailable. Storage is supplied only in the browser.
export function shouldReloadModule(error: unknown, storage: Pick<Storage, "getItem" | "setItem">, now: number): boolean {
  if (!isModuleLoadError(error)) return false;
  try {
    const previous = storage.getItem(RETRY_KEY);
    if (previous !== null && now - Number(previous) < RETRY_WINDOW_MS) return false;
    storage.setItem(RETRY_KEY, String(now));
    return true;
  } catch {
    return false;
  }
}