"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createJobType, jtk, updateJobType, type JobType } from "@/b2b/api/jobTypes";
import { isB2bError } from "@/b2b/api/client";
import { Modal } from "@/b2b/components/catalog/Modal";
import { ErrorAlert, Field, btnPrimary, btnSecondary, inputCls } from "@/b2b/components/catalog/ui";
import { moneyToInput } from "@/b2b/lib/money";
import { useMoney } from "@/b2b/lib/useMoney";
import { CurrencyChoice } from "@/b2b/currency/CurrencyChoice";
import { formErrorsFrom } from "@/b2b/setup/errors";
import { useTr } from "@/b2b/setup/i18n";
import { useFocusFirstInvalid } from "@/b2b/setup/useFocusFirstInvalid";
import { isDuplicateName, jobTypeBody, normalizeName, validateJobTypeForm, type JobTypeForm } from "./jobTypeLogic";

interface Props {
  orgId: string;
  /** Every type of the company: names are unique, archived ones included. */
  all: readonly JobType[];
  /** Rename / edit this one; absent = add. */
  type?: JobType;
  finance: boolean;
  onClose: () => void;
  onSaved?: (t: JobType) => void;
}

const FIELDS = ["name", "durationMin", "price"] as const;

export function JobTypeDialog(props: Props) {
  const { tr } = useTr();
  const title = props.type ? tr("b2b.jobTypes.editTitle", "Edit {name}", { name: props.type.name }) : tr("b2b.jobTypes.add", "Add job type");
  return <Modal open title={title} onClose={props.onClose}><JobTypeForm {...props} /></Modal>;
}

function JobTypeForm({ orgId, all, type, finance, onClose, onSaved }: Props) {
  const { tr, locale } = useTr();
  const qc = useQueryClient();
  const { currency, isSet: currencyIsSet, chooseCurrency, pick: pickCurrency, refreshCompany } = useMoney();
  const [currencyNote, setCurrencyNote] = useState<string | null>(null);
  const [f, setF] = useState<JobTypeForm>(() => ({
    name: type?.name ?? "",
    durationMin: type?.defaultDurationMin ? String(type.defaultDurationMin) : "",
    price: finance ? moneyToInput(type?.defaultPrice, locale, currency) : "",
  }));
  const [touched, setTouched] = useState(false);
  const { ref: formRef, focusFirstInvalid } = useFocusFirstInvalid<HTMLFormElement>();
  const opts = { finance, locale, currency, chooseCurrency };
  const set = (k: keyof JobTypeForm, v: string) => { setF((p) => ({ ...p, [k]: v })); if (save.isError) save.reset(); };

  const save = useMutation({
    mutationFn: () => {
      const body = jobTypeBody(f, opts, type);
      return type ? updateJobType(orgId, type.id, body) : createJobType(orgId, { ...body, name: normalizeName(f.name) });
    },
    onSuccess: async (saved) => {
      await qc.invalidateQueries({ queryKey: jtk.all(orgId) });
      if (chooseCurrency && saved.defaultPrice != null) refreshCompany(); // the first price chose the company currency
      onSaved?.(saved);
      onClose();
    },
    onError: (e) => {
      if (!isB2bError(e)) return;
      const d = (typeof e.body.details === "object" && e.body.details ? e.body.details : e.body) as { effectiveCurrency?: unknown; currency?: unknown };
      if (e.code === "CURRENCY_REQUIRED") {
        // Nothing was saved: ask again with the API's suggestion pre-selected.
        const code = typeof d.effectiveCurrency === "string" ? d.effectiveCurrency : currency;
        if (typeof d.effectiveCurrency === "string") pickCurrency(d.effectiveCurrency);
        refreshCompany();
        setCurrencyNote(tr("b2b.currency.required", "Choose the company currency before saving the first amount. {currency} is pre-selected.", { currency: code }));
      } else if (e.code === "CURRENCY_MISMATCH") {
        setCurrencyNote(tr("b2b.currency.mismatch", "The company currency is {currency}, so the page was out of date. It has been refreshed; check the amounts and save again.", { currency: typeof d.currency === "string" ? d.currency : currency }));
        refreshCompany();
      }
    },
  });
  useEffect(() => { if (save.error) focusFirstInvalid(); }, [save.error, focusFirstInvalid]);

  const name = normalizeName(f.name);
  const problems = touched ? validateJobTypeForm(f, opts) : {};
  const duplicate = touched && !problems.name && isDuplicateName(all, f.name, type?.id);
  const server = formErrorsFrom(save.error, {
    keys: FIELDS,
    aliases: { defaultDurationMin: "durationMin", defaultPrice: "price" },
    text: {
      name: isB2bError(save.error) && save.error.code === "DUPLICATE_JOB_TYPE" ? tr("b2b.jobTypes.dup", "You already have a job type called {name}.", { name }) : tr("b2b.jobTypes.err.name", "Enter a name of up to 100 characters."),
      durationMin: tr("b2b.jobTypes.err.time", "Enter a whole number of minutes, from 1 to 20160."),
      price: tr("b2b.jobTypes.err.price", "Enter an amount from 0 to 10,000,000.00."),
    },
  }, tr);
  const fieldError = (k: keyof JobTypeForm): string | undefined => {
    if (server.fields[k]) return server.fields[k];
    if (k === "name" && duplicate) return tr("b2b.jobTypes.dup", "You already have a job type called {name}.", { name });
    const p = problems[k];
    if (!p) return undefined;
    if (k === "name") return p === "required" ? tr("b2b.jobTypes.err.nameRequired", "Enter a name.") : tr("b2b.jobTypes.err.name", "Enter a name of up to 100 characters.");
    if (k === "durationMin") return tr("b2b.jobTypes.err.time", "Enter a whole number of minutes, from 1 to 20160.");
    return tr("b2b.jobTypes.err.price", "Enter an amount from 0 to 10,000,000.00.");
  };

  return (
    <form ref={formRef} noValidate className="space-y-3" onSubmit={(e) => {
      e.preventDefault(); setTouched(true);
      if (Object.keys(validateJobTypeForm(f, opts)).length > 0 || isDuplicateName(all, f.name, type?.id)) { focusFirstInvalid(); return; }
      save.mutate();
    }}>
      <Field label={tr("b2b.jobTypes.col.name", "Name")} error={fieldError("name")}>
        {(p) => <input id={p.id} autoFocus autoComplete="off" maxLength={140} value={f.name} aria-describedby={p.describedBy} aria-invalid={p.invalid} onChange={(e) => set("name", e.target.value)} className={inputCls} />}
      </Field>
      <Field label={tr("b2b.jobTypes.field.time", "Default time (minutes)")} hint={tr("b2b.jobTypes.field.timeHint", "Optional. Fills the duration of new jobs of this type.")} error={fieldError("durationMin")}>
        {(p) => <input id={p.id} inputMode="numeric" autoComplete="off" value={f.durationMin} aria-describedby={p.describedBy} aria-invalid={p.invalid} onChange={(e) => set("durationMin", e.target.value)} className={inputCls} />}
      </Field>
      {finance && <CurrencyChoice isSet={currencyIsSet} currency={currency} onPick={(c) => { pickCurrency(c); setCurrencyNote(null); }} error={currencyNote} />}
      {finance && (
        <Field label={tr("b2b.jobTypes.field.price", "Default price")} hint={tr("b2b.jobTypes.field.priceHint", "Optional. Fills the price of new jobs of this type; it can be changed on each job.")} error={fieldError("price")}>
          {(p) => <input id={p.id} inputMode="decimal" autoComplete="off" value={f.price} aria-describedby={p.describedBy} aria-invalid={p.invalid} onChange={(e) => set("price", e.target.value)} className={inputCls} />}
        </Field>
      )}
      {server.banner && <ErrorAlert message={server.banner} />}
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" onClick={onClose} className={btnSecondary}>{tr("b2b.common.cancel", "Cancel")}</button>
        <button type="submit" disabled={save.isPending} className={btnPrimary}>{save.isPending ? tr("b2b.common.saving", "Saving…") : tr("b2b.common.save", "Save")}</button>
      </div>
    </form>
  );
}
