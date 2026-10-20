import { describe, expect, it } from "vitest";
import type { DuplicateGroup } from "@/b2b/setup/api";
import { canMergeGroup, findGroup, groupId, isMergeRefusal, mergeIds, mergeTotals, sourceIdsFor } from "./merge";

const c = (id: string) => ({ id, name: id, email: null, phone: null });
const group: DuplicateGroup = { id: "g_0123456789abcdef", reason: "EMAIL", key: "a•••@b.c", customers: [c("1"), c("2"), c("3")] };
const moved = (jobs: number) => ({ jobs, locations: 1, contacts: 2, notes: 3, tags: 0 });

describe("merge helpers", () => {
  it("sums moved counts across merges and lists every merge id", () => {
    const r = { merges: [{ mergeId: "m1", sourceId: "2", moved: moved(1) }, { mergeId: "m2", sourceId: "3", moved: moved(4) }] };
    expect(mergeTotals(r)).toEqual({ jobs: 5, contacts: 4, notes: 6, locations: 2, tags: 0 });
    expect(mergeIds(r)).toEqual(["m1", "m2"]);
  });
  it("merges the others into the kept client", () => {
    expect(sourceIdsFor(group, "2")).toEqual(["1", "3"]);
    expect(canMergeGroup(group, "2")).toBe(true);
    expect(canMergeGroup(group, "x")).toBe(false);
  });
  it("refuses more than 10 sources", () => {
    const big = { customers: Array.from({ length: 12 }, (_, i) => c(String(i))) };
    expect(canMergeGroup(big, "0")).toBe(false);
  });
  it("finds a group by its URL id (the API's opaque id)", () => {
    expect(groupId(group)).toBe("g_0123456789abcdef");
    expect(findGroup([group], groupId(group))).toBe(group);
    expect(findGroup([group], "nope")).toBeUndefined();
  });
  it("keeps two groups apart when their masked keys are equal (marina@ and mario@ both mask to m•••@domain)", () => {
    const a: DuplicateGroup = { id: "g_aaaaaaaaaaaaaaaa", reason: "EMAIL", key: "m•••@hotel-marina.es", customers: [c("1"), c("2")] };
    const b: DuplicateGroup = { id: "g_bbbbbbbbbbbbbbbb", reason: "EMAIL", key: "m•••@hotel-marina.es", customers: [c("3"), c("4")] };
    expect(groupId(a)).not.toBe(groupId(b));
    expect(findGroup([a, b], groupId(b))).toBe(b);
  });
  it("falls back to reason:key for an older API without ids", () => {
    const old = { reason: "PHONE", key: "…5678", customers: [c("1"), c("2")] } as DuplicateGroup;
    expect(groupId(old)).toBe("PHONE:…5678");
    expect(findGroup([old], "PHONE:…5678")).toBe(old);
  });
  it("classifies refusal codes", () => {
    expect(isMergeRefusal("MERGE_INVALID")).toBe(true);
    expect(isMergeRefusal("CUSTOMER_ARCHIVED")).toBe(true);
    expect(isMergeRefusal("X")).toBe(false);
  });
});

import { maskPhone } from "./merge";
describe("maskPhone", () => {
  it("keeps the country prefix and the last three digits only", () => {
    expect(maskPhone("+34 600 555 021")).toBe("+34 ••• ••• 021");
    expect(maskPhone("0721555021")).toBe("••• ••• 021");
    expect(maskPhone("1234")).toBe("•••");
    expect(maskPhone(null)).toBeNull();
    expect(maskPhone("")).toBeNull();
  });
});

import { maskEmail } from "./merge";
describe("maskEmail", () => {
  it("keeps the first letter and the domain", () => {
    expect(maskEmail("ana.pop@hotel-marina.es")).toBe("a•••@hotel-marina.es");
    expect(maskEmail("x")).toBe("•••");
    expect(maskEmail(null)).toBeNull();
  });
});
