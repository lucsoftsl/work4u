"use client";

import { RequirePermission } from "@/b2b/components/shell/RequirePermission";
import { SettingsLayout } from "@/b2b/setup/SettingsLayout";
import { JobTypesPage } from "@/b2b/setup/jobtypes/JobTypesPage";

export default function JobTypesSettingsPage() {
  return (
    <RequirePermission anyOf={["jobType.manage", "job.view"]}>
      <SettingsLayout>
        <JobTypesPage />
      </SettingsLayout>
    </RequirePermission>
  );
}
