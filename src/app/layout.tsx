import type { Metadata, Viewport } from "next";
import "./globals.css";
import { display, body } from "./fonts";
import Providers from "@/app/providers";
import { ChatNotifications } from "@/components/ChatNotifications";
import { AchievementToast } from "@/components/gamification/AchievementToast";
import { LevelUpModal } from "@/components/gamification/LevelUpModal";
import { AppHeader } from "@/components/AppHeader";
import { BottomTabBar } from "@/components/BottomTabBar";
import { SkipLink } from "@/components/SkipLink";
import Footer from "@/components/Footer";

// Server root layout: real <title>/<meta> per route (route segments add their own titles via
// layout.tsx metadata), self-hosted fonts, one <main> landmark.
export const metadata: Metadata = {
  title: {
    default: "work4u — local help and local work",
    template: "%s · work4u",
  },
  description: "Post a task and get help from people nearby, or find paid work that fits your skills.",
  applicationName: "work4u",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#F7F3EA",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body className="flex min-h-screen flex-col bg-canvas font-body text-ink antialiased">
        <Providers>
          <SkipLink />
          <AppHeader />
          <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
            {children}
          </main>
          <Footer />
          <BottomTabBar />
          <ChatNotifications />
          <AchievementToast />
          <LevelUpModal />
        </Providers>
      </body>
    </html>
  );
}
