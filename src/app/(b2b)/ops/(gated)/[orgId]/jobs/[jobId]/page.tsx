"use client";

import { Suspense } from "react";
import { useTranslation } from "@/lib/i18n";
import { JobWorkspaceView } from "@/b2b/components/workspace/JobWorkspaceView";

function JobLoading() {
  const { t } = useTranslation();
  return <div role="status" className="p-6 text-sm text-ops-ink-muted">{t("b2b.job.loadingDots", "Loading job…")}</div>;
}

export default function JobPage() {
  return (
    <Suspense fallback={<JobLoading />}>
      <JobWorkspaceView />
    </Suspense>
  );
}
