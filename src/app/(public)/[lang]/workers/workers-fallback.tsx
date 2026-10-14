"use client";

import { ListSkeleton } from "@/components/ui/QueryState";
import { useTranslation } from "@/lib/i18n";

export default function WorkersFallback() {
  const { t } = useTranslation();
  return (
    <div className="mx-auto w-full max-w-content px-[var(--gutter)] py-10">
      <ListSkeleton rows={4} label={t("workers.loading")} />
    </div>
  );
}
