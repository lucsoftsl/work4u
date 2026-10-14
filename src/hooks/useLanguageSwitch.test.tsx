import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useLanguageSwitch } from "./useLanguageSwitch";
import type { Locale } from "@/lib/i18n";

const m = vi.hoisted(() => ({ path: "/ro/jobs", push: vi.fn(), setLocale: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => m.path, useRouter: () => ({ push: m.push }) }));
vi.mock("@/lib/i18n", () => ({ useTranslation: () => ({ setLocale: m.setLocale }) }));

function Switch({ to }: { to: Locale }) {
  const go = useLanguageSwitch();
  return <button onClick={() => go(to)}>go</button>;
}
const run = (to: Locale, path: string, search = "") => {
  m.path = path;
  window.history.replaceState({}, "", `${path}${search}`);
  render(<Switch to={to} />);
  fireEvent.click(screen.getByText("go"));
};
beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe("language switcher", () => {
  it("navigates to the same page in the other language, keeping the query", () => {
    run("es", "/ro/jobs", "?category=plumbing&page=2");
    expect(m.setLocale).toHaveBeenCalledWith("es");
    expect(m.push).toHaveBeenCalledWith("/es/jobs?category=plumbing&page=2");
  });
  it("English goes to the unprefixed URL; item pages and the home page work too", () => {
    run("en", "/ro/blog/tips-a1");
    expect(m.push).toHaveBeenCalledWith("/blog/tips-a1");
    cleanup(); vi.clearAllMocks();
    run("ro", "/");
    expect(m.push).toHaveBeenCalledWith("/ro");
  });
  it("fr / hu have no URLs: from a prefixed page they land on the unprefixed one, from an unprefixed page nothing navigates", () => {
    run("fr", "/es/pricing");
    expect(m.push).toHaveBeenCalledWith("/pricing");
    cleanup(); vi.clearAllMocks();
    run("hu", "/pricing");
    expect(m.push).not.toHaveBeenCalled();
    expect(m.setLocale).toHaveBeenCalledWith("hu");
  });
  it("private pages: only the language changes, no navigation", () => {
    run("ro", "/dashboard");
    expect(m.setLocale).toHaveBeenCalledWith("ro");
    expect(m.push).not.toHaveBeenCalled();
  });
});
