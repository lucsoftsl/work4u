"use client";

import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { QuestForm } from '@/types/admin';

interface QuestModalProps {
    isOpen: boolean;
    quest?: QuestForm | null;
    onClose: () => void;
    onSave: (quest: QuestForm) => Promise<void>;
    isLoading?: boolean;
}

const TYPES = ['daily', 'weekly', 'main', 'side'];
const DIFFICULTIES = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
const LANGUAGES = { en: 'English', es: 'Español', fr: 'Français' };

export function QuestModal({
    isOpen,
    quest,
    onClose,
    onSave,
    isLoading = false,
}: QuestModalProps) {
    const [formData, setFormData] = useState<QuestForm>(
        quest || {
            id: '',
            title: { en: '', es: '', fr: '' },
            description: { en: '', es: '', fr: '' },
            type: 'daily',
            difficulty: 'common',
            maxProgress: 1,
            rewards: { xp: 0, gold: 0 },
            enabled: true,
        }
    );

    const handleChange = (field: string, value: any) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleTitleChange = (lang: string, value: string) => {
        setFormData((prev) => ({
            ...prev,
            title: { ...prev.title, [lang]: value },
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
                        {quest ? 'Edit Quest' : 'Create Quest'}
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
                            Quest ID *
                        </label>
                        <input
                            type="text"
                            value={formData.id}
                            onChange={(e) => handleChange('id', e.target.value)}
                            disabled={!!quest}
                            className="w-full px-4 py-2 border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                            placeholder="e.g., daily-grind"
                        />
                    </div>

                    {/* Titles by Language */}
                    <div className="space-y-3">
                        <label className="block text-sm font-medium text-foreground">
                            Quest Title *
                        </label>
                        {Object.entries(LANGUAGES).map(([lang, langName]) => (
                            <div key={lang}>
                                <input
                                    type="text"
                                    value={formData.title[lang] || ''}
                                    onChange={(e) => handleTitleChange(lang, e.target.value)}
                                    placeholder={`Title (${langName})`}
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

                    {/* Type & Difficulty */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Type *
                            </label>
                            <select
                                value={formData.type}
                                onChange={(e) => handleChange('type', e.target.value)}
                                className="w-full px-4 py-2 border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                                {TYPES.map((type) => (
                                    <option key={type} value={type}>
                                        {type.charAt(0).toUpperCase() + type.slice(1)}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Difficulty *
                            </label>
                            <select
                                value={formData.difficulty}
                                onChange={(e) => handleChange('difficulty', e.target.value)}
                                className="w-full px-4 py-2 border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                                {DIFFICULTIES.map((diff) => (
                                    <option key={diff} value={diff}>
                                        {diff.charAt(0).toUpperCase() + diff.slice(1)}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Max Progress & Duration */}
                    <div className="grid grid-cols-2 gap-4">
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
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Duration (e.g., 24h, 7d)
                            </label>
                            <input
                                type="text"
                                value={formData.duration || ''}
                                onChange={(e) => handleChange('duration', e.target.value)}
                                className="w-full px-4 py-2 border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                placeholder="24h"
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
                    <div>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.enabled}
                                onChange={(e) => handleChange('enabled', e.target.checked)}
                                className="w-4 h-4 rounded border border-border bg-card"
                            />
                            <span className="text-sm text-foreground">Enabled</span>
                        </label>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4 border-t border-border">
                        <Button variant="outline" onClick={onClose} disabled={isLoading}>
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isLoading || !formData.id || !formData.title.en}
                            className="flex-1"
                        >
                            {isLoading ? 'Saving...' : 'Save Quest'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
