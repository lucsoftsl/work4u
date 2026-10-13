/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Send, AlertCircle, CornerDownRight, Check, CheckCheck, Clock, MessageSquare } from "lucide-react";
import { Button, buttonClasses } from "@/components/ui/Button";
import { CountBadge } from "@/components/ui/StatusChip";
import { useAuth } from "@/context/AuthContext";
import { useChatWebSocket } from "@/hooks/useChatWebSocket";
import { fetchConversations, fetchMessagesWithUser, markMessageRead } from "@/api";
import { errorMessage } from "@/lib/http";
import { signInPath } from "@/lib/auth-redirect";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ui/QueryState";
import { useTranslation } from "@/lib/i18n";
import { ReportButton } from "@/components/ReportButton";
import { StatusChip } from "@/components/ui/StatusChip";
import { api } from "@/lib/api";
import { setChatThreadOpen } from "@/lib/chat-chrome";
import { conversationPreview, initialOf, latestConversationPreview } from "@/lib/chat-preview";
import { NO_JOB_KEY, jobKeyOf, pickJobKey } from "@/lib/chat-thread";

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
  lastJobTitle?: string;
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

  const id = jd?.id || jd?.jobId || null;
  const title = jd?.title ?? jd?.jobTitle ?? null;
  return { id, title };
}

function getJobKey(msg: any): JobKey {
  return jobKeyOf(getJobData(msg).id, msg?.jobKey);
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
  const { t, locale } = useTranslation();
  const QUICK_REPLIES = [
    t('chat.quickReply1'),
    t('chat.quickReply2'),
    t('chat.quickReply3'),
    t('chat.quickReply4'),
    t('chat.quickReply5'),
    t('chat.quickReply6'),
  ];
  const { firebaseToken, user, loading: authLoading } = useAuth();
  const {
    isConnected,
    isReconnecting,
    messages: wsMessages,
    outbox,
    sendMessage,
    retryMessage,
    discardMessage,
  } = useChatWebSocket(firebaseToken, "");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [conversationsError, setConversationsError] = useState<string | null>(null);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [conversationsReload, setConversationsReload] = useState(0);
  const [messagesReload, setMessagesReload] = useState(0);

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedJobKey, setSelectedJobKey] = useState<JobKey | null>(null);
  // Job context passed in via a deep link (e.g. "Invite" from the nearby-pros
  // map) for a thread that has no message history yet — jobsForSelectedUser
  // can't derive it from past messages, so this is the fallback used when
  // sending the very first message. Once that message round-trips, the real
  // derived entry takes over and this is no longer consulted for this job.
  const [pendingJobContext, setPendingJobContext] = useState<{ id: string; title?: string } | null>(null);

  const [threadsByUser, setThreadsByUser] = useState<Map<string, UserThread>>(new Map());
  // Fetch gate for history requests (cleared to force a reload, e.g. after a reconnect).
  const loadedUsersRef = useRef<Set<string>>(new Set());
  // Users whose history has been fetched at least once — drives job-thread picking, so a
  // placeholder "General" pick is never locked in before the real threads are known.
  const [historyLoadedUsers, setHistoryLoadedUsers] = useState<ReadonlySet<string>>(new Set());
  // Job key from a ?jobId= deep link; kept selected even if it has no messages yet.
  const explicitJobKeyRef = useRef<string | null>(null);
  const markedReadRef = useRef<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  /**
   * 1) Load conversation list (users you have chats with)
   */
  useEffect(() => {
    let cancelled = false;
    const loadConversations = async () => {
      if (!firebaseToken) {
        // Still restoring the session: stay in the loading state so the deep link below waits.
        if (!authLoading) {
          setLoadingConversations(false);
          // Signed out: drop the previous account's threads so they can't leak into the next session.
          setThreadsByUser(new Map());
          setHistoryLoadedUsers(new Set());
          loadedUsersRef.current = new Set();
        }
        return;
      }

      setLoadingConversations(true);
      setConversationsError(null);
      try {
        const list: any[] = await fetchConversations(firebaseToken);
        if (cancelled) return;

        // Merge, never replace: this effect re-runs (auth settling, locale change, retry) and a
        // later response must not wipe message history that was already loaded for a thread —
        // loadedUsersRef would still say "loaded", so it would never be fetched again (QA S4.6).
        setThreadsByUser((prev) => {
          const next = new Map(prev);
          for (const item of list) {
            const other = item?.otherUserData;
            if (!other?.id) continue;

            const existing = prev.get(other.id);
            const preview = conversationPreview(item);
            next.set(other.id, {
              otherUser: {
                id: other.id,
                name: other.name || other.email || existing?.otherUser.name || t('chat.unknownUser'),
                email: other.email,
                image: other.image,
              },
              messages: existing?.messages ?? [],
              ...latestConversationPreview(existing, item?.lastMessageDate,
                `${preview.fromSelf ? `${t('chat.youPrefix')} ` : ''}${preview.lastText || (preview.hasImage ? t('chat.photo') : '')}`.trim()),
              lastJobTitle: existing?.lastJobTitle ?? preview.jobTitle,
              unreadCount: item?.unreadCount ?? existing?.unreadCount ?? 0,
            });
          }
          return next;
        });
      } catch (e) {
        if (cancelled) return;
        console.error("Failed to load conversations:", e);
        setConversationsError(errorMessage(e, t('common.loadError')));
      } finally {
        if (!cancelled) setLoadingConversations(false);
      }
    };

    loadConversations();
    return () => {
      cancelled = true;
    };
    // firebaseToken changes hourly on refresh; reload only when signed-in state flips or on retry
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!firebaseToken, authLoading, t, conversationsReload]);

  /**
   * 1b) Deep link support: ?userId=&jobId=&jobTitle=&userName= (used by the
   * "Invite" button on the nearby-pros map). Runs once conversations have
   * loaded so it can merge in rather than race the wholesale setThreadsByUser
   * above. If the user already has a real thread, this just selects it —
   * jobsForSelectedUser then derives the job list from actual history.
   */
  const deepLinkAppliedRef = useRef(false);
  useEffect(() => {
    if (loadingConversations || !firebaseToken || deepLinkAppliedRef.current) return;

    const searchParams = new URLSearchParams(window.location.search);
    const userId = searchParams.get("userId");
    if (!userId) return;
    deepLinkAppliedRef.current = true;

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
    explicitJobKeyRef.current = jobId ?? null;
    // Without ?jobId= nothing is picked yet: the job-picking effect chooses the thread that
    // actually holds the messages once this user's history has loaded.
    setSelectedJobKey(jobId ?? null);
    setSelectedUserId(userId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingConversations, !!firebaseToken, t]);

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
              lastJobTitle: getJobData(last).title ?? existing?.lastJobTitle,
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

        const { title: jobTitle } = getJobData(msg);
        const jobKey = getJobKey(msg);

        // always carry jobKey for filtering even if jobData is missing in some variants
        const enrichedMsg = {
          ...msg,
          jobKey,
          jobData:
            msg?.jobData ??
            (jobKey !== NO_JOB_KEY ? { id: jobKey, title: jobTitle ?? undefined } : undefined),
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
          lastJobTitle: getJobData(last).title ?? existingThread?.lastJobTitle,
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
      setMessagesError(null);
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
            lastJobTitle: getJobData(last).title ?? existing?.lastJobTitle,
            unreadCount: existing?.unreadCount ?? 0,
          });

          return next;
        });

        loadedUsersRef.current.add(selectedUserId);
        setHistoryLoadedUsers((prev) => (prev.has(selectedUserId) ? prev : new Set([...prev, selectedUserId])));
      } catch (e) {
        console.error("Failed to load messages:", e);
        setMessagesError(errorMessage(e, t('common.loadError')));
      } finally {
        setLoadingMessages(false);
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!firebaseToken, selectedUserId, messagesReload]);

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
      const key = getJobKey(msg);

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

  // Tell the shell whether a thread is open so the mobile tab bar shows on the inbox list only.
  useEffect(() => {
    setChatThreadOpen(!!selectedUserId);
    return () => setChatThreadOpen(false);
  }, [selectedUserId]);

  const contextJobId =
    selectedJobKey && selectedJobKey !== NO_JOB_KEY
      ? (jobsForSelectedUser.find((j) => j.jobKey === selectedJobKey)?.jobId ??
        (pendingJobContext?.id === selectedJobKey ? pendingJobContext.id : undefined))
      : undefined;
  const [contextJob, setContextJob] = useState<{ id: string; status?: string } | null>(null);
  useEffect(() => {
    if (!contextJobId) return;
    let active = true;
    api
      .getJob(contextJobId)
      .then((job) => {
        if (active) setContextJob({ id: contextJobId, status: job?.status });
      })
      .catch(() => {
        if (active) setContextJob({ id: contextJobId });
      });
    return () => {
      active = false;
    };
  }, [contextJobId]);

  const selectedJob = useMemo(() => {
    if (!selectedJobKey || selectedJobKey === NO_JOB_KEY) return undefined;
    return jobsForSelectedUser.find((j) => j.jobKey === selectedJobKey);
  }, [jobsForSelectedUser, selectedJobKey]);

  /**
   * Derived: messages for selected job
   */
  const messagesForSelectedJob = useMemo(() => {
    if (!selectedThread || !selectedJobKey) return [];

    const filtered = selectedThread.messages.filter((msg) => getJobKey(msg) === selectedJobKey);

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
   * Send: the message goes into the hook's outbox (client id, retries, failure state) and is
   * rendered from there until the server acknowledges it; then the saved message replaces it.
   */
  const handleSend = () => {
    const text = input.trim();
    if (!text || !selectedUserId) return;

    const job =
      selectedJobKey && selectedJobKey !== NO_JOB_KEY
        ? (jobsForSelectedUser.find((j) => j.jobKey === selectedJobKey) ??
          (pendingJobContext && pendingJobContext.id === selectedJobKey
            ? { jobId: pendingJobContext.id, jobTitle: pendingJobContext.title }
            : null))
        : null;

    // Make sure a brand-new conversation shows up in the list straight away.
    setThreadsByUser((prev) => {
      if (prev.has(selectedUserId)) return prev;
      const next = new Map(prev);
      next.set(selectedUserId, {
        otherUser: { id: selectedUserId, name: t('chat.unknownUser') },
        messages: [],
        unreadCount: 0,
      } as UserThread);
      return next;
    });

    sendMessage({
      toUserId: selectedUserId,
      text,
      jobData: job?.jobId ? { id: job.jobId, title: job.jobTitle } : undefined,
    });
    setInput("");
  };

  /** Outgoing messages for the open thread that the server hasn't confirmed yet. */
  const pendingForSelectedJob = useMemo(
    () =>
      outbox.filter(
        (item) => item.toUserId === selectedUserId && jobKeyOf(item.jobData?.id) === (selectedJobKey ?? NO_JOB_KEY)
      ),
    [outbox, selectedUserId, selectedJobKey]
  );

  // Keep the newest message in view: on thread switch, after history loads, and as messages arrive.
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: "end" });
  }, [selectedUserId, selectedJobKey, loadingMessages, messagesForSelectedJob.length, pendingForSelectedJob.length]);

  const retryHistory = () => {
    if (selectedUserId) loadedUsersRef.current.delete(selectedUserId);
    setMessagesReload((n) => n + 1);
  };

  // After a reconnect, reload the open thread so messages sent while we were offline appear.
  const wasConnectedRef = useRef(false);
  useEffect(() => {
    if (isConnected && !wasConnectedRef.current && selectedUserId && loadedUsersRef.current.has(selectedUserId)) {
      loadedUsersRef.current.delete(selectedUserId);
      setMessagesReload((n) => n + 1);
    }
    wasConnectedRef.current = isConnected;
  }, [isConnected, selectedUserId]);

  // Pick the job thread to open: on user switch, once that user's history has loaded, and when
  // the thread list changes. Deliberately not keyed on selectedJobKey, so the mobile "back to
  // jobs" button (which clears it) isn't immediately overridden.
  const historyLoadedForSelected = !!selectedUserId && historyLoadedUsers.has(selectedUserId);
  useEffect(() => {
    if (!selectedUserId) return;
    setSelectedJobKey((prev) =>
      pickJobKey({
        currentKey: prev,
        jobs: jobsForSelectedUser,
        historyLoaded: historyLoadedForSelected,
        explicitKey: explicitJobKeyRef.current,
      })
    );
  }, [jobsForSelectedUser, selectedUserId, historyLoadedForSelected]);

  // Pending bubbles disappear as soon as the saved message (same clientId) is in the thread.
  const deliveredClientIds = new Set<string>();
  for (const m of selectedThread?.messages ?? []) {
    const cid = (m as any)?.clientId;
    if (typeof cid === "string") deliveredClientIds.add(cid);
  }
  const visiblePending = pendingForSelectedJob.filter((item) => !deliveredClientIds.has(item.clientId));

  const dayKey = (iso?: string | null) => (iso ? new Date(iso).toDateString() : "");
  const dayLabel = (iso: string) => {
    const date = new Date(iso);
    const today = new Date();
    const yesterday = new Date(today.getTime() - 86_400_000);
    if (date.toDateString() === today.toDateString()) return t("chat.today");
    if (date.toDateString() === yesterday.toDateString()) return t("chat.yesterday");
    return date.toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "short" });
  };
  const clock = (iso?: string | null) =>
    iso ? new Date(iso).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" }) : "";

  if (authLoading) {
    return (
      <div role="status" className="mx-auto max-w-content p-[var(--gutter)]">
        <ListSkeleton rows={3} />
      </div>
    );
  }

  if (!firebaseToken) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-16 text-center">
        <h1 className="font-display text-h2 text-ink">{t("chat.signInToChat")}</h1>
        <p className="text-body text-ink-muted">{t("chat.signInToChatDesc")}</p>
        <Link href={signInPath("/chat")} className={buttonClasses("primary", "lg", "w-full")}>
          {t("nav.signIn")}
        </Link>
      </div>
    );
  }

  const timeOf = (thread: { lastMessageTime?: string | null }) => clock(thread.lastMessageTime ?? null);

  return (
    <div
      className={`bg-canvas md:h-[calc(100dvh-var(--header-h))] ${
        selectedUserId
          ? "h-[calc(100dvh-3.5rem)]"
          : "h-[calc(100dvh-3.5rem-var(--tabbar-h)-env(safe-area-inset-bottom))]"
      }`}
    >
      <div className="mx-auto flex h-full min-h-0 max-w-content">
        {/* Inbox */}
        <aside
          aria-label={t("chat.usersLabel")}
          className={`flex w-full min-w-0 flex-col border-line bg-surface md:w-[320px] md:shrink-0 md:border-r xl:w-[360px] ${selectedUserId ? "hidden md:flex" : ""}`}
        >
          <div className="border-b border-line p-4">
            <h1 className="font-display text-h2 text-ink">{t("chat.messagesAria")}</h1>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {loadingConversations ? (
              <div className="p-4">
                <ListSkeleton rows={4} />
              </div>
            ) : conversationsError ? (
              <div className="p-4">
                <ErrorState message={conversationsError} onRetry={() => setConversationsReload((n) => n + 1)} />
              </div>
            ) : usersList.length === 0 ? (
              <div className="p-4">
                <EmptyState icon={MessageSquare} title={t("chat.noConversations")} description={t("chat.noConversationsHint")} />
              </div>
            ) : (
              <ul>
                {usersList.map((thread) => {
                  const active = selectedUserId === thread.otherUser.id;
                  return (
                    <li key={thread.otherUser.id} className="border-b border-line">
                      <button
                        type="button"
                        aria-current={active ? "true" : undefined}
                        onClick={() => {
                          explicitJobKeyRef.current = null;
                          setSelectedUserId(thread.otherUser.id);
                          setSelectedJobKey(null);
                        }}
                        className={`flex min-h-[64px] w-full items-start justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-sunken ${active ? "bg-primary-soft" : ""}`}
                      >
                        <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-soft text-label text-primary">
                          {thread.otherUser.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={thread.otherUser.image} alt="" className="h-full w-full object-cover" />
                          ) : (
                            initialOf(thread.otherUser.name)
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-body text-ink">{thread.otherUser.name}</span>
                          {thread.lastJobTitle ? (
                            <span className="block truncate text-caption text-primary">{thread.lastJobTitle}</span>
                          ) : null}
                          <span className="block truncate text-label font-normal text-ink-muted">
                            {thread.lastMessageText || t("chat.noMessagesYet")}
                          </span>
                        </span>
                        <span className="flex shrink-0 flex-col items-end gap-1">
                          <span className="text-caption font-normal text-ink-subtle tabular">{timeOf(thread)}</span>
                          <CountBadge
                            count={thread.unreadCount ?? 0}
                            label={t("chat.unreadCount").replace("{count}", String(thread.unreadCount ?? 0))}
                          />
                        </span>
                      </button>

                      {active && !loadingMessages && jobsForSelectedUser.length > 1 ? (
                        <div className="hidden px-4 pb-3 md:block">
                          <p className="mb-1 text-micro uppercase text-ink-muted">{t("chat.jobsLabel")}</p>
                          <ul className="space-y-1">
                            {jobsForSelectedUser.map((j) => {
                              const jobActive = selectedJobKey === j.jobKey;
                              return (
                                <li key={j.jobKey}>
                                  <button
                                    type="button"
                                    aria-current={jobActive ? "true" : undefined}
                                    onClick={() => setSelectedJobKey(j.jobKey)}
                                    className={`flex min-h-[44px] w-full items-center gap-2 rounded-control px-2 text-left hover:bg-sunken ${jobActive ? "bg-surface shadow-stamp" : ""}`}
                                  >
                                    <CornerDownRight size={16} className="shrink-0 text-ink-subtle" aria-hidden="true" />
                                    <span className="min-w-0 flex-1 truncate text-label text-ink">
                                      {j.jobId ? j.jobTitle || `${t("chat.jobFallback")} ${j.jobId}` : t("chat.general")}
                                    </span>
                                    <span className="text-caption font-normal text-ink-subtle tabular">{clock(j.lastTime)}</span>
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>

        {/* Job threads of the selected person (mobile only, when there is more than one thread) */}
        <aside
          className={`flex w-full min-w-0 flex-col bg-surface md:hidden ${selectedUserId ? "" : "hidden"} ${selectedJobKey ? "hidden" : ""}`}
        >
          <div className="flex items-center gap-2 border-b border-line p-2">
            <Button
              variant="ghost"
              size="icon"
              aria-label={t("chat.backToConversations")}
              onClick={() => {
                explicitJobKeyRef.current = null;
                setSelectedUserId(null);
                setSelectedJobKey(null);
              }}
            >
              <ArrowLeft size={20} aria-hidden="true" />
            </Button>
            <div className="min-w-0">
              <p className="text-caption font-normal text-ink-muted">{t("chat.jobsWith")}</p>
              <p className="truncate text-body text-ink">{selectedThread?.otherUser.name ?? "—"}</p>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {!selectedUserId ? null : loadingMessages ? (
              <div className="p-4">
                <ListSkeleton rows={3} />
              </div>
            ) : messagesError && jobsForSelectedUser.length === 0 ? (
              <div className="p-4">
                <ErrorState message={messagesError} onRetry={retryHistory} />
              </div>
            ) : jobsForSelectedUser.length === 0 ? (
              <div className="p-4">
                <EmptyState icon={MessageSquare} title={t("chat.noJobThreads")} />
              </div>
            ) : (
              <ul>
                {jobsForSelectedUser.map((j) => (
                  <li key={j.jobKey} className="border-b border-line">
                    <button
                      type="button"
                      onClick={() => setSelectedJobKey(j.jobKey)}
                      className="flex min-h-[64px] w-full items-start justify-between gap-3 px-4 py-3 text-left hover:bg-sunken"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-body text-ink">
                          {j.jobId ? j.jobTitle || `${t("chat.jobFallback")} ${j.jobId}` : t("chat.general")}
                        </span>
                        <span className="block truncate text-label font-normal text-ink-muted">{j.lastText || "—"}</span>
                      </span>
                      <span className="shrink-0 text-caption font-normal text-ink-subtle tabular">{clock(j.lastTime)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>

        {/* Thread */}
        <section
          aria-label={t("chat.messagesAria")}
          className={`flex min-w-0 flex-1 flex-col bg-canvas ${selectedJobKey ? "" : "hidden md:flex"}`}
        >
          {selectedUserId && !selectedJobKey && loadingMessages ? (
            <div className="p-4">
              <ListSkeleton rows={3} />
            </div>
          ) : selectedUserId && !selectedJobKey && messagesError ? (
            <div className="p-4">
              <ErrorState message={messagesError} onRetry={retryHistory} />
            </div>
          ) : !selectedUserId || !selectedJobKey ? (
            <div className="flex h-full items-center justify-center p-6">
              <EmptyState icon={MessageSquare} title={t("chat.selectUserAndJob")} />
            </div>
          ) : (
            <>
              {/* Header: back, person, job context, connection status, report */}
              <div className="flex items-center justify-between gap-2 border-b border-line bg-surface p-2 md:px-4">
                <div className="flex min-w-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden"
                    aria-label={jobsForSelectedUser.length > 1 ? t("chat.backToJobThreads") : t("chat.backToConversations")}
                    onClick={() => {
                      if (jobsForSelectedUser.length > 1) setSelectedJobKey(null);
                      else {
                        explicitJobKeyRef.current = null;
                        setSelectedUserId(null);
                        setSelectedJobKey(null);
                      }
                    }}
                  >
                    <ArrowLeft size={20} aria-hidden="true" />
                  </Button>
                  <div className="min-w-0">
                    <h1 className="sr-only md:hidden">{selectedThread?.otherUser.name ?? t("chat.messagesAria")}</h1>
                    <h2 className="truncate font-display text-h3 text-ink">{selectedThread?.otherUser.name ?? "—"}</h2>
                    {selectedJobKey !== NO_JOB_KEY && selectedJob?.jobId ? (
                      <Link href={`/jobs/${selectedJob.jobId}`} className="block truncate text-caption text-primary hover:underline">
                        {selectedJob.jobTitle || `${t("chat.jobFallback")} ${selectedJob.jobId}`}
                      </Link>
                    ) : (
                      <p className="truncate text-caption font-normal text-ink-muted">{t("chat.general")}</p>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <span
                    role="status"
                    className={`inline-flex h-7 items-center gap-1.5 rounded-control px-2 text-caption ${isConnected ? "bg-success-soft text-success" : "bg-sunken text-ink-muted"}`}
                  >
                    <span aria-hidden="true" className={`h-2 w-2 rounded-full ${isConnected ? "bg-success" : "bg-ink-subtle"}`} />
                    {isConnected ? t("common.online") : t("common.offline")}
                  </span>
                  {selectedThread ? (
                    <ReportButton
                      reportedUserId={selectedThread.otherUser.id}
                      reportedUserName={selectedThread.otherUser.name}
                      jobId={selectedJob?.jobId}
                      firebaseToken={firebaseToken}
                      className="text-caption"
                    />
                  ) : null}
                </div>
              </div>

              {/* Job context bar */}
              {contextJobId ? (
                <div className="flex items-center gap-2 border-b border-line bg-sunken px-3 py-1.5 md:px-4">
                  <p className="min-w-0 flex-1 truncate text-label text-ink">
                    {selectedJob?.jobTitle || pendingJobContext?.title || `${t("chat.jobFallback")} ${contextJobId}`}
                  </p>
                  {contextJob?.id === contextJobId && contextJob.status ? (
                    <StatusChip kind="job" value={contextJob.status} className="shrink-0" />
                  ) : null}
                  <Link
                    href={`/jobs/${contextJobId}`}
                    className="inline-flex min-h-[44px] shrink-0 items-center px-2 text-label text-primary hover:underline"
                  >
                    {t("chat.viewJob")}
                  </Link>
                </div>
              ) : null}

              {/* Messages */}
              <div
                tabIndex={0}
                className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4 focus-visible:outline-none focus-visible:shadow-focus"
                role="log"
                aria-live="polite"
                aria-label={t("chat.messagesAria")}
                aria-busy={loadingMessages}
              >
                {loadingMessages ? (
                  <ListSkeleton rows={3} />
                ) : messagesError && messagesForSelectedJob.length === 0 && visiblePending.length === 0 ? (
                  <ErrorState message={messagesError} onRetry={retryHistory} />
                ) : messagesForSelectedJob.length === 0 && visiblePending.length === 0 ? (
                  <EmptyState icon={MessageSquare} title={t("chat.noMessagesYet")} />
                ) : (
                  messagesForSelectedJob.map((msg, index) => {
                    const time = getMessageTime(msg) as string | undefined;
                    const previousTime = index > 0 ? (getMessageTime(messagesForSelectedJob[index - 1]) as string | undefined) : undefined;
                    const newDay = !!time && dayKey(time) !== dayKey(previousTime);
                    const mine = getFromUserId(msg) === user?.id;
                    const originalText = getMessageText(msg);
                    const translatedText = getTranslatedText(msg);
                    const sourceLang = getSourceLang(msg);
                    const showingOriginal = showOriginalIds.has(msg.id);
                    const hasTranslation = !mine && !!translatedText && translatedText !== originalText;
                    const displayText = hasTranslation && !showingOriginal ? translatedText : originalText;
                    return (
                      <div key={msg.id}>
                        {newDay && time ? (
                          <div className="my-3 flex items-center gap-3 text-micro uppercase text-ink-muted" role="separator">
                            <span className="h-px flex-1 bg-line" />
                            {dayLabel(time)}
                            <span className="h-px flex-1 bg-line" />
                          </div>
                        ) : null}
                        <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                          <div
                            className={`max-w-[85%] rounded-card px-4 py-2 text-body md:max-w-[70%] ${
                              mine ? "rounded-br-none bg-primary text-on-fill" : "rounded-bl-none border border-line bg-surface text-ink"
                            }`}
                          >
                            <p className="whitespace-pre-wrap break-words font-normal">{displayText || t("chat.sentImage")}</p>
                            {hasTranslation ? (
                              <button
                                type="button"
                                onClick={() => toggleShowOriginal(msg.id)}
                                className="mt-1 min-h-[44px] text-caption text-primary underline decoration-dotted"
                              >
                                {showingOriginal
                                  ? t("chat.showTranslation")
                                  : `${t("chat.translatedFrom")} ${sourceLang?.toUpperCase() ?? "original"} · ${t("chat.seeOriginal")}`}
                              </button>
                            ) : null}
                            <div className={`mt-1 flex items-center justify-end gap-1 text-micro normal-case tracking-normal tabular ${mine ? "text-on-fill/85" : "text-ink-muted"}`}>
                              <span>{clock(time)}</span>
                              {mine && !String(msg.id).startsWith("tmp_") ? (
                                getIsRead(msg) ? (
                                  <CheckCheck size={14} aria-label={t("chat.readAria")} />
                                ) : (
                                  <Check size={14} aria-label={t("chat.sentAria")} />
                                )
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Outbox: sending / waiting / failed with Retry + Discard */}
                {!loadingMessages
                  ? visiblePending.map((item) => (
                      <div key={item.clientId} className="flex justify-end">
                        <div
                          className={`max-w-[85%] rounded-card rounded-br-none px-4 py-2 text-body md:max-w-[70%] ${
                            item.status === "failed" ? "border border-danger/30 bg-danger-soft text-ink" : "bg-primary/85 text-on-fill"
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words font-normal">{item.text}</p>
                          <div className="mt-1 flex flex-wrap items-center justify-end gap-2 text-caption">
                            {item.status === "failed" ? (
                              <>
                                <span className="inline-flex items-center gap-1 text-danger" role="alert">
                                  <AlertCircle size={14} aria-hidden="true" />
                                  {t("chat.failedToSend")}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => retryMessage(item.clientId)}
                                  className="inline-flex min-h-[44px] items-center rounded-control border border-ink/80 bg-surface px-3 text-label text-ink hover:bg-sunken"
                                >
                                  {t("common.retry")}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => discardMessage(item.clientId)}
                                  className="inline-flex min-h-[44px] items-center px-2 text-label text-ink-muted underline decoration-dotted"
                                >
                                  {t("chat.discardMessage")}
                                </button>
                              </>
                            ) : (
                              <span className="inline-flex items-center gap-1 normal-case tracking-normal">
                                <Clock size={14} aria-hidden="true" />
                                {item.status === "sending" && item.attempts <= 1 ? t("chat.sending") : t("chat.waitingToSend")}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  : null}
                <div ref={messagesEndRef} aria-hidden="true" />
              </div>

              {/* Composer */}
              <div className="shrink-0 border-t border-line bg-surface p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:p-4">
                {!isConnected ? (
                  <p role="status" className="mb-2 flex items-start gap-2 rounded-control bg-warning-soft px-3 py-2 text-caption font-normal text-ink">
                    <AlertCircle size={16} className="mt-0.5 shrink-0 text-warning" aria-hidden="true" />
                    {isReconnecting ? t("chat.reconnecting") : t("chat.connecting")}
                  </p>
                ) : null}

                <div className="-mx-3 mb-2 flex snap-x snap-proximity gap-2 overflow-x-auto scroll-px-3 px-3 pb-1 pr-8 [mask-image:linear-gradient(to_right,black_calc(100%-24px),transparent)] md:-mx-4 md:px-4 md:pr-8">
                  {QUICK_REPLIES.map((reply) => (
                    <button
                      key={reply}
                      type="button"
                      onClick={() => {
                        setInput(reply);
                        inputRef.current?.focus();
                      }}
                      className="inline-flex min-h-[44px] shrink-0 snap-start items-center whitespace-nowrap rounded-control border border-line-strong bg-surface px-3 text-label text-ink hover:bg-sunken"
                    >
                      {reply}
                    </button>
                  ))}
                </div>

                <form
                  className="flex items-center gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void handleSend();
                  }}
                >
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      // IME composition must not send half-typed text
                      if (e.key === "Enter" && e.nativeEvent.isComposing) e.preventDefault();
                    }}
                    placeholder={t("jobDetail.writeMessage")}
                    aria-label={t("jobDetail.writeMessage")}
                    maxLength={5000}
                    autoComplete="off"
                    className="min-h-[48px] min-w-0 flex-1 rounded-control border border-line-strong bg-surface px-3 text-body text-ink placeholder:text-ink-subtle hover:border-ink-muted focus:border-primary focus:outline-none focus:shadow-focus"
                  />
                  <Button type="submit" size="icon" className="h-12 w-12" disabled={!input.trim()} aria-label={t("chat.sendMessageAria")}>
                    <Send size={18} aria-hidden="true" />
                  </Button>
                </form>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
