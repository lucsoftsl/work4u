"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { listMyOrgs, qk } from "@/b2b/api/endpoints";
import { LAST_TECH_ORG_KEY } from "@/b2b/offline/last-org";
import { useTranslation } from "@/lib/i18n";


/** Entry point of the installed app: straight into the (last used) workspace's Today list, also offline. */
export default function TechHome() {
  const { t } = useTranslation();
  const router = useRouter();
  const orgs = useQuery({ queryKey: qk.myOrgs, queryFn: listMyOrgs, retry: false, networkMode: "always" });

  useEffect(() => {
    const remembered = window.localStorage.getItem(LAST_TECH_ORG_KEY);
    const list = orgs.data;
    const target = list?.find((o) => o.id === remembered)?.id ?? (list?.length === 1 ? list[0].id : null) ?? (orgs.isError ? remembered : null);
    if (target) router.replace(`/tech/${target}/today`);
  }, [orgs.data, orgs.isError, router]);

  if (orgs.data && orgs.data.length > 1) {
    return (
      <div className="mx-auto max-w-md p-4">
        <h1 className="text-2xl font-bold">{t("b2b.tech.home.choose", "Choose a workspace")}</h1>
        <ul className="mt-4 space-y-3">
          {orgs.data.map((o) => (
            <li key={o.id}><Link href={`/tech/${o.id}/today`} className="flex min-h-[56px] items-center rounded border border-ops-border-strong bg-ops-surface px-4 font-bold">{o.name}</Link></li>
          ))}
        </ul>
      </div>
    );
  }
  if (orgs.isError && !window.localStorage.getItem(LAST_TECH_ORG_KEY)) {
    return <div role="alert" className="mx-auto max-w-md p-4 font-bold">{t("b2b.tech.home.connectOnce", "Connect to the internet once to open your jobs.")}</div>;
  }
  if (orgs.data && orgs.data.length === 0) {
    return <div className="mx-auto max-w-md p-4"><h1 className="text-xl font-bold">{t("b2b.tech.home.noWorkspace", "No workspace yet")}</h1><p className="mt-2 text-ops-ink-muted">{t("b2b.tech.home.askManager", "Ask your manager to invite you.")}</p></div>;
  }
  return <div role="status" aria-busy="true" className="grid min-h-screen place-items-center text-ops-ink-muted">{t("b2b.tech.loading", "Loading…")}</div>;
}
