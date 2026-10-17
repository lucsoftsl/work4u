"use client";

import { Search } from "lucide-react";
import { useTr } from "@/b2b/setup/i18n";
import { inputCls } from "@/b2b/components/catalog/ui";
import type { ArchivedFilter, ClientSort } from "./listParams";

interface Props {
  text: string; onText: (v: string) => void;
  tag: string; onTag: (v: string) => void; tags: Array<{ tag: string; count: number }>;
  archived: ArchivedFilter; onArchived: (v: ArchivedFilter) => void;
  sort: ClientSort; onSort: (v: ClientSort) => void;
}

export function ClientsToolbar(p: Props) {
  const { tr } = useTr();
  const sel = `${inputCls} sm:w-auto`;
  return (
    <div role="search" className="flex flex-wrap gap-2">
      <div className="relative min-w-[14rem] flex-1">
        <label htmlFor="clients-q" className="sr-only">{tr("b2b.clients.search", "Search name, email, phone or ID")}</label>
        <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-ops-ink-subtle" aria-hidden="true" />
        <input id="clients-q" type="search" value={p.text} onChange={(e) => p.onText(e.target.value)} placeholder={tr("b2b.clients.search", "Search name, email, phone or ID")} className={`${inputCls} pl-9`} />
      </div>
      <div>
        <label htmlFor="clients-tag" className="sr-only">{tr("b2b.clients.filter.tag", "Tag")}</label>
        <select id="clients-tag" value={p.tag} onChange={(e) => p.onTag(e.target.value)} className={sel}>
          <option value="">{tr("b2b.clients.filter.tagAll", "Tag: All")}</option>
          {p.tags.map((t) => <option key={t.tag} value={t.tag}>{t.tag} ({t.count})</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="clients-archived" className="sr-only">{tr("b2b.clients.filter.status", "Status")}</label>
        <select id="clients-archived" value={p.archived} onChange={(e) => p.onArchived(e.target.value as ArchivedFilter)} className={sel}>
          <option value="false">{tr("b2b.clients.filter.active", "Active clients")}</option>
          <option value="true">{tr("b2b.clients.filter.archived", "Archived clients")}</option>
          <option value="all">{tr("b2b.clients.filter.all", "All clients")}</option>
        </select>
      </div>
      <div>
        <label htmlFor="clients-sort" className="sr-only">{tr("b2b.clients.sort", "Sort")}</label>
        <select id="clients-sort" value={p.sort} onChange={(e) => p.onSort(e.target.value as ClientSort)} className={sel}>
          <option value="name">{tr("b2b.clients.sort.name", "Sort: Name")}</option>
          <option value="createdAt">{tr("b2b.clients.sort.added", "Sort: Newest")}</option>
        </select>
      </div>
    </div>
  );
}
