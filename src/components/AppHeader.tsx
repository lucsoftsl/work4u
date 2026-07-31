"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/lib/i18n';
import { getSubscriptionStatus, type SubscriptionStatus } from '@/api/subscriptions';
import { ChatHeaderIcon } from "@/components/ChatHeaderIcon";
import { XPBar } from '@/components/gamification/XPBar';
import { BrandMark } from '@/components/BrandMark';
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Briefcase, Building2, Gift, LayoutDashboard, Menu, Settings, User, Users, X, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_LINKS = [
    { href: '/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard },
    { href: '/my-jobs', labelKey: 'myJobs.title', icon: Briefcase },
    { href: '/workers', labelKey: 'nav.services', icon: Users },
    { href: '/referrals', labelKey: 'nav.invite', icon: Gift },
    { href: '/business', labelKey: 'nav.forBusiness', icon: Building2 },
] as const;

export function AppHeader() {
    const pathname = usePathname();
    const { t } = useTranslation();
    const { isAuthenticated, user, firebaseToken } = useAuth();
    const [menuOpen, setMenuOpen] = useState(false);
    const [subStatus, setSubStatus] = useState<SubscriptionStatus | null>(null);

    useEffect(() => {
        let isActive = true;

        const load = async () => {
            if (!isAuthenticated || !firebaseToken) {
                if (isActive) setSubStatus(null);
                return;
            }
            try {
                const data = await getSubscriptionStatus(firebaseToken);
                if (isActive) setSubStatus(data);
            } catch {
                if (isActive) setSubStatus(null);
            }
        };

        load();

        return () => {
            isActive = false;
        };
    }, [isAuthenticated, firebaseToken]);

    const currentPlan =
        subStatus?.status === 'active' || subStatus?.status === 'trialing' ? subStatus.plan : 'free';
    const isPaid = currentPlan !== 'free';
    const planLabel = currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1);

    // Don't show header on public marketing and auth onboarding screens, or
    // the full-bleed nearby-workers map (it renders its own compact top bar)
    if (
        pathname === '/' ||
        pathname.startsWith('/signup') ||
        pathname.startsWith('/signin') ||
        pathname.endsWith('/nearby-pros')
    ) {
        return null;
    }

    return (
        <header className="sticky top-0 z-30 flex-shrink-0 border-b border-outline/80 bg-[#eef2f6]/95 backdrop-blur">
            <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between gap-4">
                    <BrandMark subtitle="Workspace" />

                    {isAuthenticated && (
                        <div className="flex items-center gap-2 lg:gap-3">
                            {NAV_LINKS.map(({ href, labelKey, icon: Icon }) => (
                                <Link
                                    key={href}
                                    href={href}
                                    className="hidden shrink-0 items-center gap-2 rounded-full border border-outline bg-white px-4 py-2 text-sm font-semibold text-[#26445e] transition-colors hover:bg-[#f7fafc] lg:inline-flex"
                                >
                                    <Icon className="h-4 w-4 text-brand" />
                                    {t(labelKey)}
                                </Link>
                            ))}
                            {isPaid ? (
                                <Link
                                    href="/pricing"
                                    className="hidden shrink-0 items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-700 transition-colors hover:bg-amber-100 lg:inline-flex"
                                >
                                    <Zap className="h-4 w-4" />
                                    {planLabel}
                                </Link>
                            ) : (
                                <Link
                                    href="/pricing"
                                    className="hidden shrink-0 items-center gap-1.5 rounded-full border border-brand/30 bg-brand/5 px-4 py-2 text-sm font-bold text-brand transition-colors hover:bg-brand/10 lg:inline-flex"
                                >
                                    <Zap className="h-4 w-4" />
                                    {t('nav.upgrade')}
                                </Link>
                            )}
                            <Link
                                href="/profile"
                                className="inline-flex shrink-0 items-center gap-2 rounded-full border border-outline bg-white px-4 py-2 text-sm font-semibold text-[#26445e] transition-colors hover:bg-[#f7fafc]"
                            >
                                <User className="h-4 w-4 text-brand" />
                                <span className="hidden sm:inline">{t('nav.profile')}</span>
                            </Link>
                            {user?.userType === 'ADMIN' && (
                                <Link
                                    href="/admin"
                                    className="hidden shrink-0 items-center gap-2 rounded-full border border-[#cfe0ea] bg-[#e8f3f7] px-4 py-2 text-sm font-semibold text-[#215b72] transition-colors hover:bg-[#dcecf2] sm:inline-flex"
                                    title={t('admin.dashboard')}
                                >
                                    <Settings className="h-4 w-4" />
                                    {t('nav.admin')}
                                </Link>
                            )}
                            <ChatHeaderIcon />
                            <button
                                onClick={() => setMenuOpen((open) => !open)}
                                aria-label={menuOpen ? t('nav.closeMenu') : t('nav.openMenu')}
                                aria-expanded={menuOpen}
                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-outline bg-white text-[#26445e] transition-colors hover:bg-[#f7fafc] lg:hidden"
                            >
                                {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                            </button>
                        </div>
                    )}
                </div>

                {/* Mobile / tablet nav panel — covers everything collapsed below lg */}
                {isAuthenticated && menuOpen && (
                    <div className="mt-3 grid grid-cols-1 gap-1.5 rounded-3xl border border-outline/70 bg-white p-3 shadow-soft sm:grid-cols-2 lg:hidden">
                        {NAV_LINKS.map(({ href, labelKey, icon: Icon }) => (
                            <Link
                                key={href}
                                href={href}
                                onClick={() => setMenuOpen(false)}
                                className={cn(
                                    "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-[#26445e] transition-colors hover:bg-[#f4f8fb]",
                                    pathname === href && "bg-[#f4f8fb]"
                                )}
                            >
                                <Icon className="h-4 w-4 text-brand" />
                                {t(labelKey)}
                            </Link>
                        ))}
                        <Link
                            href="/pricing"
                            onClick={() => setMenuOpen(false)}
                            className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-brand transition-colors hover:bg-[#f4f8fb]"
                        >
                            <Zap className="h-4 w-4" />
                            {isPaid ? planLabel : t('nav.upgrade')}
                        </Link>
                        {user?.userType === 'ADMIN' && (
                            <Link
                                href="/admin"
                                onClick={() => setMenuOpen(false)}
                                className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-[#215b72] transition-colors hover:bg-[#f4f8fb] sm:hidden"
                            >
                                <Settings className="h-4 w-4" />
                                {t('nav.admin')}
                            </Link>
                        )}
                    </div>
                )}

                {/* XP Bar for authenticated users */}
                {isAuthenticated && (
                    <div className="mt-3 rounded-3xl border border-outline/70 bg-white px-4 py-3 shadow-soft">
                        <XPBar />
                    </div>
                )}
            </div>
        </header>
    );
}
