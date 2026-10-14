import type { ReactNode } from "react";

/**
 * Wraps a section whose content streams in after the layout shell (server-fetched lists and detail pages).
 * The shell (header + <main> + footer) is flushed first; without a reserved height the footer is painted at the top of the empty
 * <main> and then pushed down by the arriving list (mobile /jobs CLS 0.32-0.40, trace: footer y 62 → 665 → 1905).
 * Reserving "viewport minus header" keeps the footer below the fold the whole time, so its later move is outside the viewport
 * and counts as no shift. Header heights match AppHeader (h-14 on phones, var(--header-h) from md).
 */
export function ReserveViewport({ children }: { children: ReactNode }) {
  return <div data-reserve-viewport className="min-h-[calc(100svh-3.5rem)] md:min-h-[calc(100svh-var(--header-h))]">{children}</div>;
}
