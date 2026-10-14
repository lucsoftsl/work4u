"use client";

import Link from "@/components/LocaleLink";
import { CloudOff } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";
import { useTranslation } from "@/lib/i18n";

/**
 * "Temporarily unavailable" state of the public list/detail pages when the content API cannot be reached. The proxy answers its URL
 * with 503 + Retry-After + noindex. Retry is a plain link back to the page (works without JavaScript); a full navigation re-runs the
 * server fetch, so it recovers as soon as the API is back.
 */
export function UnavailableView({ retryHref }: { retryHref: string }) {
  const { t } = useTranslation();
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center px-[var(--gutter)] py-16 text-center md:py-24">
      <CloudOff className="h-10 w-10 text-ink-subtle" aria-hidden="true" />
      <p className="mt-4 text-micro uppercase text-ink-muted">503</p>
      <h1 className="mt-2 font-display text-h1 text-ink">{t("unavailable.title")}</h1>
      <p className="mt-3 max-w-md text-body text-ink-muted">{t("unavailable.body")}</p>
      <div className="mt-8 flex flex-col gap-2 sm:flex-row">
        {/* A real navigation (not router.push): the server must run again. */}
        <a href={retryHref} className={buttonClasses("primary", "lg")}>{t("unavailable.retry")}</a>
        <Link href="/" className={buttonClasses("secondary", "lg")}>{t("errors.goHome")}</Link>
      </div>
    </div>
  );
}
