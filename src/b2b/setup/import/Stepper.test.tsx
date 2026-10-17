import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Stepper } from "./Stepper";

vi.mock("@/lib/i18n", () => ({ useTranslation: () => ({ t: (_k: string, f: string) => f, locale: "en" }) }));
afterEach(cleanup);

describe("Stepper", () => {
  it("marks the current step and lets earlier steps be reached", () => {
    const onGo = vi.fn();
    render(<Stepper current="preview" maxReached="preview" onGo={onGo} />);
    expect(screen.getAllByRole("listitem")[2].getAttribute("aria-current")).toBe("step");
    fireEvent.click(screen.getByRole("button", { name: /Map columns/ }));
    expect(onGo).toHaveBeenCalledWith("map");
  });
  it("locks all steps on the result", () => {
    render(<Stepper current="result" maxReached="result" onGo={vi.fn()} />);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });
});
