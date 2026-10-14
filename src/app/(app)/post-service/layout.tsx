import type { Metadata } from "next";

export const metadata: Metadata = { title: "Offer a service", robots: { index: false, follow: false } };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
