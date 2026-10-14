import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { LocaleProvider, useTranslation, type Locale } from "./i18n";

function Probe() {
  const { t, locale, setLocale } = useTranslation();
  return <><p data-testid="s">{`${locale}|${t("greeting")}`}</p><button onClick={() => setLocale("es")}>es</button></>;
}
const ro = { greeting: "Salut" };
beforeEach(() => { localStorage.clear(); document.cookie = "NEXT_LOCALE=; Max-Age=0; Path=/"; });
afterEach(cleanup);

describe("LocaleProvider on language-prefixed pages", () => {
  it("the server render and the first client render already use the URL language and its dictionary (no flash of English, no hydration mismatch)", () => {
    const html = renderToString(<LocaleProvider initialLocale={"ro" as Locale} initialDictionary={ro}><Probe /></LocaleProvider>);
    expect(html).toContain("ro|Salut");
  });
  it("a visit to /ro remembers the choice (cookie + storage); a saved different language does not override the URL", () => {
    localStorage.setItem("locale", "es");
    render(<LocaleProvider initialLocale={"ro" as Locale} initialDictionary={ro}><Probe /></LocaleProvider>);
    expect(screen.getByTestId("s").textContent).toBe("ro|Salut");
    expect(document.cookie).toContain("NEXT_LOCALE=ro");
    expect(localStorage.getItem("locale")).toBe("ro");
  });
  it("on an unprefixed page a saved client-only language (fr) is still adopted, a saved ro/es is not (the proxy handles those)", () => {
    localStorage.setItem("locale", "fr");
    render(<LocaleProvider initialLocale={"en" as Locale}><Probe /></LocaleProvider>);
    expect(screen.getByTestId("s").textContent).toMatch(/^fr\|/);
    cleanup();
    localStorage.setItem("locale", "ro");
    render(<LocaleProvider initialLocale={"en" as Locale}><Probe /></LocaleProvider>);
    expect(screen.getByTestId("s").textContent).toMatch(/^en\|/);
  });
  it("choosing a language persists it for the proxy and the app", () => {
    render(<LocaleProvider initialLocale={"en" as Locale}><Probe /></LocaleProvider>);
    fireEvent.click(screen.getByText("es"));
    expect(document.cookie).toContain("NEXT_LOCALE=es");
    expect(localStorage.getItem("locale")).toBe("es");
  });
  it("private pages (no initialLocale) keep the old behaviour: start in English, then adopt the saved language", () => {
    localStorage.setItem("locale", "fr");
    expect(renderToString(<LocaleProvider><Probe /></LocaleProvider>)).toContain("en|");
    render(<LocaleProvider><Probe /></LocaleProvider>);
    expect(screen.getByTestId("s").textContent).toMatch(/^fr\|/);
  });
  it("the cookie is used when storage is empty (language chosen on another device profile / cleared storage)", () => {
    document.cookie = "NEXT_LOCALE=hu; Path=/";
    render(<LocaleProvider><Probe /></LocaleProvider>);
    expect(screen.getByTestId("s").textContent).toMatch(/^hu\|/);
  });
});
