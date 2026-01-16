"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Plus, Edit2, Trash2, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { AchievementModal } from '@/components/admin/AchievementModal';
import {
    fetchAchievements,
    createAchievement,
    updateAchievement,
    deleteAchievement,
} from '@/lib/admin-api';
import { AchievementForm, Achievement } from '@/types/admin';
import { useTranslation } from '@/lib/i18n';

const CATEGORIES = ['jobs', 'earnings', 'profile', 'social', 'special'];
const RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

export default function AdminAchievementsPage() {
    const { t } = useTranslation();
    const { user } = useAuth();
    const router = useRouter();

    const [achievements, setAchievements] = useState<Achievement[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({ category: '', rarity: '' });

    // Check if user is admin
    useEffect(() => {
        if (user && user.userType !== 'ADMIN') {
            router.push('/');
        }
    }, [user, router]);

    // Load achievements
    useEffect(() => {
        if (user?.id) {
            loadAchievements();
        }
    }, [user?.id, filters]);

    const loadAchievements = async () => {
        if (!user?.id) return;
        setIsLoading(true);
        try {
            const filterParams: Record<string, string> = {};
            if (filters.category) filterParams.category = filters.category;
            if (filters.rarity) filterParams.rarity = filters.rarity;

            const data = await fetchAchievements(user.id, filterParams);
            setAchievements(data);
        } catch (error) {
            console.error('Failed to load achievements:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenModal = (achievement?: Achievement) => {
        setSelectedAchievement(achievement || null);
        setModalOpen(true);
    };

    const handleSave = async (achievement: AchievementForm) => {
        if (!user?.id) return;
        try {
            setIsLoading(true);
            if (selectedAchievement) {
                await updateAchievement(user.id, achievement.id, achievement);
            } else {
                await createAchievement(user.id, achievement);
            }
            await loadAchievements();
            setModalOpen(false);
        } catch (error) {
            console.error('Failed to save achievement:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (achievementId: string) => {
        if (!user?.id || !confirm('Are you sure you want to delete this achievement?')) return;
        try {
            setIsLoading(true);
            await deleteAchievement(user.id, achievementId);
            await loadAchievements();
        } catch (error) {
            console.error('Failed to delete achievement:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredAchievements = achievements.filter(
        (a) =>
            a.name.en.toLowerCase().includes(searchTerm.toLowerCase()) ||
            a.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (user?.userType !== 'ADMIN') {
        return null;
    }

    return (
        <div className="min-h-screen bg-card">
            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-4xl font-bold text-foreground mb-2">Manage Achievements</h1>
                        <p className="text-muted-foreground">Create and manage gamification achievements</p>
                    </div>
                    <Button
                        onClick={() => handleOpenModal()}
                        className="gap-2"
                    >
                        <Plus className="w-5 h-5" />
                        New Achievement
                    </Button>
                </div>

                {/* Filters & Search */}
                <div className="bg-background border border-border rounded-lg p-4 mb-6 space-y-4">
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder="Search achievements..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <select
                            value={filters.category}
                            onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                            className="px-4 py-2 border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                            <option value="">All Categories</option>
                            {CATEGORIES.map((cat) => (
                                <option key={cat} value={cat}>
                                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                                </option>
                            ))}
                        </select>

                        <select
                            value={filters.rarity}
                            onChange={(e) => setFilters({ ...filters, rarity: e.target.value })}
                            className="px-4 py-2 border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                            <option value="">All Rarities</option>
                            {RARITIES.map((rarity) => (
                                <option key={rarity} value={rarity}>
                                    {rarity.charAt(0).toUpperCase() + rarity.slice(1)}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Achievements Table */}
                {isLoading ? (
                    <div className="text-center py-12">
                        <p className="text-muted-foreground">Loading achievements...</p>
                    </div>
                ) : filteredAchievements.length === 0 ? (
                    <div className="text-center py-12 bg-background border border-border rounded-lg">
                        <p className="text-muted-foreground mb-4">No achievements found</p>
                        <Button onClick={() => handleOpenModal()}>Create First Achievement</Button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredAchievements.map((achievement) => (
                            <div
                                key={achievement.id}
                                className="bg-background border border-border rounded-lg p-4 flex items-center justify-between hover:border-primary/50 transition-colors"
                            >
                                <div className="flex items-start gap-4 flex-1">
                                    <div className="text-3xl">{achievement.icon}</div>
                                    <div className="flex-1">
                                        <h3 className="text-lg font-bold text-foreground">{achievement.name.en}</h3>
                                        <p className="text-sm text-muted-foreground mb-2">{achievement.description.en}</p>
                                        <div className="flex items-center gap-3 text-xs">
                                            <span className="px-2 py-1 bg-primary/10 text-primary rounded">
                                                {achievement.category}
                                            </span>
                                            <span className={`px-2 py-1 rounded text-white bg-rarity-${achievement.rarity}`}>
                                                {achievement.rarity}
                                            </span>
                                            <span className="text-muted-foreground">
                                                {achievement.rewards.xp} XP • {achievement.rewards.gold} Gold
                                            </span>
                                            {!achievement.enabled && (
                                                <span className="px-2 py-1 bg-red-900/20 text-red-400 rounded">
                                                    Disabled
                                                </span>
                                            )}
                                            {achievement.hidden && (
                                                <span className="px-2 py-1 bg-yellow-900/20 text-yellow-400 rounded">
                                                    Hidden
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleOpenModal(achievement)}
                                        className="p-2 hover:bg-muted rounded-lg transition-colors text-foreground"
                                    >
                                        <Edit2 className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(achievement.id)}
                                        className="p-2 hover:bg-red-900/20 rounded-lg transition-colors text-red-400"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal */}
            <AchievementModal
                isOpen={modalOpen}
                achievement={selectedAchievement}
                onClose={() => setModalOpen(false)}
                onSave={handleSave}
                isLoading={isLoading}
            />
        </div>
    );
}
