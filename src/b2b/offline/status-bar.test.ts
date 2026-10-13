import { describe, expect, it } from "vitest";
import { statusBarView } from "./status-bar";

const base = { online: true, syncState: "synced" as const, waitingCount: 0, attentionCount: 0, lastSync: null, storageLow: false, clock: () => "13:42" };

describe("statusBarView", () => {
  it("covers synced, syncing, offline queued, attention and storage low", () => {
    expect(statusBarView({ ...base, lastSync: "x" })).toEqual({ tone: "ok", text: "Online · all sent 13:42" });
    expect(statusBarView({ ...base, syncState: "syncing", waitingCount: 2 })).toEqual({ tone: "syncing", text: "Sending 2 changes…" });
    expect(statusBarView({ ...base, online: false, waitingCount: 3 })).toEqual({ tone: "offline", text: "Offline · 3 changes waiting" });
    expect(statusBarView({ ...base, online: false })).toEqual({ tone: "offline", text: "Offline" });
    expect(statusBarView({ ...base, attentionCount: 1 })).toEqual({ tone: "attention", text: "1 needs your attention" });
    expect(statusBarView({ ...base, storageLow: true }).tone).toBe("warning");
  });
  it("attention wins over offline", () => {
    expect(statusBarView({ ...base, online: false, attentionCount: 2, waitingCount: 1 }).tone).toBe("attention");
  });
});

describe("statusBarView translation", () => {
  it("routes wording through a custom t and fills placeholders", () => {
    const t = (key: string, fb: string) => (key === "b2b.tech.bar.offline" ? "Offline!" : fb);
    expect(statusBarView({ ...base, online: false, t })).toEqual({ tone: "offline", text: "Offline!" });
    expect(statusBarView({ ...base, online: false, waitingCount: 3, t }).text).toBe("Offline · 3 changes waiting");
  });
});
