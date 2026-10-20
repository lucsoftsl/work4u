"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useOrg } from "@/b2b/context/OrgContext";
import { isB2bError } from "@/b2b/api/client";
import { RequirePermission } from "@/b2b/components/shell/RequirePermission";
import { SettingsLayout } from "../SettingsLayout";
import { useOnlineStatus } from "../useOnlineStatus";
import { commitImport, discardImport, getSettings, sk, uploadImport, type ImportPreview } from "../api";
import { setupErrorMessage } from "../errors";
import { useTr } from "../i18n";
import { ConfirmStep, ResultStep } from "./ConfirmResultSteps";
import { MapStep } from "./MapStep";
import { PreviewStep } from "./PreviewStep";
import { Stepper, STEPS, type StepKey } from "./Stepper";
import { UploadStep } from "./UploadStep";
import { useStepFocus } from "./useStepFocus";
import { buildImportOptions, classifyUploadError, commitMode, initialOptionsState, type FileErrorCode, type Kind, type OptionsState } from "./importLogic";

interface Props { kind: Kind; backHref: string; doneHref: string }

/** Generic CSV import stepper for employees and clients. Gated by member.manage / customer.manage. */
export function ImportWizard({ kind, backHref, doneHref }: Props) {
  return (
    <RequirePermission permission={kind === "employees" ? "member.manage" : "customer.manage"}>
      <SettingsLayout><WizardBody kind={kind} backHref={backHref} doneHref={doneHref} /></SettingsLayout>
    </RequirePermission>
  );
}

function WizardBody({ kind, backHref, doneHref }: Props) {
  const { orgId } = useOrg();
  const { tr } = useTr();
  const online = useOnlineStatus();
  const qc = useQueryClient();
  const [step, setStep] = useState<StepKey>("upload");
  useStepFocus(step);
  const [maxReached, setMaxReached] = useState<StepKey>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [options, setOptions] = useState<OptionsState>(() => initialOptionsState(kind));
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [result, setResult] = useState<ImportPreview | null>(null);
  const [fileError, setFileError] = useState<FileErrorCode | null>(null);
  const [missing, setMissing] = useState<{ missing: string[]; headers: string[]; knownFields: string[] } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [skipRows, setSkipRows] = useState(false);
  const [commitError, setCommitError] = useState<string | null>(null);

  const settings = useQuery({ queryKey: sk.settings(orgId), queryFn: () => getSettings(orgId), retry: false });
  const country = settings.data?.country ?? "";
  useEffect(() => {
    if (country) setOptions((o) => (o.defaultCountry ? o : { ...o, defaultCountry: country.toUpperCase() }));
  }, [country]);

  // Abandoning an uncommitted preview discards it (errors ignored).
  const pending = useRef<string | null>(null);
  useEffect(() => { pending.current = preview && !result ? preview.id : null; }, [preview, result]);
  useEffect(() => () => { if (pending.current) void discardImport(orgId, pending.current).catch(() => undefined); }, [orgId]);

  const go = useCallback((s: StepKey) => {
    setStep(s);
    setMaxReached((m) => (STEPS.indexOf(s) > STEPS.indexOf(m) ? s : m));
  }, []);

  const upload = useCallback(async (f: File, opts: OptionsState, target: "map" | "preview") => {
    setBusy(true);
    setMessage(null);
    setFileError(null);
    const previous = preview?.id;
    try {
      const p = await uploadImport(orgId, kind, f, buildImportOptions(opts));
      if (previous && previous !== p.id) void discardImport(orgId, previous).catch(() => undefined);
      setPreview(p);
      setMissing(null);
      setOptions((o) => ({ ...o, mapping: p.mapping?.used ?? o.mapping }));
      go(target);
    } catch (err) {
      const c = classifyUploadError(err);
      if (c.kind === "file") { setFileError(c.code); go("upload"); }
      else if (c.kind === "missing") { setMissing(c); setPreview(null); go("map"); }
      else setMessage(isB2bError(err) && err.code === "NETWORK" ? tr("b2b.import.lostConnection", "We lost the connection. Your file is not imported. Start again.") : setupErrorMessage(err, tr));
    } finally {
      setBusy(false);
    }
  }, [orgId, kind, preview?.id, go, tr]);

  const onFile = (f: File) => { setFile(f); setOptions((o) => ({ ...o, encoding: "", mapping: {} })); void upload(f, { ...options, encoding: "", mapping: {} }, "map"); };
  const onEncoding = (enc: string) => { if (!file) return; const next = { ...options, encoding: enc }; setOptions(next); void upload(file, next, "map"); };
  const onPreview = () => { if (file) void upload(file, options, "preview"); };

  const commit = async () => {
    if (!preview) return;
    setBusy(true);
    setCommitError(null);
    try {
      const r = await commitImport(orgId, preview.id, skipRows);
      setResult(r);
      void qc.invalidateQueries({ queryKey: sk.imports(orgId) });
      void qc.invalidateQueries({ queryKey: sk.setup(orgId) });
      void qc.invalidateQueries({ queryKey: kind === "employees" ? sk.membersAll(orgId) : sk.clientsAll(orgId) });
      go("result");
    } catch (err) {
      setCommitError(setupErrorMessage(err, tr));
      setBusy(false);
      return;
    }
    setBusy(false);
  };

  const restart = () => { setPreview(null); setResult(null); setFile(null); setMissing(null); setSkipRows(false); setStep("upload"); setMaxReached("upload"); setOptions(initialOptionsState(kind, country)); };
  const examples: Record<string, string> = {};
  if (preview) for (const [field, header] of Object.entries(options.mapping)) {
    const v = preview.rows.find((r) => r.values && r.values[field] != null && typeof r.values[field] !== "object")?.values?.[field];
    if (v != null) examples[header] = String(v);
  }
  const headers = missing?.headers ?? preview?.headers ?? [];
  const stepLabel: Record<StepKey, string> = {
    upload: tr("b2b.import.step.upload", "Upload"), map: tr("b2b.import.step.map", "Map columns"), preview: tr("b2b.import.step.preview", "Preview"),
    confirm: tr("b2b.import.step.confirm", "Confirm"), result: tr("b2b.import.step.result", "Result"),
  };
  const title = kind === "employees" ? tr("b2b.import.titleEmployees", "Import employees from CSV") : tr("b2b.import.titleClients", "Import clients from CSV");

  return (
    <div className="space-y-4">
      <Link href={backHref} className="inline-flex min-h-[44px] items-center gap-2 text-sm font-bold text-ops-ink underline-offset-2 hover:underline"><ArrowLeft className="h-4 w-4" aria-hidden="true" />{tr("b2b.common.back", "Back")}</Link>
      <h1 className="text-2xl font-bold text-ops-ink">{title}</h1>
      <p role="status" aria-live="polite" className="sr-only">{tr("b2b.import.stepAnnounce", "Step {n} of {total}: {name}", { n: STEPS.indexOf(step) + 1, total: STEPS.length, name: stepLabel[step] })}</p>
      <Stepper current={step} maxReached={maxReached} onGo={(s) => { setCommitError(null); setStep(s); }} />
      {step === "upload" && <UploadStep kind={kind} busy={busy} online={online} fileError={fileError} message={message} file={file} onFile={onFile} onEncoding={onEncoding} />}
      {step === "map" && (
        <MapStep kind={kind} headers={headers} knownFields={missing?.knownFields} missing={missing?.missing ?? []} examples={examples} options={options}
          busy={busy} online={online} onChange={setOptions} onPreview={onPreview} onBack={() => setStep("upload")} />
      )}
      {step === "map" && message && <p role="alert" className="text-sm font-bold text-sig-vermilion-ink">{message}</p>}
      {step === "preview" && preview && (
        <PreviewStep kind={kind} preview={preview} online={online} busy={busy} commitError={commitError} onBack={() => setStep("map")}
          onCommit={(skip) => { setSkipRows(skip); setCommitError(null); setStep("confirm"); setMaxReached("confirm"); }} />
      )}
      {step === "confirm" && preview && commitMode(preview.counts) !== "blocked" && (
        <ConfirmStep kind={kind} preview={preview} skip={skipRows} online={online} busy={busy} error={commitError} onBack={() => setStep("preview")} onCommit={() => void commit()} />
      )}
      {step === "result" && result && <ResultStep kind={kind} result={result} doneHref={doneHref} onRestart={restart} />}
    </div>
  );
}
