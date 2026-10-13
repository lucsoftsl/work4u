import { describe, expect, it } from "vitest";
import { splitRoute } from "./split";

describe("splitRoute", () => {
  it("selects the job from the URL on a job route", () => {
    expect(splitRoute("/tech/o1/jobs/abc-123", "o1")).toEqual({ isSplit: true, isToday: false, selectedJobId: "abc-123" });
    expect(splitRoute("/tech/o1/jobs/a%20b/", "o1").selectedJobId).toBe("a b");
  });
  it("treats /today as split with no selection", () => {
    expect(splitRoute("/tech/o1/today", "o1")).toEqual({ isSplit: true, isToday: true, selectedJobId: null });
  });
  it("leaves Sync and other orgs' URLs single column", () => {
    expect(splitRoute("/tech/o1/sync", "o1").isSplit).toBe(false);
    expect(splitRoute("/tech/other/jobs/x", "o1").isSplit).toBe(false);
    expect(splitRoute("/tech/o1/jobs/x/extra", "o1").isSplit).toBe(false);
  });
});
