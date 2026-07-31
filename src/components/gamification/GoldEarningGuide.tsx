"use client";

import { Briefcase, Trophy, Target, Flame, Coins } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

export function GoldEarningGuide() {
    const { t } = useTranslation();

    const sources = [
        { icon: Briefcase, text: t('gamification.earnGoldJobs') },
        { icon: Trophy, text: t('gamification.earnGoldAchievements') },
        { icon: Target, text: t('gamification.earnGoldQuests') },
        { icon: Flame, text: t('gamification.earnGoldStreak') },
    ];

    return (
        <div className="bg-card border border-border rounded-2xl p-4 shadow-soft">
            <div className="flex items-center gap-2 mb-3">
                <Coins className="w-4 h-4 text-secondary" />
                <h3 className="text-sm font-bold text-foreground">{t('gamification.howToEarnGold')}</h3>
            </div>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {sources.map(({ icon: Icon, text }) => (
                    <li key={text} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <Icon className="w-4 h-4 shrink-0 mt-0.5 text-secondary" />
                        <span>{text}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}
