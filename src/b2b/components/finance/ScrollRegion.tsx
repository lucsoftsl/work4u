"use client";

import type { ReactNode } from "react";
import { useTr } from "@/b2b/setup/i18n";
import { cn } from "@/lib/utils";

const FOCUS = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ops-accent";
// Scroll shadows without JavaScript: a soft edge appears on the side that still has content to scroll to.
const SHADOWS = "[background:linear-gradient(to_right,#fff_30%,transparent),linear-gradient(to_left,#fff_30%,transparent),linear-gradient(to_right,rgba(23,28,34,.22),transparent),linear-gradient(to_left,rgba(23,28,34,.22),transparent)] [background-position:left,right,left,right] [background-repeat:no-repeat] [background-size:36px_100%,36px_100%,14px_100%,14px_100%] [background-attachment:local,local,scroll,scroll]";

/**
 * A wide table that scrolls sideways inside itself (`relative`: an sr-only child such as "no jobs" is absolutely positioned and, without a
 * positioned scroller, escapes the clip and widens the whole page in Chromium and WebKit): a labelled, focusable region (keyboard users can scroll it), with edge shadows and,
 * on phones, a visible "scroll sideways" hint. `label` must be unique on the page (landmark names).
 */
export function ScrollRegion({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  const { tr } = useTr();
  return (
    <div className="space-y-1">
      <div role="region" aria-label={label} tabIndex={0} className={cn("relative max-w-full overflow-x-auto rounded border border-ops-border bg-ops-surface", SHADOWS, FOCUS, className)}>{children}</div>
      <p aria-hidden="true" className="text-xs text-ops-ink-muted sm:hidden">{tr("b2b.finance.scrollHint", "Scroll sideways to see all columns →")}</p>
    </div>
  );
}
