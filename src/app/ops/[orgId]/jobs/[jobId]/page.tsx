"use client";

import { Suspense } from "react";
import { JobWorkspaceView } from "@/b2b/components/workspace/JobWorkspaceView";

export default function JobPage() {
  return (
    <Suspense fallback={<div role="status" className="p-6 text-sm text-ops-ink-muted">Loading job…</div>}>
      <JobWorkspaceView />
    </Suspense>
  );
}
