"use client";

import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { Trophy, Sparkles } from 'lucide-react';

export function XPBar() {
    const { player } = useSelector((state: RootState) => state.gamification);
    const xpPercentage = (player.currentXP / player.xpToNextLevel) * 100;

    return (
        <div className="w-full max-w-md">
            <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-secondary" />
                    <span className="text-sm font-medium text-foreground">
                        Level {player.level}
                    </span>
                    <span className="text-xs text-muted-foreground">{player.title}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                    {player.currentXP} / {player.xpToNextLevel} XP
                </span>
            </div>
            <div className="relative h-3 bg-xp-bg rounded-full overflow-hidden border border-border">
                <div
                    className="absolute top-0 left-0 h-full xp-bar-fill transition-all duration-500 ease-out"
                    style={{ width: `${xpPercentage}%` }}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
            </div>
        </div>
    );
}
