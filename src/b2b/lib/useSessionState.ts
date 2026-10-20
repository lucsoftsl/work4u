"use client";

import { useCallback, useState, type SetStateAction } from "react";

// Form drafts kept in sessionStorage: they survive a reload or an accidentally closed dialog in this tab, and go when the tab closes.

function read<T>(key: string, initial: T): T {
  try {
    const raw = window.sessionStorage.getItem(key);
    return raw === null ? initial : (JSON.parse(raw) as T);
  } catch {
    return initial; // storage blocked or an unreadable value: start empty
  }
}

function write(key: string, value: unknown) {
  try { window.sessionStorage.setItem(key, JSON.stringify(value)); } catch { /* full or blocked: the in-memory state still works */ }
}

/** useState that mirrors its value to sessionStorage under `key`; with no key it is plain state. */
export function useSessionState<T>(key: string | undefined, initial: T | (() => T)): [T, (next: SetStateAction<T>) => void] {
  const [value, setValue] = useState<T>(() => {
    const start = typeof initial === "function" ? (initial as () => T)() : initial;
    return key && typeof window !== "undefined" ? read(key, start) : start;
  });
  const set = useCallback((next: SetStateAction<T>) => {
    setValue((prev) => {
      const v = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
      if (key) write(key, v);
      return v;
    });
  }, [key]);
  return [value, set];
}

/** Drops a draft and everything stored under it (`prefix` and `prefix:*`). */
export function clearSessionDrafts(prefix: string) {
  try {
    const keys = Array.from({ length: window.sessionStorage.length }, (_, i) => window.sessionStorage.key(i)).filter((k): k is string => !!k);
    for (const k of keys) if (k === prefix || k.startsWith(`${prefix}:`)) window.sessionStorage.removeItem(k);
  } catch { /* storage blocked: nothing was stored */ }
}
