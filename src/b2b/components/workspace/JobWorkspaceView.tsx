"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { SearchX } from "lucide-react";
import { isB2bError } from "@/b2b/api/client";
import { getJob, qk } from "@/b2b/api/endpoints";
import { useTranslation } from "@/lib/i18n";
import { setTitleState } from "@/b2b/lib/title-store";
import { useOrg } from "@/b2b/context/OrgContext";
import { RequirePermission } from "@/b2b/components/shell/RequirePermission";
import { DraftEditor } from "@/b2b/components/jobs/new/DraftEditor";
import { FilesTab } from "./FilesTab";
import { JobHeader } from "./JobHeader";
import { JobTabs, parseTab, type TabDef, type TabId } from "./JobTabs";
import { OverviewTab } from "./OverviewTab";
import { useAttachments, useTimeline } from "./queries";
import { ScheduleTeamTab } from "./ScheduleTeamTab";
import { TimelineTab } from "./TimelineTab";
import { ErrorRetry, Skeleton } from "./ui";

function Loading() {
  const { t } = useTranslation();
  return (
    <div role="status" aria-busy="true" className="space-y-4">
      <span className="sr-only">{t("b2b.job.loading", "Loading job")}</span>
      <Skeleton className="h-8 w-2/3" /><Skeleton className="h-5 w-1/2" /><Skeleton className="h-11 w-full" />
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]"><Skeleton className="h-64" /><Skeleton className="h-64" /></div>
    </div>
  );
}

function NotFound({ orgId }: { orgId: string }) {
  const { t } = useTranslation();
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 p-10 text-center">
      <SearchX className="h-8 w-8 text-ops-ink-subtle" aria-hidden="true" />
      <h1 className="text-xl font-bold text-ops-ink">{t("b2b.job.notFound", "Job not found or you don't have access")}</h1>
      <Link href={`/ops/${orgId}/dashboard`} className="inline-flex min-h-[44px] items-center rounded bg-ops-ink px-4 text-sm font-bold text-white">{t("b2b.job.backToDashboard", "Back to dashboard")}</Link>
    </div>
  );
}

function Workspace({ jobId }: { jobId: string }) {
  const { t } = useTranslation();
  const { orgId, me, can } = useOrg();
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const tab = parseTab(search.get("tab"));
  const timezone = me?.org.timezone ?? "UTC";

  const q = useQuery({ queryKey: qk.job(orgId, jobId), queryFn: () => getJob(orgId, jobId), placeholderData: (prev) => prev, retry: (n, e) => !(isB2bError(e) && e.status >= 400 && e.status < 500) && n < 2 });
  const files = useAttachments(orgId, jobId);
  const timeline = useTimeline(orgId, jobId);

  const setTab = useCallback((id: TabId) => {
    const next = new URLSearchParams(search.toString());
    next.set("tab", id);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }, [router, pathname, search]);

  const tabs = useMemo<TabDef[]>(() => {
    const timelineCount = timeline.data ? `${timeline.data.pages.flat().length}${timeline.hasNextPage ? "+" : ""}` : undefined;
    return [
      { id: "overview", label: t("b2b.job.tab.overview", "Overview") },
      { id: "schedule", label: t("b2b.job.tab.schedule", "Schedule & team"), count: q.data?.assignments?.length || undefined },
      { id: "files", label: t("b2b.job.tab.files", "Files"), count: files.migrationPending ? undefined : files.data?.items.length },
      { id: "timeline", label: t("b2b.job.tab.timeline", "Timeline"), count: timelineCount },
    ];
  }, [t, q.data, files.data, files.migrationPending, timeline.data, timeline.hasNextPage]);

  const jobRef = q.data?.reference;
  useEffect(() => setTitleState({ jobRef, tab }), [jobRef, tab]);

  if (q.isPending) return <Loading />;
  if (q.isError && !q.data) {
    if (isB2bError(q.error) && q.error.isNotFound) return <NotFound orgId={orgId} />;
    return <div><h1 className="sr-only">{t("b2b.job.title", "Job")}</h1><ErrorRetry message={t("b2b.job.loadError", "Couldn't load this job.")} onRetry={() => void q.refetch()} /></div>;
  }
  const job = q.data;
  if (!job) return <Loading />;
  // A draft has no schedule, team, files or timeline yet: its page is the editor (Create job / Save draft / Discard).
  if (job.status === "DRAFT") return <DraftEditor job={job} justSaved={search.get("saved") === "1"} />;

  return (
    <div className="space-y-4">
      <JobHeader job={job} timezone={timezone} />
      <JobTabs tabs={tabs} active={tab} onChange={setTab}>
        {tab === "overview" ? <OverviewTab job={job} /> : null}
        {tab === "schedule" ? <ScheduleTeamTab job={job} timezone={timezone} /> : null}
        {tab === "files" ? <FilesTab jobId={job.id} canEdit={can("job.execute") || can("job.update")} /> : null}
        {tab === "timeline" ? <TimelineTab jobId={job.id} timezone={timezone} /> : null}
      </JobTabs>
    </div>
  );
}

export function JobWorkspaceView() {
  const params = useParams<{ jobId: string }>();
  return (
    <RequirePermission permission="job.view">
      <div className="mx-auto w-full max-w-[1400px] p-4 md:p-6">
        <Workspace jobId={params.jobId} />
      </div>
    </RequirePermission>
  );
}
