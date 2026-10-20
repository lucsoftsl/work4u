"use client";

import { B2B_PUBLIC_HOME, B2B_WORKSPACES } from "@/lib/b2b-paths";
import { useEffect } from "react";
import { useTranslation } from "@/lib/i18n";
import { setTitleState } from "@/b2b/lib/title-store";

/** The 404 of the logged-in B2B app: no marketplace chrome, links only to B2B places. */
export function B2bNotFoundView() {
  const { t } = useTranslation();
  // The URL is whatever was mistyped, so the route title cannot know this is the 404: say so.
  useEffect(() => setTitleState({ notFound: true }), []);
  return (
    <main className="mx-auto max-w-xl px-6 py-24 text-center">
      <p className="text-sm font-bold uppercase tracking-wide text-ops-ink-muted">404</p>
      <h1 className="mt-2 font-display text-3xl font-bold text-ops-ink">{t("b2b.notFound.title", "Page not found")}</h1>
      <p className="mt-3 text-ops-ink-muted">{t("b2b.notFound.body", "The page doesn't exist, or you don't have access to it.")}</p>
      <p className="mt-6 flex flex-wrap justify-center gap-4">
        <a href={B2B_WORKSPACES} className="inline-flex min-h-[44px] items-center rounded bg-ops-ink px-4 font-bold text-white">{t("b2b.notFound.workspaces", "My workspaces")}</a>
        <a href={B2B_PUBLIC_HOME} className="inline-flex min-h-[44px] items-center underline">{t("b2b.notFound.about", "About Work4U for field service")}</a>
      </p>
    </main>
  );
}
