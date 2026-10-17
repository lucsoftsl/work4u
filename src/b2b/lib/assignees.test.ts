import { describe, expect, it } from "vitest";
import { assigneeGroups } from "./assignees";

const teams = [
  { id: "t1", name: "Alpha", members: [{ id: "a", displayName: "Ana" }, { id: "b", displayName: "Bogdan" }] },
  { id: "t2", name: "Bravo", members: [{ id: "b", displayName: "Bogdan" }, { id: "gone", displayName: "Gone" }] },
];
const all = [{ id: "a", displayName: "Ana" }, { id: "b", displayName: "Bogdan" }, { id: "p", displayName: "Planning Pia", loginStatus: "NONE" as const }, { id: "c", displayName: "Carlos" }];

describe("assigneeGroups", () => {
  it("lists people without a team (planning-only included) in their own group", () => {
    const g = assigneeGroups(teams, all, "No team");
    expect(g.map((x) => x.label)).toEqual(["Alpha", "No team"]);
    expect(g[1].members.map((m) => m.displayName)).toEqual(["Carlos", "Planning Pia"]);
    expect(g[1].members.find((m) => m.id === "p")?.loginStatus).toBe("NONE");
  });
  it("shows a person who is in two teams once, and drops people who are no longer assignable", () => {
    const flat = assigneeGroups(teams, all, "No team").flatMap((x) => x.members.map((m) => m.id));
    expect(flat.filter((id) => id === "b")).toHaveLength(1);
    expect(flat).not.toContain("gone");
  });
  it("falls back to the team members when the assignable list could not be loaded", () => {
    const g = assigneeGroups(teams, undefined, "No team");
    expect(g.flatMap((x) => x.members.map((m) => m.id))).toEqual(["a", "b", "gone"]);
  });
  it("is empty only when nobody is assignable", () => {
    expect(assigneeGroups([], [], "No team")).toEqual([]);
  });
});
