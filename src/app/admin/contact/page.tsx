"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "@/lib/i18n";
import { siteSettingsApi } from "@/lib/site-settings-api";
import { Button } from "@/components/ui/Button";

export default function AdminContactPage() {
  const { t } = useTranslation();
  const { user, firebaseToken } = useAuth();
  const router = useRouter();

  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && user.userType !== "ADMIN") {
      router.push("/dashboard");
    }
  }, [user, router]);

  useEffect(() => {
    if (user?.userType !== "ADMIN") return;

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
  }, [user?.userType]);

  async function handleSave() {
    if (!firebaseToken) return;
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await siteSettingsApi.adminUpsertContactInfo({ phone, email, address }, firebaseToken);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error("Failed to save contact info:", err);
      setError(err instanceof Error ? err.message : t("adminContact.saveError"));
    } finally {
      setSaving(false);
    }
  }

  if (user?.userType !== "ADMIN") {
    return null;
  }

  return (
    <div className="min-h-screen bg-card">
      <div className="mx-auto max-w-2xl px-4 py-16">
        <Link href="/admin" className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
          <ArrowLeft className="w-4 h-4" />
          {t("admin.backToDashboard")}
        </Link>
        <h1 className="mt-4 text-4xl font-bold text-foreground mb-2">{t("adminContact.title")}</h1>
        <p className="text-muted-foreground mb-10">{t("adminContact.subtitle")}</p>

        {loading ? (
          <p className="text-muted-foreground">{t("common.loading")}</p>
        ) : (
          <div className="rounded-2xl border border-border bg-background p-6 space-y-5">
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </div>
            )}
            <div>
              <label className="mb-2 block text-sm font-semibold text-foreground">{t("contact.phone")}</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t("adminContact.phonePlaceholder")}
                className="w-full rounded-lg border border-border bg-card px-4 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-foreground">{t("contact.email")}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("adminContact.emailPlaceholder")}
                className="w-full rounded-lg border border-border bg-card px-4 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-foreground">{t("contact.address")}</label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={2}
                placeholder={t("adminContact.addressPlaceholder")}
                className="w-full rounded-lg border border-border bg-card px-4 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
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
        )}
      </div>
    </div>
  );
}
