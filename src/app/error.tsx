"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button, buttonClasses } from "@/components/ui/Button";
import { useTranslation } from "@/lib/i18n";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  const { t } = useTranslation();

  useEffect(() => {
    console.error("Unhandled route error:", error);
  }, [error]);

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center px-[var(--gutter)] py-16 text-center md:py-24">
      <AlertTriangle className="h-10 w-10 text-danger" aria-hidden="true" />
      <h1 className="mt-4 font-display text-h1 text-ink">{t("common.loadErrorTitle")}</h1>
      <p className="mt-3 max-w-md text-body text-ink-muted">{t("errors.serverDesc")}</p>
      {error.digest ? <p className="mt-2 text-caption text-ink-subtle">{t("errors.reference")}: {error.digest}</p> : null}
      <div className="mt-8 flex flex-col gap-2 sm:flex-row">
        <Button size="lg" onClick={reset}>
          {t("common.retry")}
        </Button>
        <Link href="/" className={buttonClasses("secondary", "lg")}>
          {t("errors.goHome")}
        </Link>
      </div>
    </div>
  );
}
