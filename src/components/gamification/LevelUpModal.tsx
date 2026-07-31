"use client";

import { useEffect, useState, useRef } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { Star, Sparkles, Gift, TrendingUp, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useTranslation } from '@/lib/i18n';
import { getPlayerTitleKey } from '@/lib/gamification-utils';

interface LevelUpModalProps {
    onClose?: () => void;
}

export function LevelUpModal({ onClose }: LevelUpModalProps) {
    const { t } = useTranslation();
    const { player } = useSelector((state: RootState) => state.gamification);
    const [isOpen, setIsOpen] = useState(false);
    const previousLevelRef = useRef(player.level);

    useEffect(() => {
        if (player.level > previousLevelRef.current) {
            previousLevelRef.current = player.level;
            // Using requestAnimationFrame to defer setState
            requestAnimationFrame(() => setIsOpen(true));
        }
    }, [player.level]);

    const handleClose = () => {
        setIsOpen(false);
        onClose?.();
    };

    if (!isOpen) return null;

    const rewards = [
        { icon: Star, label: t('gamification.newAbilities'), color: 'text-primary' },
        { icon: Gift, label: t('gamification.bonusRewards'), color: 'text-secondary' },
        { icon: TrendingUp, label: t('gamification.increasedEarning'), color: 'text-accent' },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="relative max-w-md w-full mx-4 animate-level-up">
                {/* Glow effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-primary/50 via-secondary/50 to-primary/50 rounded-2xl blur-xl animate-pulse" />

                <div className="relative bg-card border-2 border-primary rounded-2xl p-8 shadow-2xl">
                    <button
                        onClick={handleClose}
                        className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    {/* Animated sparkles */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                        <div className="relative">
                            <Sparkles className="w-16 h-16 text-secondary animate-float" />
                            <div className="absolute inset-0 bg-secondary/30 rounded-full blur-xl animate-pulse" />
                        </div>
                    </div>

                    <div className="text-center mt-8">
                        <h2 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent">
                            {t('gamification.levelUp')}
                        </h2>

                        <div className="inline-flex items-center gap-2 bg-primary/20 border-2 border-primary rounded-full px-6 py-3 mb-6">
                            <Star className="w-8 h-8 text-primary" />
                            <span className="text-5xl font-bold text-primary">{player.level}</span>
                        </div>

                        <p className="text-xl font-bold text-secondary mb-6">
                            {t(getPlayerTitleKey(player.title))}
                        </p>

                        <div className="space-y-3 mb-6">
                            {rewards.map((reward, index) => {
                                const Icon = reward.icon;
                                return (
                                    <div
                                        key={index}
                                        className="flex items-center gap-3 bg-muted/50 rounded-lg p-3 border border-border"
                                    >
                                        <Icon className={`w-5 h-5 ${reward.color}`} />
                                        <span className="text-sm text-muted-foreground">{reward.label}</span>
                                    </div>
                                );
                            })}
                        </div>

                        <Button
                            onClick={handleClose}
                            className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity"
                        >
                            {t('gamification.continueAdventure')}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
