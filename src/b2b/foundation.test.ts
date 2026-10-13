import { afterEach, describe, expect, it, vi } from "vitest";
import { can, canAny, guardDecision, type Viewer } from "./lib/permissions";
import { allowedTransitions, permissionForTransition, type JobForTransitions } from "./lib/transitions";
import { B2bError, b2b, buildQuery, orgPath, toB2bError } from "./api/client";
import { setTokenProvider } from "@/lib/http";
import { switchOrgPath } from "./components/shell/OrgSwitcher";
import { visibleNav } from "./lib/nav";
import { shouldRetry } from "./query/QueryProvider";

const viewerOf = (grants: Array<[string, "ALL" | "TEAM" | "ASSIGNED"]>, teamIds: string[] = []): Viewer => ({
  grants: grants.map(([permission, scope]) => ({ permission, scope })),
  teamIds,
});

describe("can()", () => {
  it("denies without a grant and allows ALL scope for any relation", () => {
    const v = viewerOf([["job.view", "ALL"]]);
    expect(can(v, "job.view")).toBe(true);
    expect(can(v, "job.view", { assignedToMe: false, teamIds: ["x"] })).toBe(true);
    expect(can(v, "job.assign")).toBe(false);
  });

  it("TEAM scope: list-level true, resource-level only for my teams or my assignments", () => {
    const v = viewerOf([["job.assign", "TEAM"]], ["t1"]);
    expect(can(v, "job.assign")).toBe(true);
    expect(can(v, "job.assign", { teamIds: ["t1", "t9"] })).toBe(true);
    expect(can(v, "job.assign", { teamIds: ["t9"] })).toBe(false);
    expect(can(v, "job.assign", { teamIds: ["t9"], assignedToMe: true })).toBe(true);
  });

  it("ASSIGNED scope (technician): only jobs assigned to me", () => {
    const v = viewerOf([["job.execute", "ASSIGNED"]], ["t1"]);
    expect(can(v, "job.execute")).toBe(true);
    expect(can(v, "job.execute", { teamIds: ["t1"] })).toBe(false);
    expect(can(v, "job.execute", { assignedToMe: true })).toBe(true);
  });

  it("canAny", () => {
    expect(canAny(viewerOf([["a", "ALL"]]), ["b", "a"])).toBe(true);
    expect(canAny(viewerOf([]), ["a"])).toBe(false);
  });
});

describe("guardDecision (route guard)", () => {
  const admin = viewerOf([["dispatch.view", "ALL"]]);
  it("handles loading, non-member, forbidden and allowed in order", () => {
    expect(guardDecision({ status: "loading" })).toBe("loading");
    expect(guardDecision({ status: "not-member" })).toBe("not-member");
    expect(guardDecision({ status: "error" })).toBe("error"); // a failed request is not "no access"
    expect(guardDecision({ status: "ready", viewer: admin, permission: "report.view" })).toBe("forbidden");
    expect(guardDecision({ status: "ready", viewer: admin, anyOf: ["report.view", "dispatch.view"] })).toBe("allowed");
    expect(guardDecision({ status: "ready", viewer: admin })).toBe("allowed");
  });

  it("filters the sidebar by permission", () => {
    const tech = viewerOf([["job.view", "ASSIGNED"]]);
    const labels = visibleNav((p) => can(tech, p)).map((n) => n.section);
    expect(labels).toEqual(["dashboard", "jobs", "notifications"]);
    expect(visibleNav((p) => can(viewerOf([["job.view", "ALL"], ["dispatch.view", "ALL"]]), p)).map((n) => n.section)).toEqual(["dashboard", "jobs", "dispatch", "notifications"]);
    const manager = viewerOf([["job.view", "ALL"], ["job.close", "ALL"], ["team.view", "ALL"], ["customer.view", "ALL"]]);
    expect(visibleNav((p) => can(manager, p)).map((n) => n.section)).toEqual(["dashboard", "jobs", "review", "teams", "customers", "notifications"]);
  });
});

describe("allowedTransitions", () => {
  const ops = viewerOf([["job.transition", "ALL"], ["job.close", "ALL"], ["job.cancel", "ALL"], ["job.complete", "ALL"], ["job.execute", "ALL"]]);
  const dispatcher = viewerOf([["job.transition", "ALL"], ["job.cancel", "ALL"]]);
  const base: JobForTransitions = { status: "READY_TO_SCHEDULE", scheduledStart: "2026-10-12T10:00:00Z", scheduledEnd: "2026-10-12T12:00:00Z", assignmentCount: 1 };

  it("offers SCHEDULED only with a window and an assignee", () => {
    expect(allowedTransitions(base, dispatcher).map((o) => o.to)).toContain("SCHEDULED");
    expect(allowedTransitions({ ...base, assignmentCount: 0 }, dispatcher).map((o) => o.to)).not.toContain("SCHEDULED");
    expect(allowedTransitions({ ...base, scheduledStart: null }, dispatcher).map((o) => o.to)).not.toContain("SCHEDULED");
  });

  it("only offers moves in the graph, forward first, cancel last", () => {
    const to = allowedTransitions(base, dispatcher).map((o) => o.to);
    expect(to).toEqual(["SCHEDULED", "PLANNING", "CANCELLED"]);
    expect(to).not.toContain("COMPLETED");
  });

  it("COMPLETED goes to REVIEW only when the job requires review, otherwise CLOSED", () => {
    expect(allowedTransitions({ status: "COMPLETED", requirements: { review: true } }, ops).map((o) => o.to)).toEqual(["REVIEW"]);
    expect(allowedTransitions({ status: "COMPLETED", requirements: { review: false } }, ops).map((o) => o.to)).toEqual(["CLOSED"]);
  });

  it("hides moves the role lacks permission for", () => {
    const noClose = viewerOf([["job.transition", "ALL"]]);
    expect(allowedTransitions({ status: "COMPLETED", requirements: { review: false } }, noClose)).toEqual([]);
    expect(allowedTransitions({ status: "IN_PROGRESS" }, dispatcher).map((o) => o.to)).toEqual(["CANCELLED"]);
  });

  it("BLOCKED can resume to where it came from; terminal states offer nothing", () => {
    const options = allowedTransitions({ status: "BLOCKED", blockedFromStatus: "ON_SITE" }, ops);
    expect(options.map((o) => o.to)).toContain("ON_SITE");
    expect(allowedTransitions({ status: "CLOSED" }, ops)).toEqual([]);
    expect(allowedTransitions({ status: "CANCELLED" }, ops)).toEqual([]);
  });

  it("flags moves that need a reason and maps permissions", () => {
    const fromInProgress = allowedTransitions({ status: "IN_PROGRESS" }, ops);
    expect(fromInProgress.find((o) => o.to === "BLOCKED")?.needsReason).toBe(true);
    expect(fromInProgress.find((o) => o.to === "COMPLETED")?.needsReason).toBe(false);
    expect(allowedTransitions({ status: "REVIEW" }, ops).find((o) => o.to === "IN_PROGRESS")?.needsReason).toBe(true);
    expect(permissionForTransition("COMPLETED", "CLOSED")).toBe("job.close");
    expect(permissionForTransition("SCHEDULED", "CANCELLED")).toBe("job.cancel");
    expect(permissionForTransition("ON_SITE", "IN_PROGRESS")).toBe("job.execute");
    expect(permissionForTransition("PLANNING", "READY_TO_SCHEDULE")).toBe("job.transition");
  });
});

describe("B2B API client", () => {
  afterEach(() => {
    setTokenProvider(null);
    vi.unstubAllGlobals();
  });
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  const headerOf = (call: unknown[], name: string) => new Headers((call[1] as RequestInit).headers).get(name);

  it("builds org paths and query strings (arrays repeat, empties dropped)", () => {
    expect(orgPath("a/b")).toBe("/orgs/a%2Fb");
    expect(buildQuery({ status: ["NEW", "PLANNING"], q: "", limit: 20, unassigned: true, x: undefined })).toBe("?status=NEW&status=PLANNING&limit=20&unassigned=true");
  });

  it("sends bearer token, If-Match and Idempotency-Key; parses JSON", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ ok: 1 }));
    vi.stubGlobal("fetch", fetchMock);
    setTokenProvider(async () => "tok");
    await b2b("/orgs/o1/jobs/j1/transitions", { method: "POST", json: { to: "PLANNING" }, ifMatch: 7, idempotencyKey: "key-12345678" });
    const call = fetchMock.mock.calls[0];
    expect(call[0]).toBe("http://localhost:3001/api/b2b/orgs/o1/jobs/j1/transitions");
    expect(headerOf(call, "Authorization")).toBe("Bearer tok");
    expect(headerOf(call, "If-Match")).toBe('"7"');
    expect(headerOf(call, "Idempotency-Key")).toBe("key-12345678");
    expect(headerOf(call, "Content-Type")).toBe("application/json");
    expect((call[1] as RequestInit).body).toBe('{"to":"PLANNING"}');
  });

  it("does not set Content-Type for multipart bodies", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ key: "k" }, 201));
    vi.stubGlobal("fetch", fetchMock);
    setTokenProvider(async () => "tok");
    const form = new FormData();
    form.append("file", new Blob(["x"]), "a.png");
    await b2b("/orgs/o1/jobs/j1/photos", { method: "POST", form });
    expect(headerOf(fetchMock.mock.calls[0], "Content-Type")).toBeNull();
  });

  it("keeps the API's extra fields on typed errors (VERSION_CONFLICT, ASSIGNMENT_CONFLICT, MIGRATION_PENDING)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({ error: "stale", code: "VERSION_CONFLICT", currentVersion: 9, currentStatus: "SCHEDULED" }, 409)));
    setTokenProvider(async () => "tok");
    const err = (await b2b("/x").catch((e: unknown) => e)) as B2bError;
    expect(err).toBeInstanceOf(B2bError);
    expect(err.isVersionConflict && err.currentVersion === 9 && err.currentStatus === "SCHEDULED").toBe(true);

    const conflicts = [{ type: "TEAM_TIME_OVERLAP", message: "Team 4 is already assigned to JOB-1038 between 13:00–16:00" }];
    const e2 = await toB2bError(json({ error: "conflict", code: "ASSIGNMENT_CONFLICT", conflicts }, 409));
    expect(e2.conflicts).toEqual(conflicts);

    const e3 = await toB2bError(json({ error: "later", code: "MIGRATION_PENDING", migration: "0004" }, 503));
    expect(e3.isMigrationPending).toBe(true);
    const e4 = await toB2bError(json({ error: "Not found", code: "NOT_FOUND" }, 404));
    expect(e4.isNotFound).toBe(true);
    const e5 = await toB2bError(new Response("<html>", { status: 502 }));
    expect(e5.code).toBe("UNKNOWN");
    expect((await toB2bError(json({}, 429))).code).toBe("RATE_LIMITED");
  });

  it("turns a network failure into a NETWORK error and returns undefined for 204", async () => {
    setTokenProvider(async () => "tok");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(b2b("/x")).rejects.toMatchObject({ code: "NETWORK", status: 0 });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
    await expect(b2b("/x", { method: "DELETE" })).resolves.toBeUndefined();
  });

  it("doesn't retry client errors but retries server errors twice", () => {
    expect(shouldRetry(0, new B2bError(404, "NOT_FOUND", "x"))).toBe(false);
    expect(shouldRetry(0, new B2bError(503, "MIGRATION_PENDING", "x"))).toBe(false);
    expect(shouldRetry(0, new B2bError(500, "UNKNOWN", "x"))).toBe(true);
    expect(shouldRetry(2, new B2bError(500, "UNKNOWN", "x"))).toBe(false);
  });
});

describe("org switching", () => {
  it("keeps the section but never the entity id", () => {
    expect(switchOrgPath("/ops/A/jobs/job-1", "A", "B")).toBe("/ops/B/jobs");
    expect(switchOrgPath("/ops/A/dispatch/board", "A", "B")).toBe("/ops/B/dispatch");
    expect(switchOrgPath("/ops", "A", "B")).toBe("/ops/B/dashboard");
  });
});
