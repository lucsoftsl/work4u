"use client";

import { useParams } from "next/navigation";
import { RequirePermission } from "@/b2b/components/shell/RequirePermission";
import { CustomerDetailView } from "@/b2b/components/customers/CustomerDetailView";

export default function CustomerPage() {
  const { customerId } = useParams<{ customerId: string }>();
  return (
    <RequirePermission permission="customer.view">
      <CustomerDetailView customerId={customerId} />
    </RequirePermission>
  );
}
