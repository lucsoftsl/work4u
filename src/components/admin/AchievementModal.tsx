"use client";

import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { AchievementForm } from '@/types/admin';
import { LOCALES, useTranslation, type Locale } from '@/lib/i18n';
import {
    emptyLocalizedText,
    firstIncompleteLocale,
    LocalizedFieldTabs,
    nativeLanguageName,
    withAllLocales,
    type LocalizedFieldDef,
} from './LocalizedFieldTabs';

interface AchievementModalProps {
    isOpen: boolean;
    achievement?: AchievementForm | null;
    onClose: () => void;
    onSave: (achievement: AchievementForm) => Promise<void>;
    isLoading?: boolean;
}

const CATEGORIES = ['jobs', 'earnings', 'profile', 'social', 'special'];
const RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

export function AchievementModal({
    isOpen,
    achievement,
    onClose,
    onSave,
    isLoading = false,
}: AchievementModalProps) {
    const { t } = useTranslation();
    const [formData, setFormData] = useState<AchievementForm>(
        achievement
            ? { ...achievement, name: withAllLocales(achievement.name), description: withAllLocales(achievement.description) }
            : {
                id: '',
                name: emptyLocalizedText(),
                description: emptyLocalizedText(),
                category: 'jobs',
                rarity: 'common',
                icon: '🎯',
                maxProgress: 1,
                rewards: { xp: 0, gold: 0 },
                hidden: false,
                enabled: true,
              }
    );

    const handleChange = (field: string, value: unknown) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const [activeLocale, setActiveLocale] = useState<Locale>(LOCALES[0]);
    const [missingLocale, setMissingLocale] = useState<Locale | null>(null);

    const localizedFields: LocalizedFieldDef[] = [
        { key: 'name', label: t('admin.achievementName') },
        { key: 'description', label: t('admin.description'), multiline: true },
    ];
    const localizedValues = { name: formData.name, description: formData.description };

    const handleLocalizedChange = (field: string, locale: Locale, value: string) => {
        setMissingLocale(null);
        setFormData((prev) => {
            const key = field as 'name' | 'description';
            return { ...prev, [key]: { ...prev[key], [locale]: value } };
        });
    };

    const handleRewardChange = (field: string, value: unknown) => {
        setFormData((prev) => ({
            ...prev,
            rewards: { ...prev.rewards, [field]: value },
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        // Every available language must be filled in; jump to the first gap instead of saving.
        const incomplete = firstIncompleteLocale(localizedFields, localizedValues);
        if (incomplete) {
            setActiveLocale(incomplete);
            setMissingLocale(incomplete);
            return;
        }
        await onSave(formData);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-surface border border-line rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 flex items-center justify-between bg-surface border-b border-line p-6">
                    <h2 className="text-2xl font-bold text-ink">
                        {achievement ? t('admin.editAchievement') : t('admin.createAchievement')}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-ink-muted hover:text-ink transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* ID */}
                    <div>
                        <label className="block text-sm font-medium text-ink mb-2">
                            {t('admin.achievementId')} *
                        </label>
                        <input
                            type="text"
                            value={formData.id}
                            onChange={(e) => handleChange('id', e.target.value)}
                            disabled={!!achievement}
                            className="w-full px-4 py-2 border border-line rounded-lg bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                            placeholder={t('admin.achievementIdPlaceholder')}
                        />
                    </div>

                    {/* Localized text: one tab per available language */}
                    <div className="space-y-2">
                        <LocalizedFieldTabs
                            fields={localizedFields}
                            values={localizedValues}
                            onChange={handleLocalizedChange}
                            activeLocale={activeLocale}
                            onActiveLocaleChange={setActiveLocale}
                        />
                        {missingLocale ? (
                            <p role="alert" className="text-sm text-danger">
                                {t('admin.missingTranslation', 'Fill in every field for {language} before saving.').replace(
                                    '{language}',
                                    nativeLanguageName(missingLocale)
                                )}
                            </p>
                        ) : null}
                    </div>

                    {/* Category & Rarity */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-ink mb-2">
                                {t('admin.category')} *
                            </label>
                            <select
                                value={formData.category}
                                onChange={(e) => handleChange('category', e.target.value)}
                                className="w-full px-4 py-2 border border-line rounded-lg bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                                {CATEGORIES.map((cat) => (
                                    <option key={cat} value={cat}>
                                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-ink mb-2">
                                {t('admin.rarity')} *
                            </label>
                            <select
                                value={formData.rarity}
                                onChange={(e) => handleChange('rarity', e.target.value)}
                                className="w-full px-4 py-2 border border-line rounded-lg bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                                {RARITIES.map((rarity) => (
                                    <option key={rarity} value={rarity}>
                                        {rarity.charAt(0).toUpperCase() + rarity.slice(1)}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Icon & Max Progress */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-ink mb-2">
                                {t('admin.icon')}
                            </label>
                            <input
                                type="text"
                                value={formData.icon}
                                onChange={(e) => handleChange('icon', e.target.value)}
                                className="w-full px-4 py-2 border border-line rounded-lg bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-primary text-2xl"
                                maxLength={2}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-ink mb-2">
                                {t('admin.maxProgress')}
                            </label>
                            <input
                                type="number"
                                value={formData.maxProgress}
                                onChange={(e) => handleChange('maxProgress', parseInt(e.target.value))}
                                className="w-full px-4 py-2 border border-line rounded-lg bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-primary"
                                min="1"
                            />
                        </div>
                    </div>

                    {/* Rewards */}
                    <div className="space-y-3">
                        <label className="block text-sm font-medium text-ink">{t('admin.rewards')}</label>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs text-ink-muted mb-1">{t('admin.xp')}</label>
                                <input
                                    type="number"
                                    value={formData.rewards.xp}
                                    onChange={(e) => handleRewardChange('xp', parseInt(e.target.value))}
                                    className="w-full px-4 py-2 border border-line rounded-lg bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-primary"
                                    min="0"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-ink-muted mb-1">{t('admin.gold')}</label>
                                <input
                                    type="number"
                                    value={formData.rewards.gold}
                                    onChange={(e) => handleRewardChange('gold', parseInt(e.target.value))}
                                    className="w-full px-4 py-2 border border-line rounded-lg bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-primary"
                                    min="0"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Status */}
                    <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.enabled}
                                onChange={(e) => handleChange('enabled', e.target.checked)}
                                className="w-4 h-4 rounded border border-line bg-surface"
                            />
                            <span className="text-sm text-ink">{t('admin.enabled')}</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.hidden}
                                onChange={(e) => handleChange('hidden', e.target.checked)}
                                className="w-4 h-4 rounded border border-line bg-surface"
                            />
                            <span className="text-sm text-ink">{t('admin.hidden')}</span>
                        </label>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4 border-t border-line">
                        <Button variant="outline" onClick={onClose} disabled={isLoading}>
                            {t('admin.cancel')}
                        </Button>
                        <Button
                            type="submit"
                            disabled={isLoading || !formData.id}
                            className="flex-1"
                        >
                            {isLoading ? t('admin.saving') : t('admin.saveAchievement')}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
