import { B2B_PUBLIC_HOME, B2B_WORKSPACES } from "@/lib/b2b-paths";

/** The 404 of the logged-in B2B app: no marketplace chrome, links only to B2B places. Server-rendered (no hooks). */
export function B2bNotFoundView() {
  return (
    <main className="mx-auto max-w-xl px-6 py-24 text-center">
      <p className="text-sm font-bold uppercase tracking-wide text-ops-ink-muted">404</p>
      <h1 className="mt-2 font-display text-3xl font-bold text-ops-ink">Page not found</h1>
      <p className="mt-3 text-ops-ink-muted">The page doesn&apos;t exist, or you don&apos;t have access to it.</p>
      <p className="mt-6 flex flex-wrap justify-center gap-4">
        <a href={B2B_WORKSPACES} className="inline-flex min-h-[44px] items-center rounded bg-ops-ink px-4 font-bold text-white">My workspaces</a>
        <a href={B2B_PUBLIC_HOME} className="inline-flex min-h-[44px] items-center underline">About Work4U for field service</a>
      </p>
    </main>
  );
}
