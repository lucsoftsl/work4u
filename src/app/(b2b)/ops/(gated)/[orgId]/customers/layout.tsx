import type { Metadata } from "next";

export const metadata: Metadata = { title: "Customers | Operations" };

export default function CustomersLayout({ children }: { children: React.ReactNode }) {
  return children;
}
