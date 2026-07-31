"use client";

import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { ScrollText, CheckCircle2, Clock, Star } from 'lucide-react';
import { QuestDifficulty } from '@/types/gamification';
import { useTranslation } from '@/lib/i18n';

export function QuestTracker() {
    const { t } = useTranslation();
    const quests = useSelector((state: RootState) =>
        state.gamification.quests.filter(q => q.status === 'active')
    );

    const getRarityColor = (difficulty: QuestDifficulty) => {
        switch (difficulty) {
            case 'common':
                return 'text-rarity-common border-rarity-common';
            case 'uncommon':
                return 'text-rarity-uncommon border-rarity-uncommon';
            case 'rare':
                return 'text-rarity-rare border-rarity-rare';
            case 'epic':
                return 'text-rarity-epic border-rarity-epic';
            case 'legendary':
                return 'text-rarity-legendary border-rarity-legendary';
        }
    };

    const getRarityBg = (difficulty: QuestDifficulty) => {
        switch (difficulty) {
            case 'common':
                return 'bg-rarity-common/10';
            case 'uncommon':
                return 'bg-rarity-uncommon/10';
            case 'rare':
                return 'bg-rarity-rare/10';
            case 'epic':
                return 'bg-rarity-epic/10';
            case 'legendary':
                return 'bg-rarity-legendary/10';
        }
    };

    if (quests.length === 0) {
        return (
            <div className="bg-card border border-border rounded-lg p-6 text-center">
                <ScrollText className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-muted-foreground">{t('gamification.noActiveQuests')}</p>
                <p className="text-xs text-muted-foreground mt-1">{t('gamification.acceptQuestsHint')}</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2 mb-4">
                <ScrollText className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-lg">{t('gamification.activeQuests')}</h3>
                <span className="text-xs text-muted-foreground">({quests.length})</span>
            </div>

            {quests.map((quest) => {
                const progress = (quest.progress / quest.maxProgress) * 100;

                return (
                    <div
                        key={quest.id}
                        className={`
              bg-card border-2 rounded-lg p-4 
              ${getRarityColor(quest.difficulty)}
              ${quest.difficulty === 'legendary' ? 'animate-pulse-glow' : ''}
              transition-all hover:scale-[1.02]
            `}
                    >
                        <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-bold text-sm">{quest.title}</h4>
                                    <span className={`
                    text-xs px-2 py-0.5 rounded-full uppercase font-bold
                    ${getRarityColor(quest.difficulty)}
                    ${getRarityBg(quest.difficulty)}
                  `}>
                                        {quest.difficulty}
                                    </span>
                                </div>
                                <p className="text-xs text-muted-foreground">{quest.description}</p>
                            </div>
                            {quest.type === 'daily' && (
                                <Clock className="w-4 h-4 text-orange-500 ml-2" />
                            )}
                        </div>

                        {/* Progress bar */}
                        <div className="mb-3">
                            <div className="flex justify-between text-xs mb-1">
                                <span className="text-muted-foreground">{t('gamification.questProgress')}</span>
                                <span className="font-medium">
                                    {quest.progress} / {quest.maxProgress}
                                </span>
                            </div>
                            <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                    className={`
                    absolute top-0 left-0 h-full transition-all duration-500
                    ${quest.difficulty === 'legendary' ? 'bg-gradient-to-r from-secondary via-primary to-secondary' : 'bg-accent'}
                  `}
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>

                        {/* Rewards */}
                        <div className="flex items-center gap-4 text-xs">
                            <div className="flex items-center gap-1">
                                <Star className="w-3 h-3 text-accent" />
                                <span className="text-muted-foreground">+{quest.rewards.xp} XP</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-3 h-3 rounded-full bg-secondary" />
                                <span className="text-muted-foreground">+{quest.rewards.gold} Gold</span>
                            </div>
                            {quest.progress >= quest.maxProgress && (
                                <div className="flex items-center gap-1 text-accent ml-auto">
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span className="font-bold">{t('gamification.readyToClaim')}</span>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
