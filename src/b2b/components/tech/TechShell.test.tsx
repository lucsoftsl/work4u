import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { TechShell } from "./TechShell";

const m = vi.hoisted(() => ({ path: "/tech/o/jobs/j1" }));
vi.mock("@/lib/i18n", () => ({ useTranslation: () => ({ t: (_k: string, f: string) => f }) }));
vi.mock("next/link", () => ({ default: ({ href, children, ...r }: { href: string; children: React.ReactNode }) => <a href={href} {...r}>{children}</a> }));
vi.mock("next/navigation", () => ({ usePathname: () => m.path }));
vi.mock("@/b2b/context/OrgContext", () => ({ useOrg: () => ({ orgId: "o", me: { org: { name: "Acme", timezone: "UTC" } } }) }));
vi.mock("@/b2b/offline/OfflineProvider", () => ({ useOffline: () => ({ online: true, syncState: "synced", waitingCount: 0, attention: [], lastSync: null }) }));
vi.mock("@/b2b/offline/useStorage", () => ({ useStorage: () => null }));
vi.mock("./JobListPane", () => ({ JobListPane: () => <p>list</p> }));
afterEach(cleanup);

// The root layout already provides the page's one <main id="main">; the field shell must not add another.
describe("TechShell landmarks", () => {
  for (const path of ["/tech/o/jobs/j1", "/tech/o/today", "/tech/o/sync"]) {
    it(`adds no <main> and no duplicate landmark on ${path}`, () => {
      m.path = path;
      const { container } = render(<TechShell><h1>Page</h1></TechShell>);
      expect(container.querySelectorAll("main, [role=main]").length).toBe(0);
      const names = [...container.querySelectorAll("nav[aria-label], section[aria-label], [role=region][aria-label]")].map((e) => e.getAttribute("aria-label"));
      expect(new Set(names).size).toBe(names.length); // landmark-unique
    });
  }
  it("split view: the list is a labelled nav and the detail a labelled region (not main)", () => {
    m.path = "/tech/o/jobs/j1";
    render(<TechShell><p>detail</p></TechShell>);
    expect(screen.getByRole("navigation", { name: "Today's jobs" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "Job details" }).id).toBe("tech-main");
  });
  it("the skip link still targets an element that exists", () => {
    m.path = "/tech/o/sync";
    const { container } = render(<TechShell><p>x</p></TechShell>);
    const href = container.querySelector("a[href^='#']")!.getAttribute("href")!;
    expect(container.querySelector(href)).toBeTruthy();
  });
});
