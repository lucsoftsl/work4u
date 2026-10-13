"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { useOrg } from "@/b2b/context/OrgContext";
import { NewJobForm } from "./NewJobForm";

export function NewJobView() {
  const { t } = useTranslation();
  const { orgId } = useOrg();
  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 p-4 lg:p-6">
      <Link href={`/ops/${encodeURIComponent(orgId)}/jobs`} className="inline-flex min-h-[44px] items-center gap-1 text-sm font-bold text-ops-ink-muted hover:text-ops-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-ops-ink">
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />{t("b2b.newJob.back", "Jobs")}
      </Link>
      <h1 className="text-2xl font-bold text-ops-ink">{t("b2b.newJob.heading", "New job")}</h1>
      <NewJobForm />
    </div>
  );
}
