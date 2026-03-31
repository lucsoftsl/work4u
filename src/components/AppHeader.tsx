"use client";

import { useAuth } from '@/context/AuthContext';
import { ChatHeaderIcon } from "@/components/ChatHeaderIcon";
import { XPBar } from '@/components/gamification/XPBar';
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Briefcase, LayoutDashboard, Settings, Shield, User } from 'lucide-react';

export function AppHeader() {
    const pathname = usePathname();
    const { isAuthenticated } = useAuth();

    // Don't show header on public marketing and auth onboarding screens
    if (pathname === '/' || pathname.startsWith('/signup') || pathname.startsWith('/signin')) {
        return null;
    }

    return (
        <header className="sticky top-0 z-30 flex-shrink-0 border-b border-outline/80 bg-[#eef2f6]/95 backdrop-blur">
            <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between gap-4">
                    <Link href="/" className="flex items-center gap-3 font-black tracking-tight text-[#10324a] transition-opacity hover:opacity-80">
                        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1e6d8a] text-white shadow-[0_10px_24px_rgba(30,109,138,0.22)]">
                            <Shield className="h-5 w-5" />
                        </span>
                        <span className="flex flex-col">
                            <span className="text-xl leading-none">Work4U</span>
                            <span className="text-xs font-semibold uppercase tracking-[0.24em] text-[#5c728d]">Workspace</span>
                        </span>
                    </Link>

                    {isAuthenticated && (
                        <div className="flex items-center gap-2 md:gap-3">
                            <Link
                                href="/dashboard"
                                className="hidden items-center gap-2 rounded-full border border-outline bg-white px-4 py-2 text-sm font-semibold text-[#26445e] transition-colors hover:bg-[#f7fafc] md:inline-flex"
                            >
                                <LayoutDashboard className="h-4 w-4 text-brand" />
                                Dashboard
                            </Link>
                            <Link
                                href="/my-jobs"
                                className="hidden items-center gap-2 rounded-full border border-outline bg-white px-4 py-2 text-sm font-semibold text-[#26445e] transition-colors hover:bg-[#f7fafc] md:inline-flex"
                            >
                                <Briefcase className="h-4 w-4 text-brand" />
                                My Jobs
                            </Link>
                            <Link
                                href="/profile"
                                className="inline-flex items-center gap-2 rounded-full border border-outline bg-white px-4 py-2 text-sm font-semibold text-[#26445e] transition-colors hover:bg-[#f7fafc]"
                            >
                                <User className="h-4 w-4 text-brand" />
                                Profile
                            </Link>
                            {true && ( // TODO: Check if user is ADMIN
                                <Link
                                    href="/admin"
                                    className="inline-flex items-center gap-2 rounded-full border border-[#cfe0ea] bg-[#e8f3f7] px-4 py-2 text-sm font-semibold text-[#215b72] transition-colors hover:bg-[#dcecf2]"
                                    title="Admin Dashboard"
                                >
                                    <Settings className="h-4 w-4" />
                                    Admin
                                </Link>
                            )}
                            <ChatHeaderIcon />
                        </div>
                    )}
                </div>

                {/* XP Bar for authenticated users */}
                {isAuthenticated && (
                    <div className="mt-3 rounded-3xl border border-outline/70 bg-white px-4 py-3 shadow-soft">
                        <XPBar />
                    </div>
                )}
            </div>
        </header>
    );
}
