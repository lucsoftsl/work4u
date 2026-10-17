"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Building2, ChevronDown, LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { B2B_WORKSPACES } from "@/lib/b2b-paths";

interface Labels { account: string; workspaces: string; signOut: string }

/**
 * Signed-in state of the public B2B header on the sign-in and company-start pages (they run inside the auth provider).
 * Renders nothing while auth resolves or when signed out, so the header keeps its Sign in link.
 */
export function B2bAccountMenu({ labels, fallback }: { labels: Labels; fallback: React.ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); buttonRef.current?.focus(); } };
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("mousedown", onClick); };
  }, [open]);

  if (loading || !user) return <>{fallback}</>;

  const name = user.displayName || user.email || labels.account;
  const item = "flex min-h-[44px] w-full items-center gap-2 rounded-control px-3 text-left text-label text-ink hover:bg-sunken";
  return (
    <div ref={ref} className="relative">
      <button ref={buttonRef} type="button" aria-haspopup="menu" aria-expanded={open} aria-controls={menuId} onClick={() => setOpen((v) => !v)} className="flex min-h-[44px] items-center gap-2 rounded-control px-1 hover:bg-sunken">
        <span aria-hidden="true" className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-soft font-display text-label text-primary">{name.charAt(0).toUpperCase()}</span>
        <span className="hidden max-w-[10rem] truncate text-label text-ink sm:inline">{name}</span>
        <span className="sr-only sm:hidden">{labels.account}</span>
        <ChevronDown className="hidden h-4 w-4 text-ink-muted sm:inline" aria-hidden="true" />
      </button>
      {open ? (
        <div id={menuId} role="menu" className="absolute right-0 top-full z-50 mt-2 w-60 rounded-card border border-line bg-surface p-1.5 shadow-raised">
          {user.email ? <p className="truncate px-3 py-2 text-caption text-ink-muted">{user.email}</p> : null}
          <a role="menuitem" href={B2B_WORKSPACES} className={item}><Building2 className="h-4 w-4 text-ink-muted" aria-hidden="true" />{labels.workspaces}</a>
          <div className="my-1 border-t border-line" />
          <button role="menuitem" type="button" onClick={() => { setOpen(false); void signOut(); }} className={item}><LogOut className="h-4 w-4 text-ink-muted" aria-hidden="true" />{labels.signOut}</button>
        </div>
      ) : null}
    </div>
  );
}
