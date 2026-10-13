import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useUnreadMessages } from "./useUnreadMessages";
const chat = vi.hoisted(() => ({ unreadCount: 4 }));
const apiJson = vi.hoisted(() => vi.fn());
vi.mock("@/context/ChatContext", () => ({ useChat: () => chat }));
vi.mock("@/lib/http", () => ({ apiJson }));
describe("useUnreadMessages", () => {
  it("reads the shared ChatProvider count and never polls on its own", () => {
    vi.useFakeTimers();
    const a = renderHook(() => useUnreadMessages());
    const b = renderHook(() => useUnreadMessages());
    vi.advanceTimersByTime(300_000);
    expect(a.result.current).toBe(4);
    expect(b.result.current).toBe(4);
    expect(apiJson).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
