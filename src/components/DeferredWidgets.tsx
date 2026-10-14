"use client";

import dynamic from "next/dynamic";

// Overlays that only matter after interaction or sign-in (chat toasts, achievement toast, level-up dialog). Loading them after
// hydration keeps them out of the first-load JavaScript of every public page (a large part of the mobile LCP/TBT cost).
const ChatNotifications = dynamic(() => import("@/components/ChatNotifications").then((m) => m.ChatNotifications), { ssr: false });
const AchievementToast = dynamic(() => import("@/components/gamification/AchievementToast").then((m) => m.AchievementToast), { ssr: false });
const LanguageSuggestion = dynamic(() => import("@/components/LanguageSuggestion").then((m) => m.LanguageSuggestion), { ssr: false });
const LevelUpModal = dynamic(() => import("@/components/gamification/LevelUpModal").then((m) => m.LevelUpModal), { ssr: false });

export function DeferredWidgets() {
  return (
    <>
      <ChatNotifications />
      <AchievementToast />
      <LevelUpModal />
      <LanguageSuggestion />
    </>
  );
}
