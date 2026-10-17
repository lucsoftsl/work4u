export type ClientTabId = "overview" | "addresses" | "jobs" | "notes" | "files";
export const TAB_ORDER: readonly ClientTabId[] = ["overview", "addresses", "jobs", "notes", "files"];

export function parseTab(v: string | null | undefined, enabled: readonly ClientTabId[] = TAB_ORDER): ClientTabId {
  return TAB_ORDER.find((t) => t === v && enabled.includes(t)) ?? "overview";
}

/** Arrow/Home/End navigation over the enabled tabs (wraps). Returns null for other keys. */
export function nextTab(current: ClientTabId, key: string, enabled: readonly ClientTabId[]): ClientTabId | null {
  const list = TAB_ORDER.filter((t) => enabled.includes(t));
  const i = list.indexOf(current);
  if (list.length === 0) return null;
  switch (key) {
    case "ArrowRight": return list[(i + 1) % list.length];
    case "ArrowLeft": return list[(i - 1 + list.length) % list.length];
    case "Home": return list[0];
    case "End": return list[list.length - 1];
    default: return null;
  }
}
