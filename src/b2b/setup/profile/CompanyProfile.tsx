"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useOrg } from "@/b2b/context/OrgContext";
import { ErrorAlert, ListSkeleton, btnPrimary, btnSecondary, inputCls } from "@/b2b/components/catalog/ui";
import { countryOptions, languageLabel, ORG_LANGUAGES, timeZones } from "@/lib/b2b-geo";
import { deleteLogo, getSettings, patchSettings, sk, uploadLogo, type CompanySettings } from "../api";
import { LogoImage } from "../LogoImage";
import { mergeSettings } from "../settings-cache";
import { useOrgSettings } from "../useOrgSettings";
import { isB2bError } from "@/b2b/api/client";
import { CurrencySelect } from "@/b2b/currency/CurrencySelect";
import { currencyKeys } from "@/b2b/currency/api";
import { useEffectiveCurrency } from "@/b2b/currency/useEffectiveCurrency";
import { currencyLockedMessage, formErrorsFrom, setupErrorMessage } from "../errors";
import { useFocusFirstInvalid } from "../useFocusFirstInvalid";
import { useTr } from "../i18n";
import { useOnlineStatus } from "../useOnlineStatus";
import { isDirty, logoProblem, profilePatch, settingsToForm, validateProfile, type ProfileForm } from "../profile-form";

const PROFILE_FIELDS = ["name", "legalName", "taxId", "country", "phone", "timezone", "locale", "addressLine", "city", "postalCode", "currency"] as const satisfies ReadonlyArray<keyof ProfileForm>;

const ERR_TEXT = {
  required: ["b2b.setup.profile.err.required", "This is required."],
  tooLong: ["b2b.setup.profile.err.tooLong", "That is too long."],
  phone: ["b2b.setup.profile.err.phone", "Use the international format, e.g. +34 600 555 021."],
  country: ["b2b.setup.profile.err.country", "Choose a country from the list."],
} as const;

/** "EUR – Euro" in the user's language; the code alone if the browser has no name for it. */
function currencyLabel(code: string, locale: string): string {
  try {
    const name = new Intl.DisplayNames([locale], { type: "currency" }).of(code);
    return name && name !== code ? `${code} – ${name}` : code;
  } catch {
    return code;
  }
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="grid gap-0.5 py-2 sm:grid-cols-[12rem_1fr] sm:gap-4">
      <dt className="text-sm font-bold text-ops-ink-muted">{label}</dt>
      <dd className="min-w-0 break-words text-ops-ink">{value || "—"}</dd>
    </div>
  );
}

export function CompanyProfile() {
  const { orgId, can } = useOrg();
  const { tr, trn, locale } = useTr();
  const qc = useQueryClient();
  const online = useOnlineStatus();
  const q = useOrgSettings(orgId);
  const roleCanEdit = can("org.manage");
  const effective = useEffectiveCurrency();
  const [form, setForm] = useState<ProfileForm | null>(null);
  const [initial, setInitial] = useState<ProfileForm | null>(null);
  const [touched, setTouched] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  // 409 CURRENCY_IN_USE: once a job or job type has an amount the currency cannot change. Learned from the refusal; stays until reload.
  const [lockedMessage, setLockedMessage] = useState<string | null>(null);
  const currencyLocked = lockedMessage !== null;
  const fileRef = useRef<HTMLInputElement>(null);
  // The role decides; a response can never take edit rights away. Memoised: the load effect below depends on its identity.
  const settings = useMemo(() => (q.data ? { ...q.data, canEdit: roleCanEdit || q.data.canEdit } : undefined), [q.data, roleCanEdit]);

  // Load the server values into the form once per fetched version, but never over unsaved edits.
  useEffect(() => {
    if (!settings) return;
    const next = settingsToForm(settings);
    setInitial((prev) => (prev && form && isDirty(prev, form) ? prev : next));
    setForm((prev) => (prev && initial && isDirty(initial, prev) ? prev : next));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  const dirty = !!(form && initial && isDirty(initial, form));
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const errors = useMemo(() => (touched && form ? validateProfile(form) : {}), [touched, form]);
  const { ref: formRef, focusFirstInvalid } = useFocusFirstInvalid<HTMLFormElement>();
  const save = useMutation({
    mutationFn: () => patchSettings(orgId, profilePatch(initial!, form!)),
    onSuccess: async (s) => {
      qc.setQueryData(sk.settings(orgId), (prev: CompanySettings | undefined) => mergeSettings(prev, s, roleCanEdit));
      await qc.invalidateQueries({ queryKey: sk.setup(orgId) });
      await qc.invalidateQueries({ queryKey: ["org", orgId, "me"] });
      void qc.invalidateQueries({ queryKey: currencyKeys.preferences }); // choosing the company currency also remembers it for this person
      const next = settingsToForm(s);
      setInitial(next); setForm(next); setSaved(true);
    },
    onError: (e) => {
      if (isB2bError(e) && e.code === "CURRENCY_IN_USE") {
        setLockedMessage(currencyLockedMessage(e, tr, trn));
        setForm((f) => (f && initial ? { ...f, currency: initial.currency } : f)); // put the old one back; the other edits stay
      }
    },
  });
  const logo = useMutation({
    mutationFn: async (file: File | null) => (file ? uploadLogo(orgId, file) : (await deleteLogo(orgId), getSettings(orgId))),
    onSuccess: (s) => { qc.setQueryData(sk.settings(orgId), (prev: CompanySettings | undefined) => mergeSettings(prev, s, roleCanEdit)); void qc.invalidateQueries({ queryKey: ["org", orgId, "me"] }); setLogoError(null); },
    onError: (e) => setLogoError(setupErrorMessage(e, tr)),
  });
  useEffect(() => { if (save.error) focusFirstInvalid(); }, [save.error, focusFirstInvalid]);

  if (q.isPending) return <ListSkeleton rows={4} />;
  if (q.isError || !settings || !form || !initial) return <ErrorAlert message={setupErrorMessage(q.error, tr)} onRetry={() => void q.refetch()} retryLabel={tr("b2b.setup.retry", "Try again")} />;

  const canEdit = settings.canEdit;
  const set = <K extends keyof ProfileForm>(k: K, v: ProfileForm[K]) => { setSaved(false); setForm((p) => (p ? { ...p, [k]: v } : p)); if (save.isError) save.reset(); };
  const text = (code: keyof typeof ERR_TEXT) => tr(ERR_TEXT[code][0], ERR_TEXT[code][1]);
  // Every API field key on its field (c769b0c5); the logo has its own message, anything else is named in the banner.
  const server = formErrorsFrom(save.error, {
    keys: PROFILE_FIELDS,
    text: {
      name: text("required"), phone: text("phone"), country: text("country"),
      currency: isB2bError(save.error) && save.error.code === "CURRENCY_IN_USE"
        ? currencyLockedMessage(save.error, tr, trn)
        : tr("b2b.setup.currency.invalid", "Choose a currency from the list."),
    },
  }, tr);
  const err = (k: keyof ProfileForm) => server.fields[k] ?? (errors[k] ? text(errors[k] as keyof typeof ERR_TEXT) : undefined);
  const currencyError = lockedMessage ?? err("currency");
  const zones = timeZones();
  const countries = countryOptions(locale, form.country || null);

  const onFile = (file: File | undefined) => {
    if (!file) return;
    const p = logoProblem(file);
    if (p) { setLogoError(tr("b2b.setup.profile.logo.invalid", "Use a JPEG, PNG or WebP image up to 2 MB.")); return; }
    setLogoError(null);
    logo.mutate(file);
  };

  const logoCard = (
    <section aria-labelledby="pf-logo" className="rounded-lg border border-ops-border bg-ops-surface p-4">
      <h2 id="pf-logo" className="text-lg font-bold text-ops-ink">{tr("b2b.setup.profile.logo.title", "Logo")}</h2>
      <div className="mt-3 flex flex-wrap items-center gap-4">
        <LogoImage url={settings.logoUrl} name={settings.name} alt={settings.logoUrl ? tr("b2b.setup.profile.logo.alt", "{name} logo", { name: settings.name }) : ""} />
        {canEdit ? (
          <div className="flex flex-wrap items-center gap-2">
            <input ref={fileRef} id="pf-logo-file" type="file" aria-label={tr("b2b.setup.profile.logo.upload", "Upload logo")} tabIndex={-1} accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
            <button type="button" disabled={!online || logo.isPending} onClick={() => fileRef.current?.click()} className={btnSecondary}>{logo.isPending ? tr("b2b.setup.profile.logo.uploading", "Uploading…") : tr("b2b.setup.profile.logo.upload", "Upload logo")}</button>
            {settings.logoUrl ? <button type="button" disabled={!online || logo.isPending} onClick={() => logo.mutate(null)} className={btnSecondary}>{tr("b2b.setup.profile.logo.remove", "Remove")}</button> : null}
            <p className="basis-full text-xs text-ops-ink-muted">{tr("b2b.setup.profile.logo.hint", "JPEG, PNG or WebP · up to 2 MB")}</p>
          </div>
        ) : null}
      </div>
      {logoError ? <p role="alert" className="mt-2 text-sm font-bold text-sig-vermilion-ink">{logoError}</p> : null}
    </section>
  );

  if (!canEdit) {
    return (
      <div className="space-y-4">
        <p role="note" className="rounded border border-ops-border bg-ops-surface p-3 text-sm text-ops-ink-muted">{tr("b2b.setup.profile.viewOnly", "View only. Ask an administrator to change the company details.")}</p>
        {logoCard}
        <section aria-labelledby="pf-company" className="rounded-lg border border-ops-border bg-ops-surface p-4">
          <h2 id="pf-company" className="text-lg font-bold text-ops-ink">{tr("b2b.setup.profile.company", "Company")}</h2>
          <dl className="mt-2 divide-y divide-ops-border">
            <Row label={tr("b2b.setup.company.name", "Company name")} value={settings.name} />
            <Row label={tr("b2b.setup.profile.legalName", "Legal name")} value={settings.legalName} />
            <Row label={tr("b2b.setup.profile.taxId", "Tax ID")} value={settings.taxId} />
            <Row label={tr("b2b.setup.company.country", "Country")} value={countries.find((c) => c.code === settings.country)?.label ?? settings.country} />
            <Row label={tr("b2b.setup.profile.phone", "Phone")} value={settings.phone} />
            <Row label={tr("b2b.setup.company.timezone", "Time zone")} value={settings.timezone} />
            <Row label={tr("b2b.setup.company.language", "Language")} value={settings.locale ? languageLabel(settings.locale) : null} />
            {settings.currency ? <Row label={tr("b2b.setup.currency.label", "Company currency")} value={currencyLabel(settings.currency, locale)} /> : null}
          </dl>
        </section>
        <section aria-labelledby="pf-address" className="rounded-lg border border-ops-border bg-ops-surface p-4">
          <h2 id="pf-address" className="text-lg font-bold text-ops-ink">{tr("b2b.setup.profile.address", "Address")}</h2>
          <dl className="mt-2 divide-y divide-ops-border">
            <Row label={tr("b2b.setup.profile.addressLine", "Address line")} value={settings.addressLine} />
            <Row label={tr("b2b.setup.profile.city", "City")} value={settings.city} />
            <Row label={tr("b2b.setup.profile.postalCode", "Postal code")} value={settings.postalCode} />
          </dl>
        </section>
      </div>
    );
  }

  const field = (id: string, k: keyof ProfileForm, label: string, extra: { type?: string; hint?: string; autoComplete?: string; inputMode?: "tel" } = {}) => (
    <div>
      <label htmlFor={id} className="block text-sm font-bold text-ops-ink">{label}</label>
      <input id={id} type={extra.type ?? "text"} autoComplete={extra.autoComplete} inputMode={extra.inputMode} value={form[k]} onChange={(e) => set(k, e.target.value)}
        aria-invalid={err(k) ? true : undefined} aria-describedby={err(k) || extra.hint ? `${id}-msg` : undefined} className={`${inputCls} mt-1`} />
      {err(k) || extra.hint ? <p id={`${id}-msg`} className={`mt-1 text-xs ${err(k) ? "font-bold text-sig-vermilion-ink" : "text-ops-ink-muted"}`}>{err(k) ?? extra.hint}</p> : null}
    </div>
  );

  return (
    <form ref={formRef} noValidate className="space-y-4" onSubmit={(e) => {
      e.preventDefault(); setTouched(true);
      if (Object.keys(validateProfile(form)).length > 0) { focusFirstInvalid(); return; }
      if (dirty) save.mutate();
    }}>
      {logoCard}
      <section aria-labelledby="pf-company" className="space-y-3 rounded-lg border border-ops-border bg-ops-surface p-4">
        <h2 id="pf-company" className="text-lg font-bold text-ops-ink">{tr("b2b.setup.profile.company", "Company")}</h2>
        {field("pf-name", "name", tr("b2b.setup.company.name", "Company name"), { autoComplete: "organization" })}
        {field("pf-legal", "legalName", tr("b2b.setup.profile.legalName", "Legal name"))}
        {field("pf-tax", "taxId", tr("b2b.setup.profile.taxId", "Tax ID"))}
        <div>
          <label htmlFor="pf-country" className="block text-sm font-bold text-ops-ink">{tr("b2b.setup.company.country", "Country")}</label>
          <select id="pf-country" value={form.country} onChange={(e) => set("country", e.target.value)} aria-invalid={err("country") ? true : undefined} aria-describedby="pf-country-msg" className={`${inputCls} mt-1`}>
            <option value="">{tr("b2b.setup.company.countryNone", "Choose a country")}</option>
            {countries.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
          </select>
          <p id="pf-country-msg" className={`mt-1 text-xs ${err("country") ? "font-bold text-sig-vermilion-ink" : "text-ops-ink-muted"}`}>{err("country") ?? tr("b2b.setup.profile.countryHint", "Also decides how phone numbers without a country code are read when you import people.")}</p>
        </div>
        {field("pf-phone", "phone", tr("b2b.setup.profile.phone", "Phone"), { type: "tel", inputMode: "tel", autoComplete: "tel", hint: tr("b2b.team.phoneHint", "International format, e.g. +34 600 555 021.") })}
        <div>
          <label htmlFor="pf-zone" className="block text-sm font-bold text-ops-ink">{tr("b2b.setup.company.timezone", "Time zone")}</label>
          <select id="pf-zone" value={form.timezone} onChange={(e) => set("timezone", e.target.value)} aria-invalid={err("timezone") ? true : undefined} aria-describedby={err("timezone") ? "pf-zone-msg" : undefined} className={`${inputCls} mt-1`}>
            {(zones.includes(form.timezone) ? zones : [form.timezone, ...zones]).map((z) => <option key={z} value={z}>{z}</option>)}
          </select>
          {err("timezone") ? <p id="pf-zone-msg" className="mt-1 text-xs font-bold text-sig-vermilion-ink">{err("timezone")}</p> : null}
        </div>
        <div>
          <label htmlFor="pf-lang" className="block text-sm font-bold text-ops-ink">{tr("b2b.setup.company.language", "Language")}</label>
          <select id="pf-lang" value={form.locale} onChange={(e) => set("locale", e.target.value)} aria-invalid={err("locale") ? true : undefined} aria-describedby={err("locale") ? "pf-lang-msg" : undefined} className={`${inputCls} mt-1`}>
            <option value="">—</option>
            {ORG_LANGUAGES.map((l) => <option key={l} value={l} lang={l}>{languageLabel(l)}</option>)}
          </select>
          {err("locale") ? <p id="pf-lang-msg" className="mt-1 text-xs font-bold text-sig-vermilion-ink">{err("locale")}</p> : null}
        </div>
      </section>
      <section aria-labelledby="pf-address" className="space-y-3 rounded-lg border border-ops-border bg-ops-surface p-4">
        <h2 id="pf-address" className="text-lg font-bold text-ops-ink">{tr("b2b.setup.profile.address", "Address")}</h2>
        {field("pf-line", "addressLine", tr("b2b.setup.profile.addressLine", "Address line"), { autoComplete: "street-address" })}
        <div className="grid gap-3 sm:grid-cols-2">
          {field("pf-city", "city", tr("b2b.setup.profile.city", "City"), { autoComplete: "address-level2" })}
          {field("pf-postal", "postalCode", tr("b2b.setup.profile.postalCode", "Postal code"), { autoComplete: "postal-code" })}
        </div>
      </section>
      {settings.currency !== undefined ? (
        <section aria-labelledby="pf-money" className="space-y-3 rounded-lg border border-ops-border bg-ops-surface p-4">
          <h2 id="pf-money" className="text-lg font-bold text-ops-ink">{tr("b2b.setup.currency.title", "Money")}</h2>
          <div>
            {/* locked, not disabled: a disabled control cannot take focus, and the refusal must move focus here like any other form error. */}
            <CurrencySelect
              id="pf-currency" label={tr("b2b.setup.currency.label", "Company currency")} labelClassName="block text-sm font-bold text-ops-ink"
              className="sm:max-w-sm" value={form.currency || effective.currency} locked={currencyLocked}
              onChange={(code) => set("currency", code)} error={currencyError ?? null} required
              hint={settings.currencyIsSet === false || !form.currency ? tr("b2b.setup.currency.unsetHint", "Not chosen yet. Pick a currency and save to set it. Used for job prices, costs and Finance.") : tr("b2b.setup.currency.hint", "Used for job prices, costs and Finance. You can't change it once any job or job type has an amount.")}
            />
          </div>
        </section>
      ) : null}
      {server.banner ? <ErrorAlert message={server.banner} /> : null}
      {!online ? <p role="status" className="text-sm text-ops-ink-muted">{tr("b2b.setup.offline", "You're offline. Reconnect to save.")}</p> : null}
      {saved && !dirty ? <p role="status" className="text-sm font-bold text-sig-green-ink">{tr("b2b.setup.profile.saved", "Saved.")}</p> : null}
      <div className="sticky bottom-0 -mx-4 flex flex-wrap justify-end gap-2 border-t border-ops-border bg-ops-surface/95 px-4 py-3 md:static md:mx-0 md:border-0 md:bg-transparent md:px-0">
        <button type="button" disabled={!dirty || save.isPending} onClick={() => { setForm(initial); setTouched(false); }} className={btnSecondary}>{tr("b2b.setup.discard", "Discard changes")}</button>
        <button type="submit" disabled={!dirty || save.isPending || !online} className={btnPrimary}>{save.isPending ? tr("b2b.common.saving", "Saving…") : tr("b2b.common.save", "Save")}</button>
      </div>
    </form>
  );
}

export type { CompanySettings };
