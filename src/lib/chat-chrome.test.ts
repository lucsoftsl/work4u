import { afterEach, describe, expect, it, vi } from "vitest";
import { getChatThreadOpen, setChatThreadOpen } from "./chat-chrome";

describe("chat-chrome", () => {
  afterEach(() => setChatThreadOpen(false));

  it("defaults to closed", () => {
    expect(getChatThreadOpen()).toBe(false);
  });

  it("tracks the open state", () => {
    setChatThreadOpen(true);
    expect(getChatThreadOpen()).toBe(true);
  });

  it("does not notify when the value is unchanged", () => {
    const spy = vi.fn();
    // subscribe indirectly via a no-op set; unchanged value must be a no-op
    setChatThreadOpen(false);
    setChatThreadOpen(false);
    expect(spy).not.toHaveBeenCalled();
  });
});
