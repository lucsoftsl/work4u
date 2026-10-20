"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ck, listSkills } from "@/b2b/api/catalog";
import type { JobRequirements, JobWorkspace } from "@/b2b/api/types";
import { useOrg } from "@/b2b/context/OrgContext";
import { Banner, fieldClass, ReasonDialog } from "@/b2b/components/workspace/ui";
import {
  CATEGORY_SUGGESTIONS, DURATION_PRESETS, PRIORITY_OPTIONS, applyJobType, draftErrors, draftFromJob, draftNeedsTitleOrClient, emptyDraft, firstInvalid,
  formatDuration, mapSubmitError, parseDuration, validateDraft, type DraftErrors, type FieldCode, type FieldKey, type FormOpts, type JobDraft, type SubmitError,
} from "@/b2b/lib/job-form";
import { clearSessionDrafts, useSessionState } from "@/b2b/lib/useSessionState";
import { useMoney } from "@/b2b/lib/useMoney";
import { useActiveJobTypes } from "@/b2b/setup/jobtypes/useJobTypes";
import { useTr } from "@/b2b/setup/i18n";
import { DraftSavedBar, IncompleteAlert } from "./DraftNotices";
import { describedBy, fieldId, FormField, FormGroup } from "./FormField";
import { JobActionBar } from "./JobActionBar";
import { JobTypePicker, SetUpJobTypesLink } from "./JobTypePicker";
import { MoneyCard } from "./MoneyCard";
import { CustomerPicker, LocationPicker } from "./Pickers";
import { useJobWrites } from "./useJobWrites";

const CHECK_ROW = "flex min-h-[44px] cursor-pointer items-center gap-3 text-sm text-ops-ink";
const CHIP = "inline-flex min-h-[44px] items-center justify-center rounded border px-3 text-sm font-bold focus-within:outline focus-within:outline-2 focus-within:outline-ops-ink";
// Keep a focused field clear of the sticky action bar.
const KEEP_CLEAR = "[&_:is(input,textarea,select,fieldset)]:scroll-mb-32";

interface Props {
  /** An existing draft to edit (the draft page). Absent: a new job. */
  draftJob?: JobWorkspace;
  /** The draft was just saved from the new-job form (?saved=1): show the confirmation. */
  justSaved?: boolean;
}

export function NewJobForm({ draftJob, justSaved = false }: Props) {
  const { tr: t, locale } = useTr();
  const router = useRouter();
  const { orgId, can } = useOrg();
  const { finance, currency, isSet: currencyIsSet, chooseCurrency, pick: pickCurrency, selected: selectedCurrency, refreshCompany } = useMoney();
  const typesQ = useActiveJobTypes(orgId);
  const types = useMemo(() => typesQ.data ?? [], [typesQ.data]);
  const typesAvailable = types.length > 0;
  const opts = useMemo<FormOpts>(() => ({ typesAvailable, finance, locale, currency, chooseCurrency }), [typesAvailable, finance, locale, currency, chooseCurrency]);

  // The form (and the inline client/location dialogs under it) survives a reload or an accidental close in this tab;
  // it is dropped once the job is created, the draft is discarded, or a new form is cancelled.
  const draftKey = draftJob ? `b2b.draftJob.${orgId}.${draftJob.id}` : `b2b.newJob.${orgId}`;
  const [stored, setDraft] = useSessionState<JobDraft>(draftKey, () => (draftJob ? draftFromJob(draftJob, { finance, locale, currency }) : emptyDraft()));
  // A form stored by an older build lacks the newer keys: fill them in.
  const draft = useMemo<JobDraft>(() => ({ ...emptyDraft(), ...stored, requirements: { ...emptyDraft().requirements, ...stored.requirements } }), [stored]);
  const [errors, setErrors] = useState<DraftErrors>({});
  const [server, setServer] = useState<SubmitError | null>(null);
  const [draftNeed, setDraftNeed] = useState(false);
  const [savedRef, setSavedRef] = useState<string | null>(justSaved && draftJob ? draftJob.reference : null);
  const [discardOpen, setDiscardOpen] = useState(false);

  const skills = useQuery({ queryKey: ck.skills(orgId), queryFn: () => listSkills(orgId), staleTime: 60_000, retry: false });

  const patch = useCallback((p: Partial<JobDraft>) => setDraft((d) => ({ ...emptyDraft(), ...d, ...p })), [setDraft]);
  const clear = useCallback((k: FieldKey) => { setErrors((e) => (e[k] ? { ...e, [k]: undefined } : e)); setServer((s) => (s?.fields[k] ? { ...s, fields: { ...s.fields, [k]: undefined } } : s)); }, []);

  const focusField = (key: FieldKey) => {
    const el = document.getElementById(fieldId(key)) ?? document.querySelector<HTMLElement>(`#${fieldId(key)} input, #${fieldId(key)} button`);
    el?.focus();
  };

  const onError = (e: unknown) => {
    const mapped = mapSubmitError(e, opts);
    setServer(mapped);
    if (mapped.kind === "currencyRequired") {
      // Nothing was saved: ask again with the API's suggestion pre-selected.
      if (mapped.suggestedCurrency) pickCurrency(mapped.suggestedCurrency);
      refreshCompany(); // the page thought the company had a currency: re-read, and the selector appears
      setTimeout(() => focusField("currency" as FieldKey), 0);
      return;
    }
    if (mapped.kind === "currencyMismatch") {
      refreshCompany(); // the page showed another currency than the company's
      return;
    }
    if (mapped.kind === "incomplete") {
      setErrors(Object.fromEntries((mapped.missing ?? []).map((k) => [k, "required"])) as DraftErrors);
      const first = (mapped.missing ?? [])[0];
      if (first) setTimeout(() => focusField(first), 0);
      return;
    }
    const first = (["title", "jobTypeId", "category", "description", "customerId", "locationId", "requestedDate", "estimatedDurationMin", "price", "cost", "requiredSkillIds", "requirements", "checklist"] as const).find((k) => mapped.fields[k]);
    if (first) setTimeout(() => focusField(first), 0);
  };
  const writes = useJobWrites({ orgId, draftJob, draftKey, draft, opts, onError, onDraftSaved: (ref) => setSavedRef(ref) });

  // The "add a title or choose a client" message goes away by itself as soon as either exists.
  const showDraftNeed = draftNeed && draftNeedsTitleOrClient(draft);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setServer(null); setDraftNeed(false); setSavedRef(null);
    const found = validateDraft(draft, opts);
    setErrors(found);
    const first = firstInvalid(found);
    if (first) { focusField(first); return; }
    if (draftJob) writes.promote.mutate(); else writes.create.mutate();
  };
  const saveAsDraft = () => {
    setServer(null); setSavedRef(null);
    if (draftNeedsTitleOrClient(draft)) { setDraftNeed(true); setErrors({}); focusField("title"); return; }
    setDraftNeed(false);
    const found = draftErrors(draft, opts);
    setErrors(found);
    const first = firstInvalid(found);
    if (first) { focusField(first); return; }
    writes.saveDraft.mutate();
  };

  const codeText = (code: FieldCode | undefined, key: FieldKey): string | undefined => {
    switch (code) {
      case "required":
        return key === "customerId" ? t("b2b.newJob.err.customer", "Choose a customer.")
          : key === "locationId" ? t("b2b.newJob.err.location", "Choose a location.")
          : key === "jobTypeId" ? t("b2b.newJob.err.type", "Choose a job type.")
          : t("b2b.newJob.err.required", "This field is required.");
      case "tooLong": return t("b2b.newJob.err.tooLong", "This is too long.");
      case "invalidDate": return t("b2b.newJob.err.invalidDate", "Enter a valid date.");
      case "invalidNumber": return t("b2b.newJob.err.invalidNumber", "Enter a whole number of minutes.");
      case "outOfRange": return t("b2b.newJob.err.outOfRange", "Enter between 1 minute and 14 days (20160 minutes).");
      case "tooMany": return t("b2b.newJob.err.tooMany", "There are too many entries.");
      case "invalidMoney": return t("b2b.newJob.err.money", "Enter an amount like 450.00.");
      case "moneyRange": return t("b2b.newJob.err.moneyRange", "Enter an amount from 0 to 10,000,000.00.");
      default: return undefined;
    }
  };
  const err = (k: FieldKey): string | undefined => codeText(errors[k], k) ?? server?.fields[k];

  const duration = parseDuration(draft.durationMin);
  const setReq = (k: keyof JobRequirements, v: boolean) => patch({ requirements: { ...draft.requirements, [k]: v } });
  const toggleSkill = (id: string) => patch({ requiredSkillIds: draft.requiredSkillIds.includes(id) ? draft.requiredSkillIds.filter((s) => s !== id) : [...draft.requiredSkillIds, id] });
  const pickCustomer = useCallback((customerId: string, locationId?: string) => {
    patch({ customerId, locationId: locationId ?? "" });
    clear("customerId");
    if (locationId) clear("locationId");
  }, [patch, clear]);
  const pickLocation = useCallback((locationId: string) => { patch({ locationId }); clear("locationId"); }, [patch, clear]);
  const pickType = (type: (typeof types)[number] | null) => {
    setDraft((d) => applyJobType({ ...emptyDraft(), ...d }, type, opts));
    clear("jobTypeId");
  };

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

  const editing = !!draftJob;
  const banner =
    server?.kind === "forbidden" ? t("b2b.newJob.forbidden", "You don't have permission to create jobs in this workspace.")
    : server?.kind === "archived" ? t("b2b.clients.err.archived", "This client is archived. Restore it to create jobs.")
    : server?.kind === "network" ? t("b2b.newJob.network", "Can't reach the server. Check your connection and try again.")
    : server?.kind === "isDraft" ? t("b2b.jobs.draft.isDraftError", "This is still a draft. Create the job first to schedule or assign it.")
    : server?.kind === "notDraft" ? t("b2b.jobs.draft.notDraftError", "This job was already created, so it can't be edited here any more. Reload the page.")
    : server?.kind === "currencyRequired" ? t("b2b.currency.required", "Choose the company currency before saving the first amount. {currency} is pre-selected.", { currency: server.suggestedCurrency ?? selectedCurrency })
    : server?.kind === "currencyMismatch" ? t("b2b.currency.mismatch", "The company currency is {currency}, so the page was out of date. It has been refreshed; check the amounts and save again.", { currency: server.companyCurrency ?? currency })
    : server?.kind === "incomplete" ? undefined
    : server?.message;
  const hasFieldErrors = Object.values(errors).some(Boolean) || Object.values(server?.fields ?? {}).some(Boolean);
  const draftsHref = `/ops/${encodeURIComponent(orgId)}/jobs?status=DRAFT&mine=true`;
  const typesPending = typesQ.isPending;
  const typePrefilled = !!draft.jobTypeId && (!draft.durationTouched || (finance && !draft.priceTouched));
  const current = draftJob?.jobType ?? null;

  return (
    <>
    <form onSubmit={submit} noValidate className={`space-y-6 ${KEEP_CLEAR}`} aria-describedby={banner ? "nj-banner" : undefined}>
      {savedRef ? <DraftSavedBar reference={savedRef} draftsHref={draftsHref} autoFocus={justSaved} onKeepEditing={() => { setSavedRef(null); focusField("title"); }} /> : null}
      {server?.kind === "incomplete" && server.missing?.length ? <IncompleteAlert missing={server.missing} onJump={focusField} /> : null}
      {banner && !(server?.kind === "field" && Object.values(server.fields).some(Boolean)) ? (
        <div id="nj-banner"><Banner tone="danger" role="alert">{banner}</Banner></div>
      ) : null}
      {hasFieldErrors && server?.kind !== "incomplete" ? <Banner tone="danger" role="alert">{t("b2b.newJob.fixErrors", "Some fields need your attention. They are marked below.")}</Banner> : null}
      {server?.unknown ? <Banner tone="danger" role="alert">{server.unknown}</Banner> : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-5">
          <FormField name="title" label={t("b2b.newJob.title", "Title")} required error={err("title")}>
            <input id={fieldId("title")} value={draft.title} maxLength={200} onChange={(e) => { patch({ title: e.target.value }); clear("title"); }} aria-invalid={!!err("title") || showDraftNeed} aria-describedby={describedBy("title", { error: err("title") })} className={`${fieldClass} min-h-[44px]`} />
          </FormField>

          {typesPending ? (
            <p role="status" className="text-sm text-ops-ink-muted">{t("b2b.newJob.loadingTypes", "Loading job types…")}</p>
          ) : typesAvailable ? (
            <JobTypePicker types={types} current={current} value={draft.jobTypeId} error={err("jobTypeId")} prefilled={typePrefilled} onChange={pickType} />
          ) : (
            <div className="space-y-1">
              <FormField name="category" label={t("b2b.newJob.category", "Category")} required error={err("category")} hint={t("b2b.newJob.categoryHint", "For example Repair, Maintenance or Installation.")}>
                <input id={fieldId("category")} list="nj-category-list" value={draft.category} maxLength={100} onChange={(e) => { patch({ category: e.target.value }); clear("category"); }} aria-invalid={!!err("category")} aria-describedby={describedBy("category", { error: err("category"), hint: true })} className={`${fieldClass} min-h-[44px]`} />
                <datalist id="nj-category-list">{CATEGORY_SUGGESTIONS.map((c) => <option key={c} value={t(`b2b.newJob.cat.${c.toLowerCase()}`, c)} />)}</datalist>
              </FormField>
              <SetUpJobTypesLink />
            </div>
          )}

          <FormField name="description" label={t("b2b.newJob.description", "Description")} error={err("description")}>
            <textarea id={fieldId("description")} rows={4} value={draft.description} onChange={(e) => { patch({ description: e.target.value }); clear("description"); }} aria-invalid={!!err("description")} aria-describedby={describedBy("description", { error: err("description") })} className={fieldClass} />
          </FormField>

          <CustomerPicker value={draft.customerId} error={err("customerId")} onChange={pickCustomer} draftKey={draftKey} />
          <LocationPicker customerId={draft.customerId} value={draft.locationId} error={err("locationId")} onChange={pickLocation} draftKey={draftKey} />
        </div>

        <div className="space-y-5">
          {finance ? (
            <MoneyCard
              price={draft.price} cost={draft.cost} currency={currency} currencyIsSet={currencyIsSet} onCurrency={pickCurrency}
              priceFromType={!!draft.jobTypeId && !draft.priceTouched && draft.price !== ""}
              priceError={err("price")} costError={err("cost")}
              onPrice={(v) => { patch({ price: v, priceTouched: true }); clear("price"); }}
              onCost={(v) => { patch({ cost: v }); clear("cost"); }}
            />
          ) : null}

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
            <input id={fieldId("estimatedDurationMin")} inputMode="numeric" value={draft.durationMin} onChange={(e) => { patch({ durationMin: e.target.value, durationTouched: true }); clear("estimatedDurationMin"); }} aria-invalid={!!err("estimatedDurationMin")} aria-describedby={describedBy("estimatedDurationMin", { error: err("estimatedDurationMin"), hint: true })} className={`${fieldClass} min-h-[44px] sm:w-40`} />
            <div className="flex flex-wrap gap-2 pt-1" role="group" aria-label={t("b2b.newJob.durationPresets", "Duration presets")}>
              {DURATION_PRESETS.map((p) => (
                <button key={p.minutes} type="button" aria-pressed={duration === p.minutes} onClick={() => { patch({ durationMin: String(p.minutes), durationTouched: true }); clear("estimatedDurationMin"); }}
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

      <JobActionBar
        busy={writes.busy || typesPending}
        creating={writes.create.isPending || writes.promote.isPending}
        savingDraft={writes.saveDraft.isPending}
        draftNeed={showDraftNeed}
        editingDraft={editing}
        draftsHref={draftsHref}
        canDiscard={can("job.cancel")}
        onCancel={() => { clearSessionDrafts(draftKey); router.push(`/ops/${encodeURIComponent(orgId)}/jobs`); }}
        onSaveDraft={saveAsDraft}
        onDiscard={() => { writes.discard.reset(); setDiscardOpen(true); }}
      />
    </form>

      {draftJob ? (
        <ReasonDialog
          open={discardOpen}
          title={t("b2b.jobs.draft.discardTitle", "Discard this draft?")}
          description={t("b2b.jobs.draft.discardBody", "{ref} will be cancelled. It was never scheduled, so nobody is notified.", { ref: draftJob.reference })}
          reasonLabel={t("b2b.jobs.draft.discardReason", "Reason")}
          reasonHint={t("b2b.jobs.draft.discardReasonHint", "Required, at least 3 characters.")}
          reasonShort={t("b2b.jobs.draft.discardReasonShort", "Enter at least 3 characters.")}
          cancelLabel={t("b2b.common.cancel", "Cancel")}
          confirmLabel={t("b2b.jobs.draft.discard", "Discard draft")}
          tone="danger"
          loading={writes.discard.isPending}
          error={writes.discard.isError ? t("b2b.jobs.draft.discardError", "Couldn't discard the draft. Reload the page and try again.") : null}
          onConfirm={(reason) => writes.discard.mutate(reason)}
          onCancel={() => setDiscardOpen(false)}
        />
      ) : null}
    </>
  );
}
