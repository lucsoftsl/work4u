"use client";

import { useTranslation } from "@/lib/i18n";

/** Shown when the drawing pad can't load: only the customer's printed name is recorded, not a drawn signature. */
export function SignatureFallbackNotice() {
  const { t } = useTranslation();
  return (
    <p role="status" className="rounded border border-sig-orange-ink/40 bg-sig-orange-tint p-2 text-sm font-bold text-sig-orange-ink">
      {t("b2b.tech.job.padFallback", "The signature pad isn't available on this phone right now. Only the customer's name will be recorded, not a drawn signature.")}
    </p>
  );
}
