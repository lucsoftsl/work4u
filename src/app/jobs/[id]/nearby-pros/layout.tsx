import type { Metadata } from "next";

export const metadata: Metadata = { title: "Workers near your job" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
