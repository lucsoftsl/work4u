"use client";

import { useEffect, useState } from "react";
import { Mail, MapPin, Phone } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { siteSettingsApi } from "@/lib/site-settings-api";
import type { ContactInfo } from "@/api/types";

export default function ContactPage() {
  const { t } = useTranslation();
  const [info, setInfo] = useState<ContactInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    const load = async () => {
      try {
        const data = await siteSettingsApi.getContactInfo();
        if (isActive) setInfo(data);
      } catch (error) {
        console.error("Failed to load contact info:", error);
      } finally {
        if (isActive) setLoading(false);
      }
    };

    void load();
    return () => {
      isActive = false;
    };
  }, []);

  const hasAnyInfo = Boolean(info?.phone || info?.email || info?.address);

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <h1 className="section-heading">{t("contact.title")}</h1>
          <p className="mt-3 text-sm leading-6 text-ink-muted">{t("contact.subtitle")}</p>
        </div>

        {loading ? (
          <div className="surface-panel p-10 text-center text-ink-muted">{t("common.loading")}</div>
        ) : !hasAnyInfo ? (
          <div className="surface-panel p-10 text-center text-ink-muted">{t("contact.notConfigured")}</div>
        ) : (
          <div className="surface-card space-y-5 p-6 md:p-8">
            {info?.phone && (
              <a
                href={`tel:${info.phone}`}
                className="flex items-center gap-4 rounded-2xl border border-outline bg-white p-4 transition hover:border-brand/35"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand">
                  <Phone className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-xs font-bold uppercase tracking-[0.16em] text-ink-subtle">
                    {t("contact.phone")}
                  </span>
                  <span className="block text-base font-semibold text-ink">{info.phone}</span>
                </span>
              </a>
            )}
            {info?.email && (
              <a
                href={`mailto:${info.email}`}
                className="flex items-center gap-4 rounded-2xl border border-outline bg-white p-4 transition hover:border-brand/35"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand">
                  <Mail className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-xs font-bold uppercase tracking-[0.16em] text-ink-subtle">
                    {t("contact.email")}
                  </span>
                  <span className="block text-base font-semibold text-ink">{info.email}</span>
                </span>
              </a>
            )}
            {info?.address && (
              <div className="flex items-center gap-4 rounded-2xl border border-outline bg-white p-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand">
                  <MapPin className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-xs font-bold uppercase tracking-[0.16em] text-ink-subtle">
                    {t("contact.address")}
                  </span>
                  <span className="block text-base font-semibold text-ink">{info.address}</span>
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
