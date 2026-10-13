"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { currentPath, signInPath } from "@/lib/auth-redirect";

/** Waits for the session, then sends signed-out visitors to sign-in with a return path. */
export function AuthGate({ children }: { children: ReactNode }) {
  const { user, loading, connectionIssue } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace(signInPath(currentPath()));
  }, [loading, user, router]);

  // Signed in but the API is unreachable (offline): the field app still opens from what is saved on the phone.
  if (connectionIssue) return <>{children}</>;

  if (loading || !user) {
    return (
      <div role="status" aria-busy="true" className="grid min-h-screen place-items-center bg-ops-canvas text-ops-ink-muted">
        Loading…
      </div>
    );
  }
  return <>{children}</>;
}
