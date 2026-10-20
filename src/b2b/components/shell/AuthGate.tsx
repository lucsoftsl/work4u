"use client";

import { useTranslation } from "@/lib/i18n";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { b2bSignInPath } from "@/lib/b2b-paths";
import { currentPath } from "@/lib/auth-redirect";

/** Waits for the session, then sends signed-out visitors to the B2B sign-in with a return path (B2B pages only; see safeB2bRedirect). */
export function AuthGate({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { user, loading, connectionIssue } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace(b2bSignInPath(currentPath()));
  }, [loading, user, router]);

  // Signed in but the API is unreachable (offline): the field app still opens from what is saved on the phone.
  if (connectionIssue) return <>{children}</>;

  if (loading || !user) {
    return (
      <div role="status" aria-busy="true" className="grid min-h-screen place-items-center bg-ops-canvas text-ops-ink-muted">
        {t("b2b.common.loadingDots", "Loading…")}
      </div>
    );
  }
  return <>{children}</>;
}
