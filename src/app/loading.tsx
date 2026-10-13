"use client";

import { ListSkeleton, Skeleton } from "@/components/ui/QueryState";
import { useTranslation } from "@/lib/i18n";

// Route-level loading UI: skeleton blocks with the final page geometry, never a full-page spinner.
export default function Loading() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto w-full max-w-content px-[var(--gutter)] py-6 md:py-10">
      <Skeleton className="h-9 w-64 max-w-full" />
      <Skeleton className="mt-3 h-4 w-96 max-w-full" />
      <div className="mt-8">
        <ListSkeleton rows={3} label={t("common.loading")} />
      </div>
    </div>
  );
}
