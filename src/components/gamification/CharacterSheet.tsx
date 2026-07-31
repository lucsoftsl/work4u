"use client";

import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { PlayerStats } from '@/components/gamification/PlayerStats';
import { GoldEarningGuide } from '@/components/gamification/GoldEarningGuide';
import { QuestTracker } from '@/components/gamification/QuestTracker';
import { Trophy, Shield, Sparkles, Star, Award, Lock, Crown, Swords } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { getPlayerTitleKey } from '@/lib/gamification-utils';

export function CharacterSheet() {
    const { t } = useTranslation();
    const { player, achievements, inventory, quests } = useSelector(
        (state: RootState) => state.gamification
    );

    const unlockedAchievements = achievements.filter(a => a.unlocked);
    const lockedAchievements = achievements.filter(a => !a.unlocked);

    const getRarityClass = (rarity: string) => {
        switch (rarity) {
            case 'common':
                return 'rarity-common';
            case 'uncommon':
                return 'rarity-uncommon';
            case 'rare':
                return 'rarity-rare';
            case 'epic':
                return 'rarity-epic';
            case 'legendary':
                return 'rarity-legendary';
            default:
                return '';
        }
    };

    const getRarityBg = (rarity: string) => {
        switch (rarity) {
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
            default:
                return '';
        }
    };

    const categoryIcons = {
        jobs: Swords,
        social: Star,
        profile: Shield,
        earnings: Trophy,
        special: Crown,
    };

    return (
        <div className="space-y-6">
            {/* Character Header */}
            <div className="bg-card border-2 border-primary rounded-2xl p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-40 h-40 bg-secondary/5 rounded-full blur-3xl" />

                <div className="relative z-10 flex flex-col items-center gap-4 text-center sm:flex-row sm:items-center sm:gap-6 sm:text-left">
                    <div className="w-24 h-24 shrink-0 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center border-4 border-card shadow-[0_16px_36px_-8px_rgba(30,109,138,0.4)]">
                        <Shield className="w-12 h-12 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-center gap-3 mb-2 sm:justify-start">
                            <h1 className="text-3xl font-bold text-foreground">{t('gamification.yourCharacter')}</h1>
                            {player.title && (
                                <span className="px-3 py-1 bg-secondary border-2 border-secondary-foreground/20 rounded-full text-sm font-bold text-secondary-foreground">
                                    {t(getPlayerTitleKey(player.title))}
                                </span>
                            )}
                        </div>
                        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-muted-foreground sm:justify-start">
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-primary" />
                                <span>{t('gamification.level')} {player.level}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Trophy className="w-4 h-4 text-secondary" />
                                <span>{player.achievements} {t('gamification.achievements')}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Star className="w-4 h-4 text-accent" />
                                <span>{player.completedQuests} {t('gamification.completedQuests')}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Player Stats */}
            <div>
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary" />
                    {t('gamification.characterStats')}
                </h2>
                <PlayerStats />
                <div className="mt-3">
                    <GoldEarningGuide />
                </div>
            </div>

            {/* Active Quests */}
            <div>
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Swords className="w-5 h-5 text-accent" />
                    {t('gamification.activeQuests')} ({quests.filter(q => q.status === 'active').length})
                </h2>
                <QuestTracker />
            </div>

            {/* Achievements */}
            <div>
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-secondary" />
                    {t('gamification.achievements')} ({unlockedAchievements.length}/{achievements.length})
                </h2>

                <div className="space-y-4">
                    {/* Unlocked Achievements */}
                    {unlockedAchievements.length > 0 && (
                        <div>
                            <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase">{t('gamification.unlocked')}</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {unlockedAchievements.map((achievement) => {
                                    const Icon = categoryIcons[achievement.category] || Award;
                                    return (
                                        <div
                                            key={achievement.id}
                                            className={`
                        bg-card border-2 rounded-2xl p-4
                        ${getRarityClass(achievement.rarity)}
                        ${achievement.rarity === 'legendary' ? 'animate-pulse-glow' : ''}
                        transition-all hover:scale-105
                      `}
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className={`
                          p-2 rounded-full text-2xl
                          ${getRarityBg(achievement.rarity)}
                        `}>
                                                    {achievement.icon}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-bold text-sm mb-1 flex items-center gap-2">
                                                        {achievement.name}
                                                        <Icon className="w-3 h-3 text-muted-foreground" />
                                                    </h4>
                                                    <p className="text-xs text-muted-foreground mb-2">
                                                        {achievement.description}
                                                    </p>
                                                    <div className="flex items-center gap-2 text-xs">
                                                        <span className="text-accent">+{achievement.rewards.xp} XP</span>
                                                        <span className="text-secondary">+{achievement.rewards.gold} Gold</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Locked Achievements */}
                    {lockedAchievements.length > 0 && (
                        <div>
                            <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase">{t('gamification.locked')}</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {lockedAchievements.slice(0, 6).map((achievement) => {
                                    const Icon = categoryIcons[achievement.category] || Award;
                                    return (
                                        <div
                                            key={achievement.id}
                                            className="bg-card border-2 border-border rounded-2xl p-4 opacity-60 hover:opacity-80 transition-opacity"
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className="p-2 rounded-full bg-muted text-2xl relative">
                                                    {achievement.hidden ? '?' : achievement.icon}
                                                    <Lock className="absolute -bottom-1 -right-1 w-3 h-3 text-muted-foreground" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-bold text-sm mb-1 flex items-center gap-2">
                                                        {achievement.hidden ? '???' : achievement.name}
                                                        <Icon className="w-3 h-3 text-muted-foreground" />
                                                    </h4>
                                                    <p className="text-xs text-muted-foreground mb-2">
                                                        {achievement.hidden ? t('gamification.hiddenAchievement') : achievement.description}
                                                    </p>
                                                    {/* Progress bar */}
                                                    {!achievement.hidden && achievement.maxProgress > 1 && (
                                                        <div className="mb-2">
                                                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                                                <div
                                                                    className="h-full bg-primary/50"
                                                                    style={{ width: `${(achievement.progress / achievement.maxProgress) * 100}%` }}
                                                                />
                                                            </div>
                                                            <p className="text-xs text-muted-foreground mt-1">
                                                                {achievement.progress}/{achievement.maxProgress}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Inventory */}
            {inventory.length > 0 && (
                <div>
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <Award className="w-5 h-5 text-primary" />
                        {t('gamification.inventory')} ({inventory.length})
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {inventory.map((item) => (
                            <div
                                key={item.id}
                                className={`
                  bg-card border-2 rounded-2xl p-3 text-center
                  ${getRarityClass(item.rarity)}
                  ${item.equipped ? 'ring-2 ring-primary' : ''}
                  transition-all hover:scale-105 cursor-pointer
                `}
                            >
                                <div className="text-3xl mb-2">{item.icon}</div>
                                <p className="text-xs font-bold mb-1">{item.name}</p>
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                    {item.description}
                                </p>
                                {item.equipped && (
                                    <span className="inline-block mt-2 text-xs px-2 py-0.5 bg-primary/20 text-primary rounded-full">
                                        {t('gamification.equipped')}
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
