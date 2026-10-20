import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import type { StepKey } from "./Stepper";
import { useStepFocus } from "./useStepFocus";

function Steps({ step }: { step: StepKey }) {
  useStepFocus(step);
  return step === "upload" ? <h2 id="upload-h">Upload</h2> : step === "map" ? <h2 id="map-h">Map columns</h2> : <h2 id="prev-h">Preview</h2>;
}
afterEach(cleanup);

describe("useStepFocus", () => {
  it("leaves focus alone on the first render, then moves it to the new step's heading on every change", () => {
    const { rerender } = render(<Steps step="upload" />);
    expect(document.activeElement).toBe(document.body);
    rerender(<Steps step="map" />);
    const map = document.getElementById("map-h")!;
    expect(document.activeElement).toBe(map);
    expect(map.getAttribute("tabindex")).toBe("-1");
    rerender(<Steps step="preview" />);
    expect(document.activeElement).toBe(document.getElementById("prev-h"));
  });
});
