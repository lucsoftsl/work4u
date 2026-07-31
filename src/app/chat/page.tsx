/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Send, AlertCircle, CornerDownRight, Check, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { useChatWebSocket } from "@/hooks/useChatWebSocket";
import { fetchConversations, fetchMessagesWithUser, markMessageRead } from "@/api";
import { useTranslation } from "@/lib/i18n";
import { ReportButton } from "@/components/ReportButton";

type JobKey = string; // jobId or "nojob"

type OtherUser = {
  id: string;
  name: string;
  email?: string;
  image?: string;
};

type UserThread = {
  otherUser: OtherUser;
  messages: any[];
  lastMessageTime?: string;
  lastMessageText?: string;
  unreadCount?: number;
};

function safeDate(value?: string | null) {
  const t = value ? new Date(value).getTime() : 0;
  return Number.isFinite(t) ? t : 0;
}

function getFromUserId(msg: any) {
  return (
    msg?.fromUserId ??
    msg?.senderUserId ??
    msg?.senderId ??
    msg?.from ??
    msg?.sender?.id ??
    msg?.sender?.userId ??
    null
  );
}

function getToUserId(msg: any) {
  return (
    msg?.toUserId ??
    msg?.receiverUserId ??
    msg?.receiverId ??
    msg?.to ??
    msg?.receiver?.id ??
    msg?.receiver?.userId ??
    null
  );
}

/**
 * IMPORTANT:
 * - Prefer "myUserId logic" whenever possible
 * - Only fallback to msg.isSent when myUserId is unavailable
 */
function getOtherUserId(msg: any, myUserId?: string) {
  const from = getFromUserId(msg);
  const to = getToUserId(msg);

  if (myUserId) {
    if (from === myUserId) return to;
    if (to === myUserId) return from;
  }

  if (typeof msg?.isSent === "boolean") {
    return msg.isSent ? to : from;
  }

  // last resort
  return from ?? to ?? null;
}

function getJobData(msg: any) {
  const jd =
    msg?.jobData ??
    msg?.message?.jobData ??
    msg?.metadata?.job ??
    msg?.job ??
    msg?.message?.job ??
    msg?.payload?.job ??
    null;

  const id = jd?.id ?? jd?.jobId ?? null;
  const title = jd?.title ?? jd?.jobTitle ?? null;
  return { id, title };
}

function getMessageText(msg: any) {
  return msg?.message?.text ?? msg?.text ?? msg?.content?.text ?? msg?.payload?.text ?? "";
}

function getTranslatedText(msg: any): string | undefined {
  return msg?.message?.translatedText ?? undefined;
}

function getSourceLang(msg: any): string | undefined {
  return msg?.message?.sourceLang ?? undefined;
}

function getMessageTime(msg: any) {
  return msg?.dateTimeCreated ?? msg?.createdAt ?? msg?.timestamp ?? null;
}

function getIsRead(msg: any) {
  return !!(msg?.isRead ?? msg?.message?.isRead);
}

function dedupeById(messages: any[]) {
  return Array.from(new Map(messages.map((m) => [m.id, m])).values());
}

export default function ChatPage() {
  const { t } = useTranslation();
  const QUICK_REPLIES = [
    t('chat.quickReply1'),
    t('chat.quickReply2'),
    t('chat.quickReply3'),
    t('chat.quickReply4'),
    t('chat.quickReply5'),
    t('chat.quickReply6'),
  ];
  const { firebaseToken, user } = useAuth();
  const { isConnected, messages: wsMessages, sendMessage, error: wsError } = useChatWebSocket(firebaseToken, "");
  const pendingSendRef = useRef<{ tempId: string; otherUserId: string } | null>(null);

  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedJobKey, setSelectedJobKey] = useState<JobKey | null>(null);
  // Job context passed in via a deep link (e.g. "Invite" from the nearby-pros
  // map) for a thread that has no message history yet — jobsForSelectedUser
  // can't derive it from past messages, so this is the fallback used when
  // sending the very first message. Once that message round-trips, the real
  // derived entry takes over and this is no longer consulted for this job.
  const [pendingJobContext, setPendingJobContext] = useState<{ id: string; title?: string } | null>(null);

  const [threadsByUser, setThreadsByUser] = useState<Map<string, UserThread>>(new Map());
  const loadedUsersRef = useRef<Set<string>>(new Set());
  const markedReadRef = useRef<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  /**
   * 1) Load conversation list (users you have chats with)
   */
  useEffect(() => {
    const loadConversations = async () => {
      if (!firebaseToken) {
        setLoadingConversations(false);
        return;
      }

      setLoadingConversations(true);
      try {
        const list: any[] = await fetchConversations(firebaseToken);

        const next = new Map<string, UserThread>();
        for (const item of list) {
          const other = item?.otherUserData;
          if (!other?.id) continue;

          next.set(other.id, {
            otherUser: {
              id: other.id,
              name: other.name || other.email || t('chat.unknownUser'),
              email: other.email,
              image: other.image,
            },
            messages: [],
            lastMessageTime: item?.lastMessageDate,
            lastMessageText: "",
            unreadCount: item?.unreadCount ?? 0,
          });
        }

        setThreadsByUser(next);
      } catch (e) {
        console.error("Failed to load conversations:", e);
      } finally {
        setLoadingConversations(false);
      }
    };

    loadConversations();
  }, [firebaseToken, t]);

  /**
   * 1b) Deep link support: ?userId=&jobId=&jobTitle=&userName= (used by the
   * "Invite" button on the nearby-pros map). Runs once conversations have
   * loaded so it can merge in rather than race the wholesale setThreadsByUser
   * above. If the user already has a real thread, this just selects it —
   * jobsForSelectedUser then derives the job list from actual history.
   */
  useEffect(() => {
    if (loadingConversations) return;

    const searchParams = new URLSearchParams(window.location.search);
    const userId = searchParams.get("userId");
    if (!userId) return;

    const jobId = searchParams.get("jobId") || undefined;
    const jobTitle = searchParams.get("jobTitle") || undefined;
    const userName = searchParams.get("userName") || undefined;

    setThreadsByUser((prev) => {
      if (prev.has(userId)) return prev;
      const next = new Map(prev);
      next.set(userId, {
        otherUser: { id: userId, name: userName || t('common.worker') },
        messages: [],
        unreadCount: 0,
      });
      return next;
    });

    if (jobId) setPendingJobContext({ id: jobId, title: jobTitle });
    setSelectedJobKey(jobId ?? null);
    setSelectedUserId(userId);
  }, [loadingConversations, t]);

  /**
   * 2) Merge websocket messages into threadsByUser (user-level only)
   *    - IMMUTABLE updates so selectedThread useMemo recomputes correctly
   *    - migrate messages from a mistakenly-created "self thread" once user.id is known
   */
  useEffect(() => {
    if (!wsMessages?.length) return;

    setThreadsByUser((prev) => {
      const next = new Map(prev);

      // ✅ If earlier we accidentally created a thread under "my own id", migrate it now.
      if (user?.id && next.has(user.id)) {
        const orphan = next.get(user.id);
        if (orphan?.messages?.length) {
          next.delete(user.id);

          for (const m of orphan.messages) {
            const otherId = getOtherUserId(m, user.id);
            if (!otherId || otherId === user.id) continue;

            const existing = next.get(otherId);
            const merged = dedupeById([...(existing?.messages ?? []), m]).sort(
              (a, b) => safeDate(getMessageTime(a)) - safeDate(getMessageTime(b))
            );

            const last = merged[merged.length - 1];
            next.set(otherId, {
              otherUser: existing?.otherUser ?? { id: otherId, name: t('chat.unknownUser') },
              messages: merged,
              lastMessageTime: getMessageTime(last) ?? existing?.lastMessageTime,
              lastMessageText: getMessageText(last) || existing?.lastMessageText || "",
              unreadCount: existing?.unreadCount ?? 0,
            });
          }
        } else {
          next.delete(user.id);
        }
      }

      for (const msg of wsMessages) {
        const otherUserId = getOtherUserId(msg, user?.id);
        if (!otherUserId) continue;

        const { id: jobId, title: jobTitle } = getJobData(msg);
        const jobKey: JobKey = jobId ?? (msg as any)?.jobKey ?? "nojob";

        // always carry jobKey for filtering even if jobData is missing in some variants
        const enrichedMsg = {
          ...msg,
          jobKey,
          jobData:
            msg?.jobData ??
            (jobKey !== "nojob" ? { id: jobKey, title: jobTitle ?? undefined } : undefined),
        };

        const existingThread = next.get(otherUserId);

        // Dedup or replace optimistic temp message
        const msgId = enrichedMsg?.id;
        const msgText = getMessageText(enrichedMsg);
        const msgTime = getMessageTime(enrichedMsg);

        const existingMessages = existingThread?.messages ?? [];
        const existingIndex = existingMessages.findIndex((m: any) => m?.id === msgId);

        let mergedMessages = existingMessages;

        if (existingIndex >= 0) {
          // Already known — patch in any updated fields (e.g. isRead flipping via a "messageRead" event)
          // rather than silently dropping the update.
          const copy = [...existingMessages];
          copy[existingIndex] = { ...copy[existingIndex], ...enrichedMsg };
          mergedMessages = copy;
        } else {
          // If server echoes a real message after we inserted tmp_ optimistic message, replace it.
          const from = getFromUserId(enrichedMsg);
          const to = getToUserId(enrichedMsg);

          const similarTempIndex = existingMessages.findIndex((m: any) => {
            const mid = String(m?.id ?? "");
            if (!mid.startsWith("tmp_")) return false;

            const sameFrom = getFromUserId(m) === from;
            const sameTo = getToUserId(m) === to;
            const sameText = getMessageText(m) === msgText;
            const dt = Math.abs(safeDate(getMessageTime(m)) - safeDate(msgTime));

            return sameFrom && sameTo && sameText && dt < 10_000;
          });

          if (similarTempIndex >= 0) {
            const copy = [...existingMessages];
            copy[similarTempIndex] = enrichedMsg;
            mergedMessages = copy;
          } else {
            mergedMessages = [...existingMessages, enrichedMsg];
          }
        }

        mergedMessages = dedupeById(mergedMessages).sort(
          (a, b) => safeDate(getMessageTime(a)) - safeDate(getMessageTime(b))
        );

        const last = mergedMessages[mergedMessages.length - 1];
        const lastTime = getMessageTime(last) ?? existingThread?.lastMessageTime;
        const lastText = getMessageText(last) || existingThread?.lastMessageText || "";

        // unread count (incoming only)
        let unread = existingThread?.unreadCount ?? 0;
        if (typeof msg?.isSent === "boolean") {
          if (msg.isSent === false) unread += 1;
        } else {
          const from = getFromUserId(msg);
          if (user?.id && from && from !== user.id) unread += 1;
        }

        // ✅ IMPORTANT: create a NEW thread object each time
        next.set(otherUserId, {
          otherUser: existingThread?.otherUser ?? { id: otherUserId, name: t('chat.unknownUser') },
          messages: mergedMessages,
          lastMessageTime: lastTime ?? undefined,
          lastMessageText: lastText ?? "",
          unreadCount: unread,
        });
      }

      return next;
    });

    // Refresh metadata so "Unknown" becomes real names (optional, but nice)
    if (firebaseToken) {
      (async () => {
        try {
          const list: any[] = await fetchConversations(firebaseToken);
          const byId = new Map<string, any>();
          for (const item of list) {
            const other = item?.otherUserData;
            if (other?.id) byId.set(other.id, item);
          }

          setThreadsByUser((prev) => {
            const next = new Map(prev);

            for (const [id, thread] of next.entries()) {
              const item = byId.get(id);
              if (!item) continue;

              const other = item.otherUserData;
              const needsName = !thread.otherUser?.name || thread.otherUser.name === t('chat.unknownUser');

              if (needsName) {
                next.set(id, {
                  ...thread,
                  otherUser: {
                    id: other.id,
                    name: other.name || other.email || thread.otherUser.name || t('chat.unknownUser'),
                    email: other.email,
                    image: other.image,
                  },
                });
              }
            }

            return next;
          });
        } catch (e) {
          console.error("Failed to refresh conversations metadata:", e);
        }
      })();
    }
  }, [wsMessages, user?.id, firebaseToken, t]);

  /**
   * 3) When a user is selected, fetch full message history with that user (once)
   */
  useEffect(() => {
    if (!firebaseToken || !selectedUserId) return;
    if (loadedUsersRef.current.has(selectedUserId)) return;

    const run = async () => {
      setLoadingMessages(true);
      try {
        const history = await fetchMessagesWithUser(firebaseToken, selectedUserId);

        setThreadsByUser((prev) => {
          const next = new Map(prev);
          const existing = next.get(selectedUserId);

          const merged = dedupeById([...(existing?.messages ?? []), ...(history ?? [])]);
          merged.sort((a, b) => safeDate(getMessageTime(a)) - safeDate(getMessageTime(b)));

          const last = merged[merged.length - 1];
          const lastTime = getMessageTime(last);
          const lastText = getMessageText(last) || "(image)";

          next.set(selectedUserId, {
            otherUser: existing?.otherUser ?? { id: selectedUserId, name: selectedUserId },
            messages: merged,
            lastMessageTime: (lastTime as string) ?? existing?.lastMessageTime,
            lastMessageText: lastText ?? existing?.lastMessageText,
            unreadCount: existing?.unreadCount ?? 0,
          });

          return next;
        });

        loadedUsersRef.current.add(selectedUserId);
      } catch (e) {
        console.error("Failed to load messages:", e);
      } finally {
        setLoadingMessages(false);
      }
    };

    run();
  }, [firebaseToken, selectedUserId]);

  /**
   * Derived: sorted users list
   */
  const usersList = useMemo(() => {
    const arr = Array.from(threadsByUser.values());
    arr.sort((a, b) => safeDate(b.lastMessageTime) - safeDate(a.lastMessageTime));
    return arr;
  }, [threadsByUser]);

  const selectedThread = selectedUserId ? threadsByUser.get(selectedUserId) : null;

  /**
   * Derived: jobs list for selected user
   */
  const jobsForSelectedUser = useMemo(() => {
    if (!selectedThread) return [];

    const grouped = new Map<
      JobKey,
      { jobId?: string; jobTitle?: string; lastTime?: string; lastText?: string; count: number }
    >();

    for (const msg of selectedThread.messages) {
      const { id: jobId, title: jobTitle } = getJobData(msg);
      const key: JobKey = jobId ?? (msg as any)?.jobKey ?? "nojob";

      const existing =
        grouped.get(key) ??
        ({
          jobId: jobId ?? undefined,
          jobTitle: jobTitle ?? undefined,
          count: 0,
        } as any);

      existing.count += 1;

      const t = getMessageTime(msg);
      const text = getMessageText(msg) || "(image)";
      if (t && safeDate(t) >= safeDate(existing.lastTime)) {
        existing.lastTime = t;
        existing.lastText = text;
      }

      if (!existing.jobTitle && jobTitle) existing.jobTitle = jobTitle;

      grouped.set(key, existing);
    }

    const list = Array.from(grouped.entries()).map(([key, v]) => ({
      jobKey: key,
      jobId: v.jobId,
      jobTitle: v.jobTitle,
      lastTime: v.lastTime,
      lastText: v.lastText,
      count: v.count,
    }));

    list.sort((a, b) => safeDate(b.lastTime) - safeDate(a.lastTime));
    return list;
  }, [selectedThread]);

  const selectedJob = useMemo(() => {
    if (!selectedJobKey || selectedJobKey === "nojob") return undefined;
    return jobsForSelectedUser.find((j) => j.jobKey === selectedJobKey);
  }, [jobsForSelectedUser, selectedJobKey]);

  /**
   * Derived: messages for selected job
   */
  const messagesForSelectedJob = useMemo(() => {
    if (!selectedThread || !selectedJobKey) return [];

    const filtered = selectedThread.messages.filter((msg) => {
      const { id: jobId } = getJobData(msg);
      const key: JobKey = jobId ?? (msg as any)?.jobKey ?? "nojob";
      return key === selectedJobKey;
    });

    filtered.sort((a, b) => safeDate(getMessageTime(a)) - safeDate(getMessageTime(b)));
    return filtered;
  }, [selectedThread, selectedJobKey]);

  /**
   * Mark incoming unread messages as read once they're viewed
   */
  useEffect(() => {
    if (!firebaseToken || !user?.id || !selectedUserId) return;

    const unread = messagesForSelectedJob.filter((msg) => {
      const id = msg?.id;
      if (!id || String(id).startsWith("tmp_")) return false;
      if (getFromUserId(msg) === user.id) return false;
      if (getIsRead(msg)) return false;
      if (markedReadRef.current.has(id)) return false;
      return true;
    });

    if (!unread.length) return;

    for (const msg of unread) {
      markedReadRef.current.add(msg.id);
      markMessageRead(firebaseToken, msg.id).catch((e) => {
        console.error("Failed to mark message as read:", e);
        markedReadRef.current.delete(msg.id);
      });
    }

    const unreadIds = new Set(unread.map((msg) => msg.id));
    setThreadsByUser((prev) => {
      const existing = prev.get(selectedUserId);
      if (!existing) return prev;

      const next = new Map(prev);
      next.set(selectedUserId, {
        ...existing,
        messages: existing.messages.map((m) => (unreadIds.has(m.id) ? { ...m, isRead: true } : m)),
      });
      return next;
    });
  }, [messagesForSelectedJob, firebaseToken, user?.id, selectedUserId]);

  const [input, setInput] = useState("");
  const [showOriginalIds, setShowOriginalIds] = useState<Set<string>>(new Set());

  const toggleShowOriginal = (id: string) => {
    setShowOriginalIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /**
   * Optimistic send so message appears immediately
   */
  const handleSend = () => {
    if (!input.trim() || !selectedUserId) return;

    const nowIso = new Date().toISOString();
    const tempId = `tmp_${nowIso}_${Math.random().toString(16).slice(2)}`;

    const job =
      selectedJobKey && selectedJobKey !== "nojob"
        ? (jobsForSelectedUser.find((j) => j.jobKey === selectedJobKey) ??
          (pendingJobContext && pendingJobContext.id === selectedJobKey
            ? { jobId: pendingJobContext.id, jobTitle: pendingJobContext.title }
            : null))
        : null;

    const optimisticMsg = {
      id: tempId,
      fromUserId: user?.id,
      toUserId: selectedUserId,
      dateTimeCreated: nowIso,
      isSent: true,
      message: { text: input.trim() },
      jobData: job?.jobId ? { id: job.jobId, title: job.jobTitle } : undefined,
      jobKey: selectedJobKey ?? "nojob",
    };

    setThreadsByUser((prev) => {
      const next = new Map(prev);
      const existing = next.get(selectedUserId);

      const baseThread: UserThread =
        existing ??
        ({
          otherUser: { id: selectedUserId, name: t('chat.unknownUser') },
          messages: [],
          unreadCount: 0,
        } as UserThread);

      const merged = dedupeById([...(baseThread.messages ?? []), optimisticMsg]).sort(
        (a, b) => safeDate(getMessageTime(a)) - safeDate(getMessageTime(b))
      );

      next.set(selectedUserId, {
        ...baseThread,
        messages: merged,
        lastMessageTime: nowIso,
        lastMessageText: input.trim(),
      });

      return next;
    });

    pendingSendRef.current = { tempId, otherUserId: selectedUserId };

    sendMessage({
      toUserId: selectedUserId,
      text: input.trim(),
      jobData: job?.jobId ? { id: job.jobId, title: job.jobTitle } : undefined,
    });

    setInput("");
  };

  /**
   * If the server rejects the last-sent message (e.g. a WS "error" event), surface it
   * instead of leaving the optimistic bubble looking like it sent successfully.
   */
  useEffect(() => {
    if (!wsError || !pendingSendRef.current) return;

    const { tempId, otherUserId } = pendingSendRef.current;
    pendingSendRef.current = null;

    setThreadsByUser((prev) => {
      const existing = prev.get(otherUserId);
      if (!existing) return prev;

      const next = new Map(prev);
      next.set(otherUserId, {
        ...existing,
        messages: existing.messages.map((m) => (m.id === tempId ? { ...m, failed: true } : m)),
      });
      return next;
    });
  }, [wsError]);

  // UX: when selecting a new user, pick most recent job if none selected yet
  useEffect(() => {
    if (!selectedUserId) return;
    setSelectedJobKey((prev) => {
      if (prev) return prev;
      return jobsForSelectedUser[0]?.jobKey ?? "nojob";
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUserId]);

  // Ensure selected job exists after jobs list changes
  useEffect(() => {
    if (!selectedUserId) return;
    if (!jobsForSelectedUser.length) return;

    setSelectedJobKey((prev) => {
      if (!prev) return jobsForSelectedUser[0].jobKey;
      const exists = jobsForSelectedUser.some((j) => j.jobKey === prev);
      return exists ? prev : jobsForSelectedUser[0].jobKey;
    });
  }, [jobsForSelectedUser, selectedUserId]);

  if (!firebaseToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted px-4">
        <div className="bg-card rounded-2xl shadow-lg p-8 text-center space-y-4 max-w-md w-full">
          <p className="text-lg font-semibold text-foreground">{t('chat.signInToChat')}</p>
          <p className="text-muted-foreground">{t('chat.signInToChatDesc')}</p>
          <Button asChild className="w-full">
            <Link href="/signin">{t('nav.signIn')}</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-muted">
      <div className="h-full flex min-h-0">
        {/* Column 1 — Users */}
        <aside
          className={`w-full md:w-96 bg-card border-r border-border flex flex-col ${selectedUserId ? "hidden md:flex" : ""
            }`}
        >
          <div className="border-b border-border p-4">
            <h1 className="text-2xl font-bold text-foreground">{t('chat.messagesAria')}</h1>
            <p className="text-xs text-muted-foreground mt-1">{t('chat.usersLabel')}</p>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loadingConversations ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full" />
                </div>
              </div>
            ) : usersList.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <p>{t('chat.noConversations')}</p>
              </div>
            ) : (
              usersList.map((thread) => {
                const active = selectedUserId === thread.otherUser.id;
                const isSelectedUser = active;

                return (
                  <div key={thread.otherUser.id} className="border-b border-gray-100">
                    <button
                      onClick={() => {
                        setSelectedUserId(thread.otherUser.id);
                        setSelectedJobKey(null);
                      }}
                      className={`w-full p-4 hover:bg-muted transition-colors text-left ${active ? "bg-primary/10" : ""
                        }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground truncate">{thread.otherUser.name}</p>
                          <p className="text-sm text-muted-foreground truncate">{thread.lastMessageText || "—"}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-xs text-muted-foreground">
                            {thread.lastMessageTime
                              ? new Date(thread.lastMessageTime).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                              : ""}
                          </span>
                          {!!thread.unreadCount && thread.unreadCount > 0 && (
                            <span className="inline-flex items-center justify-center text-[11px] font-semibold rounded-full bg-blue-600 text-white min-w-5 h-5 px-2">
                              {thread.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>

                    {/* Nested jobs list for selected user (desktop only) */}
                    {isSelectedUser && !loadingMessages && jobsForSelectedUser.length > 0 && (
                      <div className="hidden md:block px-4 pb-3">
                        <p className="text-xs text-muted-foreground mb-2">{t('chat.jobsLabel')}</p>
                        <div className="space-y-1">
                          {jobsForSelectedUser.map((j) => {
                            const jobActive = selectedJobKey === j.jobKey;
                            return (
                              <button
                                key={j.jobKey}
                                onClick={() => setSelectedJobKey(j.jobKey)}
                                className={`w-full flex items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-muted ${jobActive ? "bg-primary/10" : ""
                                  }`}
                              >
                                <CornerDownRight size={16} className="text-muted-foreground flex-shrink-0" />
                                <div className="min-w-0 flex-1">
                                  {j.jobId ? (
                                    <Link
                                      href={`/jobs/${j.jobId}`}
                                      onClick={(e) => e.stopPropagation()}
                                      className="text-sm font-medium text-blue-600 hover:underline truncate block"
                                    >
                                      {j.jobTitle || `${t('chat.jobFallback')} ${j.jobId}`}
                                    </Link>
                                  ) : (
                                    <p className="text-sm font-medium text-foreground truncate">{t('chat.general')}</p>
                                  )}
                                  <p className="text-xs text-muted-foreground truncate">{j.lastText || "—"}</p>
                                </div>
                                <span className="text-[11px] text-muted-foreground">
                                  {j.lastTime
                                    ? new Date(j.lastTime).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })
                                    : ""}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* Column 2 — Jobs for selected user (mobile only) */}
        <aside
          className={`w-full bg-card border-r border-border flex flex-col md:hidden ${selectedUserId ? "" : "hidden"
            } ${selectedJobKey ? "hidden" : ""}`}
        >
          <div className="border-b border-border p-4 flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden"
              onClick={() => {
                setSelectedUserId(null);
                setSelectedJobKey(null);
              }}
            >
              <ArrowLeft size={18} />
            </Button>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{t('chat.jobsWith')}</p>
              <p className="font-semibold text-foreground truncate">
                {selectedThread?.otherUser.name ?? "—"}
              </p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`} />
              <span className="text-xs text-muted-foreground">{isConnected ? t('common.online') : t('common.offline')}</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {!selectedUserId ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <p>{t('chat.selectUser')}</p>
              </div>
            ) : loadingMessages ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full" />
                </div>
              </div>
            ) : jobsForSelectedUser.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <p>{t('chat.noJobThreads')}</p>
              </div>
            ) : (
              jobsForSelectedUser.map((j) => {
                const active = selectedJobKey === j.jobKey;
                return (
                  <button
                    key={j.jobKey}
                    onClick={() => setSelectedJobKey(j.jobKey)}
                    className={`w-full p-4 border-b border-gray-100 hover:bg-muted transition-colors text-left ${active ? "bg-primary/10" : ""
                      }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        {j.jobId ? (
                          <Link
                            href={`/jobs/${j.jobId}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-sm font-semibold text-blue-600 hover:underline truncate block"
                          >
                            {j.jobTitle || `${t('chat.jobFallback')} ${j.jobId}`}
                          </Link>
                        ) : (
                          <p className="text-sm font-semibold text-foreground truncate">{t('chat.general')}</p>
                        )}
                        <p className="text-sm text-muted-foreground truncate">{j.lastText || "—"}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {j.lastTime
                          ? new Date(j.lastTime).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                          : ""}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">{j.count} {t('gamification.messages')}</p>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Column 3 — Chat */}
        <main className={`flex-1 flex flex-col ${selectedJobKey ? "" : "hidden md:flex"}`}>
          {!selectedUserId || !selectedJobKey ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <p>{t('chat.selectUserAndJob')}</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="bg-card border-b border-border p-4 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="md:hidden"
                    onClick={() => setSelectedJobKey(null)}
                  >
                    <ArrowLeft size={18} />
                  </Button>

                  <div className="min-w-0">
                    <p className="font-semibold text-foreground truncate">
                      {selectedThread?.otherUser.name ?? "—"}
                    </p>

                    {selectedJobKey !== "nojob" ? (
                      selectedJob?.jobId ? (
                        <Link
                          href={`/jobs/${selectedJob.jobId}`}
                          className="text-xs text-blue-600 hover:underline truncate block"
                        >
                          {selectedJob.jobTitle || `${t('chat.jobFallback')} ${selectedJob.jobId}`}
                        </Link>
                      ) : (
                        <p className="text-xs text-muted-foreground">{t('chat.jobFallback')}</p>
                      )
                    ) : (
                      <p className="text-xs text-muted-foreground">{t('chat.general')}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`} />
                  <span className="text-xs text-muted-foreground">{isConnected ? t('common.online') : t('common.offline')}</span>
                </div>
              </div>

              {/* Report / dispute */}
              {selectedThread && (
                <div className="border-b border-border bg-card px-4 py-2 flex justify-end">
                  <ReportButton
                    reportedUserId={selectedThread.otherUser.id}
                    reportedUserName={selectedThread.otherUser.name}
                    jobId={selectedJob?.jobId}
                    firebaseToken={firebaseToken}
                    className="text-xs"
                  />
                </div>
              )}

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-card">
                {loadingMessages ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin">
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full" />
                    </div>
                  </div>
                ) : messagesForSelectedJob.length === 0 ? (
                  <p className="text-center text-muted-foreground text-sm py-4">
                    {t('chat.noMessagesYet')}
                  </p>
                ) : (
                  messagesForSelectedJob.map((msg) => {
                    const mine = getFromUserId(msg) === user?.id;
                    const failed = mine && !!(msg as any)?.failed;
                    const originalText = getMessageText(msg);
                    const translatedText = getTranslatedText(msg);
                    const sourceLang = getSourceLang(msg);
                    const showingOriginal = showOriginalIds.has(msg.id);
                    const hasTranslation = !mine && !!translatedText && translatedText !== originalText;
                    const displayText = hasTranslation && !showingOriginal ? translatedText : originalText;
                    return (
                      <div key={msg.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-sm ${mine ? "bg-primary text-white" : "bg-muted text-foreground"
                            }`}
                        >
                          <p className="whitespace-pre-wrap">{displayText || t('chat.sentImage')}</p>
                          {hasTranslation && (
                            <button
                              type="button"
                              onClick={() => toggleShowOriginal(msg.id)}
                              className="mt-1 text-[10px] font-medium text-muted-foreground underline decoration-dotted hover:text-foreground"
                            >
                              {showingOriginal
                                ? t('chat.showTranslation')
                                : `${t('chat.translatedFrom')} ${sourceLang?.toUpperCase() ?? "original"} · ${t('chat.seeOriginal')}`}
                            </button>
                          )}
                          <div
                            className={`mt-1 flex items-center gap-1 text-[10px] ${mine ? "text-primary-foreground/70" : "text-muted-foreground"
                              }`}
                          >
                            <span>
                              {getMessageTime(msg)
                                ? new Date(getMessageTime(msg) as string).toLocaleTimeString([], {
                                  hour: "numeric",
                                  minute: "2-digit",
                                })
                                : ""}
                            </span>
                            {mine && failed && (
                              <span className="inline-flex items-center gap-1 text-red-200" title={t('chat.failedToSend')}>
                                <AlertCircle size={12} />
                                {t('chat.failedToSend')}
                              </span>
                            )}
                            {mine &&
                              !failed &&
                              !String(msg.id).startsWith("tmp_") &&
                              (getIsRead(msg) ? (
                                <CheckCheck size={12} className="text-sky-300" aria-label={t('chat.readAria')} />
                              ) : (
                                <Check size={12} aria-label={t('chat.sentAria')} />
                              ))}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Input */}
              <div className="bg-card border-t border-border p-4 flex-shrink-0">
                {!isConnected && (
                  <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
                    <AlertCircle size={16} className="text-yellow-700 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-yellow-800">
                      {t('chat.connectionLost')}
                    </p>
                  </div>
                )}

                <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
                  {QUICK_REPLIES.map((reply) => (
                    <button
                      key={reply}
                      type="button"
                      onClick={() => {
                        setInput(reply);
                        inputRef.current?.focus();
                      }}
                      className="shrink-0 whitespace-nowrap rounded-full border border-border bg-muted px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary hover:bg-primary/10"
                    >
                      {reply}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder={t('jobDetail.writeMessage')}
                    className="flex-1 rounded-full border border-border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <Button size="icon" onClick={handleSend} disabled={!isConnected} aria-label={t('chat.sendMessageAria')}>
                    <Send size={16} />
                  </Button>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
