"use client";

import type { ReactNode } from "react";
import { useOrg } from "@/b2b/context/OrgContext";
import { RequirePermission } from "@/b2b/components/shell/RequirePermission";
import { FinanceDenied } from "./FinanceStates";

/** RequirePermission handles loading, errors and non-members; a member without finance.view gets the Finance-specific message instead of the generic one. */
export function FinanceGate({ children }: { children: ReactNode }) {
  const org = useOrg();
  if (org.status === "ready" && org.viewer && !org.can("finance.view")) return <FinanceDenied />;
  return <RequirePermission permission="finance.view">{children}</RequirePermission>;
}
