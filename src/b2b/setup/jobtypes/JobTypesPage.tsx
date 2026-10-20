"use client";

import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { Plus } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import type { JobType } from "@/b2b/api/jobTypes";
import { JOB_TYPES_MAX } from "@/b2b/api/jobTypes";
import { useOrg } from "@/b2b/context/OrgContext";
import { ConfirmBox } from "@/b2b/components/workspace/ui";
import { ErrorAlert, ListSkeleton, btnPrimary } from "@/b2b/components/catalog/ui";
import { formatMoney } from "@/b2b/lib/money";
import { useMoney } from "@/b2b/lib/useMoney";
import { useTr } from "../i18n";
import { setupErrorMessage } from "../errors";
import { JobTypeDialog } from "./JobTypeDialog";
import { JobTypeRow } from "./JobTypeRow";
import { filterTypes, moveType, type JobTypeFilter } from "./jobTypeLogic";
import { useAllJobTypes, useArchiveJobType, useReorderJobTypes } from "./useJobTypes";

const FILTERS: ReadonlyArray<{ key: JobTypeFilter; label: string; k: string }> = [
  { key: "active", label: "Active job types", k: "b2b.jobTypes.filter.active" },
  { key: "archived", label: "Archived", k: "b2b.jobTypes.filter.archived" },
  { key: "all", label: "All", k: "b2b.jobTypes.filter.all" },
];

type DialogState = { kind: "add" } | { kind: "edit"; type: JobType } | { kind: "archive"; type: JobType } | null;

export function JobTypesPage() {
  const { tr, trn } = useTr();
  const { orgId, can } = useOrg();
  const { finance, currency, locale } = useMoney();
  const toast = useToast();
  const manage = can("jobType.manage");
  const q = useAllJobTypes(orgId);
  const [filter, setFilter] = useState<JobTypeFilter>("active");
  const [dialog, setDialog] = useState<DialogState>(null);
  const [announce, setAnnounce] = useState("");
  const [orderFailed, setOrderFailed] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const focusAfter = useRef<string | null>(null);
  const reorder = useReorderJobTypes(orgId, () => { setOrderFailed(true); toast.push({ message: tr("b2b.jobTypes.orderFailed", "Couldn't save the new order. It was put back."), tone: "error" }); });
  const archive = useArchiveJobType(orgId);

  const all = useMemo(() => q.data ?? [], [q.data]);
  const active = useMemo(() => all.filter((x) => !x.archived), [all]);
  const shown = useMemo(() => (filter === "all" ? [...active, ...all.filter((x) => x.archived)] : filterTypes(all, filter)), [all, active, filter]);

  // Moving a row re-creates its buttons; give the keyboard user their place back (the other arrow when one ends up disabled).
  useEffect(() => {
    const want = focusAfter.current;
    if (!want) return;
    focusAfter.current = null;
    const [id, dir] = want.split(":");
    const el = document.querySelector<HTMLButtonElement>(`[data-move="${id}:${dir}"]`);
    (el && !el.disabled ? el : document.querySelector<HTMLButtonElement>(`[data-move="${id}:${dir === "up" ? "down" : "up"}"]`))?.focus();
  }, [all]);

  const commit = (id: string, moved: NonNullable<ReturnType<typeof moveType>>, dir: "up" | "down") => {
    setOrderFailed(false);
    focusAfter.current = `${id}:${dir}`;
    const name = all.find((x) => x.id === id)?.name ?? "";
    setAnnounce(tr("b2b.jobTypes.moved", "{name} moved to position {n} of {total}.", { name, n: moved.position, total: moved.list.length }));
    reorder.mutate(moved.list.map((x) => x.id));
  };
  const move = (id: string, delta: -1 | 1) => {
    const moved = moveType(active, id, delta);
    if (moved) commit(id, moved, delta < 0 ? "up" : "down");
  };
  const drop = (e: DragEvent<HTMLLIElement>, index: number) => {
    e.preventDefault();
    const id = dragId ?? e.dataTransfer.getData("text/plain");
    setDragId(null); setOverIndex(null);
    const moved = id ? moveType(active, id, 0, index) : null;
    if (id && moved) commit(id, moved, "up");
  };

  const price = (t: JobType) => (finance && typeof t.defaultPrice === "number" ? formatMoney(t.defaultPrice, currency, locale) : null);
  const failedToArchive = archive.isError && dialog?.kind === "archive" ? setupErrorMessage(archive.error, tr) : undefined;
  const atLimit = all.length >= JOB_TYPES_MAX;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 basis-64">
          <h1 className="text-2xl font-bold text-ops-ink">{tr("b2b.jobTypes.title", "Job types")}</h1>
          <p className="mt-1 text-sm text-ops-ink-muted">{tr("b2b.jobTypes.lead", "The kinds of work you do. People pick one when they create a job.")}</p>
        </div>
        {manage ? <button type="button" disabled={atLimit} onClick={() => setDialog({ kind: "add" })} className={`${btnPrimary} gap-1.5`}><Plus className="h-4 w-4" aria-hidden="true" />{tr("b2b.jobTypes.add", "Add job type")}</button> : null}
      </div>

      {!manage ? <p role="note" className="rounded border border-ops-border bg-ops-surface p-3 text-sm text-ops-ink-muted">{tr("b2b.jobTypes.denied", "You can view job types but not change them. Only administrators and operations managers manage job types.")}</p> : null}
      {manage && atLimit ? <p role="note" className="text-sm text-ops-ink-muted">{tr("b2b.jobTypes.limit", "You have reached the limit of {n} job types. Archive one you no longer use, or rename it.", { n: JOB_TYPES_MAX })}</p> : null}

      {q.isPending ? <ListSkeleton rows={4} />
        : q.isError ? <ErrorAlert message={tr("b2b.jobTypes.loadError", "Job types could not be loaded.")} onRetry={() => void q.refetch()} retryLabel={tr("b2b.setup.retry", "Try again")} />
        : all.length === 0 ? (
          <section aria-labelledby="jt-empty" className="rounded-lg border border-dashed border-ops-border-strong bg-ops-surface p-6 text-center">
            <h2 id="jt-empty" className="text-lg font-bold text-ops-ink">{tr("b2b.jobTypes.empty", "No job types yet")}</h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-ops-ink-muted">{tr("b2b.jobTypes.emptyBody", "Add the kinds of work you do, like Repair or Installation. People pick one when they create a job.")}</p>
            {manage ? <button type="button" onClick={() => setDialog({ kind: "add" })} className={`${btnPrimary} mt-4`}>{tr("b2b.jobTypes.add", "Add job type")}</button> : null}
          </section>
        ) : (
          <>
            <fieldset className="min-w-0">
              <legend className="sr-only">{tr("b2b.jobTypes.filter.label", "Show job types")}</legend>
              <div className="flex flex-wrap gap-1.5">
                {FILTERS.map((x) => (
                  <label key={x.key} className={`inline-flex min-h-[44px] cursor-pointer items-center rounded border px-3 text-sm font-bold focus-within:outline focus-within:outline-2 focus-within:outline-ops-ink ${filter === x.key ? "border-ops-ink bg-ops-ink text-white" : "border-ops-border bg-ops-surface text-ops-ink hover:border-ops-border-strong"}`}>
                    <input type="radio" name="jt-filter" className="sr-only" checked={filter === x.key} onChange={() => setFilter(x.key)} />
                    {tr(x.k, x.label)}
                  </label>
                ))}
              </div>
            </fieldset>
            {manage ? <p className="text-xs text-ops-ink-muted">{tr("b2b.jobTypes.help", "Drag the handle or use the arrows to change the order. The order is the order in the job type picker. Archived types stay on old jobs.")}</p> : null}
            {orderFailed ? <p role="alert" className="text-sm font-bold text-sig-vermilion-ink">{tr("b2b.jobTypes.orderFailed", "Couldn't save the new order. It was put back.")}</p> : null}
            {shown.length === 0 ? (
              <p className="rounded border border-ops-border bg-ops-surface p-4 text-sm text-ops-ink-muted">{filter === "archived" ? tr("b2b.jobTypes.noneArchived", "No archived job types.") : tr("b2b.jobTypes.noneActive", "All your job types are archived. Restore one, or add a new one.")}</p>
            ) : (
              <ul aria-label={tr("b2b.jobTypes.title", "Job types")} className="divide-y divide-ops-border overflow-hidden rounded-lg border border-ops-border bg-ops-surface" onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOverIndex(null); }}>
                {shown.map((t) => {
                  const index = active.findIndex((x) => x.id === t.id);
                  return (
                    <JobTypeRow
                      key={t.id}
                      type={t}
                      index={index}
                      activeCount={active.length}
                      manage={manage}
                      price={price(t)}
                      drag={{
                        dragging: dragId === t.id,
                        over: dragId !== null && overIndex === index && dragId !== t.id,
                        onDragStart: (e) => { setDragId(t.id); e.dataTransfer.setData("text/plain", t.id); e.dataTransfer.effectAllowed = "move"; },
                        onDragOver: (e) => { e.preventDefault(); setOverIndex(index); },
                        onDrop: (e) => drop(e, index),
                        onDragEnd: () => { setDragId(null); setOverIndex(null); },
                      }}
                      onMove={(d) => move(t.id, d)}
                      onRename={() => setDialog({ kind: "edit", type: t })}
                      onArchive={() => { archive.reset(); setDialog({ kind: "archive", type: t }); }}
                      onRestore={() => archive.mutate({ id: t.id, archive: false }, { onSuccess: () => setAnnounce(tr("b2b.jobTypes.restored", "{name} restored.", { name: t.name })) })}
                    />
                  );
                })}
              </ul>
            )}
          </>
        )}
      <p aria-live="polite" className="sr-only">{announce}</p>

      {dialog?.kind === "add" || dialog?.kind === "edit" ? (
        <JobTypeDialog orgId={orgId} all={all} type={dialog.kind === "edit" ? dialog.type : undefined} finance={finance} onClose={() => setDialog(null)} onSaved={(t) => setAnnounce(tr("b2b.jobTypes.saved", "{name} saved.", { name: t.name }))} />
      ) : null}
      <ConfirmBox
        open={dialog?.kind === "archive"}
        title={tr("b2b.jobTypes.archiveTitle", "Archive {name}?", { name: dialog?.kind === "archive" ? dialog.type.name : "" })}
        description={dialog?.kind === "archive" ? (
          <>
            <p>{dialog.type.jobCount > 0
              ? trn("b2b.jobTypes.archiveConfirm", { one: "{n} job uses {name}. Existing jobs keep this type, but it can't be used on new jobs.", other: "{n} jobs use {name}. Existing jobs keep this type, but it can't be used on new jobs." }, dialog.type.jobCount, { name: dialog.type.name })
              : tr("b2b.jobTypes.archiveConfirmNone", "No job uses {name}. It can't be used on new jobs. You can restore it any time.", { name: dialog.type.name })}</p>
            {failedToArchive ? <p role="alert" className="mt-2 font-bold text-sig-vermilion-ink">{failedToArchive}</p> : null}
          </>
        ) : undefined}
        confirmLabel={tr("b2b.jobTypes.archive", "Archive")}
        loading={archive.isPending}
        onCancel={() => setDialog(null)}
        onConfirm={() => {
          if (dialog?.kind !== "archive") return;
          const t = dialog.type;
          archive.mutate({ id: t.id, archive: true }, { onSuccess: () => { setDialog(null); setAnnounce(tr("b2b.jobTypes.archived", "{name} archived.", { name: t.name })); } });
        }}
      />
    </div>
  );
}

