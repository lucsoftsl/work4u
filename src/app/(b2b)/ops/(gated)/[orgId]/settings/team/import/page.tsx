"use client";

import { useParams } from "next/navigation";
import { ImportWizard } from "@/b2b/setup/import/ImportWizard";

export default function TeamImportPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const base = `/ops/${encodeURIComponent(orgId)}/settings/team`;
  return <ImportWizard kind="employees" backHref={base} doneHref={base} />;
}
