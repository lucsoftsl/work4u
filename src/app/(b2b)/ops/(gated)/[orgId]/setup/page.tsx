"use client";

import { Suspense } from "react";
import { RequirePermission } from "@/b2b/components/shell/RequirePermission";
import { SetupWizard } from "@/b2b/setup/wizard/SetupWizard";

export default function SetupPage() {
  return (
    <RequirePermission permission="org.manage">
      <Suspense fallback={null}>
        <SetupWizard />
      </Suspense>
    </RequirePermission>
  );
}
