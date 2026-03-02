"use client";

import { useAuth } from '@/context/AuthContext';
import { ChatHeaderIcon } from "@/components/ChatHeaderIcon";
import { XPBar } from '@/components/gamification/XPBar';
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Swords, Scroll, User, Briefcase, Settings } from 'lucide-react';

export function AppHeader() {
    const pathname = usePathname();
    const { isAuthenticated } = useAuth();

    // Don't show header on public marketing and auth onboarding screens
    if (pathname === '/' || pathname.startsWith('/signup')) {
        return null;
    }

    return (
        <header className="bg-card border-b-2 border-primary/30 flex-shrink-0 shadow-lg shadow-primary/10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                <div className="flex items-center justify-between mb-3">
                    <Link href="/" className="flex items-center gap-2 text-2xl font-bold bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent hover:opacity-80 transition-opacity">
                        <Swords className="w-6 h-6 text-primary" />
                        work4u
                        <span className="text-xs text-muted-foreground font-normal">Quest Board</span>
                    </Link>

                    {isAuthenticated && (
                        <div className="flex items-center gap-4">
                            <Link
                                href="/jobs"
                                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors border border-border"
                            >
                                <Scroll className="w-4 h-4 text-accent" />
                                <span className="text-sm font-medium">Quests</span>
                            </Link>
                            <Link
                                href="/my-jobs"
                                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors border border-border"
                            >
                                <Briefcase className="w-4 h-4 text-primary" />
                                <span className="text-sm font-medium">My Quests</span>
                            </Link>
                            <Link
                                href="/profile"
                                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors border border-border"
                            >
                                <User className="w-4 h-4 text-secondary" />
                                <span className="text-sm font-medium">Character</span>
                            </Link>
                            {true && ( // TODO: Check if user is ADMIN
                                <Link
                                    href="/admin"
                                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/20 hover:bg-secondary/30 transition-colors border border-secondary/50"
                                    title="Admin Dashboard"
                                >
                                    <Settings className="w-4 h-4 text-secondary" />
                                    <span className="text-sm font-medium">Admin</span>
                                </Link>
                            )}
                            <ChatHeaderIcon />
                        </div>
                    )}
                </div>

                {/* XP Bar for authenticated users */}
                {isAuthenticated && (
                    <div className="mt-2">
                        <XPBar />
                    </div>
                )}
            </div>
        </header>
    );
}
