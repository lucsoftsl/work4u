"use client";

import { CalendarClock, UserX, Wrench } from "lucide-react";
import type { Conflict } from "@/b2b/api/types";
import { useTranslation } from "@/lib/i18n";
import { describeConflicts } from "@/b2b/lib/workspace";
import { Banner } from "./ui";

const ICON = { TEAM_TIME_OVERLAP: CalendarClock, MEMBER_TIME_OVERLAP: CalendarClock, SKILL_MISSING: Wrench, ALREADY_ASSIGNED: UserX } as const;

/** Conflicts with type icon + text (never colour alone). */
export function ConflictList({ conflicts, title }: { conflicts: readonly Conflict[]; title?: string }) {
  const { t, locale } = useTranslation();
  if (conflicts.length === 0) return null;
  return (
    <Banner tone="warning" title={title ?? t("b2b.conflict.found", "Conflicts found")} role="alert">
      <ul className="mt-1 space-y-1.5">
        {describeConflicts(conflicts, { t, locale }).map((c, i) => {
          const Icon = ICON[c.type] ?? CalendarClock;
          return (
            <li key={`${c.type}-${i}`} className="flex items-start gap-2">
              <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span><strong>{c.label}:</strong> {c.message}</span>
            </li>
          );
        })}
      </ul>
    </Banner>
  );
}
