"use client";

import { useId, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import type { Part } from "@/b2b/api/types";
import type { PartInput } from "@/b2b/api/endpoints";
import { PART_LIMITS, PART_UNITS, validatePart, type PartErrors } from "@/b2b/lib/parts";
import { TechDialog } from "./TechDialog";

const STEP = 1;

/** Add/edit one used part: name + quantity required, SKU/unit/note optional. Errors are inline; nothing is lost on failure. */
export function PartSheet({ open, part, busy, error, onCancel, onSave }: { open: boolean; part?: Part | null; busy?: boolean; error?: string | null; onCancel: () => void; onSave: (value: PartInput) => void }) {
  const { t } = useTranslation();
  return (
    <TechDialog open={open} title={part ? t("b2b.tech.parts.editTitle", "Edit part") : t("b2b.tech.parts.add", "Add part")} onClose={onCancel}>
      {open ? <Form key={part?.id ?? "new"} part={part} busy={busy} error={error} onCancel={onCancel} onSave={onSave} /> : null}
    </TechDialog>
  );
}

function Form({ part, busy, error, onCancel, onSave }: { part?: Part | null; busy?: boolean; error?: string | null; onCancel: () => void; onSave: (v: PartInput) => void }) {
  const { t } = useTranslation();
  const ids = { name: useId(), qty: useId(), unit: useId(), sku: useId(), note: useId() };
  const [name, setName] = useState(part?.name ?? "");
  const [quantity, setQuantity] = useState(part ? String(part.quantity) : "1");
  const [unit, setUnit] = useState(part?.unit ?? "pcs");
  const [sku, setSku] = useState(part?.sku ?? "");
  const [note, setNote] = useState(part?.note ?? "");
  const [errors, setErrors] = useState<PartErrors>({});
  const bump = (d: number) => setQuantity((q) => String(Math.max(0, Math.round(((Number(q.replace(",", ".")) || 0) + d) * 100) / 100)));
  const msg = (e?: PartErrors[keyof PartErrors]) => e === "name" ? t("b2b.tech.parts.err.name", "Enter the part name.") : e === "qty" ? t("b2b.tech.parts.err.qty", "Enter a quantity greater than 0.") : e === "long" ? t("b2b.tech.parts.err.long", "That's too long.") : null;
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const { errors: errs, value } = validatePart({ name, quantity, sku, unit, note });
    setErrors(errs);
    if (value) onSave(value);
  };
  const field = "mt-1 min-h-[48px] w-full rounded border border-ops-border-strong px-2";
  const err = (id: string, e?: PartErrors[keyof PartErrors]) => (e ? <p id={`${id}-err`} className="mt-1 text-sm text-sig-vermilion-ink">{msg(e)}</p> : null);
  return (
    <form onSubmit={submit} noValidate className="space-y-3">
      <div>
        <label htmlFor={ids.name} className="block text-sm font-bold">{t("b2b.tech.parts.name", "Part name")}</label>
        <input id={ids.name} value={name} maxLength={PART_LIMITS.name + 20} onChange={(e) => setName(e.target.value)} aria-invalid={errors.name ? true : undefined} aria-describedby={errors.name ? `${ids.name}-err` : undefined} className={field} autoComplete="off" />
        {err(ids.name, errors.name)}
      </div>
      <div>
        <label htmlFor={ids.qty} className="block text-sm font-bold">{t("b2b.tech.parts.qty", "Quantity")}</label>
        <div className="mt-1 flex items-center gap-2">
          <button type="button" aria-label={t("b2b.tech.parts.qtyLess", "Decrease quantity")} onClick={() => bump(-STEP)} className="flex h-12 w-12 shrink-0 items-center justify-center rounded border-2 border-ops-border-strong"><Minus className="h-5 w-5" aria-hidden="true" /></button>
          <input id={ids.qty} inputMode="decimal" value={quantity} onChange={(e) => setQuantity(e.target.value)} aria-invalid={errors.quantity ? true : undefined} aria-describedby={errors.quantity ? `${ids.qty}-err` : undefined} className="min-h-[48px] w-full rounded border border-ops-border-strong px-2 text-center font-mono" />
          <button type="button" aria-label={t("b2b.tech.parts.qtyMore", "Increase quantity")} onClick={() => bump(STEP)} className="flex h-12 w-12 shrink-0 items-center justify-center rounded border-2 border-ops-border-strong"><Plus className="h-5 w-5" aria-hidden="true" /></button>
        </div>
        {err(ids.qty, errors.quantity)}
      </div>
      <div>
        <label htmlFor={ids.unit} className="block text-sm font-bold">{t("b2b.tech.parts.unit", "Unit (optional)")}</label>
        <input id={ids.unit} list={`${ids.unit}-list`} value={unit} onChange={(e) => setUnit(e.target.value)} aria-describedby={errors.unit ? `${ids.unit}-err` : undefined} className={field} autoComplete="off" />
        <datalist id={`${ids.unit}-list`}>{PART_UNITS.map((u) => <option key={u} value={u} />)}</datalist>
        {err(ids.unit, errors.unit)}
      </div>
      <div>
        <label htmlFor={ids.sku} className="block text-sm font-bold">{t("b2b.tech.parts.sku", "SKU (optional)")}</label>
        <input id={ids.sku} value={sku} onChange={(e) => setSku(e.target.value)} aria-describedby={errors.sku ? `${ids.sku}-err` : undefined} className={field} autoComplete="off" />
        {err(ids.sku, errors.sku)}
      </div>
      <div>
        <label htmlFor={ids.note} className="block text-sm font-bold">{t("b2b.tech.parts.note", "Note (optional)")}</label>
        <textarea id={ids.note} rows={2} value={note} onChange={(e) => setNote(e.target.value)} aria-describedby={errors.note ? `${ids.note}-err` : undefined} className="mt-1 w-full rounded border border-ops-border-strong p-2" />
        {err(ids.note, errors.note)}
      </div>
      {error ? <p role="alert" className="rounded border border-sig-vermilion-ink/40 bg-sig-vermilion-tint p-2 text-sm text-sig-vermilion-ink">{error}</p> : null}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={onCancel} className="min-h-[48px] rounded border-2 border-ops-border-strong font-bold">{t("b2b.tech.job.cancel", "Cancel")}</button>
        <button type="submit" disabled={busy} className="min-h-[56px] rounded bg-ops-ink font-bold text-white disabled:opacity-45">{t("b2b.tech.parts.save", "Save part")}</button>
      </div>
    </form>
  );
}
