"use client";

import { useEffect } from "react";
import Link from "@/components/LocaleLink";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "@/lib/i18n";
import { ContactInfoForm } from "@/components/admin/ContactInfoForm";

export default function AdminContactPage() {
  const { t } = useTranslation();
  const { user, firebaseToken } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && user.userType !== "ADMIN") {
      router.push("/dashboard");
    }
  }, [user, router]);

  if (user?.userType !== "ADMIN") {
    return null;
  }

  return (
    <div className="min-h-screen bg-surface">
      <div className="mx-auto max-w-2xl px-4 py-16">
        <Link href="/admin" className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
          <ArrowLeft className="w-4 h-4" />
          {t("admin.backToDashboard")}
        </Link>
        <h1 className="mt-4 text-4xl font-bold text-ink mb-2">{t("adminContact.title")}</h1>
        <p className="text-ink-muted mb-10">{t("adminContact.subtitle")}</p>
        <ContactInfoForm token={firebaseToken} />
      </div>
    </div>
  );
}
