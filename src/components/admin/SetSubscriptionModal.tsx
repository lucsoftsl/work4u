"use client";

import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useTranslation } from '@/lib/i18n';
import type { AdminGrantablePlan, AdminUserSummary } from '@/lib/admin-api';

interface SetSubscriptionModalProps {
    isOpen: boolean;
    user: AdminUserSummary | null;
    initialPlan: AdminGrantablePlan;
    onClose: () => void;
    onSave: (plan: AdminGrantablePlan, options: { reason?: string; activeFrom?: string; activeTo?: string }) => Promise<void>;
    isLoading?: boolean;
}

const GRANTABLE_PLANS: AdminGrantablePlan[] = ["free", "starter", "pro", "business"];

export function SetSubscriptionModal({
    isOpen,
    user,
    initialPlan,
    onClose,
    onSave,
    isLoading = false,
}: SetSubscriptionModalProps) {
    const { t } = useTranslation();
    const [plan, setPlan] = useState<AdminGrantablePlan>(initialPlan);
    const [reason, setReason] = useState('');
    const [activeFrom, setActiveFrom] = useState('');
    const [activeTo, setActiveTo] = useState('');
    const [error, setError] = useState<string | null>(null);

    if (!isOpen || !user) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (activeFrom && activeTo && activeTo <= activeFrom) {
            setError(t('adminUsers.activeToBeforeActiveFromError'));
            return;
        }
        await onSave(plan, {
            reason: reason.trim() || undefined,
            activeFrom: activeFrom || undefined,
            activeTo: activeTo || undefined,
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-card border border-border rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 flex items-center justify-between bg-card border-b border-border p-6">
                    <h2 className="text-xl font-bold text-foreground">
                        {t('adminUsers.setPlanModalTitle')}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    <p className="text-sm text-muted-foreground truncate">
                        {user.displayName || user.email}
                    </p>

                    <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                            {t('adminUsers.planLabel')}
                        </label>
                        <select
                            value={plan}
                            onChange={(e) => setPlan(e.target.value as AdminGrantablePlan)}
                            className="w-full px-4 py-2 border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                            {GRANTABLE_PLANS.map((p) => (
                                <option key={p} value={p}>
                                    {p.charAt(0).toUpperCase() + p.slice(1)}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                {t('adminUsers.activeFromLabel')}
                            </label>
                            <input
                                type="date"
                                value={activeFrom}
                                onChange={(e) => setActiveFrom(e.target.value)}
                                className="w-full px-4 py-2 border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                {t('adminUsers.activeToLabel')}
                            </label>
                            <input
                                type="date"
                                value={activeTo}
                                onChange={(e) => setActiveTo(e.target.value)}
                                className="w-full px-4 py-2 border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        </div>
                    </div>
                    <p className="text-xs text-muted-foreground -mt-2">
                        {t('adminUsers.activeWindowHint')}
                    </p>

                    <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                            {t('adminUsers.reasonLabel')}
                        </label>
                        <input
                            type="text"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="w-full px-4 py-2 border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder={t('adminUsers.reasonPlaceholder')}
                        />
                    </div>

                    {error && <p className="text-sm text-red-600">{error}</p>}

                    <div className="flex gap-3 pt-4 border-t border-border">
                        <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                            {t('admin.cancel')}
                        </Button>
                        <Button type="submit" disabled={isLoading} className="flex-1">
                            {isLoading ? t('admin.saving') : t('adminUsers.setPlanConfirm')}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
