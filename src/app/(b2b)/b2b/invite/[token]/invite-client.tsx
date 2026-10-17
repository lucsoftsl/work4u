"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "@/components/LocaleLink";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, MailWarning } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "@/lib/i18n";
import { B2B_PUBLIC_HOME, B2B_WORKSPACES, b2bSignInPath, b2bSignUpPath } from "@/lib/b2b-paths";
import { acceptInvitation, getMe, previewInvitation, type InvitePreview } from "@/b2b/api/endpoints";
import { afterJoinPath, invitePath, inviteProblem, type InviteProblem } from "@/b2b/lib/invite";

type State =
  | { kind: "loading" }
  | { kind: "ready"; invite: InvitePreview }
  | { kind: "joining"; invite: InvitePreview }
  | { kind: "joined"; invite: InvitePreview }
  | { kind: "problem"; problem: InviteProblem; invite?: InvitePreview };

const TITLE_KEY: Record<InviteProblem, [string, string]> = {
  invalid: ["b2b.invite.invalidTitle", "This invitation link isn't valid"],
  expired: ["b2b.invite.expiredTitle", "This invitation has expired"],
  used: ["b2b.invite.usedTitle", "This invitation was already used"],
  revoked: ["b2b.invite.revokedTitle", "This invitation was cancelled"],
  mismatch: ["b2b.invite.mismatchTitle", "You're signed in with a different email"],
  already: ["b2b.invite.alreadyTitle", "You're already a member of this workspace"],
  claimed: ["b2b.invite.claimedTitle", "This place on the team was already taken"],
  signin: ["b2b.invite.signinTitle", "Please sign in again"],
  busy: ["b2b.invite.busyTitle", "Busy right now"],
  network: ["b2b.invite.networkTitle", "No connection"],
  generic: ["b2b.invite.genericTitle", "We couldn't complete that"],
};
const BODY_KEY: Record<InviteProblem, [string, string]> = {
  invalid: ["b2b.invite.invalidBody", "Check that you copied the whole link, or ask your administrator to send a new invitation."],
  expired: ["b2b.invite.expiredBody", "Invitations are valid for 14 days. Ask your administrator to send a new one."],
  used: ["b2b.invite.usedBody", "If that was you, sign in and open your workspace. Otherwise ask your administrator for a new invitation."],
  revoked: ["b2b.invite.revokedBody", "Ask your administrator to send a new invitation."],
  mismatch: ["b2b.invite.mismatchBody", "This invitation is for {email}. Sign out, then sign in or create an account with that address."],
  already: ["b2b.invite.alreadyBody", "Open your workspaces to continue."],
  claimed: ["b2b.invite.claimedBody", "Someone already joined with this invitation. Ask your administrator to send a new one."],
  signin: ["b2b.invite.signinBody", "Your session expired. Sign in to accept the invitation."],
  busy: ["b2b.invite.busyBody", "Too many requests at once. Try again in a few seconds."],
  network: ["b2b.invite.networkBody", "Check your connection and try again."],
  generic: ["b2b.invite.genericBody", "Try again in a moment."],
};
const RETRYABLE: ReadonlySet<InviteProblem> = new Set(["busy", "network", "generic"]);

export default function InviteClient({ token }: { token: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, loading: authLoading, signOut } = useAuth();
  const [state, setState] = useState<State>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    let active = true;
    previewInvitation(token)
      .then((invite) => { if (active) setState({ kind: "ready", invite }); })
      .catch((err) => { if (active) setState({ kind: "problem", problem: inviteProblem(err) }); }); // never log: the URL holds a secret
    return () => { active = false; };
  }, [token, attempt]);

  useEffect(() => { headingRef.current?.focus(); }, [state.kind]);

  const accept = useCallback(async (invite: InvitePreview) => {
    setState({ kind: "joining", invite });
    try {
      const { orgId } = await acceptInvitation(token);
      setState({ kind: "joined", invite });
      let template: string | null = null;
      try { template = (await getMe(orgId)).role.template; } catch { /* default destination */ }
      router.replace(afterJoinPath(orgId, template));
    } catch (err) {
      setState({ kind: "problem", problem: inviteProblem(err), invite });
    }
  }, [token, router]);

  const returnTo = invitePath(token);
  const tr = (pair: [string, string], vars: Record<string, string> = {}) =>
    Object.entries(vars).reduce((s, [k, v]) => s.replace(`{${k}}`, v), t(pair[0], pair[1]));
  const wrap = "mx-auto w-full max-w-xl px-[var(--gutter)] py-10 md:py-16";
  const card = "rounded-card border border-line bg-surface p-6 md:p-8";
  const h1 = "font-display text-h1 text-ink focus:outline-none";

  if (state.kind === "loading" || authLoading) {
    return (
      <div className={wrap}>
        <h1 ref={headingRef} tabIndex={-1} className={h1}>{t("b2b.invite.title", "Invitation")}</h1>
        <p role="status" className="mt-4 text-body text-ink-muted">{t("b2b.invite.checking", "Checking your invitation…")}</p>
      </div>
    );
  }

  if (state.kind === "problem") {
    const { problem, invite } = state;
    const emailHint = invite?.emailHint ?? "";
    return (
      <div className={wrap}>
        <div className={card} role="alert">
          <MailWarning className="h-8 w-8 text-warning" aria-hidden="true" />
          <h1 ref={headingRef} tabIndex={-1} className={`mt-3 ${h1}`}>{tr(TITLE_KEY[problem])}</h1>
          <p className="mt-3 text-body text-ink-muted">{tr(BODY_KEY[problem], { email: emailHint })}</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            {RETRYABLE.has(problem) ? (
              <button type="button" onClick={() => (invite ? void accept(invite) : (setState({ kind: "loading" }), setAttempt((n) => n + 1)))} className={buttonClasses("primary")}>
                {t("b2b.invite.retry", "Try again")}
              </button>
            ) : null}
            {problem === "mismatch" ? (
              <button type="button" onClick={() => void signOut().then(() => router.replace(b2bSignInPath(returnTo)))} className={buttonClasses("primary")}>
                {t("b2b.invite.switchAccount", "Sign out and switch account")}
              </button>
            ) : null}
            {problem === "signin" ? (
              <Link href={b2bSignInPath(returnTo)} className={buttonClasses("primary")}>{t("b2b.invite.signIn", "Sign in")}</Link>
            ) : null}
            {problem === "already" || problem === "used" ? (
              <Link href={B2B_WORKSPACES} className={buttonClasses("primary")}>{t("b2b.invite.openWorkspaces", "Open my workspaces")}</Link>
            ) : null}
            <Link href={B2B_PUBLIC_HOME} className={buttonClasses("ghost")}>{t("b2b.invite.home", "About Work4U for field service")}</Link>
          </div>
        </div>
      </div>
    );
  }

  const { invite } = state;
  const busy = state.kind === "joining" || state.kind === "joined";
  return (
    <div className={wrap}>
      <div className={card}>
        <h1 ref={headingRef} tabIndex={-1} className={h1}>{tr(["b2b.invite.joinTitle", "Join {org}"], { org: invite.orgName })}</h1>
        {invite.claim && invite.memberName ? (
          <>
            <p className="mt-3 text-body text-ink-muted">{tr(["b2b.invite.joiningAs", "You are joining as {name}, {role}."], { name: invite.memberName, role: invite.roleName })}</p>
            <p className="mt-1 text-body text-ink-muted">{t("b2b.invite.onSchedule", "You are already on the schedule. After you join you will see your jobs in the app.")}</p>
          </>
        ) : (
          <p className="mt-3 text-body text-ink-muted">{tr(["b2b.invite.roleLine", "You're invited as {role}."], { role: invite.roleName })}</p>
        )}
        <p className="mt-1 text-body text-ink-muted">{tr(["b2b.invite.emailLine", "This invitation was sent to {email}."], { email: invite.emailHint })}</p>
        <p className="mt-1 text-caption text-ink-muted">{tr(["b2b.invite.validUntil", "Valid until {date}."], { date: new Date(invite.expiresAt).toLocaleDateString() })}</p>

        {state.kind === "joined" ? (
          <p role="status" className="mt-6 flex items-center gap-2 text-body font-bold text-success">
            <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
            {tr(["b2b.invite.joined", "You joined {org}. Opening your workspace…"], { org: invite.orgName })}
          </p>
        ) : user ? (
          <div className="mt-6 space-y-3">
            <p className="text-label font-normal text-ink-muted">{tr(["b2b.invite.signedInAs", "Signed in as {email}."], { email: user.email ?? "" })}</p>
            <button type="button" disabled={busy} aria-busy={busy || undefined} onClick={() => void accept(invite)} className={buttonClasses("primary", "lg")}>
              {state.kind === "joining" ? t("b2b.invite.joining", "Joining…") : t("b2b.invite.accept", "Accept invitation")}
            </button>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            <p className="text-body text-ink">{t("b2b.invite.needAccount", "Sign in or create an account with the invited email address to accept.")}</p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href={b2bSignInPath(returnTo)} className={buttonClasses("primary", "lg")}>{t("b2b.invite.signIn", "Sign in")}</Link>
              <Link href={b2bSignUpPath(returnTo)} className={buttonClasses("secondary", "lg")}>{t("b2b.invite.createAccount", "Create an account")}</Link>
            </div>
          </div>
        )}
        <p className="mt-6 flex items-start gap-2 text-caption text-ink-muted"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{t("b2b.invite.privacy", "Only you should open this link: it joins the account you are signed in with.")}</p>
      </div>
    </div>
  );
}
