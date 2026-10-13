"use client";

import Link from "next/link";
import { CalendarX2, CircleCheck, Inbox, SearchX, Users, type LucideIcon } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import type { EmptyVariant } from "@/b2b/lib/empty-states";
import { EmptyState } from "./EmptyState";

const LINK = "inline-flex min-h-[44px] items-center rounded bg-ops-ink px-4 text-sm font-bold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ops-ink";

interface Copy { icon: LucideIcon; title: string; body: string; action?: { label: string; href: (orgId: string) => string } }

// TODO(routes): /jobs/new is the job-create route this console is expected to get; teams lives at /teams.
const COPY: Record<EmptyVariant, Copy> = {
  "create-first-job": { icon: Inbox, title: "No jobs yet", body: "Create the first job to start planning work.", action: { label: "Create the first job", href: (o) => `/ops/${o}/jobs/new` } },
  "ask-manager-jobs": { icon: Inbox, title: "No jobs yet", body: "Ask a manager to create the first job. It will show up here as soon as it exists." },
  "set-up-teams": { icon: Users, title: "No teams yet", body: "Add a team and its technicians so jobs can be assigned.", action: { label: "Set up teams", href: (o) => `/ops/${o}/teams` } },
  "ask-manager-teams": { icon: Users, title: "No teams yet", body: "Ask a manager to add a team before jobs can be dispatched." },
  filtered: { icon: SearchX, title: "No jobs match these filters", body: "Try removing a filter or widening the dates." },
  "page-overflow": { icon: SearchX, title: "No more jobs on this page", body: "The list is shorter than it was." },
  "day-empty-create": { icon: CalendarX2, title: "No jobs on this day", body: "Pick another day, or create a job for it.", action: { label: "Create a job", href: (o) => `/ops/${o}/jobs/new` } },
  "day-empty": { icon: CalendarX2, title: "No jobs on this day", body: "Pick another day, or ask a manager if work is expected." },
  "all-assigned": { icon: CircleCheck, title: "All caught up", body: "Every job has a team." },
};

export function RoleEmptyState({ variant, orgId, extra }: { variant: EmptyVariant; orgId: string; extra?: React.ReactNode }) {
  const { t } = useTranslation();
  const c = COPY[variant];
  const action = c.action ? (
    <Link href={c.action.href(orgId)} className={LINK}>{t(`b2b.empty.${variant}.action`, c.action.label)}</Link>
  ) : extra;
  return <EmptyState icon={c.icon} title={t(`b2b.empty.${variant}.title`, c.title)} body={t(`b2b.empty.${variant}.body`, c.body)} action={action} />;
}
