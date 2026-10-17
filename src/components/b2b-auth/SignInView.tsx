"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "@/lib/i18n";
import { GoogleIcon } from "@/components/ui/GoogleIcon";
import { b2bAuthProblem, b2bSendPasswordReset, b2bSignInWithEmail, b2bSignInWithGoogle, type B2bAuthProblem } from "@/lib/b2b-auth";
import { b2bSignUpPath } from "@/lib/b2b-paths";
import { B2bAuthFrame, fieldCls, labelCls, primaryBtn, secondaryBtn } from "./B2bAuthFrame";
import { useB2bRedirect, useContinueToWorkspace } from "./useContinueToWorkspace";

export const PROBLEM_TEXT: Record<Exclude<B2bAuthProblem, "none">, [string, string]> = {
  credentials: ["b2b.auth.err.credentials", "That email and password don't match. Check them and try again."],
  tooMany: ["b2b.auth.err.tooMany", "Too many attempts. Wait a few minutes, or reset your password."],
  network: ["b2b.auth.err.network", "No connection. Check your internet and try again."],
  disabled: ["b2b.auth.err.disabled", "This account has been disabled. Contact your administrator."],
  emailInUse: ["b2b.auth.err.emailInUse", "An account with this email already exists. Sign in instead."],
  weakPassword: ["b2b.auth.err.weakPassword", "Choose a password with at least 8 characters."],
  invalidEmail: ["b2b.auth.err.invalidEmail", "Enter a valid email address."],
  generic: ["b2b.auth.err.generic", "We couldn't complete that. Try again in a moment."],
};

export function SignInView() {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const { state, go } = useContinueToWorkspace();
  const redirect = useB2bRedirect();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<Exclude<B2bAuthProblem, "none"> | null>(null);
  const [reset, setReset] = useState<"closed" | "open" | "sent">("closed");
  const started = useRef(false);
  const errorRef = useRef<HTMLParagraphElement>(null);

  // A session exists (just signed in, or already signed in): continue once.
  useEffect(() => {
    if (loading || !user || started.current) return;
    started.current = true;
    void go();
  }, [loading, user, go]);

  useEffect(() => { if (problem) errorRef.current?.focus(); }, [problem]);

  const fail = (e: unknown) => {
    const p = b2bAuthProblem(e);
    setProblem(p === "none" ? null : p);
  };
  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (busy) return;
    setBusy(true);
    setProblem(null);
    try { await b2bSignInWithEmail(email, password); } catch (e) { fail(e); } finally { setBusy(false); }
  };
  const google = async () => {
    if (busy) return;
    setBusy(true);
    setProblem(null);
    try { await b2bSignInWithGoogle(); } catch (e) { fail(e); } finally { setBusy(false); }
  };
  const sendReset = async (ev: FormEvent) => {
    ev.preventDefault();
    if (busy || !email.trim()) return;
    setBusy(true);
    try { await b2bSendPasswordReset(email); } catch { /* same answer either way: no account enumeration */ } finally { setBusy(false); setReset("sent"); }
  };

  const continuing = (!loading && !!user && state !== "error") || state === "working";
  const tr = (pair: [string, string]) => t(pair[0], pair[1]);

  return (
    <B2bAuthFrame>
      <h1 className="font-display text-h1 text-ink">{t("b2b.auth.signIn.title", "Sign in")}</h1>
      <p className="mt-2 text-body-lg text-ink-muted">{t("b2b.auth.signIn.lead", "For companies and their employees.")}</p>

      {continuing ? (
        <p role="status" aria-busy="true" className="mt-8 text-body text-ink-muted">{t("b2b.auth.signingIn", "Signing in…")}</p>
      ) : state === "error" ? (
        <div role="alert" className="mt-8 border border-ember-text p-4">
          <p className="text-body text-ink">{t("b2b.auth.err.workspaces", "You're signed in, but we couldn't load your workspaces.")}</p>
          <button type="button" onClick={() => void go()} className={`${primaryBtn} mt-4 sm:w-auto`}>{t("b2b.auth.retry", "Try again")}</button>
        </div>
      ) : (
        <div className="mt-8 space-y-6">
          {problem ? <p ref={errorRef} tabIndex={-1} role="alert" className="border border-ember-text bg-surface p-3 text-body text-ember-text focus:outline-none">{tr(PROBLEM_TEXT[problem])}</p> : null}

          <button type="button" onClick={() => void google()} disabled={busy} className={secondaryBtn}><GoogleIcon />{t("b2b.auth.google", "Continue with Google")}</button>
          <p className="text-center text-caption text-ink-muted" aria-hidden="true">{t("b2b.auth.or", "or")}</p>

          {reset === "closed" ? (
            <form onSubmit={(e) => void submit(e)} noValidate className="space-y-4">
              <div>
                <label htmlFor="b2b-email" className={labelCls}>{t("b2b.auth.email", "Email")}</label>
                <input id="b2b-email" type="email" autoComplete="email" inputMode="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={fieldCls} />
              </div>
              <div>
                <label htmlFor="b2b-password" className={labelCls}>{t("b2b.auth.password", "Password")}</label>
                <input id="b2b-password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className={fieldCls} />
              </div>
              <button type="submit" disabled={busy || !email || !password} aria-busy={busy || undefined} className={primaryBtn}>{busy ? t("b2b.auth.signingIn", "Signing in…") : t("b2b.auth.signIn.submit", "Sign in")}</button>
              <button type="button" onClick={() => { setProblem(null); setReset("open"); }} className="inline-flex min-h-[44px] items-center text-label text-ink underline decoration-2 underline-offset-4 hover:text-primary">{t("b2b.auth.forgot", "Forgot your password?")}</button>
            </form>
          ) : reset === "open" ? (
            <form onSubmit={(e) => void sendReset(e)} className="space-y-4">
              <div>
                <label htmlFor="b2b-reset-email" className={labelCls}>{t("b2b.auth.email", "Email")}</label>
                <input id="b2b-reset-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={fieldCls} />
              </div>
              <button type="submit" disabled={busy || !email} className={primaryBtn}>{t("b2b.auth.reset.send", "Send reset link")}</button>
              <button type="button" onClick={() => setReset("closed")} className="inline-flex min-h-[44px] items-center text-label text-ink underline decoration-2 underline-offset-4">{t("b2b.auth.reset.back", "Back to sign in")}</button>
            </form>
          ) : (
            <div role="status" className="border border-line-strong bg-surface p-4">
              <p className="text-body text-ink">{t("b2b.auth.reset.sent", "If an account exists for that email, we've sent a link to reset the password.")}</p>
              <button type="button" onClick={() => setReset("closed")} className="mt-3 inline-flex min-h-[44px] items-center text-label text-ink underline decoration-2 underline-offset-4">{t("b2b.auth.reset.back", "Back to sign in")}</button>
            </div>
          )}

          <div className="border-t border-line pt-6">
            <p className="text-body text-ink">{t("b2b.auth.newCompany.lead", "New company?")}</p>
            <a href={b2bSignUpPath(redirect)} className="inline-flex min-h-[44px] items-center text-body font-bold text-primary underline decoration-2 underline-offset-4">{t("b2b.auth.signIn.newCompany", "Create your company account")}</a>
            <p className="mt-4 text-caption text-ink-muted">{t("b2b.auth.signIn.employeeNote", "Employees: use the email address your company invited. If you have an invitation link, open it and sign in or create an account there.")}</p>
          </div>
        </div>
      )}
    </B2bAuthFrame>
  );
}
