import type { Metadata } from "next";

export const metadata: Metadata = { title: "Offer a service" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
