"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ChevronDown, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { useTranslation } from "@/lib/i18n";
import { transitionJob } from "@/b2b/api/endpoints";
import type { JobStatus, JobWorkspace } from "@/b2b/api/types";
import { useOrg } from "@/b2b/context/OrgContext";
import { JOB_STATUS_META } from "@/b2b/lib/status";
import { allowedTransitions, blockedReason, GRAPH, permissionForTransition, type TransitionOption } from "@/b2b/lib/transitions";
import { describeB2bError, toTransitionJob, type DescribedError } from "@/b2b/lib/workspace";
import { cn } from "@/lib/utils";
import { Banner, btnClass, ReasonDialog } from "./ui";
import { ApproveDialog } from "@/b2b/components/review/ApproveDialog";
import { useJobCache } from "./useJobCache";

interface MenuItem { to: JobStatus; option?: TransitionOption; disabledReason?: string }

const verb = (to: JobStatus) => (to === "CANCELLED" ? "Cancel job" : to === "BLOCKED" ? "Mark blocked" : `Move to ${JOB_STATUS_META[to].label}`);

export function TransitionControl({ job }: { job: JobWorkspace }) {
  const { orgId, me, viewer, can } = useOrg();
  const { t } = useTranslation();
  const toast = useToast();
  const { merge, refresh } = useJobCache(orgId, job.id);
  const [approvalOpen, setApprovalOpen] = useState(false);
  const approvalTrigger = useRef<HTMLElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pending, setPending] = useState<TransitionOption | null>(null);
  const [error, setError] = useState<DescribedError | null>(null);
  const [announce, setAnnounce] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  const forTransitions = useMemo(() => toTransitionJob(job, { memberId: me?.member.id, teamIds: me?.member.teamIds }), [job, me]);
  const items = useMemo<MenuItem[]>(() => {
    if (!viewer) return [];
    const allowed = allowedTransitions(forTransitions, viewer);
    const out: MenuItem[] = allowed.map((o) => ({ to: o.to, option: o }));
    const relation = { assignedToMe: forTransitions.assignedToMe, teamIds: forTransitions.teamIds };
    for (const to of GRAPH[job.status]) {
      if (allowed.some((o) => o.to === to)) continue;
      const why = blockedReason(forTransitions, to);
      if (why && can(permissionForTransition(job.status, to), relation)) out.push({ to, disabledReason: why });
    }
    return out;
  }, [viewer, forTransitions, job.status, can]);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => { if (!rootRef.current?.contains(e.target as Node)) setMenuOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  const mutation = useMutation({
    mutationFn: (v: { to: JobStatus; reason?: string; version: number }) => v.to === "CLOSED" ? transitionJob(orgId, job.id, v.version, v.to) : transitionJob(orgId, job.id, v.version, v.to, v.reason),
    onSuccess: (updated, v) => {
      merge(updated);
      setError(null);
      setPending(null);
      setApprovalOpen(false);
      if (v.to === "CLOSED") (approvalTrigger.current?.isConnected ? approvalTrigger.current : rootRef.current?.querySelector<HTMLElement>("button"))?.focus();
      const msg = `${job.reference} is now ${JOB_STATUS_META[v.to].label}`;
      setAnnounce(msg);
      toast.push({ message: msg, tone: "success" });
    },
    onError: (err) => setError(describeB2bError(err)),
  });

  if (!viewer || items.length === 0) return null;
  const enabled = items.filter((i) => i.option);
  const primary = enabled.find((i) => i.option && !i.option.isBackStep && i.to !== "CANCELLED") ?? enabled[0];
  const busy = mutation.isPending;

  const run = (item: MenuItem) => {
    if (!item.option) return;
    setMenuOpen(false);
    setError(null);
    if (item.to === "CLOSED") { approvalTrigger.current = document.activeElement as HTMLElement; setApprovalOpen(true); return; }
    if (item.option.needsReason) { setPending(item.option); return; }
    mutation.mutate({ to: item.to, version: job.version });
  };

  const onMenuKey = (e: React.KeyboardEvent) => {
    const els = Array.from(rootRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])') ?? []);
    const i = els.indexOf(document.activeElement as HTMLElement);
    if (e.key === "ArrowDown") { e.preventDefault(); els[(i + 1) % els.length]?.focus(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); els[(i - 1 + els.length) % els.length]?.focus(); }
    else if (e.key === "Escape") { setMenuOpen(false); (rootRef.current?.querySelector("[aria-haspopup]") as HTMLElement | null)?.focus(); }
  };

  return (
    <div ref={rootRef} className="relative min-w-0">
      <div className="inline-flex">
        {primary ? (
          <button type="button" disabled={busy} aria-busy={busy || undefined} onClick={() => run(primary)} className={btnClass("primary", "rounded-r-none")}>
            {busy && !pending ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : null}
            {t("b2b.job.moveTo", verb(primary.to))}
          </button>
        ) : null}
        <button
          type="button" disabled={busy} aria-haspopup="menu" aria-expanded={menuOpen}
          aria-label={t("b2b.job.moreMoves", "More status moves")}
          onClick={() => setMenuOpen((o) => !o)}
          className={btnClass(primary ? "primary" : "secondary", cn("min-w-[44px] px-2", primary && "rounded-l-none border-l border-white/30"))}
        >
          {!primary ? <span>{t("b2b.job.status", "Status")}</span> : null}
          <ChevronDown className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      {menuOpen ? (
        <div role="menu" aria-label={t("b2b.job.statusMoves", "Status moves")} onKeyDown={onMenuKey}
          className="absolute right-0 z-20 mt-1 w-72 max-w-[calc(100vw-2rem)] rounded border border-ops-border bg-ops-surface py-1 shadow-lg">
          {items.map((item) => {
            const disabled = !item.option;
            return (
              <button
                key={item.to} type="button" role="menuitem" aria-disabled={disabled || undefined}
                onClick={() => (disabled ? undefined : run(item))}
                className={cn("flex min-h-[44px] w-full flex-col items-start justify-center px-3 py-1 text-left text-sm hover:bg-ops-canvas focus-visible:bg-ops-canvas focus-visible:outline-none",
                  disabled && "cursor-not-allowed text-ops-ink-subtle hover:bg-transparent", item.to === "CANCELLED" && !disabled && "text-sig-vermilion-ink")}
              >
                <span className="font-bold">{verb(item.to)}</span>
                {disabled ? <span className="text-xs">{item.disabledReason}</span> : item.option?.needsReason ? <span className="text-xs text-ops-ink-muted">Reason required</span> : null}
              </button>
            );
          })}
        </div>
      ) : null}
      <span className="sr-only" role="status" aria-live="polite">{announce}</span>
      {error && !pending && !approvalOpen ? <TransitionError error={error} onReload={() => { setError(null); void refresh(); }} /> : null}
      <ApproveDialog showNote={false} open={approvalOpen} orgId={orgId} jobId={job.id} reference={job.reference} loading={busy} error={error?.message} errorCode={error?.code} errorMissing={error?.missing} allowWithoutEvidence={me?.policies?.allowApprovalWithoutEvidence === true}
        onConfirm={(_note, version) => mutation.mutate({ to: "CLOSED", version })}
        onCancel={() => { if (error?.kind === "stale") void refresh(); setApprovalOpen(false); setError(null); (approvalTrigger.current?.isConnected ? approvalTrigger.current : rootRef.current?.querySelector<HTMLElement>("button"))?.focus(); }} />
      <ReasonDialog
        open={!!pending}
        title={pending ? verb(pending.to) : ""}
        tone={pending?.to === "CANCELLED" ? "danger" : "primary"}
        description={pending?.to === "CANCELLED" ? "Cancelling can't be undone. The assigned team will be told." : pending?.to === "BLOCKED" ? "Tell dispatch what is stopping the work." : "Explain why this job is going back."}
        confirmLabel={pending?.to === "CANCELLED" ? "Cancel job" : pending ? verb(pending.to) : "Confirm"}
        loading={busy}
        error={error && pending ? error.message : null}
        onConfirm={(reason) => pending && mutation.mutate({ to: pending.to, reason, version: job.version })}
        onCancel={() => { if (error?.kind === "stale") void refresh(); setPending(null); setError(null); }}
      />
    </div>
  );
}

export function TransitionError({ error, onReload }: { error: DescribedError; onReload: () => void }) {
  const stale = error.kind === "stale";
  return (
    <div className="mt-2 w-full max-w-md">
      <Banner tone={stale ? "warning" : "danger"} role="alert"
        action={stale ? <button type="button" onClick={onReload} className={btnClass("secondary", "text-ops-ink")}>Reload</button> : undefined}>
        {error.message}
      </Banner>
    </div>
  );
}
