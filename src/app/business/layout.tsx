import type { Metadata } from "next";

export const metadata: Metadata = { title: "For companies" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
