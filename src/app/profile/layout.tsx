import type { Metadata } from "next";

export const metadata: Metadata = { title: "Profile and settings" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
