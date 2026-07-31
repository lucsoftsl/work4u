"use client";
import "./globals.css";
import Providers from '@/app/providers';
import { ChatNotifications } from '@/components/ChatNotifications';
import { AchievementToast } from '@/components/gamification/AchievementToast';
import { LevelUpModal } from '@/components/gamification/LevelUpModal';
import { AppHeader } from '@/components/AppHeader';
import Footer from '@/components/Footer';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen flex flex-col">
        <Providers>
          <AppHeader />
          <main className="flex-1">
            {children}
          </main>
          <Footer />
          <ChatNotifications />
          <AchievementToast />
          <LevelUpModal />
        </Providers>
      </body>
    </html>
  );
}
