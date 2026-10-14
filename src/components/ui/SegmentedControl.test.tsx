import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { SegmentedControl } from "./SegmentedControl";

afterEach(cleanup);

describe("SegmentedControl tabs: long translated labels wrap instead of overflowing a 320px page", () => {
  it("tabs can shrink and wrap (no nowrap), and the group is capped to its container", () => {
    render(<SegmentedControl tone="tabs" label="g" value="a" onChange={() => undefined} options={[{ value: "a", label: "Rezolvă o treabă" }, { value: "b", label: "Găsește de lucru în apropiere" }]} />);
    const radio = screen.getByRole("radio", { name: "Găsește de lucru în apropiere" });
    expect(radio.className).not.toContain("whitespace-nowrap");
    expect(radio.className).toContain("min-w-0");
    expect(screen.getByRole("radiogroup").className).toContain("max-w-full");
  });
});
