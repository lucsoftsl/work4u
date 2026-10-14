"use client";

import { useTranslation } from "@/lib/i18n";
import { ListSkeleton } from "@/components/ui/QueryState";

export default function JobsFallback() {
  const { t } = useTranslation();
  return (
    <div className="mx-auto w-full max-w-content px-4 py-6 md:px-6 md:py-10">
      <ListSkeleton rows={4} label={t("jobs.loading")} />
    </div>
  );
}
