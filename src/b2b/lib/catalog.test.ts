import { describe, expect, it } from "vitest";
import { B2bError } from "@/b2b/api/client";
import type { Grant } from "@/b2b/api/types";
import { can as canFn, type PermissionKey } from "./permissions";
import {
  EMPTY_CUSTOMER_FORM, EMPTY_LOCATION_FORM, catalogActions, catalogErrorMessage, customerInput, diffIds, filterMembers, filterSkills,
  isForbidden, leadAfterMemberChange, locationInput, skillsByMember, toggleId, validateCustomer, validateLocation,
} from "./catalog";

const viewerWith = (...perms: string[]) => ({
  grants: perms.map((permission) => ({ permission, scope: "ALL" }) as Grant),
  teamIds: [] as string[],
});
const actionsFor = (...perms: string[]) => { const v = viewerWith(...perms); return catalogActions((p: PermissionKey) => canFn(v, p)); };

const members = [
  { id: "m1", displayName: "Ana Ruiz", workEmail: "ana@acme.com" },
  { id: "m2", displayName: "Bo Lind", workEmail: "bo@acme.com" },
];
const skills = [{ id: "s1", name: "HVAC", memberIds: ["m1"] }, { id: "s2", name: "Plumbing", memberIds: ["m1", "m2"] }];

describe("catalogActions", () => {
  it("shows nothing for a viewer-only role", () => {
    const a = actionsFor("team.view", "customer.view");
    expect(Object.values(a).some(Boolean)).toBe(false);
  });
  it("gates team controls on team.manage and status on team.status", () => {
    const a = actionsFor("team.view", "team.status");
    expect(a.changeTeamStatus).toBe(true);
    expect(a.createTeam).toBe(false);
    expect(actionsFor("team.manage").assignSkills).toBe(true);
  });
  it("gates members on member.view and customers on customer.manage", () => {
    expect(actionsFor("member.view").viewMembers).toBe(true);
    const a = actionsFor("customer.manage");
    expect([a.createCustomer, a.editCustomer, a.deleteCustomer, a.editLocations]).toEqual([true, true, true, true]);
    expect(a.createTeam).toBe(false);
  });
});

describe("filters", () => {
  it("filters members by name/email and skill", () => {
    expect(filterMembers(members, "ana")).toHaveLength(1);
    expect(filterMembers(members, "ACME")).toHaveLength(2);
    expect(filterMembers(members, "", "s1", skills).map((m) => m.id)).toEqual(["m1"]);
  });
  it("filters skills case-insensitively", () => {
    expect(filterSkills(skills, " plumb ").map((s) => s.id)).toEqual(["s2"]);
    expect(filterSkills(skills, "")).toHaveLength(2);
  });
  it("maps skills by member", () => {
    expect(skillsByMember(skills).get("m1")?.map((s) => s.name)).toEqual(["HVAC", "Plumbing"]);
    expect(skillsByMember(skills).get("m3")).toBeUndefined();
  });
});

describe("id diffs", () => {
  it("computes added and removed", () => {
    expect(diffIds(["a", "b"], ["b", "c"])).toEqual({ added: ["c"], removed: ["a"], changed: true });
    expect(diffIds(["a"], ["a"]).changed).toBe(false);
  });
  it("toggles ids immutably", () => {
    const base = ["a"];
    expect(toggleId(base, "b")).toEqual(["a", "b"]);
    expect(toggleId(base, "a")).toEqual([]);
    expect(base).toEqual(["a"]);
  });
  it("clears the lead when they leave the team", () => {
    expect(leadAfterMemberChange("m1", ["m1", "m2"])).toBe("m1");
    expect(leadAfterMemberChange("m1", ["m2"])).toBeNull();
    expect(leadAfterMemberChange(null, ["m2"])).toBeNull();
  });
});

describe("validation", () => {
  it("requires customer name and a valid email", () => {
    expect(validateCustomer(EMPTY_CUSTOMER_FORM).name).toBeTruthy();
    expect(validateCustomer({ ...EMPTY_CUSTOMER_FORM, name: "X", email: "nope" }).email).toBeTruthy();
    expect(validateCustomer({ ...EMPTY_CUSTOMER_FORM, name: "X", email: "a@b.co" })).toEqual({});
  });
  it("normalises customer input", () => {
    expect(customerInput({ ...EMPTY_CUSTOMER_FORM, name: " Acme ", phone: " " })).toMatchObject({ name: "Acme", phone: null, email: null });
  });
  it("validates location fields", () => {
    const e = validateLocation({ ...EMPTY_LOCATION_FORM, country: "ESP", latitude: "95", longitude: "x" });
    expect(Object.keys(e).sort()).toEqual(["addressLine", "country", "label", "latitude", "longitude"]);
  });
  it("builds location input with numbers and upper-case country", () => {
    const i = locationInput({ ...EMPTY_LOCATION_FORM, label: "HQ", addressLine: "1 Main", country: "es", latitude: "40,5" });
    expect(i).toMatchObject({ country: "ES", latitude: 40.5, longitude: null, city: null });
  });
});

describe("catalogErrorMessage", () => {
  it("maps RESOURCE_IN_USE per subject", () => {
    const e = new B2bError(409, "RESOURCE_IN_USE", "x");
    expect(catalogErrorMessage(e, "customer")).toMatch(/has jobs/);
    expect(catalogErrorMessage(e, "skill")).toMatch(/required by a job/);
  });
  it("maps 403, migration and network errors", () => {
    expect(catalogErrorMessage(new B2bError(403, "FORBIDDEN", "x"), "team")).toMatch(/permission/);
    expect(catalogErrorMessage(new B2bError(503, "MIGRATION_PENDING", "x"), "team")).toMatch(/isn't available yet/);
    expect(catalogErrorMessage(new B2bError(0, "NETWORK", "x"), "team")).toMatch(/connection/);
    expect(catalogErrorMessage(new Error("boom"), "team")).toMatch(/went wrong/);
  });
  it("uses the first validation field message", () => {
    const e = new B2bError(400, "VALIDATION_ERROR", "x", { fields: { name: "Too long" } });
    expect(catalogErrorMessage(e, "team")).toContain("Too long");
  });
  it("detects forbidden", () => {
    expect(isForbidden(new B2bError(403, "FORBIDDEN", "x"))).toBe(true);
    expect(isForbidden(new Error("x"))).toBe(false);
  });
});
