"use client";

import Link from "@/components/LocaleLink";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "@/lib/i18n";
import { B2bPoliciesSection } from "@/components/admin/B2bPoliciesSection";
import { ContactInfoForm } from "@/components/admin/ContactInfoForm";
import { DemoRequestsInbox } from "@/components/admin/DemoRequestsInbox";

const PUBLIC_PAGES = [
  ["/field-service", "admin.business.page.fieldService", "Field service home"],
  ["/field-service/demo", "admin.business.page.demo", "Request a demo"],
  ["/business", "admin.business.page.business", "work4u for business"],
  ["/ops/signin", "admin.business.page.signIn", "Business sign-in"],
] as const;

/** Everything about the offer for companies (field service) in one place: leads, the contact details they see, policies, pages. */
export default function AdminBusinessPage() {
  const { t } = useTranslation();
  const { user, firebaseToken } = useAuth();

  if (user?.userType !== "ADMIN") return null;

  const card = "rounded-2xl border border-line bg-canvas p-6";
  return (
    <div className="min-h-screen bg-surface">
      <div className="mx-auto max-w-3xl px-4 py-16">
        <Link href="/admin" className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t("admin.backToDashboard", "Back to admin dashboard")}
        </Link>
        <h1 className="mt-4 mb-2 text-4xl font-bold text-ink">{t("admin.business.title", "Business")}</h1>
        <p className="mb-10 text-ink-muted">{t("admin.business.subtitle", "work4u for companies: demo requests, the contact details on the demo page, field service rules and the public pages.")}</p>

        <div className="space-y-6">
          <section aria-labelledby="business-demo-heading" className={card}>
            <h2 id="business-demo-heading" className="text-xl font-bold text-ink">{t("admin.business.demoTitle", "Demo requests")}</h2>
            <p className="mt-1 mb-4 text-sm text-ink-muted">{t("admin.business.demoSubtitle", "Sent from the \"Request a demo\" form on the field-service pages.")}</p>
            {firebaseToken ? <DemoRequestsInbox token={firebaseToken} /> : null}
          </section>

          <section aria-labelledby="business-contact-heading">
            <h2 id="business-contact-heading" className="text-xl font-bold text-ink">{t("admin.business.contactTitle", "Demo page contact details")}</h2>
            <p className="mt-1 mb-4 text-sm text-ink-muted">{t("admin.business.contactSubtitle", "Shown next to the demo form as \"Prefer to talk?\". The same details appear on the public contact page.")}</p>
            <ContactInfoForm token={firebaseToken} />
          </section>

          {firebaseToken ? <B2bPoliciesSection token={firebaseToken} /> : null}

          <section aria-labelledby="business-pages-heading" className={card}>
            <h2 id="business-pages-heading" className="text-xl font-bold text-ink">{t("admin.business.pagesTitle", "Public pages")}</h2>
            <ul className="mt-4 space-y-2">
              {PUBLIC_PAGES.map(([href, key, fallback]) => (
                <li key={href}>
                  <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
                    {t(key, fallback)} <span className="font-normal text-ink-muted">{href}</span>
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
