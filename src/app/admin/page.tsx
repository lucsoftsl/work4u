"use client";

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { Settings, Trophy, Scroll, BarChart3, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function AdminDashboard() {
    const { user } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (user && user.userType !== 'ADMIN') {
            router.push('/');
        }
    }, [user, router]);

    if (user?.userType !== 'ADMIN') {
        return null;
    }

    const adminModules = [
        {
            title: 'Manage Achievements',
            description: 'Create, edit, and manage gamification achievements',
            icon: Trophy,
            href: '/admin/achievements',
            color: 'from-primary to-secondary',
        },
        {
            title: 'Manage Quests',
            description: 'Create, edit, and manage daily, weekly, and main quests',
            icon: Scroll,
            href: '/admin/quests',
            color: 'from-secondary to-accent',
        },
        {
            title: 'Gamification Analytics',
            description: 'View user progress and gamification statistics',
            icon: BarChart3,
            href: '/admin/analytics',
            color: 'from-accent to-primary',
            disabled: true,
        },
        {
            title: 'System Settings',
            description: 'Configure gamification system parameters and rules',
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
                    <h1 className="text-5xl font-bold text-foreground mb-4">Admin Dashboard</h1>
                    <p className="text-xl text-muted-foreground">
                        Manage gamification system, achievements, and quests
                    </p>
                </div>

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
                    h-full rounded-xl border border-border p-8 
                    bg-gradient-to-br ${module.color} bg-opacity-5
                    hover:border-primary/50 hover:bg-opacity-10 
                    transition-all duration-300 group
                    ${module.disabled ? '' : 'hover:shadow-lg hover:shadow-primary/20'}
                  `}
                                >
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
                                            Coming Soon
                                        </span>
                                    )}
                                </div>
                            </Link>
                        );
                    })}
                </div>

                {/* Quick Stats */}
                <div className="bg-background border border-border rounded-xl p-8">
                    <h2 className="text-2xl font-bold text-foreground mb-6">System Overview</h2>
                    <div className="grid md:grid-cols-4 gap-6">
                        <div className="text-center">
                            <div className="text-3xl font-bold text-primary mb-2">16</div>
                            <p className="text-sm text-muted-foreground">Total Achievements</p>
                        </div>
                        <div className="text-center">
                            <div className="text-3xl font-bold text-secondary mb-2">12</div>
                            <p className="text-sm text-muted-foreground">Active Quests</p>
                        </div>
                        <div className="text-center">
                            <div className="text-3xl font-bold text-accent mb-2">5</div>
                            <p className="text-sm text-muted-foreground">Quest Types</p>
                        </div>
                        <div className="text-center">
                            <div className="text-3xl font-bold text-secondary mb-2">5</div>
                            <p className="text-sm text-muted-foreground">Rarity Levels</p>
                        </div>
                    </div>
                </div>

                {/* Documentation */}
                <div className="mt-12 bg-primary/10 border border-primary/20 rounded-xl p-8">
                    <h3 className="text-lg font-bold text-foreground mb-3">API Documentation</h3>
                    <p className="text-muted-foreground mb-4">
                        For backend integration, refer to the API_SCHEMAS.md file in your project root for:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                        <li>User API response with gamification stats</li>
                        <li>Achievement configuration schema</li>
                        <li>Quest templates configuration</li>
                        <li>Backend event tracking system</li>
                        <li>Database schema recommendations</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
