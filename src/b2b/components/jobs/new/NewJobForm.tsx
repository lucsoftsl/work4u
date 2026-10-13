"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "@/lib/i18n";
import { createJob, qk } from "@/b2b/api/endpoints";
import { ck, listSkills } from "@/b2b/api/catalog";
import type { JobRequirements } from "@/b2b/api/types";
import { useOrg } from "@/b2b/context/OrgContext";
import { Banner, btnClass, fieldClass } from "@/b2b/components/workspace/ui";
import {
  CATEGORY_SUGGESTIONS, DURATION_PRESETS, PRIORITY_OPTIONS, buildCreateJobInput, emptyDraft, firstInvalid, formatDuration, mapSubmitError, parseDuration,
  validateDraft, type DraftErrors, type FieldCode, type FieldKey, type JobDraft, type SubmitError,
} from "@/b2b/lib/job-form";
import { describedBy, fieldId, FormField, FormGroup } from "./FormField";
import { CustomerPicker, LocationPicker } from "./Pickers";

const CHECK_ROW = "flex min-h-[44px] cursor-pointer items-center gap-3 text-sm text-ops-ink";
const CHIP = "inline-flex min-h-[44px] items-center justify-center rounded border px-3 text-sm font-bold focus-within:outline focus-within:outline-2 focus-within:outline-ops-ink";

export function NewJobForm() {
  const { t } = useTranslation();
  const router = useRouter();
  const qc = useQueryClient();
  const { orgId } = useOrg();
  const [draft, setDraft] = useState<JobDraft>(emptyDraft);
  const [errors, setErrors] = useState<DraftErrors>({});
  const [server, setServer] = useState<SubmitError | null>(null);

  const skills = useQuery({ queryKey: ck.skills(orgId), queryFn: () => listSkills(orgId), staleTime: 60_000, retry: false });

  const patch = useCallback((p: Partial<JobDraft>) => setDraft((d) => ({ ...d, ...p })), []);
  const clear = useCallback((k: FieldKey) => { setErrors((e) => (e[k] ? { ...e, [k]: undefined } : e)); setServer((s) => (s?.fields[k] ? { ...s, fields: { ...s.fields, [k]: undefined } } : s)); }, []);

  const focusField = (key: FieldKey) => {
    const el = document.getElementById(fieldId(key)) ?? document.querySelector<HTMLElement>(`#${fieldId(key)} input, #${fieldId(key)} button`);
    el?.focus();
  };

  const save = useMutation({
    mutationFn: () => createJob(orgId, buildCreateJobInput(draft)),
    onSuccess: async (job) => {
      await qc.invalidateQueries({ queryKey: qk.jobsAll(orgId) });
      router.push(`/ops/${encodeURIComponent(orgId)}/jobs/${encodeURIComponent(job.id)}`);
    },
    onError: (e) => {
      const mapped = mapSubmitError(e);
      setServer(mapped);
      const first = (["title", "category", "description", "customerId", "locationId", "requestedDate", "estimatedDurationMin", "requiredSkillIds", "requirements", "checklist"] as const).find((k) => mapped.fields[k]);
      if (first) setTimeout(() => focusField(first), 0);
    },
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setServer(null);
    const found = validateDraft(draft);
    setErrors(found);
    const first = firstInvalid(found);
    if (first) { focusField(first); return; }
    save.mutate();
  };

  const codeText = (code: FieldCode | undefined): string | undefined => {
    switch (code) {
      case "required": return t("b2b.newJob.err.required", "This field is required.");
      case "tooLong": return t("b2b.newJob.err.tooLong", "This is too long.");
      case "invalidDate": return t("b2b.newJob.err.invalidDate", "Enter a valid date.");
      case "invalidNumber": return t("b2b.newJob.err.invalidNumber", "Enter a whole number of minutes.");
      case "outOfRange": return t("b2b.newJob.err.outOfRange", "Enter between 1 minute and 14 days (20160 minutes).");
      case "tooMany": return t("b2b.newJob.err.tooMany", "There are too many entries.");
      default: return undefined;
    }
  };
  const err = (k: FieldKey): string | undefined => codeText(errors[k]) ?? server?.fields[k];

  const duration = parseDuration(draft.durationMin);
  const setReq = (k: keyof JobRequirements, v: boolean) => patch({ requirements: { ...draft.requirements, [k]: v } });
  const toggleSkill = (id: string) => patch({ requiredSkillIds: draft.requiredSkillIds.includes(id) ? draft.requiredSkillIds.filter((s) => s !== id) : [...draft.requiredSkillIds, id] });
  const pickCustomer = useCallback((customerId: string) => { patch({ customerId, locationId: "" }); clear("customerId"); }, [patch, clear]);
  const pickLocation = useCallback((locationId: string) => { patch({ locationId }); clear("locationId"); }, [patch, clear]);

  const REQUIREMENTS: ReadonlyArray<[keyof JobRequirements, string]> = [
    ["checklist", t("b2b.newJob.req.checklist", "Checklist must be completed")],
    ["notes", t("b2b.newJob.req.notes", "Completion notes required")],
    ["photo", t("b2b.newJob.req.photo", "After photo required")],
    ["signature", t("b2b.newJob.req.signature", "Customer signature required")],
    ["review", t("b2b.newJob.req.review", "Office review before closing")],
  ];
  const PRIORITY_LABEL: Record<string, string> = {
    LOW: t("b2b.jobs.priority.LOW", "Low"), NORMAL: t("b2b.jobs.priority.NORMAL", "Normal"),
    HIGH: t("b2b.jobs.priority.HIGH", "High"), URGENT: t("b2b.jobs.priority.URGENT", "Urgent"),
  };

  const banner =
    server?.kind === "forbidden" ? t("b2b.newJob.forbidden", "You don't have permission to create jobs in this workspace.")
    : server?.kind === "network" ? t("b2b.newJob.network", "Can't reach the server. Check your connection and try again.")
    : server?.message;
  const hasFieldErrors = Object.values(errors).some(Boolean) || Object.values(server?.fields ?? {}).some(Boolean);

  return (
    <form onSubmit={submit} noValidate className="space-y-6" aria-describedby={banner ? "nj-banner" : undefined}>
      {banner && !(server?.kind === "field" && Object.values(server.fields).some(Boolean)) ? (
        <div id="nj-banner"><Banner tone="danger" role="alert">{banner}</Banner></div>
      ) : null}
      {hasFieldErrors ? <Banner tone="danger" role="alert">{t("b2b.newJob.fixErrors", "Some fields need your attention. They are marked below.")}</Banner> : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-5">
          <FormField name="title" label={t("b2b.newJob.title", "Title")} required error={err("title")}>
            <input id={fieldId("title")} value={draft.title} maxLength={200} onChange={(e) => { patch({ title: e.target.value }); clear("title"); }} aria-invalid={!!err("title")} aria-describedby={describedBy("title", { error: err("title") })} className={`${fieldClass} min-h-[44px]`} />
          </FormField>

          <FormField name="category" label={t("b2b.newJob.category", "Category")} required error={err("category")} hint={t("b2b.newJob.categoryHint", "For example Repair, Maintenance or Installation.")}>
            <input id={fieldId("category")} list="nj-category-list" value={draft.category} maxLength={100} onChange={(e) => { patch({ category: e.target.value }); clear("category"); }} aria-invalid={!!err("category")} aria-describedby={describedBy("category", { error: err("category"), hint: true })} className={`${fieldClass} min-h-[44px]`} />
            <datalist id="nj-category-list">{CATEGORY_SUGGESTIONS.map((c) => <option key={c} value={c} />)}</datalist>
          </FormField>

          <FormField name="description" label={t("b2b.newJob.description", "Description")} error={err("description")}>
            <textarea id={fieldId("description")} rows={4} value={draft.description} onChange={(e) => { patch({ description: e.target.value }); clear("description"); }} aria-invalid={!!err("description")} aria-describedby={describedBy("description", { error: err("description") })} className={fieldClass} />
          </FormField>

          <CustomerPicker value={draft.customerId} error={err("customerId")} onChange={pickCustomer} />
          <LocationPicker customerId={draft.customerId} value={draft.locationId} error={err("locationId")} onChange={pickLocation} />
        </div>

        <div className="space-y-5">
          <FormGroup name="priority" legend={t("b2b.newJob.priority", "Priority")}>
            <div className="flex flex-wrap gap-2">
              {PRIORITY_OPTIONS.map((p) => (
                <label key={p} className={`${CHIP} cursor-pointer ${draft.priority === p ? "border-ops-ink bg-ops-ink text-white" : "border-ops-border-strong bg-ops-surface text-ops-ink hover:bg-ops-canvas"}`}>
                  <input type="radio" name="nj-priority" value={p} checked={draft.priority === p} onChange={() => patch({ priority: p })} className="sr-only" />
                  {PRIORITY_LABEL[p]}
                </label>
              ))}
            </div>
          </FormGroup>

          <FormField name="requestedDate" label={t("b2b.newJob.requestedDate", "Requested date")} error={err("requestedDate")}>
            <input id={fieldId("requestedDate")} type="date" value={draft.requestedDate} onChange={(e) => { patch({ requestedDate: e.target.value }); clear("requestedDate"); }} aria-invalid={!!err("requestedDate")} aria-describedby={describedBy("requestedDate", { error: err("requestedDate") })} className={`${fieldClass} min-h-[44px] sm:w-56`} />
          </FormField>

          <FormField name="estimatedDurationMin" label={t("b2b.newJob.duration", "Estimated duration (minutes)")} error={err("estimatedDurationMin")}
            hint={duration !== null && duration > 0 ? formatDuration(duration) : t("b2b.newJob.durationHint", "Optional. Used to plan the day.")}>
            <input id={fieldId("estimatedDurationMin")} inputMode="numeric" value={draft.durationMin} onChange={(e) => { patch({ durationMin: e.target.value }); clear("estimatedDurationMin"); }} aria-invalid={!!err("estimatedDurationMin")} aria-describedby={describedBy("estimatedDurationMin", { error: err("estimatedDurationMin"), hint: true })} className={`${fieldClass} min-h-[44px] sm:w-40`} />
            <div className="flex flex-wrap gap-2 pt-1" role="group" aria-label={t("b2b.newJob.durationPresets", "Duration presets")}>
              {DURATION_PRESETS.map((p) => (
                <button key={p.minutes} type="button" aria-pressed={duration === p.minutes} onClick={() => { patch({ durationMin: String(p.minutes) }); clear("estimatedDurationMin"); }}
                  className={`${CHIP} ${duration === p.minutes ? "border-ops-ink bg-ops-ink text-white" : "border-ops-border-strong bg-ops-surface text-ops-ink hover:bg-ops-canvas"}`}>
                  {p.label}
                </button>
              ))}
            </div>
          </FormField>

          <FormGroup name="requiredSkillIds" legend={t("b2b.newJob.skills", "Required skills")} error={err("requiredSkillIds")}>
            {skills.isPending ? <p role="status" className="text-sm text-ops-ink-muted">{t("b2b.newJob.loadingSkills", "Loading skills…")}</p>
              : skills.isError ? <p className="text-sm text-ops-ink-muted">{t("b2b.newJob.skillsError", "Skills could not be loaded. You can still create the job.")}</p>
              : skills.data.length === 0 ? <p className="text-sm text-ops-ink-muted">{t("b2b.newJob.noSkills", "No skills have been defined yet.")}</p>
              : skills.data.map((s) => (
                <label key={s.id} className={CHECK_ROW}>
                  <input type="checkbox" className="h-5 w-5" checked={draft.requiredSkillIds.includes(s.id)} onChange={() => toggleSkill(s.id)} />{s.name}
                </label>
              ))}
          </FormGroup>

          <FormGroup name="requirements" legend={t("b2b.newJob.requirements", "Completion requirements")} error={err("requirements")}>
            {REQUIREMENTS.map(([k, label]) => (
              <label key={k} className={CHECK_ROW}>
                <input type="checkbox" className="h-5 w-5" checked={draft.requirements[k]} onChange={(e) => setReq(k, e.target.checked)} />{label}
              </label>
            ))}
          </FormGroup>
        </div>
      </div>

      <FormField name="checklist" label={t("b2b.newJob.checklist", "Checklist items")} error={err("checklist")} hint={t("b2b.newJob.checklistHint", "Optional. One item per line.")}>
        <textarea id={fieldId("checklist")} rows={4} value={draft.checklistText} onChange={(e) => { patch({ checklistText: e.target.value }); clear("checklist"); }} aria-invalid={!!err("checklist")} aria-describedby={describedBy("checklist", { error: err("checklist"), hint: true })} className={fieldClass} />
      </FormField>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={save.isPending} aria-busy={save.isPending || undefined} className={btnClass("primary")}>
          {save.isPending ? t("b2b.newJob.creating", "Creating…") : t("b2b.newJob.create", "Create job")}
        </button>
        <button type="button" onClick={() => router.push(`/ops/${encodeURIComponent(orgId)}/jobs`)} disabled={save.isPending} className={btnClass("secondary")}>
          {t("b2b.common.cancel", "Cancel")}
        </button>
      </div>
    </form>
  );
}
