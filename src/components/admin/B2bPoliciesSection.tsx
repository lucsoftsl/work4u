"use client";

import { useCallback, useEffect, useState } from "react";
import { Check } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { Button } from "@/components/ui/Button";
import { getB2bPolicies, putB2bPolicies, PolicyApiError, type B2bPolicies } from "@/lib/b2b-policies-api";

const SAVED_FLASH_MS = 2500;

/** "Field service" settings group. Policy values are global (site admin), not per organisation. */
export function B2bPoliciesSection({ token }: { token: string }) {
  const { t } = useTranslation();
  const [saved, setSaved] = useState<B2bPolicies | null>(null);
  const [allow, setAllow] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const policies = await getB2bPolicies(token);
      setSaved(policies);
      setAllow(policies.allowApprovalWithoutEvidence);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [token]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!justSaved) return;
    const timer = setTimeout(() => setJustSaved(false), SAVED_FLASH_MS);
    return () => clearTimeout(timer);
  }, [justSaved]);

  async function save() {
    setSaving(true);
    setJustSaved(false);
    setError(null);
    try {
      const next = await putB2bPolicies(token, allow);
      setSaved(next);
      setAllow(next.allowApprovalWithoutEvidence);
      setJustSaved(true);
    } catch (err) {
      setError(err instanceof PolicyApiError && err.migrationPending
        ? t("adminSettings.migrationPending", "This setting isn't available yet: the database update for it hasn't been applied. Nothing was changed.")
        : t("adminSettings.saveError", "Couldn't save this setting. Nothing was changed; try again."));
    } finally {
      setSaving(false);
    }
  }

  const dirty = saved !== null && allow !== saved.allowApprovalWithoutEvidence;
  const toggleId = "setting-allow-approval-without-evidence";
  const helpId = `${toggleId}-help`;

  return (
    <section aria-labelledby="settings-b2b-heading" className="rounded-2xl border border-line bg-canvas p-6">
      <h2 id="settings-b2b-heading" className="text-xl font-bold text-ink">{t("adminSettings.b2bTitle", "Field service approvals")}</h2>
      <p className="mt-1 mb-6 text-sm text-ink-muted">{t("adminSettings.b2bSubtitle", "Rules for closing jobs in the business workspaces. They apply to every organisation.")}</p>

      {loading ? (
        <p role="status" className="text-ink-muted">{t("common.loading", "Loading…")}</p>
      ) : loadError ? (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          <span>{t("adminSettings.loadError", "Couldn't load this setting.")}</span>
          <Button onClick={() => void load()}>{t("adminSettings.retry", "Retry")}</Button>
        </div>
      ) : (
        <div className="space-y-5">
          {error ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div> : null}
          <div className="flex items-start justify-between gap-4">
            <div>
              <label htmlFor={toggleId} className="block text-sm font-semibold text-ink">{t("adminSettings.allowApprovalWithoutEvidence", "Allow approval without completion evidence")}</label>
              <p id={helpId} className="mt-1 max-w-prose text-sm text-ink-muted">
                {t("adminSettings.allowApprovalHelp", "Off (recommended): a job can only be approved once its photos, signature, notes and checklist are present and can be checked. On: jobs can be closed even when photos, signatures or notes are missing or can't be loaded, so a customer record may be final without proof of the work. Each such approval is recorded in the job's audit log.")}
              </p>
            </div>
            <button
              id={toggleId}
              type="button"
              role="switch"
              aria-checked={allow}
              aria-describedby={helpId}
              disabled={saving}
              onClick={() => setAllow((v) => !v)}
              className={`relative mt-1 inline-flex h-7 w-12 shrink-0 items-center rounded-full border border-line transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${allow ? "bg-primary" : "bg-sunken"}`}
            >
              <span aria-hidden="true" className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform motion-reduce:transition-none ${allow ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>
          {allow ? <p role="note" className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">{t("adminSettings.allowApprovalWarning", "Warning: with this on, reviewers can approve jobs without proof of completion.")}</p> : null}
          {saved?.updatedAt ? (
            <p className="text-sm text-ink-muted">
              {t("adminSettings.lastChange", "Last changed {when} by user {who}.")
                .replace("{when}", new Date(saved.updatedAt).toLocaleString())
                .replace("{who}", saved.updatedByUserId ?? t("adminSettings.unknownUser", "unknown"))}
            </p>
          ) : (
            <p className="text-sm text-ink-muted">{t("adminSettings.neverChanged", "Never changed: using the default (off).")}</p>
          )}
          <div className="flex items-center gap-3 pt-2">
            <Button onClick={() => void save()} disabled={saving || !dirty}>
              {saving ? t("articleForm.saving", "Saving…") : t("adminContact.save", "Save changes")}
            </Button>
            {justSaved ? (
              <span role="status" className="inline-flex items-center gap-1.5 text-sm font-semibold text-green-700">
                <Check className="h-4 w-4" aria-hidden="true" />
                {t("adminContact.saved", "Saved")}
              </span>
            ) : null}
          </div>
        </div>
      )}
    </section>
  );
}
