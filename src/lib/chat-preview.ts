/** Inbox-row preview fields pulled defensively from a conversation list item (shape varies by backend version). */
export type ConversationPreview = { lastText: string; jobTitle?: string; /** Last message has an image (text may be empty). */ hasImage: boolean; /** The signed-in user sent the last message. */ fromSelf: boolean };

type Loose = Record<string, any> | null | undefined; // eslint-disable-line @typescript-eslint/no-explicit-any

export function conversationPreview(item: Loose): ConversationPreview {
  const otherId: unknown = item?.otherUserData?.id;
  const last = item?.lastMessage;
  const lastObj: Loose = last && typeof last === "object" ? last : null;
  const text =
    (typeof last === "string" ? last : undefined) ??
    lastObj?.message?.text ??
    lastObj?.text ??
    item?.lastMessageText ??
    "";
  const jd = item?.jobData ?? lastObj?.jobData ?? lastObj?.message?.jobData ?? item?.job ?? null;
  const jobTitle: unknown = jd?.title ?? jd?.jobTitle ?? item?.jobTitle;
  const fromId: unknown = lastObj?.fromUserId;
  return {
    lastText: typeof text === "string" ? text : "",
    jobTitle: typeof jobTitle === "string" && jobTitle ? jobTitle : undefined,
    hasImage: typeof lastObj?.imageUrl === "string" && lastObj.imageUrl.length > 0,
    // fromUserId is the sender; when it is not the partner it is us
    fromSelf: typeof fromId === "string" && typeof otherId === "string" && fromId !== otherId,
  };
}

export function initialOf(name: string): string {
  return (Array.from(name.trim())[0] ?? "?").toUpperCase();
}

/** Keep a newer socket preview, but replace older cached text with the current inbox response. */
export function latestConversationPreview(existing: { lastMessageTime?: string; lastMessageText?: string } | undefined, apiTime: string | undefined, apiText: string) {
  const time = (value?: string) => value ? Date.parse(value) || 0 : 0;
  return existing && time(existing.lastMessageTime) > time(apiTime)
    ? { lastMessageTime: existing.lastMessageTime, lastMessageText: existing.lastMessageText }
    : { lastMessageTime: apiTime ?? existing?.lastMessageTime, lastMessageText: apiText || existing?.lastMessageText || "" };
}
