"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { companiesApi } from "@/lib/companies-api";
import { getSubscriptionStatus, type SubscriptionStatus } from "@/api/subscriptions";
import type { Company, RosterWorker, Shift } from "@/api/types";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import {
  Building2,
  Users,
  CalendarDays,
  CalendarClock,
  Wallet,
  MapPin,
  UserPlus,
  ArrowRight,
} from "lucide-react";

const STATUS_STYLES: Record<string, string> = {
  COMPLETED: "bg-emerald-50 text-emerald-700",
  IN_PROGRESS: "bg-blue-50 text-blue-700",
  OPEN: "bg-amber-50 text-amber-700",
  CANCELLED: "bg-red-50 text-red-700",
  DISPUTED: "bg-red-50 text-red-700",
};
const DEFAULT_STATUS_STYLE = "bg-amber-50 text-amber-700";

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatTimeRange(start: string | null, end: string | null, timeNotSetLabel: string): string {
  if (!start || !end) return timeNotSetLabel;
  return `${formatTime(start)} – ${formatTime(end)}`;
}

function formatStatusLabel(status: string): string {
  return status
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getInitials(name?: string | null): string {
  if (!name?.trim()) return "?";
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase() || "?";
}

export default function BusinessDashboardPage() {
  const router = useRouter();
  const { isAuthenticated, firebaseToken, loading: authLoading } = useAuth();
  const { t } = useTranslation();

  const QUICK_ACTIONS = [
    {
      href: "/business/schedule",
      title: t('biz.viewFullCalendar'),
      desc: t('biz.qaCalendarDesc'),
      icon: CalendarClock,
    },
    {
      href: "/business/roster",
      title: t('biz.qaManageRosterTitle'),
      desc: t('biz.qaManageRosterDesc'),
      icon: Users,
    },
    {
      href: "/business/roster",
      title: t('biz.qaAddWorkerTitle'),
      desc: t('biz.qaAddWorkerDesc'),
      icon: UserPlus,
    },
  ];

  const [company, setCompany] = useState<Company | null>(null);
  const [companyLoading, setCompanyLoading] = useState(true);

  const [subStatus, setSubStatus] = useState<SubscriptionStatus | null>(null);
  const [subStatusLoading, setSubStatusLoading] = useState(true);

  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [roster, setRoster] = useState<RosterWorker[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/signin?redirect=/business/dashboard");
    }
  }, [authLoading, isAuthenticated, router]);

  const loadCompany = useCallback(async () => {
    if (!firebaseToken) return;
    setCompanyLoading(true);
    try {
      const result = await companiesApi.getMyCompany(firebaseToken);
      setCompany(result);
    } catch (error) {
      console.error("Failed to load company:", error);
      setCompany(null);
    } finally {
      setCompanyLoading(false);
    }
  }, [firebaseToken]);

  useEffect(() => {
    if (!firebaseToken) return;
    loadCompany();
  }, [firebaseToken, loadCompany]);

  useEffect(() => {
    let isActive = true;

    const load = async () => {
      if (!firebaseToken) return;
      setSubStatusLoading(true);
      try {
        const data = await getSubscriptionStatus(firebaseToken);
        if (isActive) setSubStatus(data);
      } catch (error) {
        console.error("Failed to load subscription status:", error);
        if (isActive) setSubStatus(null);
      } finally {
        if (isActive) setSubStatusLoading(false);
      }
    };

    load();

    return () => {
      isActive = false;
    };
  }, [firebaseToken]);

  useEffect(() => {
    if (!company || !firebaseToken) return;

    let cancelled = false;
    async function loadStats() {
      setStatsLoading(true);
      try {
        const from = startOfDay(new Date()).toISOString();
        const to = addDays(startOfDay(new Date()), 7).toISOString();
        const [rosterResult, shiftsResult] = await Promise.all([
          companiesApi.listRoster(company!.id, firebaseToken!),
          companiesApi.listShifts(company!.id, from, to, firebaseToken!),
        ]);
        if (cancelled) return;
        setRoster(rosterResult);
        setShifts(shiftsResult);
      } catch (error) {
        console.error("Failed to load dashboard stats:", error);
      } finally {
        if (!cancelled) setStatsLoading(false);
      }
    }

    loadStats();
    return () => {
      cancelled = true;
    };
  }, [company, firebaseToken]);

  async function handleCreateCompany(event: React.FormEvent) {
    event.preventDefault();
    if (!firebaseToken || !name.trim()) return;

    setCreating(true);
    setCreateError(null);
    try {
      const created = await companiesApi.createCompany(
        { name: name.trim(), industry: industry.trim() || undefined },
        firebaseToken
      );
      setCompany(created);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : t('biz.createCompanyError'));
    } finally {
      setCreating(false);
    }
  }

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-10 w-10 rounded-full border-2 border-[hsl(var(--brand))] border-t-transparent animate-spin" />
      </div>
    );
  }

  const hasBusinessPlan =
    subStatus?.plan === "business" && (subStatus.status === "active" || subStatus.status === "trialing");

  const today = new Date();
  const shiftsToday = shifts
    .filter((s) => s.scheduledStartAt && isSameDay(new Date(s.scheduledStartAt), today))
    .sort(
      (a, b) => new Date(a.scheduledStartAt as string).getTime() - new Date(b.scheduledStartAt as string).getTime()
    );
  const shiftsThisWeek = shifts.length;
  const pendingPayments = shifts.filter(
    (s) => s.lifecycleStatus === "COMPLETED" && !s.paymentMarkedPaidAt && !s.paymentConfirmedAt
  );

  const STATS = [
    { label: t('biz.statRosterSize'), value: roster.length, icon: Users },
    { label: t('biz.statShiftsToday'), value: shiftsToday.length, icon: CalendarDays },
    { label: t('biz.statShiftsWeek'), value: shiftsThisWeek, icon: CalendarClock },
    { label: t('biz.statPendingPayments'), value: pendingPayments.length, icon: Wallet },
  ];

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-5xl mx-auto px-4 py-10 sm:py-14">
        {companyLoading || subStatusLoading ? (
          <div className="space-y-4">
            <div className="h-8 w-64 rounded-lg bg-muted animate-pulse" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />
              ))}
            </div>
          </div>
        ) : !company && !hasBusinessPlan ? (
          <div className="max-w-md mx-auto rounded-2xl border border-outline bg-card p-8 shadow-soft text-center">
            <div className="w-10 h-10 rounded-xl bg-brand-soft flex items-center justify-center mb-4 mx-auto">
              <Building2 size={18} className="text-brand" />
            </div>
            <h1 className="text-xl font-bold text-ink mb-1.5">{t('biz.subscribeTitle')}</h1>
            <p className="text-sm text-ink-muted mb-6">
              {t('biz.subscribeDesc')}
            </p>
            <Button asChild size="lg" className="w-full">
              <Link href="/pricing?intent=business">{t('biz.viewBusinessPlan')}</Link>
            </Button>
          </div>
        ) : !company ? (
          <div className="max-w-md mx-auto rounded-2xl border border-outline bg-card p-8 shadow-soft">
            <div className="w-10 h-10 rounded-xl bg-brand-soft flex items-center justify-center mb-4">
              <Building2 size={18} className="text-brand" />
            </div>
            <h1 className="text-xl font-bold text-ink mb-1.5">{t('biz.createCompanyTitle')}</h1>
            <p className="text-sm text-ink-muted mb-6">
              {t('biz.createCompanyDesc')}
            </p>
            <form onSubmit={handleCreateCompany} className="space-y-4">
              <div>
                <label
                  htmlFor="company-name"
                  className="block text-xs font-semibold text-ink-subtle uppercase tracking-wide mb-1.5"
                >
                  {t('biz.companyNameLabel')}
                </label>
                <input
                  id="company-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('biz.companyNamePlaceholder')}
                  className="field-shell w-full"
                />
              </div>
              <div>
                <label
                  htmlFor="company-industry"
                  className="block text-xs font-semibold text-ink-subtle uppercase tracking-wide mb-1.5"
                >
                  {t('biz.industryLabel')} <span className="normal-case font-normal text-ink-subtle">{t('biz.optional')}</span>
                </label>
                <input
                  id="company-industry"
                  type="text"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  placeholder={t('biz.industryPlaceholder')}
                  className="field-shell w-full"
                />
              </div>
              {createError && <p className="text-xs text-red-600">{createError}</p>}
              <Button type="submit" size="lg" className="w-full" disabled={creating || !name.trim()}>
                {creating ? t('biz.creating') : t('biz.createCompanyButton')}
              </Button>
            </form>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="mb-8">
              <p className="text-sm font-semibold text-brand uppercase tracking-wider mb-1">
                {t('business.badge')}
              </p>
              <h1 className="text-3xl font-bold text-ink">{company.name}</h1>
              {company.industry && <p className="text-sm text-ink-muted mt-1">{company.industry}</p>}
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
              {STATS.map(({ label, value, icon: Icon }) => (
                <div key={label} className="rounded-2xl border border-outline bg-card p-5 flex flex-col gap-3">
                  <div className="w-8 h-8 rounded-xl bg-brand-soft flex items-center justify-center">
                    <Icon size={16} className="text-brand" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-ink">{statsLoading ? "–" : value}</p>
                    <p className="text-xs text-ink-subtle mt-0.5">{label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Today's shifts */}
            <section className="mb-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-ink">{t('biz.todaysShifts')}</h2>
                <Link href="/business/schedule" className="text-sm font-semibold text-brand hover:underline">
                  {t('biz.viewFullCalendar')}
                </Link>
              </div>

              {statsLoading ? (
                <div className="space-y-2">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-16 rounded-2xl bg-muted animate-pulse" />
                  ))}
                </div>
              ) : shiftsToday.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-outline bg-card py-14 text-center px-4">
                  <div className="w-12 h-12 rounded-2xl bg-brand-soft flex items-center justify-center">
                    <CalendarDays size={20} className="text-brand" />
                  </div>
                  <p className="text-sm font-semibold text-ink">{t('biz.noShiftsToday')}</p>
                  <p className="text-xs text-ink-muted max-w-xs">
                    {t('biz.noShiftsTodayDesc')}
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border border-outline bg-card divide-y divide-[hsl(var(--outline))] overflow-hidden">
                  {shiftsToday.map((shift) => (
                    <div
                      key={shift.id}
                      className="flex flex-col sm:flex-row sm:items-center gap-3 p-4"
                    >
                      <div className="flex items-center gap-3 sm:w-52 shrink-0">
                        <div className="w-9 h-9 rounded-full bg-brand-soft flex items-center justify-center text-xs font-bold text-brand shrink-0">
                          {getInitials(shift.worker?.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-ink truncate">
                            {shift.worker?.name ?? t('biz.unassigned')}
                          </p>
                          <p className="text-xs text-ink-subtle">
                            {formatTimeRange(shift.scheduledStartAt, shift.scheduledEndAt, t('biz.timeNotSet'))}
                          </p>
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-ink truncate">{shift.title}</p>
                        <p className="text-xs text-ink-muted truncate flex items-center gap-1">
                          <MapPin size={12} className="shrink-0" />
                          {shift.location}
                        </p>
                      </div>

                      <span
                        className={cn(
                          "shrink-0 self-start sm:self-center rounded-full px-2.5 py-1 text-xs font-semibold",
                          STATUS_STYLES[shift.lifecycleStatus] ?? DEFAULT_STATUS_STYLE
                        )}
                      >
                        {formatStatusLabel(shift.lifecycleStatus)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Quick actions */}
            <section>
              <h2 className="text-lg font-bold text-ink mb-4">{t('biz.quickActions')}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {QUICK_ACTIONS.map(({ href, title, desc, icon: Icon }, i) => (
                  <Link
                    key={`${href}-${i}`}
                    href={href}
                    className="group flex items-start gap-3.5 rounded-2xl border border-outline bg-card p-5 transition-colors hover:border-[hsl(var(--brand))]"
                  >
                    <div className="shrink-0 mt-0.5 w-9 h-9 rounded-xl bg-brand-soft flex items-center justify-center">
                      <Icon size={16} className="text-brand" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-ink mb-0.5">{title}</p>
                      <p className="text-xs text-ink-muted leading-relaxed">{desc}</p>
                    </div>
                    <ArrowRight
                      size={14}
                      className="mt-1 shrink-0 text-ink-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-brand"
                    />
                  </Link>
                ))}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
