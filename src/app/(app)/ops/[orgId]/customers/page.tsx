"use client";

import { Suspense } from "react";
import { RequirePermission } from "@/b2b/components/shell/RequirePermission";
import { CustomersView } from "@/b2b/components/customers/CustomersView";

export default function CustomersPage() {
  return (
    <RequirePermission permission="customer.view">
      <Suspense fallback={null}>
        <CustomersView />
      </Suspense>
    </RequirePermission>
  );
}
