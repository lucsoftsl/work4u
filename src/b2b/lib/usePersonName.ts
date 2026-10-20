"use client";

import { useCallback } from "react";
import { useTranslation } from "@/lib/i18n";
import { personName } from "./person";

/** `nameOf(displayName)` → the name, or "Team member" (translated) when the API sends null. */
export function usePersonName() {
  const { t } = useTranslation();
  return useCallback((name: string | null | undefined) => personName(name, t("b2b.member.unnamed", "Team member")), [t]);
}
