"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { referralsApi } from "@/lib/referrals-api";
import { buildReferralLink } from "@/lib/referral";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { useTranslation } from "@/lib/i18n";
import type { MyReferralsResponse } from "@/api/types";
import { Check, Copy, Gift, MessageCircle, Sparkles, Users } from "lucide-react";

export default function ReferralsPage() {
  const router = useRouter();
  const { isAuthenticated, firebaseToken, loading: authLoading } = useAuth();
  const { t } = useTranslation();

  const [data, setData] = useState<MyReferralsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.push("/signin?redirect=/referrals");
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!firebaseToken) return;

    const load = async () => {
      setLoading(true);
      try {
        const result = await referralsApi.getMyReferrals(firebaseToken);
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : t('referrals.errorLoad'));
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [firebaseToken, t]);

  if (authLoading || !isAuthenticated) {
    return null;
  }

  const referralLink = data ? buildReferralLink(data.referralCode) : "";
  const steps = [
    { step: "1", title: t('referrals.step1Title'), desc: t('referrals.step1Desc') },
    { step: "2", title: t('referrals.step2Title'), desc: t('referrals.step2Desc') },
    { step: "3", title: t('referrals.step3Title'), desc: t('referrals.step3Desc') },
  ];

  async function handleCopy() {
    if (!referralLink) return;
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-3xl mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-brand/10 text-brand rounded-full px-4 py-1.5 text-sm font-medium mb-4">
            <Gift size={14} />
            {t('referrals.inviteEarn')}
          </div>
          <h1 className="text-4xl font-bold text-ink mb-3">{t('referrals.heading')}</h1>
          <p className="text-ink-muted text-lg max-w-md mx-auto">
            {t('referrals.subtitle')}
          </p>
        </div>

        {/* How it works */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          {steps.map((item) => (
            <div key={item.step} className="rounded-2xl border border-outline bg-card p-5">
              <div className="w-7 h-7 rounded-full bg-brand/10 text-brand text-xs font-bold flex items-center justify-center mb-3">
                {item.step}
              </div>
              <p className="text-sm font-semibold text-ink mb-1">{item.title}</p>
              <p className="text-xs text-ink-muted leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="h-40 rounded-2xl bg-muted animate-pulse mb-10" />
        ) : error ? (
          <p className="text-red-600 font-semibold mb-10">{error}</p>
        ) : data ? (
          <>
            {/* Referral code / link card */}
            <div className="rounded-2xl border-2 border-brand bg-card p-6 mb-10">
              <p className="text-sm font-semibold text-brand uppercase tracking-wider mb-3">{t('referrals.yourLink')}</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1 rounded-xl bg-muted px-4 py-3 text-sm text-ink font-mono truncate">
                  {referralLink}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleCopy} className="whitespace-nowrap">
                    {copied ? <Check size={15} className="text-success" /> : <Copy size={15} />}
                    {copied ? t('referrals.copied') : t('referrals.copy')}
                  </Button>
                  <Button asChild className="whitespace-nowrap">
                    <a
                      href={buildWhatsAppUrl("", `${t('referrals.shareMessage')} ${referralLink}`)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <MessageCircle size={15} />
                      {t('referrals.share')}
                    </a>
                  </Button>
                </div>
              </div>
              {data.referredBy && (
                <p className="mt-4 text-xs text-ink-subtle">
                  {t('referrals.joinedVia')} <span className="font-semibold">{data.referredBy.name}</span>.
                </p>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-10">
              <div className="rounded-2xl border border-outline bg-card p-5 text-center">
                <p className="text-3xl font-bold text-ink">{data.stats.totalReferred}</p>
                <p className="text-xs text-ink-muted mt-1">{t('referrals.invited')}</p>
              </div>
              <div className="rounded-2xl border border-outline bg-card p-5 text-center">
                <p className="text-3xl font-bold text-success">{data.stats.completed}</p>
                <p className="text-xs text-ink-muted mt-1">{t('referrals.completed')}</p>
              </div>
              <div className="rounded-2xl border border-outline bg-card p-5 text-center">
                <p className="text-3xl font-bold text-amber-500">{data.stats.pending}</p>
                <p className="text-xs text-ink-muted mt-1">{t('referrals.pending')}</p>
              </div>
            </div>

            {/* Referral list */}
            <div>
              <h2 className="text-lg font-bold text-ink mb-4 flex items-center gap-2">
                <Users size={18} className="text-brand" />
                {t('referrals.yourReferrals')}
              </h2>
              {data.referrals.length === 0 ? (
                <div className="rounded-2xl border border-outline bg-card p-8 text-center">
                  <Sparkles size={24} className="mx-auto mb-3 text-ink-subtle" />
                  <p className="text-sm text-ink-muted">
                    {t('referrals.emptyTitle')}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-outline rounded-2xl border border-outline overflow-hidden">
                  {data.referrals.map((referral) => (
                    <div key={referral.id} className="flex items-center justify-between gap-3 px-5 py-4 bg-card">
                      <div>
                        <p className="text-sm font-semibold text-ink">{referral.referredUser.name || t('referrals.newUser')}</p>
                        <p className="text-xs text-ink-subtle">
                          {t('referrals.joined')} {new Date(referral.dateTimeCreated).toLocaleDateString()}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          referral.status === "COMPLETED"
                            ? "bg-green-50 text-green-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {referral.status === "COMPLETED" ? t('referrals.completed') : t('referrals.pending')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : null}
      </main>

    </div>
  );
}
