"use client";

import Link from "next/link";
import { AlertTriangle, Building2, Check, FileText, ListChecks, MapPin, Navigation, Square } from "lucide-react";
import type { JobWorkspace } from "@/b2b/api/types";
import { useOrg } from "@/b2b/context/OrgContext";
import { StatusPill } from "@/b2b/components/StatusPill";
import { missingLabel } from "@/b2b/lib/workspace";
import { cn } from "@/lib/utils";
import { NotesCard } from "./NotesCard";
import { ReviewPanel } from "./ReviewPanel";
import { Card } from "./ui";
import { PartsReadOnly } from "@/b2b/components/PartsReadOnly";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap justify-between gap-x-4 gap-y-0.5 border-b border-ops-border py-2 text-sm last:border-0">
      <dt className="text-ops-ink-muted">{label}</dt>
      <dd className="min-w-0 break-words text-right font-medium text-ops-ink">{children || <span className="text-ops-ink-subtle">Not provided</span>}</dd>
    </div>
  );
}

function Requirements({ job }: { job: JobWorkspace }) {
  const r = job.requirements;
  const missing = job.missingCompletion ?? [];
  const flags: Array<{ key: "notes" | "photo" | "signature"; on: boolean; label: string }> = [
    { key: "notes", on: !!r?.notes, label: "Completion notes required" },
    { key: "photo", on: !!r?.photo, label: "After photo required" },
    { key: "signature", on: !!r?.signature, label: "Customer signature required" },
  ];
  const active = flags.filter((f) => f.on);
  const nothing = !(job.checklist?.length) && active.length === 0 && !r?.review;
  return (
    <Card title="Completion requirements" icon={<ListChecks className="h-4 w-4" aria-hidden="true" />}>
      {nothing ? <p className="text-sm text-ops-ink-muted">No completion requirements for this job.</p> : null}
      {job.checklist?.length ? (
        <ul className="space-y-1">
          {job.checklist.map((item) => (
            <li key={item.id} className="flex items-start gap-2 py-1 text-sm">
              {item.done ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-sig-green-ink" aria-hidden="true" /> : <Square className="mt-0.5 h-4 w-4 shrink-0 text-ops-ink-subtle" aria-hidden="true" />}
              <span className={cn(item.done && "text-ops-ink-muted line-through")}>{item.text}</span>
              <span className="sr-only">{item.done ? "(done)" : "(not done)"}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {active.length ? (
        <ul className="mt-2 space-y-1 border-t border-ops-border pt-2">
          {active.map((f) => {
            const isMissing = missing.includes(f.key);
            return (
              <li key={f.key} className="flex items-center gap-2 text-sm">
                {isMissing ? <Square className="h-4 w-4 text-ops-ink-subtle" aria-hidden="true" /> : <Check className="h-4 w-4 text-sig-green-ink" aria-hidden="true" />}
                {f.label}<span className="text-xs text-ops-ink-muted">{isMissing ? "· missing" : "· done"}</span>
              </li>
            );
          })}
        </ul>
      ) : null}
      {r?.review ? <p className="mt-2 text-sm text-ops-ink-muted">Needs review before it can be closed.</p> : null}
      {missing.length ? <p className="mt-3 rounded bg-sig-orange-tint p-2 text-sm font-bold text-sig-orange-ink">Still missing: {missing.map(missingLabel).join(", ")}</p> : null}
    </Card>
  );
}

export function OverviewTab({ job }: { job: JobWorkspace }) {
  const { orgId } = useOrg();
  const loc = job.location;
  const address = [loc?.addressLine, [loc?.postalCode, loc?.city].filter(Boolean).join(" "), loc?.country].filter(Boolean).join(", ");
  const hasCoords = typeof loc?.latitude === "number" && typeof loc?.longitude === "number";
  const warnings = [loc?.accessInstructions && ["Access", loc.accessInstructions], loc?.safetyInstructions && ["Safety", loc.safetyInstructions]].filter(Boolean) as [string, string][];

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div className="min-w-0 space-y-4">
        <Card title="Description & scope" icon={<FileText className="h-4 w-4" aria-hidden="true" />}>
          <p className="whitespace-pre-wrap text-sm text-ops-ink">{job.description || <span className="text-ops-ink-subtle">No description.</span>}</p>
          {warnings.length ? (
            <div role="note" className="mt-4 flex gap-3 rounded border border-sig-orange-ink bg-sig-orange-tint p-3 text-sm text-sig-orange-ink">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
              <div className="space-y-1">{warnings.map(([k, v]) => <p key={k}><strong>{k} instructions:</strong> {v}</p>)}</div>
            </div>
          ) : null}
          {job.requiredSkills?.length ? <p className="mt-3 text-sm text-ops-ink-muted">Skills needed: {job.requiredSkills.map((s) => s.name).join(", ")}</p> : null}
        </Card>
        <div className="grid gap-4 md:grid-cols-2">
          <Card title="Customer contact" icon={<Building2 className="h-4 w-4" aria-hidden="true" />}>
            <dl>
              <Row label="Customer">{job.customer?.name}</Row>
              <Row label="Phone">{job.customer?.phone ? <a className="text-ops-accent underline" href={`tel:${job.customer.phone}`}>{job.customer.phone}</a> : null}</Row>
              <Row label="Email">{job.customer?.email ? <a className="text-ops-accent underline" href={`mailto:${job.customer.email}`}>{job.customer.email}</a> : null}</Row>
            </dl>
          </Card>
          <Card title="Site location" icon={<MapPin className="h-4 w-4" aria-hidden="true" />}
            action={job.navigationUrl ? <a href={job.navigationUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[44px] items-center gap-1.5 rounded border border-ops-border-strong px-3 text-sm font-bold text-ops-ink hover:bg-ops-canvas"><Navigation className="h-4 w-4" aria-hidden="true" />Navigate<span className="sr-only"> (opens in a new tab)</span></a> : undefined}>
            <p className="text-sm font-bold text-ops-ink">{loc?.label}</p>
            <p className="font-mono text-sm text-ops-ink">{address || "No address"}</p>
            {hasCoords ? <p className="mt-2 inline-block rounded bg-ops-chrome px-2 py-1 font-mono text-xs text-white">GPS {loc.latitude?.toFixed(5)}, {loc.longitude?.toFixed(5)}</p> : null}
          </Card>
        </div>
        <NotesCard job={job} />
      </div>
      <div className="min-w-0 space-y-4">
        <ReviewPanel job={job} />
        <Requirements job={job} />
        {["IN_PROGRESS", "BLOCKED", "COMPLETED", "REVIEW", "CLOSED"].includes(job.status) ? <Card title="Parts used"><PartsReadOnly orgId={orgId} jobId={job.id} heading="h3" /></Card> : null}
        {job.previousJobs?.length ? (
          <Card title="Previous jobs here">
            <ul className="divide-y divide-ops-border">
              {job.previousJobs.map((p) => (
                <li key={p.id}>
                  <Link href={`/ops/${orgId}/jobs/${p.id}`} className="flex min-h-[44px] flex-wrap items-center justify-between gap-2 py-2 text-sm hover:bg-ops-canvas">
                    <span className="min-w-0"><span className="font-mono text-xs text-ops-ink-muted">{p.reference}</span> <span className="text-ops-ink">{p.title}</span></span>
                    <StatusPill status={p.status} />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
