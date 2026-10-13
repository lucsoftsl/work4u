import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { PauseSheet } from "./PauseSheet";
import { UndoToast } from "./UndoToast";

const offline = vi.hoisted(() => ({ value: {} as Record<string, unknown> }));
vi.mock("@/lib/i18n", () => ({ useTranslation: () => ({ t: (_k: string, f: string) => f }) }));
vi.mock("@/b2b/offline/OfflineProvider", () => ({ useOffline: () => offline.value }));
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; };
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe("PauseSheet", () => {
  it("needs a reason; Other also needs text; Cancel changes nothing", () => {
    const onConfirm = vi.fn(); const onCancel = vi.fn();
    render(<PauseSheet open onConfirm={onConfirm} onCancel={onCancel} />);
    const pause = () => screen.getByRole("button", { name: "Pause" }) as HTMLButtonElement;
    expect(screen.getByRole("group", { name: "Why are you pausing?" })).toBeTruthy();
    expect(pause().disabled).toBe(true);
    fireEvent.click(screen.getByRole("radio", { name: "Other" }));
    expect(pause().disabled).toBe(true);
    expect(screen.getByText("Say what's happening.")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Note (optional)"), { target: { value: "gate locked" } });
    expect(pause().disabled).toBe(false);
    fireEvent.click(pause());
    expect(onConfirm).toHaveBeenCalledWith("OTHER", "gate locked");
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalled();
  });
  it("a plain reason sends no note", () => {
    const onConfirm = vi.fn();
    render(<PauseSheet open onConfirm={onConfirm} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByRole("radio", { name: "Waiting for parts" }));
    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    expect(onConfirm).toHaveBeenCalledWith("PARTS", undefined);
  });
  it("every option row is at least 56px tall", () => {
    render(<PauseSheet open onConfirm={vi.fn()} onCancel={vi.fn()} />);
    for (const r of screen.getAllByRole("radio")) expect(r.closest("label")?.className).toContain("min-h-[56px]");
  });
});

describe("UndoToast", () => {
  const set = (over: Record<string, unknown>) => { offline.value = { undoEntry: { token: 1, jobId: "j", text: "Work paused" }, undoMessage: null, undoLast: vi.fn(), dismissUndo: vi.fn(), clearUndoMessage: vi.fn(), ...over }; return offline.value; };
  it("announces politely with the 8 s window and undoes on click", () => {
    const o = set({});
    render(<UndoToast />);
    expect(screen.getByRole("status").textContent).toContain("Work paused. Undo available for 8 seconds.");
    fireEvent.click(screen.getByRole("button", { name: /^Undo/ }));
    expect(o.undoLast).toHaveBeenCalled();
  });
  it("dismisses itself after 8 s, but not while hovered", () => {
    vi.useFakeTimers();
    const o = set({});
    render(<UndoToast />);
    const toast = screen.getByRole("status").parentElement!;
    fireEvent.mouseEnter(toast);
    act(() => { vi.advanceTimersByTime(20_000); });
    expect(o.dismissUndo).not.toHaveBeenCalled();
    fireEvent.mouseLeave(toast);
    act(() => { vi.advanceTimersByTime(8_500); });
    expect(o.dismissUndo).toHaveBeenCalled();
  });
  it("Ctrl+Z undoes outside text fields only; Escape dismisses", () => {
    const o = set({});
    render(<><input aria-label="t" /><UndoToast /></>);
    fireEvent.keyDown(screen.getByLabelText("t"), { key: "z", ctrlKey: true });
    expect(o.undoLast).not.toHaveBeenCalled();
    fireEvent.keyDown(document.body, { key: "z", ctrlKey: true });
    expect(o.undoLast).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(o.dismissUndo).toHaveBeenCalled();
  });
  it("shows a failed undo as an alert, and nothing when there is nothing to undo", () => {
    set({ undoEntry: null, undoMessage: "Can't undo: this job changed." });
    const { rerender } = render(<UndoToast />);
    expect(screen.getByRole("alert").textContent).toContain("Can't undo");
    set({ undoEntry: null, undoMessage: null });
    rerender(<UndoToast />);
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
