import { beforeEach, describe, expect, it, vi } from "vitest";
import { getB2bPolicies, putB2bPolicies, PolicyApiError } from "./b2b-policies-api";
const apiFetch = vi.hoisted(() => vi.fn());
vi.mock("./http", () => ({ API_BASE_URL: "http://api", apiFetch }));
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
beforeEach(() => apiFetch.mockReset());
describe("b2b policies api", () => {
  it("GETs with the bearer token", async () => {
    apiFetch.mockResolvedValue(json(200, { allowApprovalWithoutEvidence: false, updatedAt: null, updatedByUserId: null }));
    expect(await getB2bPolicies("tok")).toMatchObject({ allowApprovalWithoutEvidence: false });
    expect(apiFetch).toHaveBeenCalledWith("http://api/api/admin/site/b2b-policies", { headers: { Authorization: "Bearer tok" } });
  });
  it("PUTs a boolean body", async () => {
    apiFetch.mockResolvedValue(json(200, { allowApprovalWithoutEvidence: true, updatedAt: "2026-10-13T10:00:00Z", updatedByUserId: "u1" }));
    await putB2bPolicies("tok", true);
    const [, init] = apiFetch.mock.calls[0];
    expect(init.method).toBe("PUT");
    expect(JSON.parse(init.body)).toEqual({ allowApprovalWithoutEvidence: true });
  });
  it("flags 503 MIGRATION_PENDING and keeps the status of other failures", async () => {
    apiFetch.mockResolvedValue(json(503, { code: "MIGRATION_PENDING", migration: "0007_site_settings.sql" }));
    await expect(putB2bPolicies("tok", true)).rejects.toMatchObject({ migrationPending: true, status: 503 });
    apiFetch.mockResolvedValue(json(403, { error: "no" }));
    const err = await getB2bPolicies("tok").catch((e) => e);
    expect(err).toBeInstanceOf(PolicyApiError);
    expect(err).toMatchObject({ migrationPending: false, status: 403 });
  });
});
