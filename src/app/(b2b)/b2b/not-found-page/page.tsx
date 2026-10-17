import type { Metadata } from "next";
import { B2bNotFoundView } from "@/components/layout/B2bNotFoundView";

export const metadata: Metadata = { title: "Page not found", robots: { index: false, follow: false } };

// Unknown /ops/{org}/… and /tech/{org}/… screens are rewritten here by src/proxy.ts with status 404 (a page, not notFound(), so the
// server HTML is real content inside the B2B layout).
export default function B2bNotFoundPage() {
  return <B2bNotFoundView />;
}
