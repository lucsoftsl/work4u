"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { siteSettingsApi } from "@/lib/site-settings-api";
import { Button } from "@/components/ui/Button";

/** The published company contact details (contact page, field-service demo page). Used by /admin/contact and /admin/business. */
export function ContactInfoForm({ token }: { token: string | null }) {
  const { t } = useTranslation();
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await siteSettingsApi.getContactInfo();
        setPhone(data.phone ?? "");
        setEmail(data.email ?? "");
        setAddress(data.address ?? "");
      } catch (err) {
        console.error("Failed to load contact info:", err);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  async function handleSave() {
    if (!token) return;
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await siteSettingsApi.adminUpsertContactInfo({ phone, email, address }, token);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error("Failed to save contact info:", err);
      setError(err instanceof Error ? err.message : t("adminContact.saveError"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-ink-muted">{t("common.loading")}</p>;

  return (
    <div className="rounded-2xl border border-line bg-canvas p-6 space-y-5">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}
      <div>
        <label className="mb-2 block text-sm font-semibold text-ink">{t("contact.phone")}</label>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder={t("adminContact.phonePlaceholder")}
          className="w-full rounded-lg border border-line bg-surface px-4 py-2 text-ink focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
      <div>
        <label className="mb-2 block text-sm font-semibold text-ink">{t("contact.email")}</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("adminContact.emailPlaceholder")}
          className="w-full rounded-lg border border-line bg-surface px-4 py-2 text-ink focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
      <div>
        <label className="mb-2 block text-sm font-semibold text-ink">{t("contact.address")}</label>
        <textarea
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          rows={2}
          placeholder={t("adminContact.addressPlaceholder")}
          className="w-full rounded-lg border border-line bg-surface px-4 py-2 text-ink focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
      <div className="flex items-center gap-3 pt-2">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? t("articleForm.saving") : t("adminContact.save")}
        </Button>
        {saved && (
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-green-700">
            <Check className="h-4 w-4" />
            {t("adminContact.saved")}
          </span>
        )}
      </div>
    </div>
  );
}
