"use client";

import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { AchievementForm } from '@/types/admin';

interface AchievementModalProps {
    isOpen: boolean;
    achievement?: AchievementForm | null;
    onClose: () => void;
    onSave: (achievement: AchievementForm) => Promise<void>;
    isLoading?: boolean;
}

const CATEGORIES = ['jobs', 'earnings', 'profile', 'social', 'special'];
const RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
const LANGUAGES = { en: 'English', es: 'Español', fr: 'Français' };

export function AchievementModal({
    isOpen,
    achievement,
    onClose,
    onSave,
    isLoading = false,
}: AchievementModalProps) {
    const [formData, setFormData] = useState<AchievementForm>(
        achievement || {
            id: '',
            name: { en: '', es: '', fr: '' },
            description: { en: '', es: '', fr: '' },
            category: 'jobs',
            rarity: 'common',
            icon: '🎯',
            maxProgress: 1,
            rewards: { xp: 0, gold: 0 },
            hidden: false,
            enabled: true,
        }
    );

    const handleChange = (field: string, value: any) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleNameChange = (lang: string, value: string) => {
        setFormData((prev) => ({
            ...prev,
            name: { ...prev.name, [lang]: value },
        }));
    };

    const handleDescriptionChange = (lang: string, value: string) => {
        setFormData((prev) => ({
            ...prev,
            description: { ...prev.description, [lang]: value },
        }));
    };

    const handleRewardChange = (field: string, value: any) => {
        setFormData((prev) => ({
            ...prev,
            rewards: { ...prev.rewards, [field]: value },
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSave(formData);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-card border border-border rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 flex items-center justify-between bg-card border-b border-border p-6">
                    <h2 className="text-2xl font-bold text-foreground">
                        {achievement ? 'Edit Achievement' : 'Create Achievement'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* ID */}
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                            Achievement ID *
                        </label>
                        <input
                            type="text"
                            value={formData.id}
                            onChange={(e) => handleChange('id', e.target.value)}
                            disabled={!!achievement}
                            className="w-full px-4 py-2 border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                            placeholder="e.g., first-job"
                        />
                    </div>

                    {/* Names by Language */}
                    <div className="space-y-3">
                        <label className="block text-sm font-medium text-foreground">
                            Achievement Name *
                        </label>
                        {Object.entries(LANGUAGES).map(([lang, langName]) => (
                            <div key={lang}>
                                <input
                                    type="text"
                                    value={formData.name[lang] || ''}
                                    onChange={(e) => handleNameChange(lang, e.target.value)}
                                    placeholder={`Name (${langName})`}
                                    className="w-full px-4 py-2 border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>
                        ))}
                    </div>

                    {/* Descriptions by Language */}
                    <div className="space-y-3">
                        <label className="block text-sm font-medium text-foreground">
                            Description *
                        </label>
                        {Object.entries(LANGUAGES).map(([lang, langName]) => (
                            <div key={lang}>
                                <textarea
                                    value={formData.description[lang] || ''}
                                    onChange={(e) => handleDescriptionChange(lang, e.target.value)}
                                    placeholder={`Description (${langName})`}
                                    className="w-full px-4 py-2 border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                    rows={2}
                                />
                            </div>
                        ))}
                    </div>

                    {/* Category & Rarity */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Category *
                            </label>
                            <select
                                value={formData.category}
                                onChange={(e) => handleChange('category', e.target.value)}
                                className="w-full px-4 py-2 border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                                {CATEGORIES.map((cat) => (
                                    <option key={cat} value={cat}>
                                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Rarity *
                            </label>
                            <select
                                value={formData.rarity}
                                onChange={(e) => handleChange('rarity', e.target.value)}
                                className="w-full px-4 py-2 border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
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
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Icon Emoji
                            </label>
                            <input
                                type="text"
                                value={formData.icon}
                                onChange={(e) => handleChange('icon', e.target.value)}
                                className="w-full px-4 py-2 border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-2xl"
                                maxLength={2}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Max Progress
                            </label>
                            <input
                                type="number"
                                value={formData.maxProgress}
                                onChange={(e) => handleChange('maxProgress', parseInt(e.target.value))}
                                className="w-full px-4 py-2 border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                min="1"
                            />
                        </div>
                    </div>

                    {/* Rewards */}
                    <div className="space-y-3">
                        <label className="block text-sm font-medium text-foreground">Rewards</label>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs text-muted-foreground mb-1">XP</label>
                                <input
                                    type="number"
                                    value={formData.rewards.xp}
                                    onChange={(e) => handleRewardChange('xp', parseInt(e.target.value))}
                                    className="w-full px-4 py-2 border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                    min="0"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-muted-foreground mb-1">Gold</label>
                                <input
                                    type="number"
                                    value={formData.rewards.gold}
                                    onChange={(e) => handleRewardChange('gold', parseInt(e.target.value))}
                                    className="w-full px-4 py-2 border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
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
                                className="w-4 h-4 rounded border border-border bg-card"
                            />
                            <span className="text-sm text-foreground">Enabled</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.hidden}
                                onChange={(e) => handleChange('hidden', e.target.checked)}
                                className="w-4 h-4 rounded border border-border bg-card"
                            />
                            <span className="text-sm text-foreground">Hidden</span>
                        </label>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4 border-t border-border">
                        <Button variant="outline" onClick={onClose} disabled={isLoading}>
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isLoading || !formData.id || !formData.name.en}
                            className="flex-1"
                        >
                            {isLoading ? 'Saving...' : 'Save Achievement'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
