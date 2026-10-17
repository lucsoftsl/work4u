"use client";

import { Suspense } from "react";
import { RequirePermission } from "@/b2b/components/shell/RequirePermission";
import { NotificationsView } from "@/b2b/components/notifications/NotificationsView";

export default function NotificationsPage() {
  return (
    <RequirePermission permission="job.view">
      <Suspense fallback={null}>
        <NotificationsView />
      </Suspense>
    </RequirePermission>
  );
}
