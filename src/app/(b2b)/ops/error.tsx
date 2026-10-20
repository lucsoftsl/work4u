"use client";

import { B2B_WORKSPACES } from "@/lib/b2b-paths";
import { useTranslation } from "@/lib/i18n";

/** A screen in the operations console crashed: stays inside the B2B layout, so the language and the sign-in are still there. */
export default function OpsError({ reset }: { error: Error; reset: () => void }) {
  const { t } = useTranslation();
  return (
    <div role="alert" className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-xl font-bold text-ops-ink">{t("b2b.opsError.title", "Something went wrong")}</h1>
      <p className="text-ops-ink-muted">{t("b2b.opsError.body", "We hit an unexpected problem. Please try again, or go back to your workspaces.")}</p>
      <div className="flex flex-wrap justify-center gap-2">
        <button type="button" onClick={reset} className="inline-flex min-h-[44px] items-center rounded bg-ops-ink px-4 text-sm font-bold text-white">{t("b2b.opsError.retry", "Try again")}</button>
        {/* A plain anchor on purpose: a full page load resets the broken client state. */}
        <a href={B2B_WORKSPACES} className="inline-flex min-h-[44px] items-center rounded border border-ops-border-strong px-4 text-sm font-bold text-ops-ink">{t("b2b.opsError.home", "Go to workspaces")}</a>
      </div>
    </div>
  );
}
