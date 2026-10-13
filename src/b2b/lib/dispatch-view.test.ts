import { describe, expect, it } from "vitest";
import type { DispatchBoard, Job } from "@/b2b/api/types";
import { applyBoardFilters, boardFilterKey, boardQuery, boardSkillOptions, filterBoard, laneTabs, nextTab, parseBoardFilters, resolveActiveLane } from "./dispatch-view";

const job = (id: string, over: Record<string, unknown> = {}) => ({ id, number: 1, reference: id, title: "t", status: "NEW", ...over }) as unknown as Job;
const board = (): DispatchBoard => ({
  range: { from: "d", to: "d" },
  unassigned: [job("a", { priority: "URGENT" }), job("b")],
  teams: [{ id: "t1", name: "T1", status: "AVAILABLE", jobs: [job("c", { priority: "LOW" })] }, { id: "t2", name: "T2", status: "AVAILABLE", jobs: [] }],
  individuals: [],
});
const withSkills = (): DispatchBoard => {
  const b = board();
  b.unassigned = [job("a", { requiredSkills: [{ id: "s1", name: "Plumbing" }] }), job("b", { requiredSkills: [{ id: "s2", name: "Gas" }] })];
  return b;
};

describe("board filters", () => {
  it("parses and serializes priority/skill, keeping other params", () => {
    const f = parseBoardFilters(new URLSearchParams("priority=high,bogus&priority=URGENT&skill=s1"));
    expect(f).toEqual({ priority: ["URGENT", "HIGH"], skill: "s1" });
    const sp = applyBoardFilters(new URLSearchParams("date=2026-10-12&priority=LOW"), f);
    expect(sp.getAll("priority")).toEqual(["URGENT", "HIGH"]);
    expect(sp.get("date")).toBe("2026-10-12");
    expect(applyBoardFilters(sp, { priority: [] }).toString()).toBe("date=2026-10-12");
  });
  it("filters by priority without mutating the input", () => {
    const b = board();
    const out = filterBoard(b, { priority: ["URGENT"] });
    expect(out.unassigned.map((j) => j.id)).toEqual(["a"]);
    expect(out.teams[0].jobs).toEqual([]);
    expect(b.unassigned).toHaveLength(2);
  });
  it("treats missing priority as NORMAL", () => {
    expect(filterBoard(board(), { priority: ["NORMAL"] }).unassigned.map((j) => j.id)).toEqual(["b"]);
  });
  it("only offers skills that exist in the payload", () => {
    expect(boardSkillOptions(board())).toEqual([]);
    expect(boardSkillOptions(withSkills()).map((s) => s.name)).toEqual(["Gas", "Plumbing"]);
    expect(filterBoard(withSkills(), { priority: [], skill: "s1" }).unassigned.map((j) => j.id)).toEqual(["a"]);
  });
});

describe("lane switcher", () => {
  const tabs = laneTabs(board());
  it("lists unassigned, teams, then individuals when present", () => {
    expect(tabs).toEqual(["unassigned", "t1", "t2"]);
    const b = board(); b.individuals = [job("x")];
    expect(laneTabs(b).at(-1)).toBe("individuals");
  });
  it("resolves ?team= with sane fallbacks", () => {
    expect(resolveActiveLane("t2", tabs)).toBe("t2");
    expect(resolveActiveLane("unassigned", tabs)).toBe("unassigned");
    expect(resolveActiveLane("nope", tabs)).toBe("t1");
    expect(resolveActiveLane(null, ["unassigned"])).toBe("unassigned");
  });
  it("moves with arrows, wraps and supports Home/End", () => {
    expect(nextTab("t1", tabs, "ArrowRight")).toBe("t2");
    expect(nextTab("t2", tabs, "ArrowRight")).toBe("unassigned");
    expect(nextTab("unassigned", tabs, "ArrowLeft")).toBe("t2");
    expect(nextTab("t1", tabs, "Home")).toBe("unassigned");
    expect(nextTab("t1", tabs, "End")).toBe("t2");
    expect(nextTab("t1", tabs, "a")).toBeNull();
  });
});

describe("server-side board filters", () => {
  it("maps filters to the board query params", () => {
    expect(boardQuery({ priority: [] })).toEqual({});
    expect(boardQuery({ priority: ["URGENT", "HIGH"], skill: "s1" })).toEqual({ skillIds: ["s1"], priorities: ["URGENT", "HIGH"] });
  });
  it("makes an order-independent cache key", () => {
    expect(boardFilterKey({ priority: ["HIGH", "URGENT"] })).toEqual(boardFilterKey({ priority: ["URGENT", "HIGH"] }));
    expect(boardFilterKey({ priority: [], skill: "a" })).not.toEqual(boardFilterKey({ priority: [] }));
  });
  it("trusts the board when the server echoed its filters", () => {
    const b = { range: { from: "", to: "" }, unassigned: [{ id: "x", priority: "LOW" }], teams: [], individuals: [], filters: { skillIds: [], priorities: ["URGENT"] } } as unknown as DispatchBoard;
    expect(filterBoard(b, { priority: ["URGENT"] })).toBe(b);
  });
});
