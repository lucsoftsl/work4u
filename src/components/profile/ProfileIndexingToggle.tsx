"use client";

import { useEffect, useState } from "react";
import { Checkbox } from "@/components/ui/Field";
import { useTranslation } from "@/lib/i18n";
import { apiJson, errorMessage } from "@/lib/http";

/** Worker opt-out from search engines (GET/PUT /api/users/:id/profile-indexing). Default is "listed". */
export function ProfileIndexingToggle({ userId }: { userId: string }) {
  const { t } = useTranslation();
  const [indexable, setIndexable] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const url = `/api/users/${encodeURIComponent(userId)}/profile-indexing`;

  useEffect(() => {
    let active = true;
    apiJson<{ indexable: boolean }>(url, { auth: true })
      .then((r) => { if (active) setIndexable(r.indexable); })
      .catch((e) => { if (active) setError(errorMessage(e, t("profile.indexing.loadError"))); });
    return () => { active = false; };
  }, [url, t]);

  const change = async (next: boolean) => {
    const previous = indexable;
    setIndexable(next); // optimistic; rolled back below if the server refuses
    setSaving(true);
    setError(null);
    try {
      const r = await apiJson<{ indexable: boolean }>(url, { method: "PUT", auth: true, json: { indexable: next } });
      setIndexable(r.indexable);
    } catch (e) {
      setIndexable(previous);
      setError(errorMessage(e, t("profile.indexing.saveError")));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section aria-labelledby="profile-indexing-heading" className="rounded-card border border-line bg-surface p-5 md:p-6">
      <h2 id="profile-indexing-heading" className="font-display text-h3 text-ink">{t("profile.indexing.title")}</h2>
      <p className="mt-1 text-body text-ink-muted">{t("profile.indexing.help")}</p>
      <Checkbox
        wrapperClassName="mt-2"
        label={t("profile.indexing.label")}
        checked={indexable === true}
        disabled={indexable === null || saving}
        onChange={(e) => void change(e.target.checked)}
      />
      {error ? <p role="alert" className="mt-1 text-caption font-bold text-danger">{error}</p> : null}
    </section>
  );
}
