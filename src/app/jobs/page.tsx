"use client";

import { Suspense } from "react";
import JobsPageContent from "./jobs-content";
import { useTranslation } from "@/lib/i18n";
import { ListSkeleton } from "@/components/ui/QueryState";

export default function JobsPage() {
  const { t } = useTranslation();

  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-content px-4 py-6 md:px-6 md:py-10">
          <ListSkeleton rows={4} label={t("jobs.loading")} />
        </div>
      }
    >
      <JobsPageContent />
    </Suspense>
  );
}
