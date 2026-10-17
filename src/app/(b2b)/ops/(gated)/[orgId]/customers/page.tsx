"use client";

import { Suspense } from "react";
import { RequirePermission } from "@/b2b/components/shell/RequirePermission";
import { ClientsPage } from "@/b2b/setup/clients/ClientsPage";

export default function CustomersPage() {
  return (
    <RequirePermission permission="customer.view">
      <Suspense fallback={null}>
        <ClientsPage />
      </Suspense>
    </RequirePermission>
  );
}
