"use client";

import { useRef, useState } from "react";
import { CloudOff, Pencil, Plus, Trash2 } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import type { Part } from "@/b2b/api/types";
import type { PartInput } from "@/b2b/api/endpoints";
import { techErrorMessage } from "@/b2b/lib/tech-actions";
import { useOffline } from "@/b2b/offline/OfflineProvider";
import { PartSheet } from "./PartSheet";

export const formatQty = (q: number) => String(Math.round(q * 100) / 100);

/** "Parts used" on the technician job screen: add / edit / remove; edits are queued offline, removal is undoable (no confirm dialog). */
export function PartsSection({ job, parts, editable, pendingIds }: { job: { id: string; reference: string }; parts: readonly Part[]; editable: boolean; pendingIds?: ReadonlySet<string> }) {
  const { t } = useTranslation();
  const { submitPart } = useOffline();
  const [sheet, setSheet] = useState<{ part: Part | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const close = () => { setSheet(null); setError(null); trigger.current?.focus(); };

  const save = async (value: PartInput) => {
    setBusy(true);
    setError(null);
    try {
      const editing = sheet?.part;
      const res = editing
        ? await submitPart(job, "edit", { id: editing.id, values: value, undoText: t("b2b.tech.undo.action.partEdited", "Updated {name}").replace("{name}", value.name) })
        : await submitPart(job, "add", { values: value, undoText: t("b2b.tech.undo.action.partAdded", "Added {name}").replace("{name}", value.name) });
      setNote(res.queued ? t("b2b.tech.parts.savedQueued", "Part saved on this device.") : null);
      close();
    } catch (e) {
      const known = techErrorMessage(e, t).message;
      setError(`${t("b2b.tech.parts.saveError", "Couldn't save this part. Try again.")} ${known}`);
    } finally {
      setBusy(false);
    }
  };
  const remove = async (part: Part) => {
    setError(null);
    try {
      await submitPart(job, "delete", { id: part.id, undoText: t("b2b.tech.undo.action.partRemoved", "Removed {name}").replace("{name}", part.name) });
    } catch (e) {
      setError(techErrorMessage(e, t).message);
    }
  };
  const open = (part: Part | null, el: HTMLElement) => { trigger.current = el; setSheet({ part }); };
  const btn = "inline-flex min-h-[48px] items-center justify-center gap-1.5 rounded border-2 border-ops-border-strong px-3 text-sm font-bold";
  return (
    <section aria-labelledby="parts-h" className="rounded border border-ops-border bg-ops-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 id="parts-h" className="text-xs font-bold uppercase tracking-wider text-ops-ink-subtle">{t("b2b.tech.parts.title", "Parts used ({n})").replace("{n}", String(parts.length))}</h2>
        {editable ? <button type="button" onClick={(e) => open(null, e.currentTarget)} className={btn}><Plus className="h-4 w-4" aria-hidden="true" />{t("b2b.tech.parts.add", "Add part")}</button> : null}
      </div>
      {parts.length === 0 ? (
        <p className="mt-2 text-ops-ink-muted">{t("b2b.tech.parts.empty", "Nothing used yet.")}</p>
      ) : (
        <ul className="mt-2 divide-y divide-ops-border">
          {parts.map((p) => (
            <li key={p.id} className="flex min-h-[56px] items-center gap-2 py-1.5">
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{p.name}</p>
                <p className="truncate text-sm text-ops-ink-muted"><span className="font-mono">×{formatQty(p.quantity)}{p.unit ? ` ${p.unit}` : ""}</span>{p.sku ? ` · SKU ${p.sku}` : ""}{p.note ? ` · ${p.note}` : ""}</p>
                {pendingIds?.has(p.id) ? <p className="inline-flex items-center gap-1 text-xs font-bold text-sig-orange-ink"><CloudOff className="h-3.5 w-3.5" aria-hidden="true" />{t("b2b.tech.timer.savedOnDevice", "Saved on device")}</p> : null}
              </div>
              {editable ? (
                <>
                  <button type="button" aria-label={`${t("b2b.tech.parts.edit", "Edit")} ${p.name}`} onClick={(e) => open(p, e.currentTarget)} className={btn}><Pencil className="h-4 w-4" aria-hidden="true" /><span className="max-md:sr-only">{t("b2b.tech.parts.edit", "Edit")}</span></button>
                  <button type="button" aria-label={`${t("b2b.tech.parts.remove", "Remove")} ${p.name}`} onClick={() => void remove(p)} className={btn}><Trash2 className="h-4 w-4" aria-hidden="true" /><span className="max-md:sr-only">{t("b2b.tech.parts.remove", "Remove")}</span></button>
                </>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {!editable ? <p className="mt-2 text-sm text-ops-ink-muted">{t("b2b.tech.parts.readOnly", "Parts can be changed until the job is approved.")}</p> : null}
      {note ? <p role="status" className="mt-2 text-sm font-bold">{note}</p> : null}
      {error && !sheet ? <p role="alert" className="mt-2 rounded border border-sig-vermilion-ink/40 bg-sig-vermilion-tint p-2 text-sm text-sig-vermilion-ink">{error}</p> : null}
      <PartSheet open={sheet !== null} part={sheet?.part} busy={busy} error={error} onCancel={close} onSave={(v) => void save(v)} />
    </section>
  );
}
