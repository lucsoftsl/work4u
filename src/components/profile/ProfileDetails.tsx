"use client";

import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { resolveAccountMode } from "@/hooks/useAccountMode";
import countriesData from "@/data/countries.json";
import type { AuthUser } from "@/types/auth";
import { countryFlag, parseAddress } from "./profile-utils";

type Country = (typeof countriesData)[number];
const countries = countriesData as Country[];

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-caption text-ink-muted">{label}</dt>
      <dd className="mt-0.5 break-words text-body text-ink">{children}</dd>
    </div>
  );
}

export function ProfileDetails({ user }: { user: AuthUser }) {
  const { t } = useTranslation();
  const address = parseAddress(user.address);
  const country = countries.find((c) => c.code2 === (address.country || user.country));
  const state = country?.states.find((s) => s.code === (address.state || user.state));
  const mode = resolveAccountMode(user);
  const modeLabel = mode === "BOTH" ? t("profile.modeBoth") : mode === "WORKER" ? t("nav.viewWorking") : t("nav.viewHiring");
  const dash = "-";
  const active = user.status === "ACTIVE";
  const StatusIcon = active ? CheckCircle2 : AlertTriangle;
  const statusLabel = t(`profile.status.${user.status}`);

  return (
    <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
      <Row label={t("profile.displayName")}>{user.displayName || dash}</Row>
      <Row label={t("profile.phoneNumber")}>{user.phoneNumber || dash}</Row>
      <Row label={t("profile.accountMode")}>{modeLabel}</Row>
      <Row label={t("profile.status")}>
        <span
          className={`inline-flex h-7 items-center gap-1.5 rounded-control px-2 text-caption font-bold ${
            active ? "bg-success-soft text-success" : "bg-warning-soft text-warning"
          }`}
        >
          <StatusIcon className="h-3.5 w-3.5" aria-hidden="true" />
          {statusLabel}
        </span>
      </Row>
      <Row label={t("profile.country")}>
        {address.country || user.country ? `${countryFlag(address.country || user.country || "")} ${country?.name || address.country}` : dash}
      </Row>
      <Row label={t("profile.state")}>{state?.name || address.state || dash}</Row>
      <Row label={t("profile.address")}>{address.address || dash}</Row>
      <Row label={t("profile.city")}>{address.city || dash}</Row>
      <Row label={t("profile.number")}>{address.number || dash}</Row>
      <Row label={t("profile.postcode")}>{address.postcode || dash}</Row>
    </dl>
  );
}
