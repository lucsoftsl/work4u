"use client";

import { Suspense } from "react";
import { RequirePermission } from "@/b2b/components/shell/RequirePermission";
import { ReviewQueueView } from "@/b2b/components/review/ReviewQueueView";

export default function ReviewPage() {
  return (
    <RequirePermission permission="job.close">
      <Suspense fallback={null}>
        <ReviewQueueView />
      </Suspense>
    </RequirePermission>
  );
}
