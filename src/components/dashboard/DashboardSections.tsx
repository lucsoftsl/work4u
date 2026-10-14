"use client";

import Link from "@/components/LocaleLink";
import type { ReactNode } from "react";
import { ArrowRight, CheckCircle2, Circle, CircleAlert, Clock, MapPin } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { buttonClasses } from "@/components/ui/Button";
import { MoneyPlate } from "@/components/ui/MoneyPlate";
import { CountBadge, StatusChip } from "@/components/ui/StatusChip";
import type { AttentionItem, ChecklistItem } from "@/components/dashboard/dashboard-data";

/** Titled card used for every dashboard block (one H2 per block). */
export function DashboardCard({
  id,
  title,
  aside,
  children,
  className,
}: {
  id: string;
  title: string;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section aria-labelledby={id} className={cn("min-w-0 rounded-card border border-line bg-surface p-4 md:p-6", className)}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 id={id} className="flex items-center gap-2 font-display text-h3 text-ink">
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

export function MoneyPill({ amount, currency, hourly }: { amount: number; currency: string; hourly: boolean }) {
  const { t } = useTranslation();
  return (
    <span className="inline-flex shrink-0 rounded-control border border-money/25 bg-money-soft px-2 py-1">
      <MoneyPlate size="inline" amount={amount} currency={currency} suffix={hourly ? t("jobs.perHour") : undefined} />
    </span>
  );
}

export function AttentionCard({ item }: { item: AttentionItem }) {
  const { t } = useTranslation();
  const chip =
    item.kind === "applicants" ? (
      <span className="inline-flex h-7 items-center gap-1.5 rounded-control bg-warning-soft px-2 text-caption font-bold text-warning">
        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
        {t("dashboard.newApplicants").replace("{count}", String(item.count))}
      </span>
    ) : item.kind === "review" ? (
      <StatusChip kind="stage" value="AWAITING_REVIEW" label={t("dashboard.workerMarkedComplete")} />
    ) : (
      <StatusChip kind="job" value="IN_PROGRESS" />
    );
  const note =
    item.kind === "applicants" ? t("dashboard.applicantsNote") : item.kind === "review" ? t("dashboard.reviewNote") : t("dashboard.continueNote");
  const cta =
    item.kind === "applicants" ? t("dashboard.reviewApplicants") : item.kind === "review" ? t("dashboard.reviewAndPay") : t("dashboard.continueJob");

  return (
    <article className="rounded-card border border-line bg-canvas p-4 md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {chip}
          <h3 className="mt-2 line-clamp-2 break-words font-display text-[1.0625rem] font-semibold leading-snug text-ink md:text-h3">{item.title}</h3>
        </div>
        <MoneyPill amount={item.budget} currency={item.currency} hourly={item.hourly} />
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <p className="min-w-0 text-label text-ink-muted">{note}</p>
        <Link href={item.href} className={buttonClasses("primary", "default", "w-full sm:w-auto")}>
          {cta}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}

export function AttentionBadge({ count }: { count: number }) {
  const { t } = useTranslation();
  return <CountBadge count={count} label={t("dashboard.attentionCount").replace("{count}", String(count))} />;
}

export function Checklist({ items }: { items: readonly ChecklistItem[] }) {
  const { t } = useTranslation();
  const done = items.filter((i) => i.done).length;
  return (
    <DashboardCard
      id="first-steps-heading"
      title={t("dashboard.firstSteps")}
      aside={
        <span className="rounded-control bg-primary-soft px-2 py-1 text-caption font-bold text-primary tabular">
          {t("dashboard.stepsDone").replace("{done}", String(done)).replace("{total}", String(items.length))}
        </span>
      }
    >
      <div
        role="progressbar"
        aria-label={t("dashboard.firstSteps")}
        aria-valuemin={0}
        aria-valuemax={items.length}
        aria-valuenow={done}
        className="h-2 overflow-hidden rounded-full bg-sunken"
      >
        <div className="h-full rounded-full bg-primary" style={{ width: `${items.length ? (done / items.length) * 100 : 0}%` }} />
      </div>
      <ul className="mt-4 space-y-2">
        {items.map((item) => {
          const label = t(`dashboard.step.${item.key}`);
          return (
            <li key={item.key}>
              {item.done ? (
                <p className="flex min-h-[44px] items-center gap-3 px-1 text-body text-ink-muted">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-success" aria-hidden="true" />
                  <span className="line-through">{label}</span>
                  <span className="sr-only">{t("dashboard.stepCompleted")}</span>
                </p>
              ) : (
                <Link
                  href={item.href}
                  className="flex min-h-[44px] items-center gap-3 rounded-control px-1 text-body font-bold text-ink hover:bg-sunken"
                >
                  <Circle className="h-5 w-5 shrink-0 text-ink-subtle" aria-hidden="true" />
                  <span className="min-w-0 flex-1">{label}</span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </DashboardCard>
  );
}

/** Verification row: a success check only when verified, a warning icon otherwise. */
export function VerificationStatus({ verified, label }: { verified: boolean; label: string }) {
  const Icon = verified ? CheckCircle2 : CircleAlert;
  return (
    <p className="flex items-center gap-2">
      <Icon className={cn("h-4 w-4 shrink-0", verified ? "text-success" : "text-warning")} aria-hidden="true" />
      {label}
    </p>
  );
}

export function AccountCard({
  name,
  email,
  phone,
  location,
  emailVerified,
  phoneVerified,
  statusLabel,
}: {
  name: string;
  email: string;
  phone?: string | null;
  location: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  /** Only passed when the account is not simply active. */
  statusLabel?: string;
}) {
  const { t } = useTranslation();
  return (
    <DashboardCard id="account-heading" title={t("dashboard.account")}>
      <p className="break-words font-bold text-ink">{name}</p>
      <p className="break-all text-label text-ink-muted">{email}</p>
      <div className="mt-4 space-y-2 text-label text-ink">
        <VerificationStatus verified={emailVerified} label={emailVerified ? t("dashboard.emailVerified") : t("dashboard.emailNotVerified")} />
        <VerificationStatus
          verified={phoneVerified}
          label={phoneVerified ? t("dashboard.phoneVerified") : phone ? t("dashboard.phoneNotVerified") : t("dashboard.phoneNotAdded")}
        />
        {statusLabel ? (
          <p className="flex items-center gap-2">
            <CircleAlert className="h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
            {statusLabel}
          </p>
        ) : null}
        <p className="flex items-center gap-2 text-ink-muted">
          <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="min-w-0 break-words">{location}</span>
        </p>
      </div>
      <Link href="/profile" className={buttonClasses("secondary", "default", "mt-4 w-full")}>
        {t("dashboard.editProfile")}
      </Link>
    </DashboardCard>
  );
}
