"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "@/components/LocaleLink";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, Gift, LogOut, Menu, MessageSquare, Settings, User, X, Zap } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "@/lib/i18n";
import { currentPath, signInPath } from "@/lib/auth-redirect";
import { useAccountMode, type ViewMode } from "@/hooks/useAccountMode";
import { useEntitlements } from "@/hooks/useEntitlements";
import { useMenuKeys } from "@/hooks/useMenuKeys";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { BrandMark } from "@/components/BrandMark";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { buttonClasses } from "@/components/ui/Button";
import { NAV, isActivePath, isChromeless } from "@/components/shell/nav-config";
import { cn } from "@/lib/utils";

type SwitchValue = ViewMode | "business";

const BUSINESS_HOME = "/business/dashboard";
const isBusinessPath = (pathname: string | null) => pathname === "/business" || Boolean(pathname?.startsWith("/business/"));

/**
 * "Hiring | Working" switch for BOTH accounts, plus "Business" for anyone whose plan includes company
 * features (Business subscribers, admins). Switching goes to that area's home and is announced.
 */
export function ViewModeSwitch({ className, fullWidth = false }: { className?: string; fullWidth?: boolean }) {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const { mode, view, setView } = useAccountMode();
  const entitlements = useEntitlements();
  const [announcement, setAnnouncement] = useState("");

  const hasBusiness = entitlements?.companyFeatures === true;
  if (mode !== "BOTH" && !hasBusiness) return null;

  const options: { value: SwitchValue; label: string }[] = [];
  if (mode !== "WORKER") options.push({ value: "hiring", label: t("nav.viewHiring") });
  if (mode !== "REQUESTOR") options.push({ value: "working", label: t("nav.viewWorking") });
  if (hasBusiness) options.push({ value: "business", label: t("nav.viewBusiness", "Business") });

  const current: SwitchValue = hasBusiness && isBusinessPath(pathname) ? "business" : view;

  const change = (next: SwitchValue) => {
    if (next === current) return;
    if (next === "business") {
      setAnnouncement(t("nav.switchedBusiness", "Switched to Business"));
      router.push(BUSINESS_HOME);
      return;
    }
    setView(next);
    setAnnouncement(t(next === "hiring" ? "nav.switchedHiring" : "nav.switchedWorking"));
    router.push("/dashboard");
  };

  return (
    <>
      <SegmentedControl<SwitchValue>
        label={t("nav.viewMode")}
        tone="mode"
        value={current}
        onChange={change}
        options={options}
        className={cn("min-w-0 shrink", fullWidth && "flex w-full", className)}
      />
      <span className="sr-only" role="status" aria-live="polite">
        {announcement}
      </span>
    </>
  );
}

function useDismiss(open: boolean, close: () => void, ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && close();
    const onClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) close();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open, close, ref]);
}

function AccountMenu() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  useDismiss(open, () => setOpen(false), ref);
  const onMenuKeys = useMenuKeys(open, () => setOpen(false), listRef, triggerRef);

  const name = user?.displayName?.trim() || user?.email?.split("@")[0] || "";
  const initial = (name[0] || "?").toUpperCase();
  const isAdmin = user?.userType === "ADMIN";

  const handleSignOut = async () => {
    setOpen(false);
    try {
      await signOut();
      router.push(signInPath(currentPath()));
    } catch (error) {
      console.error("Sign out failed:", error);
    }
  };

  const item = "flex min-h-[44px] w-full items-center gap-3 rounded-control px-3 text-left text-label text-ink hover:bg-sunken";

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && !open) {
            e.preventDefault();
            setOpen(true);
          }
        }}
        aria-label={t("nav.account")}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        className="flex min-h-[44px] items-center gap-2 rounded-control px-1 hover:bg-sunken"
      >
        {user?.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.photoUrl} alt="" width={36} height={36} decoding="async" className="h-9 w-9 rounded-full object-cover" />
        ) : (
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-soft font-display text-label text-primary">{initial}</span>
        )}
        <span className="hidden max-w-[10rem] truncate text-label text-ink xl:inline">{name}</span>
        <ChevronDown className="hidden h-4 w-4 text-ink-muted xl:inline" aria-hidden="true" />
      </button>
      {open ? (
        <div ref={listRef} id={menuId} role="menu" onKeyDown={onMenuKeys} className="absolute right-0 top-full z-50 mt-2 w-60 rounded-card border border-line bg-surface p-1.5 shadow-raised">
          <Link role="menuitem" href="/profile" onClick={() => setOpen(false)} className={item}>
            <User className="h-4 w-4 text-ink-muted" aria-hidden="true" />
            {t("nav.profile")}
          </Link>
          <Link role="menuitem" href="/pricing" onClick={() => setOpen(false)} className={item}>
            <Zap className="h-4 w-4 text-ink-muted" aria-hidden="true" />
            {t("nav.upgrade")}
          </Link>
          <Link role="menuitem" href="/referrals" onClick={() => setOpen(false)} className={item}>
            <Gift className="h-4 w-4 text-ink-muted" aria-hidden="true" />
            {t("nav.invite")}
          </Link>
          {isAdmin ? (
            <Link role="menuitem" href="/admin" onClick={() => setOpen(false)} className={item}>
              <Settings className="h-4 w-4 text-ink-muted" aria-hidden="true" />
              {t("nav.admin")}
            </Link>
          ) : null}
          <div className="my-1 border-t border-line" />
          <button role="menuitem" type="button" onClick={handleSignOut} className={item}>
            <LogOut className="h-4 w-4 text-ink-muted" aria-hidden="true" />
            {t("nav.signOut")}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function MessagesLink({ unread }: { unread: number }) {
  const { t } = useTranslation();
  const label = unread > 0 ? `${t("nav.messages")} — ${t("chat.unreadCount").replace("{count}", String(unread))}` : t("nav.messages");
  return (
    <Link href="/chat" aria-label={label} className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-ink hover:bg-sunken">
      <MessageSquare className="h-5 w-5" aria-hidden="true" />
      {unread > 0 ? (
        <span aria-hidden="true" className="absolute right-1 top-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-ember px-1 text-micro text-on-fill">
          {unread > 99 ? "99+" : unread}
        </span>
      ) : null}
    </Link>
  );
}

export function AppHeader() {
  const pathname = usePathname();
  const { t } = useTranslation();
  const { isAuthenticated, loading } = useAuth();
  const { view } = useAccountMode();
  const unread = useUnreadMessages();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const moreTriggerRef = useRef<HTMLButtonElement>(null);
  const moreListRef = useRef<HTMLElement>(null);
  useDismiss(menuOpen, () => setMenuOpen(false), menuRef);
  const onMoreKeys = useMenuKeys(menuOpen, () => setMenuOpen(false), moreListRef, moreTriggerRef);

  if (isChromeless(pathname)) return null;

  const items = NAV[view].slice(0, 4);
  const navLink = (active: boolean) =>
    cn(
      "relative inline-flex min-h-[44px] shrink-0 items-center whitespace-nowrap rounded-control px-2 text-[0.9375rem] font-bold transition-colors xl:px-3",
      active
        ? "text-primary after:absolute after:inset-x-2 after:bottom-1 after:h-0.5 after:rounded-full after:bg-primary"
        : "text-ink-muted hover:text-ink"
    );

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface">
      <div className="mx-auto flex h-14 max-w-content items-center gap-2 px-4 md:h-header md:gap-3 md:px-6">
        <BrandMark size="sm" className="md:text-2xl" />

        {loading ? (
          // Reserve the right-hand cluster while auth resolves (no layout shift).
          <div className="ml-auto h-9 w-28 rounded-control bg-sunken" aria-hidden="true" />
        ) : isAuthenticated ? (
          <>
            <nav aria-label={t("nav.mainNav")} className="ml-4 hidden min-w-0 items-center gap-1 lg:flex">
              {items.map(({ href, labelKey }) => {
                const active = isActivePath(pathname, href);
                return (
                  <Link key={href} href={href} aria-current={active ? "page" : undefined} className={navLink(active)}>
                    {t(labelKey)}
                  </Link>
                );
              })}
            </nav>

            <div className="ml-auto flex min-w-0 items-center gap-1 md:gap-2">
              {/* Mobile has the full-width switch on the dashboard (M6), so the header one is md+ only. */}
              <span className="hidden md:inline-flex md:min-w-0">
                <ViewModeSwitch />
              </span>

              {/* md–lg: the four nav items move into a compact menu (fixes the 1024 overflow, F39). */}
              <div ref={menuRef} className="relative hidden md:block lg:hidden">
                <button
                  ref={moreTriggerRef}
                  type="button"
                  onClick={() => setMenuOpen((v) => !v)}
                  aria-expanded={menuOpen}
                  aria-haspopup="true"
                  className={buttonClasses("ghost", "sm", "text-ink")}
                >
                  {menuOpen ? <X className="h-4 w-4" aria-hidden="true" /> : <Menu className="h-4 w-4" aria-hidden="true" />}
                  {t("nav.more")}
                </button>
                {menuOpen ? (
                  <nav ref={moreListRef} onKeyDown={onMoreKeys} aria-label={t("nav.mainNav")} className="absolute right-0 top-full z-50 mt-2 w-60 rounded-card border border-line bg-surface p-1.5 shadow-raised">
                    {items.map(({ href, labelKey, icon: Icon }) => {
                      const active = isActivePath(pathname, href);
                      return (
                        <Link
                          key={href}
                          href={href}
                          aria-current={active ? "page" : undefined}
                          onClick={() => setMenuOpen(false)}
                          className={cn(
                            "flex min-h-[44px] items-center gap-3 rounded-control px-3 text-label",
                            active ? "bg-primary-soft text-primary" : "text-ink hover:bg-sunken"
                          )}
                        >
                          <Icon className="h-4 w-4" aria-hidden="true" />
                          {t(labelKey)}
                        </Link>
                      );
                    })}
                  </nav>
                ) : null}
              </div>

              <span className="hidden md:inline-flex">
                <MessagesLink unread={unread} />
              </span>
              <NotificationBell />
              <AccountMenu />
            </div>
          </>
        ) : (
          <>
            <nav aria-label={t("nav.mainNav")} className="ml-4 hidden items-center gap-1 md:flex">
              <Link href="/jobs" className={navLink(isActivePath(pathname, "/jobs"))}>{t("nav.findJobs")}</Link>
              <Link href="/workers" className={navLink(isActivePath(pathname, "/workers"))}>{t("nav.findWorkers")}</Link>
              <Link href="/how-it-works" className={cn(navLink(isActivePath(pathname, "/how-it-works")), "hidden lg:inline-flex")}>
                {t("nav.howItWorks")}
              </Link>
            </nav>
            <div className="ml-auto flex items-center gap-2">
              <Link href={signInPath(pathname === "/" ? null : currentPath())} className={buttonClasses("ghost", "sm")}>
                {t("nav.signIn")}
              </Link>
              <Link href="/signup" className={buttonClasses("primary", "sm")}>
                {t("nav.joinNow")}
              </Link>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
