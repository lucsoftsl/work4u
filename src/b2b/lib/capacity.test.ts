import { describe, expect, it } from "vitest";
import { capacityView, formatHours } from "./capacity";

describe("formatHours", () => {
  it("formats minutes as hours with at most one decimal", () => {
    expect(formatHours(480)).toBe("8");
    expect(formatHours(150)).toBe("2.5");
    expect(formatHours(0)).toBe("0");
    expect(formatHours(-5)).toBe("0");
  });
});

describe("capacityView", () => {
  it("shows booked of working hours and the percentage", () => {
    expect(capacityView({ workingMinutes: 480, bookedMinutes: 120, utilization: 0.25, source: "team" })).toEqual({
      state: "ok", percent: 25, fill: 25, bookedHours: "2", workingHours: "8", source: "team", isDefault: false,
    });
  });
  it("marks a lane that is nearly full and one that is over-booked (bar capped at 100)", () => {
    expect(capacityView({ workingMinutes: 480, bookedMinutes: 450, utilization: 0.94, source: "members" }).state).toBe("full");
    const over = capacityView({ workingMinutes: 480, bookedMinutes: 720, utilization: 1.5, source: "members" });
    expect(over).toMatchObject({ state: "over", percent: 150, fill: 100 });
  });
  it("treats a null utilization as not working", () => {
    expect(capacityView({ workingMinutes: 0, bookedMinutes: 0, utilization: null, source: "default" })).toMatchObject({ state: "not-working", percent: null, fill: 0, isDefault: true });
  });
  it("flags default hours so the UI can explain them", () => {
    expect(capacityView({ workingMinutes: 480, bookedMinutes: 0, utilization: 0, source: "default" }).isDefault).toBe(true);
  });
});
