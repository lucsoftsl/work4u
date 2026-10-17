"use client";

import { useSyncExternalStore } from "react";
import { hasSessionHint } from "@/lib/auth-sdk";

export interface SessionLinkTarget { href: string; label: string }

const noop = () => () => undefined;

/** True after hydration when the `work4u_auth` hint cookie says someone is signed in (no auth SDK on these static pages). */
export function useSessionHint(): boolean {
  return useSyncExternalStore(noop, hasSessionHint, () => false);
}

/**
 * "Sign in" on the static B2B pages, which have no auth provider. The server HTML always says Sign in; once the page hydrates and the
 * session hint cookie is there, it becomes "My workspace" (/ops picks the right workspace, or the company wizard).
 */
export function SessionAwareLink({ signIn, workspace, className }: { signIn: SessionLinkTarget; workspace: SessionLinkTarget; className?: string }) {
  const target = useSessionHint() ? workspace : signIn;
  return <a href={target.href} className={className}>{target.label}</a>;
}
