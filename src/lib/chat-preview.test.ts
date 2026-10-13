import { describe, expect, it } from "vitest";
import { conversationPreview, initialOf, latestConversationPreview } from "./chat-preview";

describe("conversationPreview", () => {
  it("reads nested last message and job title", () => {
    expect(conversationPreview({ lastMessage: { message: { text: "Hi" }, jobData: { title: "Fix sink" } } })).toEqual({
      lastText: "Hi",
      jobTitle: "Fix sink",
      hasImage: false,
      fromSelf: false,
    });
  });
  it("reads a string lastMessage", () => {
    expect(conversationPreview({ lastMessage: "Yo" }).lastText).toBe("Yo");
  });
  it("returns empty for missing data", () => {
    expect(conversationPreview(null)).toEqual({ lastText: "", jobTitle: undefined, hasImage: false, fromSelf: false });
  });
});

describe("conversationPreview (API lastMessage shape)", () => {
  const base = { otherUserData: { id: "bea" }, unreadCount: 2 };
  it("reads text, sender and image of the documented shape", () => {
    expect(conversationPreview({ ...base, lastMessage: { text: "See you at 5", fromUserId: "me" } })).toMatchObject({ lastText: "See you at 5", fromSelf: true, hasImage: false });
    expect(conversationPreview({ ...base, lastMessage: { text: "Hi", fromUserId: "bea" } }).fromSelf).toBe(false);
  });
  it("flags an image-only message (text null)", () => {
    expect(conversationPreview({ ...base, lastMessage: { text: null, imageUrl: "https://x/y.jpg", fromUserId: "bea" } })).toMatchObject({ lastText: "", hasImage: true });
  });
});

describe("initialOf", () => {
  it("uppercases first character", () => expect(initialOf(" anna")).toBe("A"));
  it("falls back to ?", () => expect(initialOf("")).toBe("?"));
});

describe("latestConversationPreview", () => {
  it("replaces a cached preview when the API has a newer message", () => {
    expect(latestConversationPreview({ lastMessageTime: "2026-10-12T09:00:00Z", lastMessageText: "Old" }, "2026-10-12T10:00:00Z", "Photo")).toEqual({ lastMessageTime: "2026-10-12T10:00:00Z", lastMessageText: "Photo" });
  });
  it("keeps a newer live message when a stale inbox response arrives", () => {
    expect(latestConversationPreview({ lastMessageTime: "2026-10-12T11:00:00Z", lastMessageText: "Live" }, "2026-10-12T10:00:00Z", "Old").lastMessageText).toBe("Live");
  });
});
