"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Plus, Edit2, Trash2, Search } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { QuestModal } from '@/components/admin/QuestModal';
import {
    fetchQuests,
    createQuest,
    updateQuest,
    deleteQuest,
} from '@/lib/admin-api';
import { QuestForm, Quest } from '@/types/admin';

const TYPES = ['daily', 'weekly', 'main', 'side'];
const DIFFICULTIES = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

export default function AdminQuestsPage() {
    const { user } = useAuth();
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
        if (!user?.id) return;
        setIsLoading(true);
        try {
            const filterParams: Record<string, string> = {};
            if (filters.type) filterParams.type = filters.type;
            if (filters.difficulty) filterParams.difficulty = filters.difficulty;

            const data = await fetchQuests(user.id, filterParams);
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
        if (!user?.id) return;
        try {
            setIsLoading(true);
            if (selectedQuest) {
                await updateQuest(user.id, quest.id, quest);
            } else {
                await createQuest(user.id, quest);
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
        if (!user?.id || !confirm('Are you sure you want to delete this quest?')) return;
        try {
            setIsLoading(true);
            await deleteQuest(user.id, questId);
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
        <div className="min-h-screen bg-card">
            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-4xl font-bold text-foreground mb-2">Manage Quests</h1>
                        <p className="text-muted-foreground">Create and manage gamification quests</p>
                    </div>
                    <Button
                        onClick={() => handleOpenModal()}
                        className="gap-2"
                    >
                        <Plus className="w-5 h-5" />
                        New Quest
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
                                    placeholder="Search quests..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <select
                            value={filters.type}
                            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                            className="px-4 py-2 border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                            <option value="">All Types</option>
                            {TYPES.map((type) => (
                                <option key={type} value={type}>
                                    {type.charAt(0).toUpperCase() + type.slice(1)}
                                </option>
                            ))}
                        </select>

                        <select
                            value={filters.difficulty}
                            onChange={(e) => setFilters({ ...filters, difficulty: e.target.value })}
                            className="px-4 py-2 border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                            <option value="">All Difficulties</option>
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
                        <p className="text-muted-foreground">Loading quests...</p>
                    </div>
                ) : filteredQuests.length === 0 ? (
                    <div className="text-center py-12 bg-background border border-border rounded-lg">
                        <p className="text-muted-foreground mb-4">No quests found</p>
                        <Button onClick={() => handleOpenModal()}>Create First Quest</Button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredQuests.map((quest) => (
                            <div
                                key={quest.id}
                                className="bg-background border border-border rounded-lg p-4 flex items-center justify-between hover:border-primary/50 transition-colors"
                            >
                                <div className="flex-1">
                                    <h3 className="text-lg font-bold text-foreground">{quest.title.en}</h3>
                                    <p className="text-sm text-muted-foreground mb-2">{quest.description.en}</p>
                                    <div className="flex items-center gap-3 text-xs">
                                        <span className="px-2 py-1 bg-primary/10 text-primary rounded">
                                            {quest.type}
                                        </span>
                                        <span className={`px-2 py-1 rounded text-white bg-rarity-${quest.difficulty}`}>
                                            {quest.difficulty}
                                        </span>
                                        <span className="text-muted-foreground">
                                            {quest.maxProgress} Progress • {quest.rewards.xp} XP • {quest.rewards.gold} Gold
                                        </span>
                                        {quest.duration && (
                                            <span className="text-muted-foreground">Duration: {quest.duration}</span>
                                        )}
                                        {!quest.enabled && (
                                            <span className="px-2 py-1 bg-red-900/20 text-red-400 rounded">
                                                Disabled
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleOpenModal(quest)}
                                        className="p-2 hover:bg-muted rounded-lg transition-colors text-foreground"
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
