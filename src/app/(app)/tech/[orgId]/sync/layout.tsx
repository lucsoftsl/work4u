import type { Metadata } from "next";

export const metadata: Metadata = { title: "Sync" };

export default function SyncLayout({ children }: { children: React.ReactNode }) {
  return children;
}
