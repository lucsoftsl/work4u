import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { LocaleProvider } from "@/lib/i18n";
import { ErrorState } from "./QueryState";

describe("ErrorState", () => {
  it("announces the error and calls onRetry", () => {
    const onRetry = vi.fn();
    render(
      <LocaleProvider>
        <ErrorState message="Network down" onRetry={onRetry} />
      </LocaleProvider>
    );

    expect(screen.getByRole("alert").textContent).toContain("Network down");
    fireEvent.click(screen.getByRole("button"));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
