"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Globe } from "lucide-react";

export interface LanguageOption { code: string; label: string; href: string }

/**
 * Language picker of the public B2B footer: the marketplace footer's dropdown (globe button, list opening upwards), but each choice is
 * a real link to that language's page, since these static pages have no client-side locale.
 */
export function B2bLanguageMenu({ label, current, options }: { label: string; current: string; options: LanguageOption[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); buttonRef.current?.focus(); } };
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("mousedown", onClick); };
  }, [open]);

  const currentLabel = options.find((o) => o.code === current)?.label ?? current.toUpperCase();
  return (
    <div ref={ref} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={listId}
        aria-label={`${label}: ${currentLabel}`}
        className="inline-flex min-h-[44px] items-center gap-2 rounded-control border border-line-strong bg-surface px-3 text-label text-ink hover:bg-sunken"
      >
        <Globe className="h-4 w-4" aria-hidden="true" />
        {currentLabel}
      </button>
      {open ? (
        <ul id={listId} aria-label={label} className="absolute bottom-full left-0 z-50 mb-2 w-48 rounded-card border border-line bg-surface p-1.5 shadow-raised">
          {options.map((o) => (
            <li key={o.code}>
              <a
                href={o.href}
                hrefLang={o.code}
                lang={o.code}
                aria-current={o.code === current ? "true" : undefined}
                className={`flex min-h-[44px] w-full items-center rounded-control px-3 text-left text-label ${o.code === current ? "bg-primary-soft text-primary" : "text-ink hover:bg-sunken"}`}
              >
                {o.label}
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
