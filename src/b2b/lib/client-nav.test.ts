import { afterEach, describe, expect, it, vi } from "vitest";
import { replaceQuery } from "./client-nav";

const setOnline = (v: boolean) => Object.defineProperty(navigator, "onLine", { value: v, configurable: true });
afterEach(() => { setOnline(true); window.history.replaceState(null, "", "/"); });

describe("replaceQuery: a filter change must never leave the page", () => {
  it("online: goes through the router (no scroll jump)", () => {
    const router = { replace: vi.fn() };
    replaceQuery(router, "/ops/o1/finance?by=team");
    expect(router.replace).toHaveBeenCalledWith("/ops/o1/finance?by=team", { scroll: false });
  });
  it("offline: only the address bar changes (history.replaceState); the router is not asked to fetch a page it cannot get", () => {
    setOnline(false);
    const router = { replace: vi.fn() };
    const spy = vi.spyOn(window.history, "replaceState");
    replaceQuery(router, "/ops/o1/finance?by=team");
    expect(router.replace).not.toHaveBeenCalled();
    expect(spy).toHaveBeenCalledWith(null, "", "/ops/o1/finance?by=team");
    expect(window.location.pathname + window.location.search).toBe("/ops/o1/finance?by=team");
    spy.mockRestore();
  });
});
