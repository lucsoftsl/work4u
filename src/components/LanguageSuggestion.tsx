"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { useTranslation, type Locale } from "@/lib/i18n";
import { useLanguageSwitch } from "@/hooks/useLanguageSwitch";
import { BOT_UA, LANG_COOKIE, isLocalizablePath, launchLangOf, splitLangPrefix, type LaunchLang } from "@/lib/i18n-routing";

const DISMISSED_KEY = "langSuggestionDismissed";

const hasCookie = (name: string) => document.cookie.split("; ").some((c) => c.startsWith(`${name}=`));

/** Which language to offer on this page, or null (not a public page, bot, a language already chosen/dismissed, or already on it). */
export function pickSuggestion(pathname: string, current: string): LaunchLang | null {
  const { path } = splitLangPrefix(pathname);
  if (!isLocalizablePath(path) || BOT_UA.test(navigator.userAgent)) return null;
  let remembered = false;
  try {
    remembered = window.localStorage.getItem(DISMISSED_KEY) === "1" || window.localStorage.getItem("locale") !== null;
  } catch {
    // storage blocked: fall back to the cookie check only
  }
  if (remembered || hasCookie(LANG_COOKIE)) return null;
  const wanted = launchLangOf(navigator.language);
  return wanted && wanted !== "en" && wanted !== current ? wanted : null;
}

/**
 * First-visit hint: "Want to see Work4U in Romanian/Spanish?" It only ever offers a choice. There is no automatic redirect by IP or
 * Accept-Language, and nothing happens for crawlers (the banner needs JavaScript and is skipped for bot user agents).
 * Shown once: never when a language was already chosen (cookie / saved preference), dismissed, or already on that language.
 */
export function LanguageSuggestion() {
  const { t, locale } = useTranslation();
  const pathname = usePathname();
  const switchLanguage = useLanguageSwitch();
  const [suggested, setSuggested] = useState<LaunchLang | null>(null);

  useEffect(() => {
    // Browser-only inputs (navigator, storage, cookie) are unavailable while rendering on the server, so they are read after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSuggested(pickSuggestion(pathname ?? "/", locale));
  }, [pathname, locale]);

  if (!suggested) return null;

  const dismiss = () => {
    try {
      window.localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // ignore
    }
    setSuggested(null);
  };

  return (
    <div role="region" lang={suggested} aria-label={t(`langSuggest.${suggested}.label`)} className="fixed inset-x-3 bottom-20 z-40 mx-auto flex max-w-lg items-center gap-3 rounded-card border border-line-strong bg-surface p-3 shadow-raised md:bottom-4">
      <p lang={suggested} className="flex-1 text-label text-ink">{t(`langSuggest.${suggested}.message`)}</p>
      <button type="button" lang={suggested} onClick={() => switchLanguage(suggested as Locale)} className="min-h-[44px] rounded-control bg-primary px-4 text-label text-on-fill hover:bg-primary-strong">
        {t(`langSuggest.${suggested}.accept`)}
      </button>
      <button type="button" lang={suggested} onClick={dismiss} aria-label={t(`langSuggest.${suggested}.dismiss`)} className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-control text-ink-muted hover:bg-sunken">
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
