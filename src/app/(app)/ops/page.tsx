"use client";

import { useState } from "react";
import Link from "@/components/LocaleLink";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, ChevronRight, Plus } from "lucide-react";
import { createOrg, listMyOrgs, qk } from "@/b2b/api/endpoints";
import { isB2bError } from "@/b2b/api/client";

/** Workspace chooser: 0 orgs → create one; 1 org → straight in (unless you came here on purpose); else pick. */
export default function OpsHome() {
  const router = useRouter();
  const qc = useQueryClient();
  const orgs = useQuery({ queryKey: qk.myOrgs, queryFn: listMyOrgs });
  const [name, setName] = useState("");
  const create = useMutation({
    mutationFn: () => createOrg({ name: name.trim(), timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }),
    onSuccess: async (res) => {
      await qc.invalidateQueries({ queryKey: qk.myOrgs });
      router.push(`/ops/${res.org.id}/dashboard`);
    },
  });

  return (
    <div className="min-h-screen bg-ops-canvas text-ops-ink">
      <header className="flex h-16 items-center justify-between bg-ops-chrome px-4 text-white">
        <span className="font-display text-lg font-bold">work4u Ops</span>
        <Link href="/dashboard" className="inline-flex min-h-[44px] items-center text-sm text-ops-chrome-muted hover:text-white">Back to the marketplace</Link>
      </header>
      <div className="mx-auto max-w-xl p-4 md:p-8">
        <h1 className="font-display text-2xl font-bold">Choose a workspace</h1>
        <p className="mt-1 text-ops-ink-muted">Your companies on work4u Ops.</p>

        {orgs.isPending ? <div role="status" className="mt-6 h-24 animate-pulse rounded bg-ops-border motion-reduce:animate-none"><span className="sr-only">Loading</span></div> : null}
        {orgs.isError ? (
          <p role="alert" className="mt-6 rounded border border-sig-vermilion-ink bg-sig-vermilion-tint p-3 text-sig-vermilion-ink">
            {isB2bError(orgs.error) ? orgs.error.message : "Couldn't load your workspaces."}{" "}
            <button type="button" onClick={() => void orgs.refetch()} className="font-bold underline">Try again</button>
          </p>
        ) : null}

        {orgs.data && orgs.data.length > 0 ? (
          <ul className="mt-6 space-y-2">
            {orgs.data.map((org) => (
              <li key={org.id}>
                <Link href={`/ops/${org.id}/dashboard`} className="flex min-h-[64px] items-center gap-3 rounded border border-ops-border bg-ops-surface px-4 hover:border-ops-border-strong">
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
            You aren&apos;t a member of any workspace yet. Create one for your company, or ask an administrator to invite you.
          </p>
        ) : null}

        <form
          className="mt-8 rounded border border-ops-border bg-ops-surface p-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim().length >= 2) create.mutate();
          }}
        >
          <h2 className="font-bold">Create a workspace</h2>
          <label htmlFor="org-name" className="mt-3 block text-sm font-bold">Company name</label>
          <input id="org-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} required className="mt-1 h-11 w-full rounded border border-ops-border-strong bg-white px-3 focus:outline-none focus:ring-2 focus:ring-ops-ink" />
          {create.isError ? <p role="alert" className="mt-2 text-sm text-sig-vermilion-ink">{isB2bError(create.error) ? create.error.message : "Couldn't create the workspace."}</p> : null}
          <button type="submit" disabled={create.isPending || name.trim().length < 2} className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded bg-ops-ink px-4 text-sm font-bold text-white disabled:opacity-45">
            <Plus className="h-4 w-4" aria-hidden="true" /> {create.isPending ? "Creating…" : "Create workspace"}
          </button>
        </form>
      </div>
    </div>
  );
}
