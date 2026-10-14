"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Plus, Edit2, Trash2, Search } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { QuestModal } from '@/components/admin/QuestModal';
import { useTranslation } from '@/lib/i18n';
import {
    fetchQuests,
    createQuest,
    updateQuest,
    deleteQuest,
} from '@/lib/admin-api';
import { QuestForm, Quest } from '@/types/admin';
import { BackLink } from "@/components/ui/BackLink";

const TYPES = ['daily', 'weekly', 'main', 'side'];
const DIFFICULTIES = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

export default function AdminQuestsPage() {
    const { t } = useTranslation();
    const { user, firebaseToken } = useAuth();
    const router = useRouter();

    const [quests, setQuests] = useState<Quest[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({ type: '', difficulty: '' });

    // Check if user is admin
    useEffect(() => {
        if (user && user.userType !== 'ADMIN') {
            router.push('/');
        }
    }, [user, router]);

    // Load quests
    useEffect(() => {
        if (user?.id) {
            loadQuests();
        }
    }, [user?.id, filters]);

    const loadQuests = async () => {
        if (!user?.id || !firebaseToken) return;
        setIsLoading(true);
        try {
            const filterParams: Record<string, string> = {};
            if (filters.type) filterParams.type = filters.type;
            if (filters.difficulty) filterParams.difficulty = filters.difficulty;

            const data = await fetchQuests(user.id, firebaseToken, filterParams);
            setQuests(data);
        } catch (error) {
            console.error('Failed to load quests:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenModal = (quest?: Quest) => {
        setSelectedQuest(quest || null);
        setModalOpen(true);
    };

    const handleSave = async (quest: QuestForm) => {
        if (!user?.id || !firebaseToken) return;
        try {
            setIsLoading(true);
            if (selectedQuest) {
                await updateQuest(user.id, firebaseToken, quest.id, quest);
            } else {
                await createQuest(user.id, firebaseToken, quest);
            }
            await loadQuests();
            setModalOpen(false);
        } catch (error) {
            console.error('Failed to save quest:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (questId: string) => {
        if (!user?.id || !firebaseToken || !confirm(t('admin.deleteConfirm'))) return;
        try {
            setIsLoading(true);
            await deleteQuest(user.id, firebaseToken, questId);
            await loadQuests();
        } catch (error) {
            console.error('Failed to delete quest:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredQuests = quests.filter(
        (q) =>
            q.title.en.toLowerCase().includes(searchTerm.toLowerCase()) ||
            q.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (user?.userType !== 'ADMIN') {
        return null;
    }

    return (
        <div className="min-h-screen bg-surface">
            <div className="max-w-7xl mx-auto px-4 py-8">
                <BackLink href="/admin" label={t("admin.backToDashboard")} className="mb-2" />
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-4xl font-bold text-ink mb-2">{t('admin.quests')}</h1>
                        <p className="text-ink-muted">{t('admin.questsDesc')}</p>
                    </div>
                    <Button
                        onClick={() => handleOpenModal()}
                        className="gap-2"
                    >
                        <Plus className="w-5 h-5" />
                        {t('admin.newQuest')}
                    </Button>
                </div>

                {/* Filters & Search */}
                <div className="bg-canvas border border-line rounded-lg p-4 mb-6 space-y-4">
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="absolute left-3 top-3 w-5 h-5 text-ink-muted" />
                                <input
                                    type="text"
                                    placeholder={t('admin.searchQuests')}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-line rounded-lg bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-ink-muted"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <select
                            value={filters.type}
                            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                            className="px-4 py-2 border border-line rounded-lg bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                            <option value="">{t('admin.allTypes')}</option>
                            {TYPES.map((type) => (
                                <option key={type} value={type}>
                                    {type.charAt(0).toUpperCase() + type.slice(1)}
                                </option>
                            ))}
                        </select>

                        <select
                            value={filters.difficulty}
                            onChange={(e) => setFilters({ ...filters, difficulty: e.target.value })}
                            className="px-4 py-2 border border-line rounded-lg bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                            <option value="">{t('admin.allDifficulties')}</option>
                            {DIFFICULTIES.map((difficulty) => (
                                <option key={difficulty} value={difficulty}>
                                    {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Quests Table */}
                {isLoading ? (
                    <div className="text-center py-12">
                        <p className="text-ink-muted">{t('admin.loadingQuests')}</p>
                    </div>
                ) : filteredQuests.length === 0 ? (
                    <div className="text-center py-12 bg-canvas border border-line rounded-lg">
                        <p className="text-ink-muted mb-4">{t('admin.noQuests')}</p>
                        <Button onClick={() => handleOpenModal()}>{t('admin.createFirstQuest')}</Button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredQuests.map((quest) => (
                            <div
                                key={quest.id}
                                className="bg-canvas border border-line rounded-lg p-4 flex items-center justify-between hover:border-primary/50 transition-colors"
                            >
                                <div className="flex-1">
                                    <h3 className="text-lg font-bold text-ink">{quest.title.en}</h3>
                                    <p className="text-sm text-ink-muted mb-2">{quest.description.en}</p>
                                    <div className="flex items-center gap-3 text-xs">
                                        <span className="px-2 py-1 bg-primary/10 text-primary rounded">
                                            {quest.type}
                                        </span>
                                        <span className={`px-2 py-1 rounded text-white bg-rarity-${quest.difficulty}`}>
                                            {quest.difficulty}
                                        </span>
                                        <span className="text-ink-muted">
                                            {quest.maxProgress} {t('admin.progress')} • {quest.rewards.xp} {t('admin.xp')} • {quest.rewards.gold} {t('admin.gold')}
                                        </span>
                                        {quest.duration && (
                                            <span className="text-ink-muted">{t('admin.durationPrefix')} {quest.duration}</span>
                                        )}
                                        {!quest.enabled && (
                                            <span className="px-2 py-1 bg-red-900/20 text-red-400 rounded">
                                                {t('admin.disabled')}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleOpenModal(quest)}
                                        className="p-2 hover:bg-sunken rounded-lg transition-colors text-ink"
                                    >
                                        <Edit2 className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(quest.id)}
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
            <QuestModal
                isOpen={modalOpen}
                quest={selectedQuest}
                onClose={() => setModalOpen(false)}
                onSave={handleSave}
                isLoading={isLoading}
            />
        </div>
    );
}
