"use client";

import Link from "@/components/LocaleLink";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "@/lib/i18n";
import { useAccountMode } from "@/hooks/useAccountMode";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { NAV, isActivePath, isChromeless } from "@/components/shell/nav-config";
import { useChatThreadOpen } from "@/lib/chat-chrome";
import { cn } from "@/lib/utils";

/** Mobile (< md) bottom tab bar for signed-in users: five mode-aware tabs (design-tokens §5.6). */
export function BottomTabBar() {
  const pathname = usePathname();
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const { view } = useAccountMode();
  const unread = useUnreadMessages();
  const chatThreadOpen = useChatThreadOpen();

  // An open chat thread has its own full-height layout with a back button; the inbox list keeps the bar.
  if (!isAuthenticated || isChromeless(pathname) || (pathname.startsWith("/chat") && chatThreadOpen)) return null;

  return (
    <>
      {/* Spacer so page content is never hidden behind the fixed bar. */}
      <div aria-hidden="true" className="h-[calc(var(--tabbar-h)+env(safe-area-inset-bottom))] md:hidden" />
      <nav
        aria-label={t("nav.sections")}
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <ul className="mx-auto grid h-tabbar max-w-lg grid-cols-5 gap-1 px-1.5">
          {NAV[view].map(({ href, shortKey, icon: Icon }) => {
            const active = isActivePath(pathname, href);
            const isMessages = href === "/chat";
            return (
              <li key={href} className="flex min-w-0">
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  aria-label={isMessages && unread > 0 ? `${t(shortKey)} — ${t("chat.unreadCount").replace("{count}", String(unread))}` : undefined}
                  className={cn(
                    "relative my-1.5 flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-card text-micro normal-case tracking-normal transition-colors",
                    active ? "bg-primary-soft text-primary" : "text-ink-muted hover:text-ink"
                  )}
                >
                  <Icon className="h-6 w-6 shrink-0" aria-hidden="true" />
                  <span className="w-full truncate px-0.5 text-center">{t(shortKey)}</span>
                  {isMessages && unread > 0 ? (
                    <span aria-hidden="true" className="absolute right-2 top-1 h-2.5 w-2.5 rounded-full bg-ember" />
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
