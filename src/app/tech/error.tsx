"use client";

/** Last-resort screen for the field app: queued work lives in IndexedDB, so a crash never loses it. */
export default function TechError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div role="alert" className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-xl font-bold">Something went wrong</h1>
      <p className="text-ops-ink-muted">Anything you did is still saved on this phone and will be sent when you&apos;re online.</p>
      <button type="button" onClick={reset} className="min-h-[48px] rounded bg-ops-ink px-6 font-bold text-white">Reload this screen</button>
    </div>
  );
}
