import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { RowMenu } from "./RowMenu";
import type { Member } from "../api";

vi.mock("@/lib/i18n", () => ({ useTranslation: () => ({ locale: "en", t: (_k: string, f?: string) => f ?? _k }) }));
afterEach(cleanup);
const member = { id: "m1", displayName: "Ana", status: "ACTIVE", loginStatus: "NONE", role: { id: "r", name: "Tech", template: "TECHNICIAN" } } as Member;

describe("team RowMenu", () => {
  it("moves focus back to the Actions button before running an action, so the dialog it opens returns focus there", () => {
    const onAction = vi.fn(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: "Actions for Ana" })));
    render(<RowMenu member={member} canManage onAction={onAction} />);
    fireEvent.click(screen.getByRole("button", { name: "Actions for Ana" }));
    const edit = screen.getByRole("button", { name: "Edit" });
    edit.focus();
    fireEvent.click(edit);
    expect(onAction).toHaveBeenCalledWith("edit");
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Actions for Ana" }));
  });
});
