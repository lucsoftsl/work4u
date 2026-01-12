"use client";
import { ChatHeaderIcon } from "@/components/ChatHeaderIcon";
import "./globals.css";
import Providers from '@/app/providers';
import { ChatNotifications } from '@/components/ChatNotifications';
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  return (
    <html lang="en">
      <body className="antialiased min-h-screen h-screen flex flex-col">
        <Providers>
          {/* Global minimal header with Home link (hidden on Home page to avoid duplication) */}
          {pathname !== '/' && (
            <header className="bg-white border-b border-gray-200 flex-shrink-0">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
                <Link href="/" className="text-2xl font-bold text-blue-600 hover:text-blue-700 transition-colors">
                  work4u
                </Link>
                <ChatHeaderIcon />
              </div>
            </header>
          )}
          <main className="flex-1 min-h-0">
            {children}
          </main>
          <ChatNotifications />
        </Providers>
      </body>
    </html>
  );
}
