"use client";

import { CheckCircle2, CircleDashed, CircleHelp } from "lucide-react";
import { btnPrimary, btnSecondary, inputCls } from "@/b2b/components/catalog/ui";
import { cn } from "@/lib/utils";
import { useTr } from "../i18n";
import { defaultFields, fieldLabel } from "./fields";
import { buildMapRows, setHeaderField, type Kind, type MapStatus, type OptionsState } from "./importLogic";

interface Props {
  kind: Kind; headers: string[]; knownFields?: string[]; missing: string[]; examples: Record<string, string>;
  options: OptionsState; busy: boolean; online: boolean; onChange: (o: OptionsState) => void; onPreview: () => void; onBack: () => void;
}

function StatusChip({ status }: { status: MapStatus }) {
  const { tr } = useTr();
  const m = {
    matched: { Icon: CheckCircle2, label: tr("b2b.import.matched", "Matched"), cls: "bg-sig-green-tint text-sig-green-ink" },
    needs: { Icon: CircleHelp, label: tr("b2b.import.needsMapping", "Needs mapping"), cls: "bg-sig-orange-tint text-sig-orange-ink" },
    skipped: { Icon: CircleDashed, label: tr("b2b.import.skipped", "Skipped"), cls: "border border-dashed border-sig-slate-ink text-sig-slate-ink" },
  }[status];
  return <span className={cn("inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs font-bold", m.cls)}><m.Icon className="h-3.5 w-3.5" aria-hidden="true" />{m.label}</span>;
}

export function MapStep({ kind, headers, knownFields, missing, examples, options, busy, online, onChange, onPreview, onBack }: Props) {
  const { tr } = useTr();
  const fields = knownFields && knownFields.length > 0 ? knownFields : defaultFields(kind);
  const rows = buildMapRows(headers, Object.fromEntries(Object.entries(options.mapping).map(([f, h]) => [f, h])), missing);
  const check = (key: keyof OptionsState, label: string) => (
    <label className="flex min-h-[44px] items-center gap-3 text-sm"><input type="checkbox" className="h-5 w-5" checked={options[key] as boolean} onChange={(e) => onChange({ ...options, [key]: e.target.checked })} />{label}</label>
  );
  return (
    <div className="space-y-4">
      {missing.length > 0 && (
        <p role="alert" className="rounded border border-sig-orange-ink bg-ops-surface p-3 text-sm font-bold">
          {tr("b2b.import.missingColumn", "We couldn't find a column for {field}. Choose it below, then continue.", { field: missing.map(fieldLabel).join(", ") })}
        </p>
      )}
      <section aria-labelledby="map-h" className="space-y-3 rounded-lg border border-ops-border bg-ops-surface p-4">
        <h2 id="map-h" className="text-lg font-bold">{tr("b2b.import.step.map", "Map columns")}</h2>
        <p className="text-sm text-ops-ink-muted">{tr("b2b.import.matchOrder", "Existing records are matched by ID first, then email, then phone. Matches are updated; the rest are created.")}</p>
        <ul className="divide-y divide-ops-border">
          {rows.map((r) => {
            const selId = `map-${r.header}`;
            return (
              <li key={r.header} className="grid gap-2 py-3 min-[700px]:grid-cols-[1fr_1fr_1fr_auto] min-[700px]:items-center">
                <div className="min-w-0"><p className="text-xs font-bold text-ops-ink-muted">{tr("b2b.import.yourColumn", "Your column")}</p><p className="break-words font-bold">{r.header}</p></div>
                <div>
                  <label htmlFor={selId} className="block text-xs font-bold text-ops-ink-muted">{tr("b2b.import.targetField", "Import as")}</label>
                  <select id={selId} value={r.field} onChange={(e) => onChange({ ...options, mapping: setHeaderField(options.mapping, r.header, e.target.value) })} className={inputCls}>
                    <option value="">{tr("b2b.import.dontImport", "Don't import")}</option>
                    {fields.map((f) => <option key={f} value={f}>{fieldLabel(f)}</option>)}
                  </select>
                </div>
                <div className="min-w-0"><p className="text-xs font-bold text-ops-ink-muted">{tr("b2b.import.example", "Example")}</p><p className="break-words text-sm">{examples[r.header] ?? "-"}</p></div>
                <StatusChip status={r.status} />
              </li>
            );
          })}
        </ul>
      </section>
      <section aria-labelledby="opt-h" className="space-y-1 rounded-lg border border-ops-border bg-ops-surface p-4">
        <h2 id="opt-h" className="text-lg font-bold">{tr("b2b.import.options", "Options")}</h2>
        {kind === "employees" && check("createMissingTeams", tr("b2b.import.opt.teams", "Create teams that don't exist yet"))}
        {kind === "employees" && check("createMissingSkills", tr("b2b.import.opt.skills", "Create skills that don't exist yet"))}
        {kind === "customers" && check("matchByName", tr("b2b.import.opt.matchByName", "Match clients by name when there is no ID, email or phone"))}
        {check("clearEmpty", tr("b2b.import.opt.clearEmpty", "Empty cells clear the existing value"))}
        <div className="pt-2">
          <label htmlFor="opt-country" className="block text-sm font-bold">{tr("b2b.import.opt.country", "Default phone country (2 letters, e.g. RO)")}</label>
          <input id="opt-country" maxLength={2} autoComplete="off" value={options.defaultCountry} onChange={(e) => onChange({ ...options, defaultCountry: e.target.value.toUpperCase() })} className={`${inputCls} w-24`} />
        </div>
      </section>
      <div className="sticky bottom-0 flex flex-wrap justify-between gap-2 border-t border-ops-border bg-ops-canvas py-3">
        <button type="button" onClick={onBack} className={btnSecondary}>{tr("b2b.common.back", "Back")}</button>
        <button type="button" disabled={busy || !online} onClick={onPreview} className={btnPrimary}>{busy ? tr("b2b.import.checking", "Checking your file…") : tr("b2b.import.previewCta", "Preview import")}</button>
      </div>
    </div>
  );
}
