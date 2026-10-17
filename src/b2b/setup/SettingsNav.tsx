"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useOrg } from "@/b2b/context/OrgContext";
import { useTr } from "./i18n";
import { cn } from "@/lib/utils";

/** Sub-navigation of Company setup: a rail on wide screens, scrolling tabs below. */
export function SettingsNav() {
  const { orgId, can } = useOrg();
  const pathname = usePathname();
  const { tr } = useTr();
  const base = `/ops/${encodeURIComponent(orgId)}`;
  const items = [
    { href: `${base}/settings/profile`, label: tr("b2b.setup.nav.profile", "Company profile"), show: true, match: `${base}/settings/profile` },
    { href: `${base}/settings/team`, label: tr("b2b.setup.nav.team", "Team & employees"), show: can("member.view"), match: `${base}/settings/team` },
    { href: `${base}/customers`, label: tr("b2b.nav.customers", "Clients"), show: can("customer.view"), match: `${base}/customers` },
  ].filter((i) => i.show);
  return (
    <nav aria-label={tr("b2b.setup.nav.label", "Company setup")} className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:overflow-visible lg:px-0">
      <ul className="flex gap-1 lg:flex-col">
        {items.map((i) => {
          const active = pathname === i.match || pathname.startsWith(`${i.match}/`);
          return (
            <li key={i.href} className="shrink-0">
              <Link href={i.href} aria-current={active ? "page" : undefined} className={cn("flex min-h-[44px] items-center whitespace-nowrap rounded px-3 text-sm font-bold lg:whitespace-normal", active ? "bg-ops-ink text-white" : "text-ops-ink hover:bg-ops-canvas")}>{i.label}</Link>
            </li>
          );
        })}
        <li className="shrink-0"><span aria-disabled="true" className="flex min-h-[44px] items-center gap-2 px-3 text-sm text-ops-ink-subtle">{tr("b2b.setup.nav.integrations", "Integrations")}<span className="rounded border border-ops-border px-1.5 text-xs">{tr("b2b.setup.soon", "Soon")}</span></span></li>
      </ul>
    </nav>
  );
}
