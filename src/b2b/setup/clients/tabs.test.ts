import { describe, expect, it } from "vitest";
import { nextTab, parseTab } from "./tabs";

const enabled = ["overview", "addresses", "jobs", "notes"] as const;
describe("client tabs", () => {
  it("wraps with arrows and skips the disabled Files tab", () => {
    expect(nextTab("notes", "ArrowRight", enabled)).toBe("overview");
    expect(nextTab("overview", "ArrowLeft", enabled)).toBe("notes");
    expect(nextTab("overview", "End", enabled)).toBe("notes");
    expect(nextTab("jobs", "Home", enabled)).toBe("overview");
    expect(nextTab("jobs", "a", enabled)).toBeNull();
  });
  it("parses the tab param, falling back to overview", () => {
    expect(parseTab("notes", enabled)).toBe("notes");
    expect(parseTab("files", enabled)).toBe("overview");
    expect(parseTab("x")).toBe("overview");
  });
});
