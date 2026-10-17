"use client";

import { RequirePermission } from "@/b2b/components/shell/RequirePermission";
import { ClientImportPage } from "@/b2b/setup/clients/ClientImportPage";

export default function ClientImportRoute() {
  return (
    <RequirePermission permission="customer.manage">
      <ClientImportPage />
    </RequirePermission>
  );
}
