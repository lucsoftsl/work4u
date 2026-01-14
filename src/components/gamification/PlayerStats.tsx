"use client";

import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { Coins, Zap, Target, Trophy, Flame } from 'lucide-react';
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
            glow: 'shadow-[0_0_10px_rgba(234,179,8,0.4)]'
        },
        {
            label: t('gamification.level'),
            value: player.level,
            icon: Zap,
            color: 'text-primary',
            glow: 'shadow-[0_0_10px_rgba(168,85,247,0.4)]'
        },
        {
            label: t('gamification.quests'),
            value: `${player.activeQuests}/${player.completedQuests}`,
            icon: Target,
            color: 'text-accent',
            glow: 'shadow-[0_0_10px_rgba(34,197,94,0.4)]'
        },
        {
            label: t('gamification.achievements'),
            value: player.achievements,
            icon: Trophy,
            color: 'text-rarity-legendary',
            glow: 'shadow-[0_0_10px_rgba(234,179,8,0.4)]'
        },
        {
            label: t('gamification.streak'),
            value: `${player.streak} ${t('gamification.streak').includes('Day') ? 'days' : ''}`,
            icon: Flame,
            color: 'text-orange-500',
            glow: 'shadow-[0_0_10px_rgba(249,115,22,0.4)]'
        },
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {stats.map((stat) => {
                const Icon = stat.icon;
                return (
                    <div
                        key={stat.label}
                        className={`bg-card border border-border rounded-lg p-3 flex items-center gap-2 ${stat.glow} transition-all hover:scale-105`}
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
