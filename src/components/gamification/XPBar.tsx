"use client";

import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { Sparkles } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { getPlayerTitleKey } from '@/lib/gamification-utils';
import { cn } from '@/lib/utils';
import type { PlayerStats } from '@/types/gamification';

// The seeded default rank; never shown on its own (it isn't earned progress).
const DEFAULT_TITLE = 'Novice Worker';

/** The player only when the backend has reported real progress; otherwise null. */
export function selectVisiblePlayer(state: RootState): PlayerStats | null {
    const { serverStatus, player } = state.gamification;
    if (serverStatus !== 'loaded') return null;
    if (player.totalXP <= 0 && player.level <= 1) return null;
    return player;
}

interface XPBarProps {
    className?: string;
}

export function XPBar({ className }: XPBarProps) {
    const player = useSelector(selectVisiblePlayer);
    const { t } = useTranslation();

    if (!player) return null;

    const xpPercentage = player.xpToNextLevel > 0
        ? Math.min(100, Math.max(0, (player.currentXP / player.xpToNextLevel) * 100))
        : 0;
    const showTitle = Boolean(player.title) && player.title !== DEFAULT_TITLE;

    return (
        <div className={cn('rounded-3xl border border-line/70 bg-white px-4 py-3 shadow-stamp', className)}>
            <div className="w-full max-w-md">
                <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-ink" />
                        <span className="text-sm font-medium text-ink">
                            {t('gamification.level')} {player.level}
                        </span>
                        {showTitle && (
                            <span className="text-xs text-ink-muted">{t(getPlayerTitleKey(player.title))}</span>
                        )}
                    </div>
                    <span className="text-xs text-ink-muted">
                        {player.currentXP} / {player.xpToNextLevel} XP
                    </span>
                </div>
                <div
                    role="progressbar"
                    aria-label={t('gamification.level')}
                    aria-valuemin={0}
                    aria-valuemax={player.xpToNextLevel}
                    aria-valuenow={player.currentXP}
                    className="relative h-3 bg-xp-bg rounded-full overflow-hidden border border-line"
                >
                    <div
                        className="absolute top-0 left-0 h-full bg-success transition-all duration-500 ease-out"
                        style={{ width: `${xpPercentage}%` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
                </div>
            </div>
        </div>
    );
}
