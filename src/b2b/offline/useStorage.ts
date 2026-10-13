"use client";

import { useEffect, useState } from "react";

export const STORAGE_LOW_RATIO = 0.8;

export interface StorageInfo { usage: number; quota: number; ratio: number; low: boolean }

/** Phone storage use (where the browser reports it); null when unknown. */
export function useStorage(): StorageInfo | null {
  const [info, setInfo] = useState<StorageInfo | null>(null);
  useEffect(() => {
    let alive = true;
    void navigator.storage?.estimate?.().then((e) => {
      if (!alive || !e.quota) return;
      const usage = e.usage ?? 0;
      setInfo({ usage, quota: e.quota, ratio: usage / e.quota, low: usage / e.quota >= STORAGE_LOW_RATIO });
    }).catch(() => undefined);
    return () => { alive = false; };
  }, []);
  return info;
}
