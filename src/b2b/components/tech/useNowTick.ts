"use client";

import { useEffect, useState } from "react";
import { serverNow } from "@/b2b/lib/server-clock";

/** Re-renders every second while `active`; the caller derives values from the SERVER-corrected clock, so a stalled tab never drifts. */
export function useNowTick(active: boolean, intervalMs = 1000): number {
  const [now, setNow] = useState(() => serverNow());
  useEffect(() => {
    if (!active) return;
    const first = setTimeout(() => setNow(serverNow()), 0); // refresh right away when the clock starts running
    const id = setInterval(() => setNow(serverNow()), intervalMs);
    const onVisible = () => setNow(serverNow());
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearTimeout(first); clearInterval(id); document.removeEventListener("visibilitychange", onVisible); };
  }, [active, intervalMs]);
  return now;
}
