import { describe, expect, it } from "vitest";
import type { NotificationItem } from "@/b2b/api/types";
import { bellLabel, markReadLocally, notificationKind, relativeTime, unreadBadge } from "./notifications";

const n = (id: number, read: boolean): NotificationItem => ({ id, kind: "x", title: "t", body: "b", read, createdAt: "2026-01-01T00:00:00Z" });

describe("notifications helpers", () => {
  it("maps known kinds and falls back", () => {
    expect(notificationKind("job.sent_back").label).toBe("Sent back");
    expect(notificationKind("weird.kind").label).toBe("Update");
  });
  it("formats relative time", () => {
    const now = Date.parse("2026-10-12T12:00:00Z");
    expect(relativeTime("2026-10-12T11:55:00Z", now)).toBe("5 min ago");
    expect(relativeTime("2026-10-12T09:00:00Z", now)).toBe("3 h ago");
    expect(relativeTime("2026-10-10T12:00:00Z", now)).toBe("2 d ago");
    expect(relativeTime("2026-10-12T12:00:00Z", now)).toBe("just now");
  });
  it("marks one read immutably", () => {
    const list = [n(1, false), n(2, false)];
    const out = markReadLocally(list, 1);
    expect(out[0].read).toBe(true);
    expect(list[0].read).toBe(false);
    expect(out[1]).toBe(list[1]);
  });
  it("badge and label", () => {
    expect(unreadBadge(120)).toBe("99+");
    expect(bellLabel(3)).toBe("Notifications, 3 unread");
    expect(bellLabel(0)).toBe("Notifications");
  });
});
