"use client";

import { useOrg } from "@/b2b/context/OrgContext";
import { ImportWizard } from "@/b2b/setup/import/ImportWizard";

/** The wizard supplies its own layout, back link and h1. */
export function ClientImportPage() {
  const { orgId } = useOrg();
  const base = `/ops/${encodeURIComponent(orgId)}/customers`;
  return <ImportWizard kind="customers" backHref={base} doneHref={base} />;
}
