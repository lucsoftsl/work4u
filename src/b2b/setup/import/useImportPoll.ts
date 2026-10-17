"use client";

import { useEffect, useRef, useState } from "react";
import { getImport, type ImportPreview } from "../api";
import { nextPollDelay } from "./importLogic";

/**
 * Polls GET imports/:id every 2s while COMMITTING (10s when the tab is hidden), stops on DONE/FAILED and on unmount.
 * Poll errors are tolerated: the next tick tries again.
 */
export function useImportPoll(orgId: string, initial: ImportPreview | null): ImportPreview | null {
  const [state, setState] = useState<ImportPreview | null>(initial);
  const stopped = useRef(false);
  const initialId = initial?.id;
  const initialStatus = initial?.status;

  useEffect(() => { setState(initial); }, [initial]);

  useEffect(() => {
    if (!initialId || initialStatus !== "COMMITTING") return;
    stopped.current = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const ctrl = new AbortController();
    const tick = async (status: string) => {
      const delay = nextPollDelay(status, typeof document !== "undefined" && document.visibilityState === "hidden");
      if (delay === null || stopped.current) return;
      timer = setTimeout(async () => {
        let next = status;
        try {
          const res = await getImport(orgId, initialId, ctrl.signal);
          if (stopped.current) return;
          setState(res);
          next = res.status;
        } catch {
          // keep the last known status and retry
        }
        void tick(next);
      }, delay);
    };
    void tick("COMMITTING");
    return () => { stopped.current = true; ctrl.abort(); if (timer) clearTimeout(timer); };
  }, [orgId, initialId, initialStatus]);

  return state;
}
