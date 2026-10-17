import { describe, expect, it } from "vitest";
import type { ClientNote, TimelineItem } from "@/b2b/setup/api";
import { NOTE_MAX, buildFeed, canPinNote, noteExcerpt, validateNoteBody } from "./noteRules";

const note = (id: string, createdAt: string, pinned = false): ClientNote => ({ id, body: id, pinned, author: null, createdAt, editedAt: null, canEdit: false, canDelete: false });

describe("note rules", () => {
  it("validates body length", () => {
    expect(validateNoteBody("  ")).toBe("empty");
    expect(validateNoteBody("a".repeat(NOTE_MAX + 1))).toBe("tooLong");
    expect(validateNoteBody("ok")).toBeNull();
  });
  it("pin requires customer.manage", () => {
    expect(canPinNote((p) => p === "customer.manage")).toBe(true);
    expect(canPinNote(() => false)).toBe(false);
  });
  it("makes a short excerpt", () => {
    expect(noteExcerpt("a\n\n b", 10)).toBe("a b");
    expect(noteExcerpt("x".repeat(100), 10)).toHaveLength(10);
  });
  it("puts pinned first, then merges notes and system entries by date and drops NOTE timeline rows", () => {
    const tl: TimelineItem[] = [
      { type: "NOTE", at: "2026-10-05T00:00:00Z" },
      { type: "JOB_CREATED", at: "2026-10-04T00:00:00Z" },
    ];
    const feed = buildFeed([note("old", "2026-10-01T00:00:00Z", true), note("new", "2026-10-06T00:00:00Z"), note("mid", "2026-10-03T00:00:00Z")], tl);
    expect(feed.map((f) => (f.kind === "note" ? f.note.id : f.item.type))).toEqual(["old", "new", "JOB_CREATED", "mid"]);
  });
});
