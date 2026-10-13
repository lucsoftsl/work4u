"use client";

import { Suspense } from "react";
import WorkersPageContent from "./workers-content";
import { ListSkeleton } from "@/components/ui/QueryState";
import { useTranslation } from "@/lib/i18n";

export default function WorkersPage() {
  const { t } = useTranslation();

  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-content px-[var(--gutter)] py-10">
          <ListSkeleton rows={4} label={t("workers.loading")} />
        </div>
      }
    >
      <WorkersPageContent />
    </Suspense>
  );
}
