import type { Metadata } from "next";

export const metadata: Metadata = { title: "Finance | Operations" };

export default function FinanceLayout({ children }: { children: React.ReactNode }) {
  return children;
}
