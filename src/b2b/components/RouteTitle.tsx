"use client";

import { useEffect, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { useTranslation } from "@/lib/i18n";
import { fmt } from "@/b2b/lib/plural";
import { routeTitle } from "@/b2b/lib/route-title";
import { getTitleState, subscribeTitle, type TitleState } from "@/b2b/lib/title-store";

type T = (key: string, fallback: string) => string;

/** "Job JOB-1003 · Schedule & team · Work4U", "Team & employees · Work4U", "Page not found · Work4U". */
export function buildTitle(pathname: string, state: TitleState, t: T): string | null {
  const brand = pathname.startsWith("/tech") ? "Work4U Field" : "Work4U";
  if (state.notFound) return [t("b2b.notFound.title", "Page not found"), brand].join(" · ");
  const route = routeTitle(pathname);
  if (!route) return null;
  if (!route.job) return [t(route.key, route.fallback), brand].join(" · ");
  const job = state.jobRef ? fmt(t("b2b.title.job", "Job {ref}"), { ref: state.jobRef }) : t("b2b.title.jobNoRef", "Job");
  const tab = route.area === "ops" && state.tab ? t(`b2b.job.tab.${state.tab}`, state.tab) : null;
  return [job, tab, brand].filter(Boolean).join(" · ");
}

/**
 * The tab title of every B2B page, in the user's language, set once from here. Static `metadata.title` is rendered on the server before
 * the language is known and stays as the English default. Next rewrites the title on client navigation, so it is applied again after
 * each route change and whenever the browser changes it to something else.
 */
export function RouteTitle() {
  const { t, locale } = useTranslation();
  const pathname = usePathname() ?? "";
  const state = useSyncExternalStore(subscribeTitle, getTitleState, getTitleState);
  const title = buildTitle(pathname, state, t);

  useEffect(() => {
    if (!title) return;
    const apply = () => { if (document.title !== title) document.title = title; };
    apply();
    const frame = requestAnimationFrame(apply);
    const observer = new MutationObserver(apply);
    observer.observe(document.head, { childList: true, subtree: true, characterData: true });
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, [title, locale, pathname]);

  return null;
}
