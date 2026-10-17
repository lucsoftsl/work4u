import { describe, expect, it } from "vitest";
import { addTag, removeTag } from "./tags";

describe("tags", () => {
  it("adds a lower-cased, trimmed tag", () => {
    expect(addTag(["vip"], "  Contract  ")).toEqual({ tags: ["vip", "contract"], error: null });
  });
  it("ignores empty input without an error", () => {
    expect(addTag(["a"], "   ")).toEqual({ tags: ["a"], error: null });
  });
  it.each(["=sum", "+1", "-x", "@me"])("rejects a leading special char in %s", (t) => {
    expect(addTag([], t).error).toBe("leadingChar");
  });
  it("rejects tags over 40 chars", () => {
    expect(addTag([], "a".repeat(41)).error).toBe("tooLong");
    expect(addTag([], "a".repeat(40)).error).toBeNull();
  });
  it("rejects duplicates and more than 20 tags", () => {
    expect(addTag(["a"], "A").error).toBe("duplicate");
    const twenty = Array.from({ length: 20 }, (_, i) => `t${i}`);
    expect(addTag(twenty, "x").error).toBe("tooMany");
  });
  it("does not mutate the input", () => {
    const base = ["a"];
    addTag(base, "b");
    removeTag(base, "a");
    expect(base).toEqual(["a"]);
  });
});
