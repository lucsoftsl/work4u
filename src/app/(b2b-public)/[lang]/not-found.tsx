import Link from "next/link";
import { B2B_PUBLIC_HOME } from "@/lib/b2b-paths";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-xl px-6 py-24 text-center">
      <p className="text-micro uppercase text-ink-muted">404</p>
      <h1 className="mt-2 font-display text-h1 text-ink">Page not found</h1>
      <p className="mt-3"><Link href={B2B_PUBLIC_HOME} className="text-primary underline">Work4U for field service</Link></p>
    </main>
  );
}
