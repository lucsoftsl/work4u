"use client";

import { Suspense } from "react";
import { RequirePermission } from "@/b2b/components/shell/RequirePermission";
import { JobsView } from "@/b2b/components/jobs/JobsView";

export default function JobsPage() {
  return (
    <RequirePermission permission="job.view">
      <Suspense fallback={null}>
        <JobsView />
      </Suspense>
    </RequirePermission>
  );
}
