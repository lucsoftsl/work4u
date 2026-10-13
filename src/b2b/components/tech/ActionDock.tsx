import type { ReactNode } from "react";

/**
 * Keeps the primary field action reachable during a long checklist/wrap-up: sticks just above the bottom tabs
 * (56px + safe area) so it never scrolls out of view or hides under the tab bar.
 */
export function ActionDock({ children }: { children: ReactNode }) {
  return (
    <div data-testid="action-dock" className="sticky bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-20 md:bottom-0 -mx-4 border-t border-ops-border bg-ops-surface/95 px-4 py-2 backdrop-blur">
      {children}
    </div>
  );
}
