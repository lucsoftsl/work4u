"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "@/lib/i18n";
import { GoogleIcon } from "@/components/ui/GoogleIcon";
import { isB2bError } from "@/b2b/api/client";
import { qk, signupCompany } from "@/b2b/api/endpoints";
import { b2bAuthProblem, b2bCreateAccount, b2bSignInWithGoogle, type B2bAuthProblem } from "@/lib/b2b-auth";
import { B2B_WORKSPACES, b2bSignInPath } from "@/lib/b2b-paths";
import { isPlausiblePhone } from "@/lib/b2b-phone";
import { ORG_LANGUAGES as LANGUAGES, countryOptions, languageLabel, timeZones } from "@/lib/b2b-geo";
import { B2bAuthFrame, fieldCls, labelCls, primaryBtn, secondaryBtn } from "./B2bAuthFrame";
import { PROBLEM_TEXT } from "./SignInView";
import { useB2bRedirect, useContinueToWorkspace } from "./useContinueToWorkspace";



const MIN_PASSWORD = 8;

const browserZone = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; } catch { return "UTC"; } };

function Stepper({ step, withCompany, t }: { step: 1 | 2; withCompany: boolean; t: (k: string, f?: string) => string }) {
  const steps = [t("b2b.setup.step.account", "Account"), ...(withCompany ? [t("b2b.setup.step.company", "Company")] : [])];
  return (
    <ol aria-label={t("b2b.setup.wizard.title", "Set up your company")} className="mb-8 flex flex-wrap gap-x-6 gap-y-1 border-b border-line pb-3 text-label">
      {steps.map((label, i) => {
        const n = i + 1;
        const current = n === step;
        return (
          <li key={label} aria-current={current ? "step" : undefined} className={current ? "font-bold text-ink" : "text-ink-muted"}>
            <span className="mr-2 font-display">{String(n).padStart(2, "0")}</span>{label}{n < step ? <span className="sr-only"> ({t("b2b.setup.step.done", "completed")})</span> : null}
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Company start: 01 Account (skipped when already signed in), 02 Company (creates the organisation through POST /api/b2b/signup).
 * With a safe `?redirect=` (an employee on the way to an invitation) only the account is created and no organisation.
 */
export function StartView() {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const qc = useQueryClient();
  const { user, loading } = useAuth();
  const redirect = useB2bRedirect();
  const { go } = useContinueToWorkspace();
  const accountOnly = redirect !== null;

  // account
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authProblem, setAuthProblem] = useState<Exclude<B2bAuthProblem, "none"> | null>(null);
  // company
  const [company, setCompany] = useState("");
  const [country, setCountry] = useState(locale === "ro" ? "RO" : locale === "es" ? "ES" : "");
  const [phone, setPhone] = useState("");
  const [zone, setZone] = useState(browserZone);
  const [orgLocale, setOrgLocale] = useState<(typeof LANGUAGES)[number]>((LANGUAGES as readonly string[]).includes(locale) ? (locale as (typeof LANGUAGES)[number]) : "en");
  const [companyError, setCompanyError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const continued = useRef(false);

  const zones = useMemo(() => timeZones(), []);
  const countryNames = useMemo(() => countryOptions(locale), [locale]);

  const signedIn = !loading && !!user;
  const step: 1 | 2 = signedIn && !accountOnly ? 2 : 1;

  // Signed in with only an account needed (employee on the way to an invitation): continue straight to the invitation.
  useEffect(() => {
    if (!accountOnly || !signedIn || continued.current) return;
    continued.current = true;
    void go();
  }, [accountOnly, signedIn, go]);

  useEffect(() => { if (authProblem || companyError) errorRef.current?.focus(); }, [authProblem, companyError]);
  useEffect(() => { if (user?.displayName && !name) setName(user.displayName); }, [user, name]);

  const createAccount = async (ev: FormEvent) => {
    ev.preventDefault();
    if (submitting.current) return;
    if (password.length < MIN_PASSWORD) { setAuthProblem("weakPassword"); return; }
    submitting.current = true; setBusy(true); setAuthProblem(null);
    try { await b2bCreateAccount(email, password, name); } catch (e) { const p = b2bAuthProblem(e); setAuthProblem(p === "none" ? null : p); } finally { submitting.current = false; setBusy(false); }
  };
  const google = async () => {
    if (submitting.current) return;
    submitting.current = true; setBusy(true); setAuthProblem(null);
    try { await b2bSignInWithGoogle(); } catch (e) { const p = b2bAuthProblem(e); setAuthProblem(p === "none" ? null : p); } finally { submitting.current = false; setBusy(false); }
  };

  const createCompany = async (ev: FormEvent) => {
    ev.preventDefault();
    if (submitting.current) return; // a double click creates one organisation
    if (company.trim().length < 2) { setCompanyError(t("b2b.setup.company.err.name", "Enter your company name (at least 2 characters).")); return; }
    if (!isPlausiblePhone(phone, country)) { setCompanyError(t("b2b.setup.company.err.phone", "Enter the phone number in international format, e.g. +34 600 555 021, or choose a country to use a local number.")); return; }
    submitting.current = true; setBusy(true); setCompanyError(null);
    try {
      const res = await signupCompany({
        name: company.trim(),
        adminDisplayName: name.trim() || undefined,
        timezone: zone || undefined,
        country: country || undefined,
        phone: phone.trim() || undefined,
        locale: orgLocale,
      });
      await qc.invalidateQueries({ queryKey: qk.myOrgs });
      router.replace(`/ops/${encodeURIComponent(res.org.id)}/setup`); // continue with employees and clients
    } catch (e) {
      submitting.current = false; setBusy(false);
      if (isB2bError(e) && e.code === "EMAIL_IN_USE") setCompanyError(t("b2b.setup.company.err.emailInUse", "This email address is already used by another sign-in. Sign in with that one instead."));
      else if (isB2bError(e) && e.code === "EMAIL_REQUIRED") setCompanyError(t("b2b.setup.company.err.emailRequired", "Your account has no email address. Use an account with an email."));
      else if (isB2bError(e) && e.isRateLimited) setCompanyError(t("b2b.setup.company.err.busy", "Too many attempts. Wait a minute and try again."));
      else if (isB2bError(e) && e.status === 400) setCompanyError(t("b2b.setup.company.err.invalid", "Check the details you entered (the phone number needs the country code, like +34 600 555 021)."));
      else setCompanyError(t("b2b.setup.company.err.generic", "We couldn't create your company. Try again in a moment."));
    }
  };

  const err = (text: string | null) => text ? <p ref={errorRef} tabIndex={-1} role="alert" className="border border-ember-text bg-surface p-3 text-body text-ember-text focus:outline-none">{text}</p> : null;

  if (accountOnly && signedIn) {
    return <B2bAuthFrame><p role="status" aria-busy="true" className="text-body text-ink-muted">{t("b2b.auth.signingIn", "Signing in…")}</p></B2bAuthFrame>;
  }

  return (
    <B2bAuthFrame>
      <Stepper step={step} withCompany={!accountOnly} t={t} />
      {step === 1 ? (
        <>
          <h1 className="font-display text-h1 text-ink">{accountOnly ? t("b2b.auth.createAccount.title", "Create your account") : t("b2b.setup.account.title", "Create your company account")}</h1>
          <p className="mt-2 text-body-lg text-ink-muted">{accountOnly ? t("b2b.auth.createAccount.lead", "Use the email address your company invited.") : t("b2b.setup.account.lead", "One login for you and your team. It takes a few minutes.")}</p>
          <div className="mt-8 space-y-6">
            {authProblem ? err(t(PROBLEM_TEXT[authProblem][0], PROBLEM_TEXT[authProblem][1])) : null}
            <button type="button" onClick={() => void google()} disabled={busy} className={secondaryBtn}><GoogleIcon />{t("b2b.auth.google", "Continue with Google")}</button>
            <p className="text-center text-caption text-ink-muted" aria-hidden="true">{t("b2b.auth.or", "or")}</p>
            <form onSubmit={(e) => void createAccount(e)} noValidate className="space-y-4">
              <div>
                <label htmlFor="start-name" className={labelCls}>{t("b2b.setup.account.name", "Your name")}</label>
                <input id="start-name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className={fieldCls} />
              </div>
              <div>
                <label htmlFor="start-email" className={labelCls}>{t("b2b.auth.email", "Email")}</label>
                <input id="start-email" type="email" autoComplete="email" inputMode="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={fieldCls} />
              </div>
              <div>
                <label htmlFor="start-password" className={labelCls}>{t("b2b.auth.password", "Password")}</label>
                <input id="start-password" type="password" autoComplete="new-password" required minLength={MIN_PASSWORD} aria-describedby="start-password-hint" value={password} onChange={(e) => setPassword(e.target.value)} className={fieldCls} />
                <p id="start-password-hint" className="mt-1 text-caption text-ink-muted">{t("b2b.setup.account.passwordHint", "At least 8 characters.")}</p>
              </div>
              <button type="submit" disabled={busy || !email || !password} aria-busy={busy || undefined} className={primaryBtn}>{t("b2b.setup.account.submit", "Create account")}</button>
            </form>
            <p className="text-body text-ink">{t("b2b.setup.account.haveOne", "Already have an account?")}{" "}
              <a href={b2bSignInPath(redirect)} className="font-bold text-primary underline decoration-2 underline-offset-4">{t("b2b.setup.account.signIn", "Sign in")}</a>
            </p>
          </div>
        </>
      ) : (
        <>
          <h1 className="font-display text-h1 text-ink">{t("b2b.setup.company.title", "Tell us about your company")}</h1>
          <p className="mt-2 text-body-lg text-ink-muted">{t("b2b.setup.company.lead", "You can change all of this later in Company setup.")}</p>
          <form onSubmit={(e) => void createCompany(e)} noValidate className="mt-8 space-y-4">
            {err(companyError)}
            <div>
              <label htmlFor="co-name" className={labelCls}>{t("b2b.setup.company.name", "Company name")}</label>
              <input id="co-name" autoComplete="organization" required maxLength={120} value={company} onChange={(e) => setCompany(e.target.value)} className={fieldCls} />
            </div>
            <div>
              <label htmlFor="co-admin" className={labelCls}>{t("b2b.setup.account.name", "Your name")}</label>
              <input id="co-admin" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className={fieldCls} />
            </div>
            <div>
              <label htmlFor="co-country" className={labelCls}>{t("b2b.setup.company.country", "Country")}</label>
              <select id="co-country" autoComplete="country" value={country} onChange={(e) => setCountry(e.target.value)} className={fieldCls}>
                <option value="">{t("b2b.setup.company.countryNone", "Choose a country")}</option>
                {countryNames.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="co-phone" className={labelCls}>{t("b2b.setup.company.phone", "Company phone (optional)")}</label>
              <input id="co-phone" type="tel" inputMode="tel" autoComplete="tel" aria-describedby="co-phone-hint" value={phone} onChange={(e) => setPhone(e.target.value)} className={fieldCls} />
              <p id="co-phone-hint" className="mt-1 text-caption text-ink-muted">{t("b2b.team.phoneHint", "International format, e.g. +34 600 555 021.")}</p>
            </div>
            <div>
              <label htmlFor="co-zone" className={labelCls}>{t("b2b.setup.company.timezone", "Time zone")}</label>
              <select id="co-zone" value={zone} onChange={(e) => setZone(e.target.value)} className={fieldCls}>
                {(zones.includes(zone) ? zones : [zone, ...zones]).map((z) => <option key={z} value={z}>{z}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="co-lang" className={labelCls}>{t("b2b.setup.company.language", "Language")}</label>
              <select id="co-lang" value={orgLocale} onChange={(e) => setOrgLocale(e.target.value as (typeof LANGUAGES)[number])} className={fieldCls}>
                {LANGUAGES.map((l) => <option key={l} value={l} lang={l}>{languageLabel(l)}</option>)}
              </select>
            </div>
            <button type="submit" disabled={busy} aria-busy={busy || undefined} className={primaryBtn}>{busy ? t("b2b.setup.company.creating", "Creating your workspace…") : t("b2b.setup.company.submit", "Create my workspace")}</button>
          </form>
          <p className="mt-6"><a href={B2B_WORKSPACES} className="inline-flex min-h-[44px] items-center text-label text-ink underline decoration-2 underline-offset-4 hover:text-primary">{t("b2b.setup.company.back", "Back to my workspaces")}</a></p>
        </>
      )}
    </B2bAuthFrame>
  );
}
