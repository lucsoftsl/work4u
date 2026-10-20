// What a page knows about its own title that the URL cannot tell: the job reference, the open job tab, and "this is the 404 view".
// <RouteTitle> reads it; the pages write it (and clear it when they unmount).
export interface TitleState { jobRef?: string; tab?: string; notFound?: boolean }

let state: TitleState = {};
const listeners = new Set<() => void>();

export const getTitleState = (): TitleState => state;
export const subscribeTitle = (fn: () => void): (() => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };

/** Merge `patch` into the state; returns a function that removes exactly those keys again (for effect cleanup). */
export function setTitleState(patch: TitleState): () => void {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
  return () => {
    const next = { ...state };
    for (const k of Object.keys(patch) as Array<keyof TitleState>) delete next[k];
    state = next;
    listeners.forEach((l) => l());
  };
}
