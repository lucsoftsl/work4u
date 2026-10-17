import { describe, expect, it } from "vitest";
import type { Invitation, Member } from "../api";
import { buildCreateBody, buildInviteLink, buildMemberPatch, countWithoutLogin, daysSince, deriveBadge, filterMembers, formFromMember, pendingInvitesByMember, selectableRoles, splitInvitable } from "./memberLogic";

const mk = (o: Partial<Member> = {}): Member => ({ id: "m1", displayName: "Ana", workEmail: null, phone: null, externalId: null, memberType: "EMPLOYEE", status: "ACTIVE", loginStatus: "NONE", role: { id: "r1", name: "Tech", template: "TECHNICIAN" }, ...o });

describe("deriveBadge", () => {
  it("maps the four statuses", () => {
    expect(deriveBadge(mk())).toBe("planning");
    expect(deriveBadge(mk({ loginStatus: "INVITED" }))).toBe("invited");
    expect(deriveBadge(mk({ loginStatus: "ACTIVE" }))).toBe("active");
    expect(deriveBadge(mk({ status: "SUSPENDED", loginStatus: "ACTIVE" }))).toBe("suspended");
  });
});
describe("daysSince", () => {
  it("counts whole days and never goes negative", () => {
    const now = Date.parse("2026-10-15T12:00:00Z");
    expect(daysSince("2026-10-12T12:00:00Z", now)).toBe(3);
    expect(daysSince("2026-10-20T12:00:00Z", now)).toBe(0);
    expect(daysSince("nope", now)).toBe(0);
  });
});
describe("pendingInvitesByMember", () => {
  it("keeps the newest pending invite per member", () => {
    const base = { email: "a@b.c", roleId: null, memberType: null, expiresAt: "" };
    const list: Invitation[] = [
      { ...base, id: "1", status: "PENDING", memberId: "m1", createdAt: "2026-10-01T00:00:00Z" },
      { ...base, id: "2", status: "PENDING", memberId: "m1", createdAt: "2026-10-05T00:00:00Z" },
      { ...base, id: "3", status: "REVOKED", memberId: "m2", createdAt: "2026-10-05T00:00:00Z" },
      { ...base, id: "4", status: "PENDING", memberId: null, createdAt: "2026-10-05T00:00:00Z" },
    ];
    const r = pendingInvitesByMember(list);
    expect(r.m1.id).toBe("2");
    expect(r.m2).toBeUndefined();
  });
});
describe("filters and counts", () => {
  const list = [mk(), mk({ id: "m2", loginStatus: "ACTIVE", role: { id: "r2", name: "Ops", template: "OPS" } })];
  it("filters by login status and role", () => {
    expect(filterMembers(list, { loginStatus: "NONE", roleId: "" })).toHaveLength(1);
    expect(filterMembers(list, { loginStatus: "", roleId: "r2" })[0].id).toBe("m2");
    expect(filterMembers(list, { loginStatus: "", roleId: "" })).toHaveLength(2);
  });
  it("counts people without login", () => expect(countWithoutLogin(list)).toBe(1));
});
describe("splitInvitable", () => {
  it("skips people without email and those already active", () => {
    const r = splitInvitable([mk({ workEmail: "a@x.io" }), mk({ id: "m2" }), mk({ id: "m3", loginStatus: "ACTIVE", workEmail: "z@x.io" }), mk({ id: "m4", status: "SUSPENDED", workEmail: "s@x.io" })]);
    expect(r.invitable.map((m) => m.id)).toEqual(["m1"]);
    expect(r.skipped.map((m) => m.id)).toEqual(["m2"]);
  });
});
describe("buildInviteLink", () => {
  it("uses the given origin", () => {
    expect(buildInviteLink("https://x.example/", "tok/en")).toBe("https://x.example/b2b/invite/tok%2Fen");
  });
});
describe("selectableRoles", () => {
  const roles = [{ id: "a", template: "ADMIN" }, { id: "t", template: "TECHNICIAN" }];
  it("hides Administrator unless viewer is admin", () => {
    expect(selectableRoles(roles, "OPS")).toEqual([roles[1]]);
    expect(selectableRoles(roles, "ADMIN")).toEqual(roles);
  });
  it("falls back to the current role when roles are unavailable", () => {
    expect(selectableRoles(undefined, "OPS", roles[1])).toEqual([roles[1]]);
    expect(selectableRoles(undefined, "OPS")).toEqual([]);
  });
  it("keeps the current role even if hidden", () => expect(selectableRoles(roles, "OPS", roles[0])[0]).toBe(roles[0]));
});
describe("member body builders", () => {
  it("builds a create body without empty fields", () => {
    expect(buildCreateBody({ ...formFromMember(), displayName: " Ana ", phone: "+34600555021" })).toEqual({ displayName: "Ana", memberType: "EMPLOYEE", phone: "+34600555021" });
  });
  it("patches only changed fields and clears with null", () => {
    const m = mk({ workEmail: "a@x.io", phone: "+1" });
    expect(buildMemberPatch({ ...formFromMember(m), workEmail: "", displayName: "Ana B" }, m)).toEqual({ displayName: "Ana B", workEmail: null });
    expect(buildMemberPatch(formFromMember(m), m)).toEqual({});
  });
});


import { canManageRow } from "./memberLogic";
describe("canManageRow", () => {
  const admin = { role: { id: "r", name: "Administrator", template: "ADMIN" } };
  const tech = { role: { id: "r2", name: "Field Technician", template: "TECHNICIAN" } };
  it("uses the API's per-row flag when present", () => {
    expect(canManageRow({ ...admin, canManage: false }, true, "ADMIN")).toBe(false);
    expect(canManageRow({ ...tech, canManage: true }, true, "OPS_MANAGER")).toBe(true);
  });
  it("falls back to the role rule: only an Administrator manages an Administrator", () => {
    expect(canManageRow(admin, true, "OPS_MANAGER")).toBe(false);
    expect(canManageRow(admin, true, "ADMIN")).toBe(true);
    expect(canManageRow(tech, true, "OPS_MANAGER")).toBe(true);
  });
  it("never without member.manage", () => {
    expect(canManageRow({ ...tech, canManage: true }, false, "ADMIN")).toBe(false);
  });
});
