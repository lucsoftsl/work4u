import { describe, expect, it } from "vitest";
import { newPartId, totalsByName, validatePart } from "./parts";

describe("validatePart", () => {
  it("accepts name + quantity only and trims", () => {
    expect(validatePart({ name: " Valve ", quantity: "2" })).toMatchObject({ errors: {}, value: { name: "Valve", quantity: 2, sku: null, unit: null, note: null } });
    expect(validatePart({ name: "Pipe", quantity: "1,5", unit: "m" }).value?.quantity).toBe(1.5);
  });
  it("rejects empty name, zero/negative/huge/3-decimal/non-numeric quantity", () => {
    expect(validatePart({ name: " ", quantity: "1" }).errors.name).toBe("name");
    for (const q of ["0", "-1", "10000", "1.234", "abc", ""]) expect(validatePart({ name: "x", quantity: q }).errors.quantity).toBe("qty");
    expect(validatePart({ name: "x", quantity: "9999" }).value).not.toBeNull();
  });
  it("enforces field lengths", () => {
    expect(validatePart({ name: "x".repeat(121), quantity: "1" }).errors.name).toBe("long");
    expect(validatePart({ name: "x", quantity: "1", sku: "s".repeat(61), unit: "u".repeat(13), note: "n".repeat(301) }).errors).toEqual({ sku: "long", unit: "long", note: "long" });
  });
});
describe("helpers", () => {
  it("makes unique uuid-shaped ids", () => {
    const a = newPartId();
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(newPartId()).not.toBe(a);
  });
  it("sums per name and unit", () => {
    expect(totalsByName([{ name: "Valve", unit: "pcs", quantity: 1 }, { name: "valve", unit: "pcs", quantity: 0.5 }, { name: "Valve", unit: null, quantity: 2 }])).toHaveLength(2);
  });
});
