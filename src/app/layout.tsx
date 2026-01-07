"use client";
import "./globals.css";
import Providers from '@/app/providers';
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
      <body className="antialiased">
        {/* Global minimal header with Home link (hidden on Home page to avoid duplication) */}
        {pathname !== '/' && (
          <header className="bg-white border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <Link href="/" className="text-2xl font-bold text-blue-600 hover:text-blue-700 transition-colors">
                work4u
              </Link>
            </div>
          </header>
        )}
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
