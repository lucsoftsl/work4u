"use client";

import Link from "next/link";
import { Compass } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";
import { useTranslation } from "@/lib/i18n";

export default function NotFound() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center px-[var(--gutter)] py-16 text-center md:py-24">
      <Compass className="h-10 w-10 text-ink-subtle" aria-hidden="true" />
      <p className="mt-4 text-micro uppercase text-ink-muted">404</p>
      <h1 className="mt-2 font-display text-h1 text-ink">{t("errors.notFoundTitle")}</h1>
      <p className="mt-3 max-w-md text-body text-ink-muted">{t("errors.notFoundDesc")}</p>
      <div className="mt-8 flex flex-col gap-2 sm:flex-row">
        <Link href="/" className={buttonClasses("primary", "lg")}>
          {t("errors.goHome")}
        </Link>
        <Link href="/jobs" className={buttonClasses("secondary", "lg")}>
          {t("nav.findJobs")}
        </Link>
      </div>
    </div>
  );
}
