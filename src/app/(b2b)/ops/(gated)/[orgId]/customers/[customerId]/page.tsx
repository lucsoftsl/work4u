"use client";

import { useParams } from "next/navigation";
import { RequirePermission } from "@/b2b/components/shell/RequirePermission";
import { ClientPage } from "@/b2b/setup/clients/ClientPage";

export default function CustomerPage() {
  const { customerId } = useParams<{ customerId: string }>();
  return (
    <RequirePermission permission="customer.view">
      <ClientPage clientId={customerId} />
    </RequirePermission>
  );
}
