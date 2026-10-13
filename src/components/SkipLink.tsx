"use client";

import { useTranslation } from "@/lib/i18n";

/** First focusable element on every page; jumps past the header to <main id="main">. */
export function SkipLink() {
  const { t } = useTranslation();
  return (
    <a
      href="#main"
      className="sr-only-focusable fixed left-4 top-4 z-[100] rounded-control bg-primary px-4 py-3 text-label text-on-fill shadow-raised"
    >
      {t("common.skipToContent")}
    </a>
  );
}
