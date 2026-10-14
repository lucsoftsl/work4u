import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { LanguageSuggestion, pickSuggestion } from "./LanguageSuggestion";
import en from "@/locales/en.json";

const m = vi.hoisted(() => ({ path: "/", locale: "en", switchTo: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => m.path, useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/i18n", () => ({ useTranslation: () => ({ locale: m.locale, t: (k: string) => (en as Record<string, string>)[k] ?? k }) }));
vi.mock("@/hooks/useLanguageSwitch", () => ({ useLanguageSwitch: () => m.switchTo }));

const setNavigator = (language: string, userAgent = "Mozilla/5.0 (Macintosh) Safari/605") => {
  vi.spyOn(window.navigator, "language", "get").mockReturnValue(language);
  vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue(userAgent);
};
beforeEach(() => { m.path = "/"; m.locale = "en"; localStorage.clear(); document.cookie = "NEXT_LOCALE=; Max-Age=0; Path=/"; setNavigator("ro-RO"); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.clearAllMocks(); });

describe("language suggestion banner", () => {
  it("offers Romanian / Spanish to a first-time visitor whose browser uses it, in that language, without redirecting", () => {
    render(<LanguageSuggestion />);
    expect(screen.getByText("Vrei să vezi Work4U în română?")).toBeTruthy();
    cleanup();
    setNavigator("es-ES");
    render(<LanguageSuggestion />);
    expect(screen.getByText("¿Quieres ver Work4U en español?")).toBeTruthy();
    expect(m.switchTo).not.toHaveBeenCalled();
  });
  it("accepting switches to that language; dismissing hides it for good and never changes the language", () => {
    render(<LanguageSuggestion />);
    fireEvent.click(screen.getByRole("button", { name: "Română" }));
    expect(m.switchTo).toHaveBeenCalledWith("ro");
    cleanup();
    render(<LanguageSuggestion />);
    fireEvent.click(screen.getByRole("button", { name: "Nu acum" })); // the OFFERED language, not the (English) page language
    expect(screen.queryByRole("region", { name: "Sugestie de limbă" })).toBeNull();
    expect(screen.queryByRole("region")).toBeNull();
    expect(localStorage.getItem("locale")).toBeNull();
    expect(document.cookie).not.toContain("NEXT_LOCALE");
    cleanup();
    render(<LanguageSuggestion />);
    expect(screen.queryByRole("region")).toBeNull(); // stays dismissed
  });
  it("is not shown when: a language was chosen, the browser language is English/unsupported, the page is already in it, the page is private, or the visitor is a bot", () => {
    document.cookie = "NEXT_LOCALE=en; Path=/";
    expect(pickSuggestion("/", "en")).toBeNull();
    document.cookie = "NEXT_LOCALE=; Max-Age=0; Path=/";
    localStorage.setItem("locale", "fr");
    expect(pickSuggestion("/", "en")).toBeNull();
    localStorage.clear();
    setNavigator("en-US");
    expect(pickSuggestion("/", "en")).toBeNull();
    setNavigator("fr-FR");
    expect(pickSuggestion("/", "en")).toBeNull();
    setNavigator("ro-RO");
    expect(pickSuggestion("/ro/jobs", "ro")).toBeNull();
    expect(pickSuggestion("/dashboard", "en")).toBeNull();
    expect(pickSuggestion("/jobs", "en")).toBe("ro");
    setNavigator("ro-RO", "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)");
    expect(pickSuggestion("/", "en")).toBeNull();
  });
});
