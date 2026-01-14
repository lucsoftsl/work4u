"use client";
import "./globals.css";
import Providers from '@/app/providers';
import { ChatNotifications } from '@/components/ChatNotifications';
import { AchievementToast } from '@/components/gamification/AchievementToast';
import { LevelUpModal } from '@/components/gamification/LevelUpModal';
import { AppHeader } from '@/components/AppHeader';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen h-screen flex flex-col">
        <Providers>
          <AppHeader />
          <main className="flex-1 min-h-0">
            {children}
          </main>
          <ChatNotifications />
          <AchievementToast />
          <LevelUpModal />
        </Providers>
      </body>
    </html>
  );
}
