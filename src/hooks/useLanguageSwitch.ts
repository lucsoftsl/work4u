"use client";

import { useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslation, type Locale } from "@/lib/i18n";
import { isLaunchLang, isLocalizablePath, localizedPath, splitLangPrefix } from "@/lib/i18n-routing";

/**
 * Switches the language. On a public page the visitor lands on the same page in the new language (`/ro/jobs?x=1` → `/jobs?x=1`),
 * query kept. fr / hu have no URLs of their own: they use the unprefixed page and swap the text client-side.
 * On private pages only the text changes (the language lives in the profile / cookie there).
 */
export function useLanguageSwitch() {
  const { setLocale } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();

  return useCallback(
    (target: Locale) => {
      setLocale(target); // persists the choice (cookie + localStorage) before navigating
      const { path } = splitLangPrefix(pathname ?? "/");
      if (!isLocalizablePath(path)) return;
      const destination = localizedPath(isLaunchLang(target) ? target : "en", path);
      if (destination !== pathname) router.push(`${destination}${window.location.search}`);
    },
    [pathname, router, setLocale],
  );
}
