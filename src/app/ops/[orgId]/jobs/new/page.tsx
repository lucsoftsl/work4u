"use client";

import { RequirePermission } from "@/b2b/components/shell/RequirePermission";
import { NewJobView } from "@/b2b/components/jobs/new/NewJobView";

export default function NewJobPage() {
  return (
    <RequirePermission permission="job.create">
      <NewJobView />
    </RequirePermission>
  );
}
