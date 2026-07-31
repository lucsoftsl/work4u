"use client";

import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { Coins, Zap, Target, Trophy, Flame, Briefcase } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

export function PlayerStats() {
    const { t } = useTranslation();
    const { player } = useSelector((state: RootState) => state.gamification);

    const stats = [
        {
            label: t('gamification.gold'),
            value: player.gold.toLocaleString(),
            icon: Coins,
            color: 'text-secondary',
        },
        {
            label: t('gamification.level'),
            value: player.level,
            icon: Zap,
            color: 'text-primary',
        },
        {
            label: t('gamification.quests'),
            value: `${player.activeQuests}/${player.completedQuests}`,
            icon: Target,
            color: 'text-accent',
        },
        {
            label: t('gamification.achievements'),
            value: player.achievements,
            icon: Trophy,
            color: 'text-rarity-legendary',
        },
        {
            label: t('gamification.streak'),
            value: `${player.streak} ${t('gamification.streakDays')}`,
            icon: Flame,
            color: 'text-orange-500',
        },
        {
            label: t('gamification.jobsCompleted'),
            value: player.completedJobs,
            icon: Briefcase,
            color: 'text-emerald-600',
        },
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {stats.map((stat) => {
                const Icon = stat.icon;
                return (
                    <div
                        key={stat.label}
                        className="bg-card border border-border rounded-2xl p-3 flex items-center gap-2 shadow-soft transition-all hover:scale-105"
                    >
                        <Icon className={`w-5 h-5 ${stat.color}`} />
                        <div>
                            <p className="text-xs text-muted-foreground">{stat.label}</p>
                            <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
