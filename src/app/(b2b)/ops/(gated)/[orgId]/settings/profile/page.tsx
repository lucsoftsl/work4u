"use client";

import { RequirePermission } from "@/b2b/components/shell/RequirePermission";
import { SettingsLayout } from "@/b2b/setup/SettingsLayout";
import { CompanyProfile } from "@/b2b/setup/profile/CompanyProfile";
import { useTr } from "@/b2b/setup/i18n";

export default function CompanyProfilePage() {
  const { tr } = useTr();
  return (
    <RequirePermission anyOf={["org.manage", "member.view", "customer.view", "jobType.manage"]}>
      <SettingsLayout>
        <h1 className="mb-4 text-2xl font-bold text-ops-ink">{tr("b2b.setup.profile.title", "Company profile")}</h1>
        <CompanyProfile />
      </SettingsLayout>
    </RequirePermission>
  );
}
