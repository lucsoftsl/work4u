"use client";

import { LogoImage } from "@/b2b/setup/LogoImage";
import { useOrgSettings } from "@/b2b/setup/useOrgSettings";
import { useEffect, useId, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { listMyOrgs, qk } from "@/b2b/api/endpoints";
import { useOrg } from "@/b2b/context/OrgContext";
import { useMenuKeys } from "@/hooks/useMenuKeys";

/** Where to go when switching org: same section in the new org (never the same entity id, which is org-specific). */
export function switchOrgPath(pathname: string, fromOrgId: string, toOrgId: string): string {
  const prefix = `/ops/${fromOrgId}`;
  const rest = pathname.startsWith(prefix) ? pathname.slice(prefix.length) : "/dashboard";
  const section = rest.split("/").filter(Boolean)[0] ?? "dashboard";
  return `/ops/${toOrgId}/${section}`;
}

export function OrgSwitcher() {
  const { orgId, me } = useOrg();
  const router = useRouter();
  const pathname = usePathname();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const logo = useOrgSettings(orgId, me?.org.hasLogo === true);
  const orgs = useQuery({ queryKey: qk.myOrgs, queryFn: listMyOrgs, staleTime: 5 * 60_000 });
  const onKeys = useMenuKeys(open, () => setOpen(false), listRef, triggerRef);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const choose = (toOrgId: string) => {
    setOpen(false);
    if (toOrgId === orgId) return;
    qc.removeQueries({ queryKey: qk.org(orgId) }); // nothing from the old org may show in the new one
    router.push(switchOrgPath(pathname, orgId, toOrgId));
  };

  return (
    <div ref={ref} className="relative min-w-0">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-[44px] w-full min-w-0 max-w-[16rem] items-center gap-2 rounded border border-white/20 px-2 text-sm text-white hover:bg-white/10 sm:px-3"
      >
        {me?.org.hasLogo ? <LogoImage url={logo.data?.logoUrl} name={me.org.name} className="h-7 w-7" /> : <span className="hidden text-ops-chrome-muted sm:inline">Org:</span>}
        <span className="truncate font-bold">{me?.org.name ?? "…"}</span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-ops-chrome-muted" aria-hidden="true" />
      </button>
      {open ? (
        <div ref={listRef} id={id} role="menu" onKeyDown={onKeys} className="absolute left-0 top-full z-50 mt-2 w-72 rounded border border-ops-border bg-ops-surface p-1.5 text-ops-ink shadow-lg">
          {(orgs.data ?? []).map((org) => (
            <button key={org.id} role="menuitem" type="button" onClick={() => choose(org.id)} className="flex min-h-[44px] w-full items-center gap-2 rounded px-3 text-left text-sm hover:bg-ops-canvas">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold">{org.name}</span>
                <span className="block truncate text-xs text-ops-ink-muted">{org.role.name}</span>
              </span>
              {org.id === orgId ? <Check className="h-4 w-4" aria-label="Current workspace" /> : null}
            </button>
          ))}
          {orgs.isPending ? <p className="px-3 py-2 text-sm text-ops-ink-muted">Loading…</p> : null}
          <div className="my-1 border-t border-ops-border" />
          <button role="menuitem" type="button" onClick={() => router.push("/ops")} className="flex min-h-[44px] w-full items-center gap-2 rounded px-3 text-left text-sm hover:bg-ops-canvas">
            <Plus className="h-4 w-4" aria-hidden="true" /> All workspaces
          </button>
        </div>
      ) : null}
    </div>
  );
}
