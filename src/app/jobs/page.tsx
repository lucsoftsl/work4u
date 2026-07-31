"use client";

import { Suspense } from "react";
import JobsPageContent from "./jobs-content";
import { useTranslation } from "@/lib/i18n";

export default function JobsPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={
        <div className="text-center py-12">
          <p className="text-muted-foreground">{t('jobs.loading')}</p>
        </div>
      }>
        <JobsPageContent />
      </Suspense>
    </div>
  );
}
