"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Check, Copy, Gift, Share2, Sparkles, Users } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button, buttonClasses } from "@/components/ui/Button";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/QueryState";
import { useToast } from "@/components/ui/Toast";
import { referralsApi } from "@/lib/referrals-api";
import { buildReferralLink } from "@/lib/referral";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { signInPath } from "@/lib/auth-redirect";
import { errorMessage } from "@/lib/http";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { MyReferralsResponse } from "@/api/types";

const COPIED_RESET_MS = 2000;

function Stat({ value, label, tone }: { value: number; label: string; tone?: string }) {
  return (
    <div className="min-w-0 rounded-card border border-line bg-surface p-4 text-center md:p-5">
      <p className={cn("font-display text-h1 tabular", tone ?? "text-ink")}>{value}</p>
      <p className="mt-1 text-caption text-ink-muted">{label}</p>
    </div>
  );
}

export default function ReferralsPage() {
  const { isAuthenticated, firebaseToken, loading: authLoading } = useAuth();
  const { t, locale } = useTranslation();
  const { push } = useToast();

  const [data, setData] = useState<MyReferralsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [copied, setCopied] = useState(false);
  const retry = useCallback(() => setReloadKey((key) => key + 1), []);

  useEffect(() => {
    if (!firebaseToken) return;
    let isActive = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await referralsApi.getMyReferrals(firebaseToken);
        if (isActive) setData(result);
      } catch (err) {
        console.error("Failed to load referrals:", err);
        if (isActive) setError(errorMessage(err, t("referrals.errorLoad")));
      } finally {
        if (isActive) setLoading(false);
      }
    };
    void load();
    return () => {
      isActive = false;
    };
  }, [firebaseToken, reloadKey, t]);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), COPIED_RESET_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  if (authLoading) {
    return (
      <div className="mx-auto w-full max-w-content px-[var(--gutter)] py-8" role="status" aria-busy="true">
        <span className="sr-only">{t("common.loading")}</span>
        <Skeleton className="h-9 w-64" />
        <Skeleton className="mt-6 h-40 w-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="mx-auto w-full max-w-xl px-[var(--gutter)] py-12">
        <h1 className="sr-only">{t("referrals.heading")}</h1>
        <EmptyState
          icon={Gift}
          title={t("referrals.signInTitle")}
          description={t("referrals.signInDesc")}
          action={
            <Link href={signInPath("/referrals")} className={buttonClasses("primary")}>
              {t("nav.signIn")}
            </Link>
          }
        />
      </div>
    );
  }

  const referralLink = data ? buildReferralLink(data.referralCode) : "";
  const shareText = `${t("referrals.shareMessage")} ${referralLink}`;
  const steps = [1, 2, 3].map((n) => ({
    step: n,
    title: t(`referrals.step${n}Title`),
    desc: t(n === 3 ? "referrals.step3DescNeutral" : `referrals.step${n}Desc`),
  }));

  async function handleCopy() {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
    } catch (err) {
      console.error("Clipboard write failed:", err);
      push({ tone: "error", message: t("referrals.copyError") });
    }
  }

  async function handleShare() {
    if (!referralLink) return;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "work4u", text: t("referrals.shareMessage"), url: referralLink });
      } catch (err) {
        // The user closing the share sheet is not an error.
        if (!(err instanceof DOMException && err.name === "AbortError")) {
          console.error("Share failed:", err);
          push({ tone: "error", message: t("referrals.shareError") });
        }
      }
      return;
    }
    window.open(buildWhatsAppUrl("", shareText), "_blank", "noopener,noreferrer");
  }

  return (
    <div className="mx-auto w-full max-w-content px-[var(--gutter)] py-8 md:py-12">
      <header className="max-w-2xl">
        <h1 className="font-display text-h1 text-ink">{t("referrals.heading")}</h1>
        <p className="mt-2 text-body-lg text-ink-muted">{t("referrals.subtitleNeutral")}</p>
      </header>

      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div className="min-w-0 space-y-8">
          {loading ? (
            <Skeleton className="h-40 w-full" />
          ) : error ? (
            <ErrorState message={error} onRetry={retry} />
          ) : data ? (
            <>
              <section aria-labelledby="referral-link-heading" className="rounded-card border-2 border-primary bg-surface p-5 md:p-6">
                <h2 id="referral-link-heading" className="text-micro uppercase text-primary">
                  {t("referrals.yourLink")}
                </h2>
                <p className="mt-3 break-all rounded-control bg-sunken px-4 py-3 font-mono text-label font-normal text-ink">{referralLink}</p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <Button variant="secondary" onClick={handleCopy} className="sm:min-w-[140px]">
                    {copied ? <Check className="h-4 w-4 text-success" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
                    {copied ? t("referrals.copied") : t("referrals.copy")}
                  </Button>
                  <Button onClick={handleShare} className="sm:min-w-[140px]">
                    <Share2 className="h-4 w-4" aria-hidden="true" />
                    {t("referrals.share")}
                  </Button>
                </div>
                <span role="status" className="sr-only">
                  {copied ? t("referrals.copied") : ""}
                </span>
                {data.referredBy ? (
                  <p className="mt-4 text-caption text-ink-muted">
                    {t("referrals.joinedVia")} <span className="font-bold text-ink">{data.referredBy.name}</span>.
                  </p>
                ) : null}
              </section>

              <section aria-label={t("referrals.statsLabel")} className="grid grid-cols-3 gap-3 md:gap-4">
                <Stat value={data.stats.totalReferred} label={t("referrals.invited")} />
                <Stat value={data.stats.completed} label={t("referrals.completed")} tone="text-success" />
                <Stat value={data.stats.pending} label={t("referrals.pending")} tone="text-warning" />
              </section>

              <section aria-labelledby="referral-list-heading">
                <h2 id="referral-list-heading" className="flex items-center gap-2 font-display text-h3 text-ink">
                  <Users className="h-5 w-5 text-primary" aria-hidden="true" />
                  {t("referrals.yourReferrals")}
                </h2>
                <div className="mt-4">
                  {data.referrals.length === 0 ? (
                    <EmptyState icon={Sparkles} title={t("referrals.emptyTitle")} />
                  ) : (
                    <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
                      {data.referrals.map((referral) => {
                        const completed = referral.status === "COMPLETED";
                        return (
                          <li key={referral.id} className="flex items-center justify-between gap-3 px-4 py-3 md:px-5">
                            <div className="min-w-0">
                              <p className="truncate text-body font-bold text-ink">{referral.referredUser.name || t("referrals.newUser")}</p>
                              <p className="text-caption text-ink-muted">
                                {t("referrals.joined")} {new Date(referral.dateTimeCreated).toLocaleDateString(locale)}
                              </p>
                            </div>
                            <span
                              className={cn(
                                "inline-flex h-7 shrink-0 items-center rounded-control px-2 text-caption font-bold",
                                completed ? "bg-success-soft text-success" : "bg-warning-soft text-warning"
                              )}
                            >
                              {completed ? t("referrals.completed") : t("referrals.pending")}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </section>
            </>
          ) : null}
        </div>

        <section aria-labelledby="referral-how-heading" className="rounded-card border border-line bg-surface p-5 md:p-6">
          <h2 id="referral-how-heading" className="font-display text-h3 text-ink">
            {t("referrals.howItWorks")}
          </h2>
          <ol className="mt-4 space-y-5">
            {steps.map((item) => (
              <li key={item.step} className="flex gap-3">
                <span
                  aria-hidden="true"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-soft font-display text-label text-primary"
                >
                  {item.step}
                </span>
                <div className="min-w-0">
                  <h3 className="text-body font-bold text-ink">{item.title}</h3>
                  <p className="mt-0.5 text-label font-normal text-ink-muted">{item.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
