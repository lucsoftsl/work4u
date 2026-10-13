"use client";

import { RequirePermission } from "@/b2b/components/shell/RequirePermission";
import { DashboardView } from "@/b2b/components/dashboard/DashboardView";

export default function DashboardPage() {
  return (
    <RequirePermission permission="job.view">
      <DashboardView />
    </RequirePermission>
  );
}
