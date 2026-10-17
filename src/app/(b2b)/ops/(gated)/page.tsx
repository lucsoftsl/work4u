"use client";

import Link from "@/components/LocaleLink";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Building2, ChevronRight, LogOut, Plus } from "lucide-react";
import { listMyOrgs, qk } from "@/b2b/api/endpoints";
import { isB2bError } from "@/b2b/api/client";
import { useAuth } from "@/context/AuthContext";
import { B2B_SIGN_IN, B2B_START } from "@/lib/b2b-paths";
import { useTranslation } from "@/lib/i18n";

/** Workspace chooser. Creating a company happens in the start wizard (/ops/start), which also works for people who already have one. */
export default function OpsHome() {
  const { t } = useTranslation();
  const router = useRouter();
  const { signOut } = useAuth();
  const orgs = useQuery({ queryKey: qk.myOrgs, queryFn: listMyOrgs });

  return (
    <div className="min-h-screen bg-ops-canvas text-ops-ink">
      <header className="flex h-16 items-center justify-between bg-ops-chrome px-4 text-white">
        <span className="font-display text-lg font-bold">work4u Ops</span>
        <button type="button" onClick={() => void signOut().then(() => router.push(B2B_SIGN_IN))} className="inline-flex min-h-[44px] items-center gap-2 px-2 text-sm text-ops-chrome-muted hover:text-white">
          <LogOut className="h-4 w-4" aria-hidden="true" />{t("b2b.home.signOut", "Sign out")}
        </button>
      </header>
      <main id="ops-main" className="mx-auto max-w-xl p-4 md:p-8">
        <h1 className="font-display text-2xl font-bold">{t("b2b.home.title", "Choose a workspace")}</h1>
        <p className="mt-1 text-ops-ink-muted">{t("b2b.home.lead", "Your companies on Work4U.")}</p>

        {orgs.isPending ? <div role="status" className="mt-6 h-24 animate-pulse rounded bg-ops-border motion-reduce:animate-none"><span className="sr-only">{t("b2b.home.loading", "Loading")}</span></div> : null}
        {orgs.isError ? (
          <p role="alert" className="mt-6 rounded border border-sig-vermilion-ink bg-sig-vermilion-tint p-3 text-sig-vermilion-ink">
            {isB2bError(orgs.error) ? orgs.error.message : t("b2b.home.loadError", "Couldn't load your workspaces.")}{" "}
            <button type="button" onClick={() => void orgs.refetch()} className="font-bold underline">{t("b2b.home.tryAgain", "Try again")}</button>
          </p>
        ) : null}

        {orgs.data && orgs.data.length > 0 ? (
          <ul className="mt-6 space-y-2">
            {orgs.data.map((org) => (
              <li key={org.id}>
                <Link href={org.landing ?? `/ops/${org.id}/dashboard`} className="flex min-h-[64px] items-center gap-3 rounded border border-ops-border bg-ops-surface px-4 hover:border-ops-border-strong">
                  <Building2 className="h-5 w-5 text-ops-ink-muted" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">{org.name}</span>
                    <span className="block text-sm text-ops-ink-muted">{org.role.name} · {org.timezone}</span>
                  </span>
                  <ChevronRight className="h-5 w-5 text-ops-ink-subtle" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        ) : null}

        {orgs.data && orgs.data.length === 0 ? (
          <p className="mt-6 rounded border border-dashed border-ops-border-strong bg-ops-surface p-4 text-ops-ink-muted">
            {t("b2b.home.empty", "You aren't a member of any workspace yet. Set up a company, or ask an administrator to invite you.")}
          </p>
        ) : null}

        <p className="mt-8">
          <Link href={B2B_START} className="inline-flex min-h-[44px] items-center gap-2 rounded bg-ops-ink px-4 text-sm font-bold text-white">
            <Plus className="h-4 w-4" aria-hidden="true" />{t("b2b.home.createCta", "Set up a new company")}
          </Link>
        </p>
      </main>
    </div>
  );
}
