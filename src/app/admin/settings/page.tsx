"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "@/lib/i18n";
import { B2bPoliciesSection } from "@/components/admin/B2bPoliciesSection";

/** "Configure the website" shell: each settings group is its own <section>; add new groups below. */
export default function AdminSettingsPage() {
  const { t } = useTranslation();
  const { user, firebaseToken } = useAuth();

  if (user?.userType !== "ADMIN") return null;

  return (
    <div className="min-h-screen bg-surface">
      <div className="mx-auto max-w-2xl px-4 py-16">
        <Link href="/admin" className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t("admin.backToDashboard", "Back to admin dashboard")}
        </Link>
        <h1 className="mt-4 mb-2 text-4xl font-bold text-ink">{t("adminSettings.title", "Site settings")}</h1>
        <p className="mb-10 text-ink-muted">{t("adminSettings.subtitle", "Configure how the website and business workspaces behave.")}</p>
        <div className="space-y-6">
          {firebaseToken ? <B2bPoliciesSection token={firebaseToken} /> : null}
        </div>
      </div>
    </div>
  );
}
