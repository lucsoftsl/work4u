"use client";

import { useAuth } from '@/context/AuthContext';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Settings, Trophy, Scroll, BarChart3, ArrowRight, Users, Flag, Building2, AlertTriangle, ShieldAlert, Newspaper, Phone, Languages } from 'lucide-react';
import { fetchAdminStats, type AdminStats } from '@/lib/admin-api';
import { useTranslation } from '@/lib/i18n';

export default function AdminDashboard() {
    const { t } = useTranslation();
    const { user, firebaseToken } = useAuth();
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [statsLoading, setStatsLoading] = useState(true);

    useEffect(() => {
        if (!firebaseToken || user?.userType !== 'ADMIN') return;
        fetchAdminStats(firebaseToken)
            .then(setStats)
            .catch((err) => console.error('Failed to load admin stats:', err))
            .finally(() => setStatsLoading(false));
    }, [firebaseToken, user?.userType]);

    if (user?.userType !== 'ADMIN') {
        return null;
    }

    const openReports = (stats?.reports.byStatus.OPEN ?? 0) + (stats?.reports.byStatus.REVIEWING ?? 0);
    const totalUsers = Object.values(stats?.users.byType ?? {}).reduce((a, b) => a + b, 0);
    const totalJobs = Object.values(stats?.jobs.byLifecycleStatus ?? {}).reduce((a, b) => a + b, 0);

    const adminModules = [
        {
            title: t('adminUsers.title'),
            description: t('adminUsers.subtitle'),
            icon: Users,
            href: '/admin/users',
            color: 'from-primary to-accent',
        },
        {
            title: t('adminReports.title'),
            description: t('adminReports.subtitle'),
            icon: Flag,
            href: '/admin/reports',
            color: 'from-red-500 to-orange-500',
            badge: openReports > 0 ? openReports : undefined,
        },
        {
            title: t('adminJobs.title'),
            description: t('adminJobs.subtitle'),
            icon: ShieldAlert,
            href: '/admin/jobs',
            color: 'from-red-500 to-amber-500',
        },
        {
            title: t('adminBlog.title'),
            description: t('adminBlog.subtitle'),
            icon: Newspaper,
            href: '/admin/blog',
            color: 'from-primary to-accent',
        },
        {
            title: t('adminContact.title'),
            description: t('adminContact.subtitle'),
            icon: Phone,
            href: '/admin/contact',
            color: 'from-secondary to-primary',
        },
        {
            title: t('admin.achievements'),
            description: t('admin.achievementsDesc'),
            icon: Trophy,
            href: '/admin/achievements',
            color: 'from-primary to-secondary',
        },
        {
            title: t('admin.quests'),
            description: t('admin.questsDesc'),
            icon: Scroll,
            href: '/admin/quests',
            color: 'from-secondary to-accent',
        },
        {
            title: t('adminTranslations.title'),
            description: t('adminTranslations.subtitle'),
            icon: Languages,
            href: '/admin/translations',
            color: 'from-accent to-secondary',
        },
        {
            title: t('admin.analytics'),
            description: t('admin.analyticsDesc'),
            icon: BarChart3,
            href: '/admin/analytics',
            color: 'from-accent to-primary',
            disabled: true,
        },
        {
            title: t('admin.settings'),
            description: t('admin.settingsDesc'),
            icon: Settings,
            href: '/admin/settings',
            color: 'from-primary via-secondary to-accent',
            disabled: true,
        },
    ];

    return (
        <div className="min-h-screen bg-card">
            <div className="max-w-7xl mx-auto px-4 py-16">
                {/* Header */}
                <div className="mb-16">
                    <h1 className="text-5xl font-bold text-foreground mb-4">{t('admin.dashboard')}</h1>
                    <p className="text-xl text-muted-foreground">
                        {t('adminDashboard.subtitle')}
                    </p>
                </div>

                {/* Open complaints callout */}
                {!statsLoading && openReports > 0 && (
                    <Link
                        href="/admin/reports"
                        className="mb-8 flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-6 py-4 transition-colors hover:bg-red-100"
                    >
                        <div className="flex items-center gap-3">
                            <AlertTriangle className="h-5 w-5 text-red-600" />
                            <p className="text-sm font-semibold text-red-800">
                                {openReports} {openReports === 1 ? t('adminDashboard.openComplaintSingular') : t('adminDashboard.openComplaintsPlural')}
                            </p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-red-600" />
                    </Link>
                )}

                {/* Admin Modules Grid */}
                <div className="grid md:grid-cols-2 gap-6 mb-12">
                    {adminModules.map((module) => {
                        const Icon = module.icon;
                        return (
                            <Link
                                key={module.href}
                                href={module.disabled ? '#' : module.href}
                                className={module.disabled ? 'cursor-not-allowed opacity-50' : ''}
                            >
                                <div
                                    className={`
                    relative h-full rounded-xl border border-border p-8
                    bg-gradient-to-br ${module.color} bg-opacity-5
                    hover:border-primary/50 hover:bg-opacity-10
                    transition-all duration-300 group
                    ${module.disabled ? '' : 'hover:shadow-lg hover:shadow-primary/20'}
                  `}
                                >
                                    {module.badge !== undefined && (
                                        <span className="absolute -top-2 -right-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-red-600 px-1.5 text-xs font-bold text-white">
                                            {module.badge}
                                        </span>
                                    )}
                                    <div className="flex items-start justify-between mb-6">
                                        <div
                                            className={`
                        p-3 rounded-lg bg-gradient-to-br ${module.color}
                        ${module.disabled ? 'opacity-50' : ''}
                      `}
                                        >
                                            <Icon className="w-6 h-6 text-white" />
                                        </div>
                                        {!module.disabled && (
                                            <ArrowRight className="w-5 h-5 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                                        )}
                                    </div>

                                    <h3 className="text-xl font-bold text-foreground mb-2">{module.title}</h3>
                                    <p className="text-sm text-muted-foreground mb-4">{module.description}</p>

                                    {module.disabled && (
                                        <span className="text-xs px-2 py-1 bg-yellow-900/20 text-yellow-400 rounded">
                                            {t('adminDashboard.comingSoon')}
                                        </span>
                                    )}
                                </div>
                            </Link>
                        );
                    })}
                </div>

                {/* Platform Overview */}
                <div className="bg-background border border-border rounded-xl p-8 mb-8">
                    <h2 className="text-2xl font-bold text-foreground mb-6">{t('adminDashboard.platformOverview')}</h2>
                    {statsLoading ? (
                        <div className="grid md:grid-cols-4 gap-6">
                            {[0, 1, 2, 3].map((i) => (
                                <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
                            ))}
                        </div>
                    ) : (
                        <div className="grid md:grid-cols-4 gap-6">
                            <div className="text-center">
                                <div className="text-3xl font-bold text-primary mb-2">{totalUsers}</div>
                                <p className="text-sm text-muted-foreground">{t('adminDashboard.totalUsers')}</p>
                                <p className="text-xs text-muted-foreground mt-1">+{stats?.users.newLast7Days ?? 0} {t('adminDashboard.newThisWeek')}</p>
                            </div>
                            <div className="text-center">
                                <div className="text-3xl font-bold text-secondary mb-2">{totalJobs}</div>
                                <p className="text-sm text-muted-foreground">{t('adminDashboard.marketplaceJobs')}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {stats?.jobs.byLifecycleStatus.IN_PROGRESS ?? 0} {t('adminDashboard.inProgress')}
                                </p>
                            </div>
                            <div className="text-center">
                                <div className="text-3xl font-bold text-accent mb-2">{stats?.business.companies ?? 0}</div>
                                <p className="text-sm text-muted-foreground">{t('adminDashboard.businessAccounts')}</p>
                                <p className="text-xs text-muted-foreground mt-1">{stats?.business.shifts ?? 0} {t('adminDashboard.shiftsScheduled')}</p>
                            </div>
                            <div className="text-center">
                                <div className="text-3xl font-bold text-secondary mb-2">{stats?.proSubscribers ?? 0}</div>
                                <p className="text-sm text-muted-foreground">{t('adminDashboard.proSubscribers')}</p>
                            </div>
                        </div>
                    )}
                    {!statsLoading && (stats?.jobs.disputedCount ?? 0) > 0 && (
                        <div className="mt-6 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">
                            <AlertTriangle className="h-4 w-4" />
                            {stats?.jobs.disputedCount} {stats?.jobs.disputedCount === 1 ? t('adminDashboard.jobDisputedSingular') : t('adminDashboard.jobsDisputedPlural')}
                        </div>
                    )}
                </div>

                {/* Quick links */}
                <div className="flex flex-wrap gap-3">
                    <Link
                        href="/business"
                        className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
                    >
                        <Building2 className="h-4 w-4 text-primary" />
                        {t('adminDashboard.work4uForBusiness')}
                    </Link>
                </div>
            </div>
        </div>
    );
}
