import { describe, expect, it } from "vitest";
import { filterPickerOptions, moveActiveIndex } from "./ListboxPicker";
import { escapeHtml } from "../maps/NearbyWorkersMap";

const OPTIONS = [
  { value: "USD", label: "USD", description: "US Dollar" },
  { value: "HUF", label: "HUF", description: "Hungarian Forint" },
];

describe("ListboxPicker logic", () => {
  it("filters by label and description", () => {
    expect(filterPickerOptions(OPTIONS, "forint").map((o) => o.value)).toEqual(["HUF"]);
    expect(filterPickerOptions(OPTIONS, "  ")).toHaveLength(2);
    expect(filterPickerOptions(OPTIONS, "zzz")).toHaveLength(0);
  });

  it("moves the active index with clamping", () => {
    expect(moveActiveIndex(-1, "ArrowDown", 3)).toBe(0);
    expect(moveActiveIndex(2, "ArrowDown", 3)).toBe(2);
    expect(moveActiveIndex(0, "ArrowUp", 3)).toBe(0);
    expect(moveActiveIndex(1, "Home", 3)).toBe(0);
    expect(moveActiveIndex(0, "End", 3)).toBe(2);
    expect(moveActiveIndex(0, "ArrowDown", 0)).toBe(-1);
  });
});

describe("escapeHtml", () => {
  it("neutralises markup in worker names", () => {
    expect(escapeHtml('<img src=x onerror="a">')).toBe("&lt;img src=x onerror=&quot;a&quot;&gt;");
  });
});
