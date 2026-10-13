"use client";

import { useState } from "react";
import Link from "next/link";
import { Star, User } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";
import { EmptyState, Skeleton } from "@/components/ui/QueryState";
import { useTranslation } from "@/lib/i18n";
import { useAuth } from "@/context/AuthContext";
import { signInPath } from "@/lib/auth-redirect";
import { AccountTab } from "@/components/profile/AccountTab";
import { ReviewsTab } from "@/components/profile/ReviewsTab";
import { ProfileTabs, panelId, tabId, type ProfileTabItem } from "@/components/profile/ProfileTabs";
import { BackLink } from "@/components/ui/BackLink";

type TabId = "account" | "reviews";

export default function ProfilePage() {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>("account");

  // The auth check is async: wait for it before deciding the user is signed out.
  if (authLoading) {
    return (
      <div className="mx-auto w-full max-w-content px-[var(--gutter)] py-8" role="status" aria-busy="true">
        <span className="sr-only">{t("common.loading")}</span>
        <Skeleton className="h-9 w-56" />
        <Skeleton className="mt-6 h-11 w-full max-w-md" />
        <Skeleton className="mt-6 h-72 w-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-xl px-[var(--gutter)] py-12">
        <h1 className="sr-only">{t("profile.title")}</h1>
        <EmptyState
          icon={User}
          title={t("profile.signInRequiredTitle")}
          description={t("profile.signInRequiredDesc")}
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Link href={signInPath("/profile")} className={buttonClasses("primary")}>
                {t("nav.signIn")}
              </Link>
              <Link href="/signup" className={buttonClasses("secondary")}>
                {t("nav.getStarted")}
              </Link>
            </div>
          }
        />
      </div>
    );
  }

  const tabs: readonly ProfileTabItem<TabId>[] = [
    { id: "account", label: t("profile.accountSettingsTab"), icon: <User className="h-4 w-4" aria-hidden="true" /> },
    { id: "reviews", label: t("common.reviews"), icon: <Star className="h-4 w-4" aria-hidden="true" /> },
  ];

  return (
    <div className="mx-auto w-full max-w-content px-[var(--gutter)] py-6 md:py-10">
      <BackLink href="/dashboard" label={t("nav.backToDashboard")} className="mb-2" />
      <h1 className="font-display text-h1 text-ink">{t("profile.title")}</h1>
      <p className="mt-2 text-body text-ink-muted">{t("profile.subtitle")}</p>

      <div className="mt-6">
        <ProfileTabs tabs={tabs} active={activeTab} onChange={setActiveTab} label={t("profile.sectionsLabel")} />
      </div>

      <div
        role="tabpanel"
        id={panelId(activeTab)}
        aria-labelledby={tabId(activeTab)}
        tabIndex={0}
        className="mt-6 max-w-3xl rounded-card focus-visible:shadow-focus"
      >
        {activeTab === "account" ? <AccountTab user={user} /> : <ReviewsTab userId={user.id} />}
      </div>
    </div>
  );
}
