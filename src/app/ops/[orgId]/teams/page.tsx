"use client";

import { RequirePermission } from "@/b2b/components/shell/RequirePermission";
import { TeamsView } from "@/b2b/components/teams/TeamsView";

export default function TeamsPage() {
  return (
    <RequirePermission permission="team.view">
      <TeamsView />
    </RequirePermission>
  );
}
