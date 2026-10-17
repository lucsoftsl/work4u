"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { isB2bError } from "@/b2b/api/client";
import { submitDemoRequest, type DemoTeamSize } from "@/b2b/api/endpoints";
import { buttonClasses } from "@/components/ui/Button";

const TEAM_SIZES: DemoTeamSize[] = ["1-5", "6-20", "21-50", "51+"];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Field = "name" | "email" | "company" | "phone" | "message";

export interface DemoFormLabels {
  name: string; email: string; company: string; phone: string; teamSize: string; teamSizeUnit: string;
  message: string; messageHint: string; submit: string; sending: string; sentTitle: string; sentBody: string;
  errRequired: string; errEmail: string; errBusy: string; errGeneric: string; errCheck: string; privacy: string;
}

const field = "mt-1 block min-h-[48px] w-full rounded-control border border-line-strong bg-surface px-3 text-body text-ink transition-[border-color,box-shadow] duration-fast hover:border-ink-muted focus:border-primary focus:outline-none focus-visible:shadow-focus aria-[invalid=true]:border-ember-text";
const label = "block text-label text-ink";

/** "Request a demo" form of the public B2B site: posts to /api/b2b/demo-requests, keeps the input on errors, thanks on success. */
export function DemoRequestForm({ labels, lang }: { labels: DemoFormLabels; lang: string }) {
  const id = useId();
  const [values, setValues] = useState({ name: "", email: "", company: "", phone: "", teamSize: "", message: "", website: "" });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [problem, setProblem] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const problemRef = useRef<HTMLParagraphElement>(null);
  const doneRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (problem) problemRef.current?.focus(); }, [problem]);
  useEffect(() => { if (state === "sent") doneRef.current?.focus(); }, [state]);

  const set = (k: keyof typeof values) => (e: { target: { value: string } }) => setValues((v) => ({ ...v, [k]: e.target.value }));

  const validate = (): Partial<Record<Field, string>> => {
    const out: Partial<Record<Field, string>> = {};
    if (values.name.trim().length < 2) out.name = labels.errRequired;
    if (!EMAIL.test(values.email.trim())) out.email = labels.errEmail;
    if (values.company.trim().length < 2) out.company = labels.errRequired;
    return out;
  };

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (state === "sending") return;
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length) { setProblem(labels.errCheck); return; }
    setState("sending"); setProblem(null);
    try {
      await submitDemoRequest({
        name: values.name.trim(),
        email: values.email.trim(),
        company: values.company.trim(),
        phone: values.phone.trim() || undefined,
        teamSize: (values.teamSize || undefined) as DemoTeamSize | undefined,
        message: values.message.trim() || undefined,
        locale: lang,
        website: values.website,
      });
      setState("sent");
    } catch (e) {
      setState("idle");
      if (isB2bError(e) && e.code === "VALIDATION_ERROR") {
        const server = e.fields;
        setErrors(Object.fromEntries(Object.keys(server).filter((k): k is Field => ["name", "email", "company", "phone", "message"].includes(k)).map((k) => [k, k === "email" ? labels.errEmail : labels.errRequired])));
        setProblem(labels.errCheck);
      } else if (isB2bError(e) && e.isRateLimited) setProblem(labels.errBusy);
      else setProblem(labels.errGeneric);
    }
  };

  if (state === "sent") {
    return (
      <div ref={doneRef} tabIndex={-1} role="status" className="rounded-card border border-primary/25 bg-primary-soft p-6 focus:outline-none md:p-8">
        <CheckCircle2 className="h-8 w-8 text-primary" aria-hidden="true" />
        <h2 className="mt-3 font-display text-h3 text-ink">{labels.sentTitle}</h2>
        <p className="mt-2 text-body text-ink-muted">{labels.sentBody}</p>
      </div>
    );
  }

  const input = (k: Field, extra: Record<string, string | number | boolean> = {}) => ({
    id: `${id}-${k}`,
    value: values[k],
    onChange: set(k),
    "aria-invalid": errors[k] ? true : undefined,
    "aria-describedby": errors[k] ? `${id}-${k}-err` : undefined,
    className: field,
    ...extra,
  });
  const err = (k: Field) => errors[k] ? <p id={`${id}-${k}-err`} className="mt-1 text-caption text-ember-text">{errors[k]}</p> : null;

  return (
    <form onSubmit={(e) => void submit(e)} noValidate className="space-y-5 rounded-card border border-line bg-surface p-5 shadow-stamp md:p-8">
      {problem ? <p ref={problemRef} tabIndex={-1} role="alert" className="rounded-control border border-ember-text/40 bg-ember-soft p-3 text-body text-ember-text focus:outline-none">{problem}</p> : null}
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor={`${id}-name`} className={label}>{labels.name}</label>
          <input {...input("name", { autoComplete: "name", required: true, maxLength: 120 })} />
          {err("name")}
        </div>
        <div>
          <label htmlFor={`${id}-email`} className={label}>{labels.email}</label>
          <input {...input("email", { type: "email", inputMode: "email", autoComplete: "email", required: true, maxLength: 254 })} />
          {err("email")}
        </div>
        <div>
          <label htmlFor={`${id}-company`} className={label}>{labels.company}</label>
          <input {...input("company", { autoComplete: "organization", required: true, maxLength: 160 })} />
          {err("company")}
        </div>
        <div>
          <label htmlFor={`${id}-phone`} className={label}>{labels.phone}</label>
          <input {...input("phone", { type: "tel", inputMode: "tel", autoComplete: "tel", maxLength: 40 })} />
          {err("phone")}
        </div>
      </div>
      <fieldset>
        <legend className={label}>{labels.teamSize}</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {TEAM_SIZES.map((s) => (
            <label key={s} className="cursor-pointer">
              <input type="radio" name={`${id}-team`} value={s} checked={values.teamSize === s} onChange={set("teamSize")} className="peer sr-only" />
              <span className="inline-flex min-h-[44px] items-center rounded-full border border-line-strong bg-surface px-4 text-label text-ink transition-colors duration-fast hover:bg-sunken peer-checked:border-primary peer-checked:bg-primary-soft peer-checked:text-primary peer-focus-visible:shadow-focus">
                {s} {labels.teamSizeUnit}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <label htmlFor={`${id}-message`} className={label}>{labels.message}</label>
        <textarea {...input("message", { rows: 4, maxLength: 2000 })} className={`${field} py-2.5`} aria-describedby={`${id}-message-hint`} />
        <p id={`${id}-message-hint`} className="mt-1 text-caption text-ink-muted">{labels.messageHint}</p>
      </div>
      {/* Honeypot: hidden from people and assistive tech; bots that fill it get a quiet "thanks". */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor={`${id}-website`}>Website</label>
        <input id={`${id}-website`} tabIndex={-1} autoComplete="off" value={values.website} onChange={set("website")} />
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-caption text-ink-muted">{labels.privacy}</p>
        <button type="submit" disabled={state === "sending"} aria-busy={state === "sending" || undefined} className={buttonClasses("primary", "lg", "shrink-0 px-6")}>
          {state === "sending" ? labels.sending : labels.submit}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </form>
  );
}
