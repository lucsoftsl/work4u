"use client";

import { useState } from "react";
import { resolveLogoUrl } from "./logo";

/** The company logo with a letter fallback when there is none or the (short-lived signed) link fails to load. */
export function LogoImage({ url, name, className = "h-16 w-16", alt }: { url: string | null | undefined; name: string; className?: string; alt?: string }) {
  const src = resolveLogoUrl(url);
  const [failed, setFailed] = useState<string | null>(null);
  if (!src || failed === src) {
    return <span aria-hidden="true" className={`${className} flex shrink-0 items-center justify-center rounded border border-dashed border-ops-border-strong text-sm font-bold text-ops-ink-subtle`}>{name.slice(0, 1).toUpperCase()}</span>;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt ?? ""} onError={() => setFailed(src)} className={`${className} shrink-0 rounded border border-ops-border bg-white object-contain`} />;
}
