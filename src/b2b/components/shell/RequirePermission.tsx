"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Lock, RefreshCw, ShieldQuestion } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { useOrg } from "@/b2b/context/OrgContext";
import { guardDecision, type PermissionKey } from "@/b2b/lib/permissions";

/** Route guard: loading skeleton → "not a member" → "no access" → children. UI only; the API enforces. */
export function RequirePermission({ permission, anyOf, children }: { permission?: PermissionKey; anyOf?: readonly PermissionKey[]; children: ReactNode }) {
  const org = useOrg();
  const { t } = useTranslation();
  const state = guardDecision({ status: org.status, viewer: org.viewer, permission, anyOf });

  if (state === "loading") {
    return (
      <div role="status" aria-busy="true" className="space-y-3 p-6">
        <span className="sr-only">Loading</span>
        <div className="h-6 w-48 animate-pulse rounded bg-ops-border motion-reduce:animate-none" />
        <div className="h-40 animate-pulse rounded bg-ops-border motion-reduce:animate-none" />
      </div>
    );
  }
  if (state === "error" && org.rateLimited) {
    return (
      <div role="status" className="mx-auto flex max-w-md flex-col items-center gap-3 p-10 text-center">
        <RefreshCw className="h-8 w-8 text-ops-ink-subtle" aria-hidden="true" />
        <h1 className="text-xl font-bold text-ops-ink">{t("b2b.shell.rateLimitedTitle", "Busy right now")}</h1>
        <p className="text-ops-ink-muted">{t("b2b.shell.rateLimitedBody", "Too many requests at once. We'll try again automatically in a few seconds.")}</p>
        <button type="button" onClick={org.refetch} className="inline-flex min-h-[44px] items-center rounded bg-ops-ink px-4 text-sm font-bold text-white">{t("b2b.common.retry", "Retry")}</button>
      </div>
    );
  }
  if (state === "error") {
    return (
      <div role="alert" className="mx-auto flex max-w-md flex-col items-center gap-3 p-10 text-center">
        <RefreshCw className="h-8 w-8 text-ops-ink-subtle" aria-hidden="true" />
        <h1 className="text-xl font-bold text-ops-ink">Couldn&apos;t load this workspace</h1>
        <p className="text-ops-ink-muted">That was a connection or server problem, not a permissions one. Try again in a moment.</p>
        <button type="button" onClick={org.refetch} className="inline-flex min-h-[44px] items-center rounded bg-ops-ink px-4 text-sm font-bold text-white">Try again</button>
      </div>
    );
  }
  if (state === "not-member") {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 p-10 text-center">
        <ShieldQuestion className="h-8 w-8 text-ops-ink-subtle" aria-hidden="true" />
        <h1 className="text-xl font-bold text-ops-ink">You don&apos;t have access to this workspace</h1>
        <p className="text-ops-ink-muted">It may not exist, or you may not be a member. Pick another workspace or ask an administrator for an invitation.</p>
        <Link href="/ops" className="inline-flex min-h-[44px] items-center rounded bg-ops-ink px-4 text-sm font-bold text-white">Choose workspace</Link>
      </div>
    );
  }
  if (state === "forbidden") {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 p-10 text-center">
        <Lock className="h-8 w-8 text-ops-ink-subtle" aria-hidden="true" />
        <h1 className="text-xl font-bold text-ops-ink">You don&apos;t have permission to view this page</h1>
        <p className="text-ops-ink-muted">Your role in this workspace doesn&apos;t include it. An administrator can change your role.</p>
      </div>
    );
  }
  return <>{children}</>;
}

/** Hides children the viewer can't use (buttons, panels). */
export function Can({ permission, children, fallback = null }: { permission: PermissionKey; children: ReactNode; fallback?: ReactNode }) {
  const { can } = useOrg();
  return <>{can(permission) ? children : fallback}</>;
}
