"use client";

import Link from "next/link";
import { Settings2 } from "lucide-react";
import type { JobType } from "@/b2b/api/jobTypes";
import { formatDuration } from "@/b2b/lib/job-form";
import { useOrg } from "@/b2b/context/OrgContext";
import { useTr } from "@/b2b/setup/i18n";
import { cn } from "@/lib/utils";
import { fieldId, FormGroup } from "./FormField";

interface Props {
  types: readonly JobType[];
  /** The type the job already has when it is archived: shown (and kept) on an old job, never offered to a new one. */
  current?: { id: string; name: string; archived: boolean } | null;
  value: string;
  error?: string;
  /** Show "Time and price are filled from the job type." */
  prefilled: boolean;
  onChange: (type: JobType | null) => void;
}

/** Job type as radio cards, in the admin's order. Replaces the free-text category once the company has job types. */
export function JobTypePicker({ types, current, value, error, prefilled, onChange }: Props) {
  const { tr } = useTr();
  const legacy = current && !types.some((x) => x.id === current.id) ? current : null;
  return (
    <FormGroup name="jobTypeId" legend={tr("b2b.newJob.type", "Job type")} required error={error} hint={prefilled ? tr("b2b.newJob.typeHelp", "Time and price are filled from the job type. You can change them.") : undefined}>
      <div role="radiogroup" aria-label={tr("b2b.newJob.type", "Job type")} aria-describedby={error ? `${fieldId("jobTypeId")}-err` : undefined} className="grid gap-2 sm:grid-cols-2">
        {legacy ? (
          <label key={legacy.id} className={cn(CARD, value === legacy.id ? CARD_ON : CARD_OFF)}>
            <input type="radio" name="nj-jobType" className="sr-only" checked={value === legacy.id} onChange={() => onChange(null)} />
            <span className="block min-w-0 break-words font-bold">{legacy.name}</span>
            <span className="block text-xs opacity-80">{tr("b2b.newJob.typeArchived", "Archived. It stays on this job.")}</span>
          </label>
        ) : null}
        {types.map((t) => {
          const on = value === t.id;
          return (
            <label key={t.id} className={cn(CARD, on ? CARD_ON : CARD_OFF)}>
              <input type="radio" name="nj-jobType" className="sr-only" checked={on} onChange={() => onChange(t)} />
              <span className="block min-w-0 break-words font-bold">{t.name}</span>
              {t.defaultDurationMin ? <span className="block text-xs opacity-80">{formatDuration(t.defaultDurationMin)}</span> : null}
            </label>
          );
        })}
      </div>
    </FormGroup>
  );
}

const CARD = "block min-h-[44px] cursor-pointer rounded border px-3 py-2 text-sm focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ops-ink";
const CARD_ON = "border-ops-ink bg-ops-ink text-white";
const CARD_OFF = "border-ops-border-strong bg-ops-surface text-ops-ink hover:bg-ops-canvas";

/** Shown instead of the picker when the company has no job types yet: the old free-text category, plus a way to fix that for those who can. */
export function SetUpJobTypesLink() {
  const { tr } = useTr();
  const { orgId, can } = useOrg();
  if (!can("jobType.manage")) return null;
  return (
    <Link href={`/ops/${encodeURIComponent(orgId)}/settings/job-types`} className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-bold text-ops-ink underline">
      <Settings2 className="h-4 w-4" aria-hidden="true" />{tr("b2b.newJob.noTypes", "Set up job types")}
    </Link>
  );
}
