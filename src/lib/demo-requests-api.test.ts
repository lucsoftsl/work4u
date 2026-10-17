import { describe, expect, it } from "vitest";
import { parseDemoRequests } from "./demo-requests-api";

const row = (id: string, createdAt: string) => ({ id, name: "Ana", email: "ana@example.com", company: "Acme", createdAt });

describe("parseDemoRequests", () => {
  it("accepts a bare array and sorts newest first", () => {
    const out = parseDemoRequests([row("a", "2026-10-01T10:00:00Z"), row("b", "2026-10-03T10:00:00Z")]);
    expect(out.map((r) => r.id)).toEqual(["b", "a"]);
  });

  it("accepts {items: [...]}", () => {
    expect(parseDemoRequests({ items: [row("a", "2026-10-01T10:00:00Z")] })).toHaveLength(1);
  });

  it("returns an empty list for unexpected shapes", () => {
    expect(parseDemoRequests(null)).toEqual([]);
    expect(parseDemoRequests({ data: [] })).toEqual([]);
    expect(parseDemoRequests("nope")).toEqual([]);
  });

  it("drops rows without an id and fills optional fields with null", () => {
    const out = parseDemoRequests([{ name: "x" }, { id: "c", company: "Co", phone: "", createdAt: "2026-10-01" }]);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ id: "c", company: "Co", phone: null, teamSize: null, message: null, status: "new" });
  });
});
