"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Circle } from "lucide-react";
import { useOrg } from "@/b2b/context/OrgContext";
import { btnPrimary, btnSecondary } from "@/b2b/components/catalog/ui";
import { getSetup, sk } from "./api";
import { checklistItems, hideKey, requiredCounts } from "./checklist";
import { useTr } from "./i18n";

const noop = () => () => undefined;
function useHidden(orgId: string): [boolean, () => void] {
  const [local, setLocal] = useState(false);
  const stored = useSyncExternalStore(noop, () => { try { return window.localStorage.getItem(hideKey(orgId)) === "1"; } catch { return false; } }, () => false);
  return [local || stored, () => { try { window.localStorage.setItem(hideKey(orgId), "1"); } catch { /* private mode */ } setLocal(true); }];
}

/** Dashboard card driven by GET /setup. Only people who can act (org.manage) see it; a failure hides it (non-critical). */
export function SetupChecklist() {
  const { orgId, can } = useOrg();
  const { tr } = useTr();
  const allowed = can("org.manage");
  const [hidden, hide] = useHidden(orgId);
  const q = useQuery({ queryKey: sk.setup(orgId), queryFn: () => getSetup(orgId), enabled: allowed, retry: false });
  if (!allowed || q.isError) return null;
  if (q.isPending) return <div role="status" aria-busy="true" className="h-28 animate-pulse rounded-lg bg-ops-border motion-reduce:animate-none"><span className="sr-only">{tr("b2b.setup.checklist.loading", "Loading setup progress")}</span></div>;
  const p = q.data;
  if (p.completed) return <p role="status" className="flex items-center gap-2 text-sm text-ops-ink-muted"><CheckCircle2 className="h-4 w-4 text-sig-green-ink" aria-hidden="true" />{tr("b2b.setup.checklist.complete", "Setup complete")}</p>;
  if (hidden) return null;
  const items = checklistItems(p);
  const { done, total } = requiredCounts(p);
  const base = `/ops/${encodeURIComponent(orgId)}`;
  return (
    <section aria-labelledby="setup-h" className="rounded-lg border-2 border-ops-border bg-ops-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="setup-h" className="text-lg font-bold text-ops-ink">{tr("b2b.setup.checklist.title", "Set up your company · {done} of {total} required steps done", { done, total })}</h2>
          <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={p.percent} aria-labelledby="setup-h" className="mt-2 h-2 w-64 max-w-full overflow-hidden rounded bg-ops-border">
            <div className="h-full bg-ops-accent" style={{ width: `${Math.min(100, Math.max(0, p.percent))}%` }} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`${base}/setup`} className={btnPrimary}>{tr("b2b.setup.checklist.continue", "Continue setup")}</Link>
          <button type="button" onClick={hide} className={btnSecondary}>{tr("b2b.setup.checklist.hide", "Hide for now")}</button>
        </div>
      </div>
      <ol className="mt-4 divide-y divide-ops-border">
        {items.map((i) => (
          <li key={i.key} className="flex flex-wrap items-center gap-3 py-2">
            {i.done ? <CheckCircle2 className="h-5 w-5 shrink-0 text-sig-green-ink" aria-hidden="true" /> : <Circle className="h-5 w-5 shrink-0 text-ops-ink-subtle" aria-hidden="true" />}
            <span className="min-w-0 flex-1">
              <span className={i.done ? "text-ops-ink-muted line-through" : "font-bold text-ops-ink"}>{tr(i.labelKey, i.label)}</span>
              {i.done ? <span className="sr-only"> ({tr("b2b.setup.step.done", "completed")})</span> : null}
              {!i.required ? <span className="ml-2 rounded border border-ops-border px-1.5 text-xs text-ops-ink-muted">{tr("b2b.setup.checklist.optional", "Optional")}</span> : null}
              {i.waiting && !i.done ? <span className="ml-2 text-xs text-ops-ink-muted">{tr("b2b.setup.checklist.afterClients", "After step 4")}</span> : null}
            </span>
            {!i.done && !i.waiting ? <Link href={`${base}/${i.to}`} className={btnSecondary}>{tr(i.buttonKey, i.button)}</Link> : null}
          </li>
        ))}
      </ol>
    </section>
  );
}
