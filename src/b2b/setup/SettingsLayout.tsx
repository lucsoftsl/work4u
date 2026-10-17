"use client";

import type { ReactNode } from "react";
import { SettingsNav } from "./SettingsNav";

/** Page frame of Company setup: sub-navigation + content. The page supplies its own h1 (one per page). */
export function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-6xl p-4 lg:p-6">
      <div className="grid gap-4 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-8">
        <SettingsNav />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
