"use client";

import { Suspense } from "react";
import { RequirePermission } from "@/b2b/components/shell/RequirePermission";
import { DuplicatesPage } from "@/b2b/setup/clients/DuplicatesPage";

export default function ClientDuplicatesPage() {
  return (
    <RequirePermission permission="customer.view">
      <Suspense fallback={null}>
        <DuplicatesPage />
      </Suspense>
    </RequirePermission>
  );
}
