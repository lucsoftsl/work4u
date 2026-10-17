import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(cleanup);
import { TagsInput } from "./TagsInput";

vi.mock("@/b2b/setup/i18n", () => ({ useTr: () => ({ tr: (_k: string, f: string, v: Record<string, string | number> = {}) => Object.entries(v).reduce((s, [k, x]) => s.split(`{${k}}`).join(String(x)), f) }) }));

function Harness() {
  const [tags, setTags] = useState<string[]>([]);
  return <TagsInput tags={tags} onChange={setTags} />;
}

describe("TagsInput", () => {
  it("adds a lower-case chip on Enter and removes it", () => {
    render(<Harness />);
    const input = screen.getByLabelText("Tags");
    fireEvent.change(input, { target: { value: "VIP" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(screen.getByText("vip")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Remove tag vip" }));
    expect(screen.queryByText("vip")).toBeNull();
  });
  it("shows an inline error for a leading special character", () => {
    render(<Harness />);
    const input = screen.getByLabelText("Tags");
    fireEvent.change(input, { target: { value: "=cmd" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(screen.getByText("A tag can't start with = + - or @.")).toBeTruthy();
    expect(input.getAttribute("aria-invalid")).toBe("true");
  });
});
