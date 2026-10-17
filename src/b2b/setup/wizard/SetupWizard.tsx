"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Circle, FileUp, UserPlus } from "lucide-react";
import { useOrg } from "@/b2b/context/OrgContext";
import { btnPrimary, btnSecondary } from "@/b2b/components/catalog/ui";
import { getSetup, sk } from "../api";
import { doneSummary, parseWizardStep, resumeStep, type WizardStep } from "../checklist";
import { useTr } from "../i18n";

const STEPS: Array<{ key: "account" | "company" | WizardStep; label: [string, string] }> = [
  { key: "account", label: ["b2b.setup.step.account", "Account"] },
  { key: "company", label: ["b2b.setup.step.company", "Company"] },
  { key: "employees", label: ["b2b.setup.step.employees", "Employees"] },
  { key: "clients", label: ["b2b.setup.step.clients", "Clients"] },
  { key: "done", label: ["b2b.setup.step.finish", "Done"] },
];

/**
 * Steps 03-05 of the company wizard (01 and 02 happen on /ops/start, before the workspace exists). Resumable: the dashboard
 * checklist is the source of truth, so closing this page loses nothing, and "Continue setup" reopens the first unfinished step.
 */
export function SetupWizard() {
  const { orgId, can } = useOrg();
  const { tr } = useTr();
  const router = useRouter();
  const sp = useSearchParams();
  const progress = useQuery({ queryKey: sk.setup(orgId), queryFn: () => getSetup(orgId), retry: false });
  const base = `/ops/${encodeURIComponent(orgId)}`;
  const step: WizardStep = parseWizardStep(sp.get("step")) ?? resumeStep(progress.data);
  const go = (s: WizardStep) => router.replace(`${base}/setup?step=${s}`);
  const index = STEPS.findIndex((s) => s.key === step);
  const canTeam = can("member.manage");
  const canClients = can("customer.manage");

  const option = (icon: typeof FileUp, title: string, body: string, href: string, enabled: boolean) => {
    const Icon = icon;
    return enabled ? (
      <li>
        <Link href={href} className="flex min-h-[72px] items-start gap-3 rounded border-2 border-ops-border bg-ops-surface p-4 hover:border-ops-border-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
          <Icon className="mt-0.5 h-5 w-5 shrink-0 text-ops-accent" aria-hidden="true" />
          <span><span className="block font-bold text-ops-ink">{title}</span><span className="block text-sm text-ops-ink-muted">{body}</span></span>
        </Link>
      </li>
    ) : null;
  };

  const summary = doneSummary(progress.data);
  return (
    <div className="mx-auto w-full max-w-2xl p-4 lg:p-6">
      <ol aria-label={tr("b2b.setup.wizard.title", "Set up your company")} className="mb-6 flex flex-wrap gap-x-5 gap-y-1 border-b border-ops-border pb-3 text-sm">
        {STEPS.map((s, i) => {
          const current = i === index;
          return (
            <li key={s.key} aria-current={current ? "step" : undefined} className={`${current ? "font-bold text-ops-ink" : "text-ops-ink-muted"} ${current ? "" : "max-[599px]:hidden"}`}>
              <span className="mr-1 font-mono">{String(i + 1).padStart(2, "0")}</span>{tr(s.label[0], s.label[1])}
              {i < index ? <span className="sr-only"> ({tr("b2b.setup.step.done", "completed")})</span> : null}
            </li>
          );
        })}
      </ol>

      {step === "employees" ? (
        <section aria-labelledby="wz-h">
          <h1 id="wz-h" className="text-2xl font-bold text-ops-ink">{tr("b2b.setup.team.title", "Add your employees")}</h1>
          <p className="mt-2 text-ops-ink-muted">{tr("b2b.setup.team.lead", "People you add here are planned and dispatched by your office. They don't need an account yet.")}</p>
          <p className="mt-2 rounded border border-ops-border bg-ops-surface p-3 text-sm text-ops-ink-muted">{tr("b2b.team.privacy", "Employees you add here are only visible to your company. They are never listed on the work4u marketplace.")}</p>
          <ul className="mt-5 space-y-3">
            {option(FileUp, tr("b2b.setup.wizard.uploadCsv", "Upload a CSV"), tr("b2b.setup.wizard.uploadCsvBody", "Recommended for more than a few people. Download the template first."), `${base}/settings/team/import`, canTeam)}
            {option(UserPlus, tr("b2b.setup.wizard.addOne", "Add one"), tr("b2b.setup.wizard.addOneBody", "Name and role are enough. Email and phone are optional."), `${base}/settings/team`, canTeam)}
          </ul>
          {!canTeam ? <p className="mt-4 text-sm text-ops-ink-muted">{tr("b2b.team.denied", "View only. You can see the team but not change it. Ask an administrator for access.")}</p> : null}
          <div className="mt-6 flex flex-wrap gap-2">
            <button type="button" onClick={() => go("clients")} className={btnPrimary}>{progress.data?.steps.find((s) => s.key === "employees")?.done ? tr("b2b.setup.wizard.next", "Continue") : tr("b2b.setup.wizard.skip", "Skip for now")}</button>
            <Link href={`${base}/dashboard`} className={btnSecondary}>{tr("b2b.setup.wizard.saveLater", "Save and finish later")}</Link>
          </div>
        </section>
      ) : step === "clients" ? (
        <section aria-labelledby="wz-h">
          <h1 id="wz-h" className="text-2xl font-bold text-ops-ink">{tr("b2b.setup.clients.title", "Add your clients")}</h1>
          <p className="mt-2 text-ops-ink-muted">{tr("b2b.setup.clients.lead", "The people and places you work for. You can add contacts, addresses and notes later.")}</p>
          <ul className="mt-5 space-y-3">
            {option(FileUp, tr("b2b.setup.wizard.uploadCsv", "Upload a CSV"), tr("b2b.setup.wizard.uploadCsvBody", "Recommended for more than a few people. Download the template first."), `${base}/customers/import`, canClients)}
            {option(UserPlus, tr("b2b.setup.wizard.addOneClient", "Add one client"), tr("b2b.setup.wizard.addOneClientBody", "Start with your most important client."), `${base}/customers`, canClients)}
          </ul>
          <div className="mt-6 flex flex-wrap gap-2">
            <button type="button" onClick={() => go("done")} className={btnPrimary}>{progress.data?.steps.find((s) => s.key === "clients")?.done ? tr("b2b.setup.wizard.next", "Continue") : tr("b2b.setup.wizard.skip", "Skip for now")}</button>
            <button type="button" onClick={() => go("employees")} className={btnSecondary}>{tr("b2b.setup.wizard.back", "Back")}</button>
            <Link href={`${base}/dashboard`} className={btnSecondary}>{tr("b2b.setup.wizard.saveLater", "Save and finish later")}</Link>
          </div>
        </section>
      ) : (
        <section aria-labelledby="wz-h">
          <h1 id="wz-h" className="text-2xl font-bold text-ops-ink">{tr("b2b.setup.done.title", "Your workspace is ready")}</h1>
          <ul className="mt-5 space-y-2" aria-live="polite">
            {summary.ready.map((s) => <li key={s.key} className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-sig-green-ink" aria-hidden="true" /><span>{tr(`b2b.setup.checklist.step.${s.key === "first_job" ? "firstJob" : s.key}`, s.key)}</span><span className="sr-only"> ({tr("b2b.setup.step.done", "completed")})</span></li>)}
            {summary.open.map((s) => <li key={s.key} className="flex items-center gap-2 text-ops-ink-muted"><Circle className="h-5 w-5" aria-hidden="true" /><span>{tr(`b2b.setup.checklist.step.${s.key === "first_job" ? "firstJob" : s.key}`, s.key)}</span><span> · {tr("b2b.setup.done.later", "to do later from the checklist")}</span></li>)}
          </ul>
          <div className="mt-6"><Link href={`${base}/dashboard`} className={btnPrimary}>{tr("b2b.setup.done.cta", "Go to my dashboard")}</Link></div>
        </section>
      )}
    </div>
  );
}
