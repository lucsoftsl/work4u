import type { ClientNote, TimelineItem } from "@/b2b/setup/api";

export const NOTE_MAX = 4000;
export type NoteBodyError = "empty" | "tooLong";

export function validateNoteBody(body: string): NoteBodyError | null {
  const t = body.trim();
  if (!t) return "empty";
  return t.length > NOTE_MAX ? "tooLong" : null;
}

/** Only the author edits text (the API sets canEdit); delete = author or org.manage (canDelete); pin = customer.manage. */
export const canEditNote = (n: Pick<ClientNote, "canEdit">): boolean => n.canEdit;
export const canDeleteNote = (n: Pick<ClientNote, "canDelete">): boolean => n.canDelete;
export const canPinNote = (can: (p: string) => boolean): boolean => can("customer.manage");

export function noteExcerpt(body: string, max = 80): string {
  const flat = body.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1).trimEnd()}…` : flat;
}

export type FeedItem =
  | { kind: "note"; at: string; note: ClientNote }
  | { kind: "system"; at: string; item: TimelineItem };

const time = (s: string) => {
  const n = Date.parse(s);
  return Number.isNaN(n) ? 0 : n;
};

/** Pinned notes first, then notes and system entries (job created/completed, client events) newest first. */
export function buildFeed(notes: readonly ClientNote[], timeline: readonly TimelineItem[]): FeedItem[] {
  const pinned: FeedItem[] = notes.filter((n) => n.pinned).sort((a, b) => time(b.createdAt) - time(a.createdAt)).map((note) => ({ kind: "note", at: note.createdAt, note }));
  const rest: FeedItem[] = [
    ...notes.filter((n) => !n.pinned).map((note): FeedItem => ({ kind: "note", at: note.createdAt, note })),
    ...timeline.filter((t) => t.type !== "NOTE" && typeof t.at === "string").map((item): FeedItem => ({ kind: "system", at: item.at, item })),
  ].sort((a, b) => time(b.at) - time(a.at));
  return [...pinned, ...rest];
}
