"use client";

import { Suspense } from "react";
import WorkersPageContent from "./workers-content";
import { useTranslation } from "@/lib/i18n";

export default function WorkersPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={
        <div className="text-center py-12">
          <p className="text-muted-foreground">{t('workers.loading')}</p>
        </div>
      }>
        <WorkersPageContent />
      </Suspense>
    </div>
  );
}
