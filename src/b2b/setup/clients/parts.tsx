"use client";

import { WifiOff } from "lucide-react";
import { useOrg } from "@/b2b/context/OrgContext";
import { useTr } from "@/b2b/setup/i18n";

export const useClientsBase = (): string => `/ops/${encodeURIComponent(useOrg().orgId)}/customers`;

export function TagChips({ tags }: { tags: readonly string[] }) {
  const { tr } = useTr();
  if (tags.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-1" aria-label={tr("b2b.clients.tags", "Tags")}>
      {tags.map((t) => <li key={t} className="rounded-full border border-ops-border-strong px-2 py-0.5 text-xs font-bold text-ops-ink">{t}</li>)}
    </ul>
  );
}

export function OfflineNote() {
  const { tr } = useTr();
  return (
    <p role="status" className="flex items-center gap-2 rounded border border-ops-border-strong bg-ops-surface p-3 text-sm text-ops-ink">
      <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />{tr("b2b.clients.offline", "You're offline. Reconnect to save changes.")}
    </p>
  );
}

export const typeLabel = (type: string, tr: (k: string, f: string) => string): string =>
  type === "PERSON" ? tr("b2b.customers.person", "Person") : tr("b2b.customers.company", "Company");

export const shortDate = (iso: string | null | undefined): string => {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
};
