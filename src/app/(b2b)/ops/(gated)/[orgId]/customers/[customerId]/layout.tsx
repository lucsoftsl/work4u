import type { Metadata } from "next";

export const metadata: Metadata = { title: "Customer | Operations" };

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return children;
}
