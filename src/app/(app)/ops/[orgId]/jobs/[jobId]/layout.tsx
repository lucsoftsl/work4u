import type { Metadata } from "next";

export const metadata: Metadata = { title: "Job" };

export default function JobLayout({ children }: { children: React.ReactNode }) {
  return children;
}
