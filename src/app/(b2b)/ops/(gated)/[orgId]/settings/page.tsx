"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useOrg } from "@/b2b/context/OrgContext";
import { RequirePermission } from "@/b2b/components/shell/RequirePermission";
import { firstSettingsPage } from "@/b2b/setup/settings-nav";

/** /settings has no page of its own: it opens the first Company setup page the viewer may use. */
export default function SettingsIndex() {
  const { orgId, can } = useOrg();
  const router = useRouter();
  const target = firstSettingsPage(orgId, can);
  useEffect(() => { router.replace(target); }, [router, target]);
  return (
    <RequirePermission anyOf={["org.manage", "member.view", "customer.view", "jobType.manage"]}>
      <div role="status" aria-busy="true" className="p-6 text-ops-ink-muted">…</div>
    </RequirePermission>
  );
}
