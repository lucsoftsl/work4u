import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useRef } from "react";
import { trapTarget, useFocusTrap } from "./useFocusTrap";

function Box() {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, true);
  return (
    <div ref={ref} tabIndex={-1} data-testid="box">
      <button>first</button><input aria-label="mid" /><button disabled>skip</button><button>last</button>
    </div>
  );
}
afterEach(cleanup);

describe("trapTarget", () => {
  it("wraps at both ends and leaves the middle to the browser", () => {
    expect(trapTarget(3, 2, false)).toBe(0);
    expect(trapTarget(3, 0, true)).toBe(2);
    expect(trapTarget(3, 1, false)).toBeNull();
    expect(trapTarget(3, -1, true)).toBe(2); // focus on the container itself
    expect(trapTarget(0, -1, false)).toBe(-1);
  });
});

describe("useFocusTrap", () => {
  it("Tab on the last control goes to the first, Shift+Tab on the first goes to the last (disabled controls skipped)", () => {
    render(<Box />);
    screen.getByText("last").focus();
    fireEvent.keyDown(screen.getByTestId("box"), { key: "Tab" });
    expect(document.activeElement).toBe(screen.getByText("first"));
    fireEvent.keyDown(screen.getByTestId("box"), { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(screen.getByText("last"));
  });
  it("returns focus to the opener when it closes", () => {
    const opener = document.createElement("button");
    document.body.appendChild(opener);
    opener.focus();
    const { unmount } = render(<Box />);
    screen.getByText("first").focus();
    unmount();
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });
});
