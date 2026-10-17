import { describe, expect, it } from "vitest";
import { formatAddress, jobScopeIsPartial, mapsUrl } from "./address";

describe("address helpers", () => {
  it("formats and encodes", () => {
    const l = { addressLine: "Calle Mayor 1", city: "Marbella", postalCode: "29600", country: "ES" };
    expect(formatAddress(l)).toBe("Calle Mayor 1, 29600, Marbella, ES");
    expect(mapsUrl(l)).toContain(encodeURIComponent("Calle Mayor 1, 29600, Marbella, ES"));
    expect(mapsUrl({ ...l, latitude: 1.5, longitude: 2 })).toContain("1.5%2C2");
  });
  it("detects partial job scope", () => {
    expect(jobScopeIsPartial([{ permission: "job.view", scope: "TEAM" }])).toBe(true);
    expect(jobScopeIsPartial([{ permission: "job.view", scope: "ALL" }])).toBe(false);
    expect(jobScopeIsPartial([])).toBe(false);
  });
});
