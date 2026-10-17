"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";
import { useSessionHint } from "./SessionAwareLink";

export interface MenuLink { href: string; label: string }

/** Phone menu of the public B2B header: a 44 px button (aria-expanded), Esc closes, links stay real anchors. */
export function MobileMenu({ label, links, signIn, workspace, cta }: { label: string; links: MenuLink[]; signIn: MenuLink; workspace: MenuLink; cta: MenuLink }) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const account = useSessionHint() ? workspace : signIn;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const row = "flex min-h-[52px] items-center rounded-control px-3 text-body font-bold text-ink hover:bg-sunken";
  return (
    <div className="lg:hidden">
      <button ref={buttonRef} type="button" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((v) => !v)} className={buttonClasses("ghost", "sm", "text-ink")}>
        {open ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
        <span className="sr-only sm:not-sr-only">{label}</span>
      </button>
      {open ? (
        <div id={panelId} className="absolute inset-x-0 top-full border-b border-line bg-surface px-[var(--gutter)] pb-4 pt-2 shadow-raised">
          <nav aria-label={label}>
            {links.map((l) => <a key={l.href} href={l.href} onClick={() => setOpen(false)} className={row}>{l.label}</a>)}
            <div className="my-2 border-t border-line" />
            <a href={account.href} className={row}>{account.label}</a>
          </nav>
          <a href={cta.href} className={buttonClasses("primary", "lg", "mt-3 w-full")}>{cta.label}</a>
        </div>
      ) : null}
    </div>
  );
}
