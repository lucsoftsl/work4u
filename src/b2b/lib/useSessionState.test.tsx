import { afterEach, describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { clearSessionDrafts, useSessionState } from "./useSessionState";

afterEach(() => sessionStorage.clear());

describe("useSessionState", () => {
  it("keeps the value across a remount (reload) under the same key", () => {
    const first = renderHook(() => useSessionState("draft:a", { title: "" }));
    act(() => first.result.current[1]({ title: "Repair boiler" }));
    first.unmount();
    const second = renderHook(() => useSessionState("draft:a", { title: "" }));
    expect(second.result.current[0]).toEqual({ title: "Repair boiler" });
  });
  it("supports updater functions", () => {
    const { result } = renderHook(() => useSessionState("draft:n", 1));
    act(() => result.current[1]((n) => n + 1));
    expect(result.current[0]).toBe(2);
    expect(sessionStorage.getItem("draft:n")).toBe("2");
  });
  it("without a key it is plain state", () => {
    const { result } = renderHook(() => useSessionState<string>(undefined, "x"));
    act(() => result.current[1]("y"));
    expect(result.current[0]).toBe("y");
    expect(sessionStorage.length).toBe(0);
  });
  it("ignores unreadable stored values", () => {
    sessionStorage.setItem("draft:bad", "{not json");
    const { result } = renderHook(() => useSessionState("draft:bad", "fallback"));
    expect(result.current[0]).toBe("fallback");
  });
  it("clearSessionDrafts removes every key under a prefix only", () => {
    sessionStorage.setItem("job:o1", "1");
    sessionStorage.setItem("job:o1:client", "2");
    sessionStorage.setItem("job:o2", "3");
    clearSessionDrafts("job:o1");
    expect(sessionStorage.getItem("job:o1")).toBeNull();
    expect(sessionStorage.getItem("job:o1:client")).toBeNull();
    expect(sessionStorage.getItem("job:o2")).toBe("3");
  });
});
