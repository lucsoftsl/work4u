"use client";

import { useEffect, useState, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import { markNotificationRead } from '@/store/slices/gamificationSlice';
import { Trophy, Star, Gift, CheckCircle, Flame, X } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

export function AchievementToast() {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const notifications = useSelector((state: RootState) =>
        state.gamification.notifications.filter(n => !n.read)
    );
    const [visible, setVisible] = useState<string[]>([]);

    const handleDismiss = useCallback((id: string) => {
        setVisible(prev => prev.filter(v => v !== id));
        setTimeout(() => {
            dispatch(markNotificationRead(id));
        }, 300);
    }, [dispatch]);

    useEffect(() => {
        notifications.forEach(notification => {
            if (!visible.includes(notification.id)) {
                setVisible(prev => [...prev, notification.id]);

                // Auto-dismiss after 5 seconds
                setTimeout(() => {
                    handleDismiss(notification.id);
                }, 5000);
            }
        });
    }, [notifications, visible, handleDismiss]);

    const getIcon = (type: string) => {
        switch (type) {
            case 'achievement':
                return Trophy;
            case 'level_up':
                return Star;
            case 'quest_complete':
                return CheckCircle;
            case 'reward':
                return Gift;
            case 'challenge':
                return Flame;
            default:
                return Trophy;
        }
    };

    const getRarityClass = (type: string) => {
        switch (type) {
            case 'achievement':
                return 'rarity-legendary';
            case 'level_up':
                return 'rarity-epic';
            case 'quest_complete':
                return 'rarity-rare';
            default:
                return 'rarity-uncommon';
        }
    };

    return (
        <div className="fixed top-20 right-4 z-50 flex flex-col gap-2 max-w-sm">
            {notifications.map((notification) => {
                const Icon = getIcon(notification.type);
                const isVisible = visible.includes(notification.id);

                return (
                    <div
                        key={notification.id}
                        className={`
              ${getRarityClass(notification.type)}
              bg-card border-2 rounded-lg p-4 
              transition-all duration-500 transform
              ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
              animate-achievement
            `}
                    >
                        <div className="flex items-start gap-3">
                            <div className={`
                p-2 rounded-full 
                ${notification.type === 'achievement' ? 'bg-secondary/20' : ''}
                ${notification.type === 'level_up' ? 'bg-primary/20' : ''}
                ${notification.type === 'quest_complete' ? 'bg-accent/20' : ''}
                animate-pulse
              `}>
                                <Icon className={`
                  w-6 h-6
                  ${notification.type === 'achievement' ? 'text-secondary' : ''}
                  ${notification.type === 'level_up' ? 'text-primary' : ''}
                  ${notification.type === 'quest_complete' ? 'text-accent' : ''}
                `} />
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-sm mb-1">{notification.title}</h4>
                                <p className="text-xs text-muted-foreground">{notification.message}</p>
                            </div>
                            <button
                                onClick={() => handleDismiss(notification.id)}
                                className="text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
