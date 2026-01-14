"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Clock,
  DollarSign,
  MapPin,
  Shield,
  Star,
  Wifi,
  Send,
  Users,
  AlertCircle,
  Edit2,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { fetchMessagesWithUser } from "@/api";
import { useChatWebSocket } from "@/hooks/useChatWebSocket";
import { useAuth } from "@/context/AuthContext";
import { useChat } from "@/context/ChatContext";
import { useTranslation } from "@/lib/i18n";
import type { Job } from "@/api/types";

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params?.id as string | undefined;
  const { t } = useTranslation();

  const { firebaseToken, user } = useAuth();
  const { addNotification } = useChat();

  const [job, setJob] = useState<Job | undefined>();
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [httpMessages, setHttpMessages] = useState<[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const isPoster = job && user?.id === job.createdByUserId;

  // WebSocket chat (pass undefined safely until job is loaded)
  const {
    isConnected,
    messages: wsMessages,
    sendMessage,
    error: chatError,
    isLoadingHistory,
  } = useChatWebSocket(firebaseToken, job?.createdByUserId);

  useEffect(() => {
    let isActive = true;

    const load = async () => {
      if (!jobId) {
        if (isActive) setLoading(false);
        return;
      }

      try {
        const data = await api.getJob(jobId);
        if (isActive) setJob(data);
      } catch (error) {
        console.error("Failed to load job", error);
      } finally {
        if (isActive) setLoading(false);
      }
    };

    load();

    return () => {
      isActive = false;
    };
  }, [jobId]);

  // Fallback: Fetch chat history via HTTP to ensure messages appear
  useEffect(() => {
    const loadHistory = async () => {
      if (!firebaseToken || !job?.createdByUserId) return;
      try {
        const history = await fetchMessagesWithUser(firebaseToken, job.createdByUserId, { limit: 50 });
        setHttpMessages(history);
      } catch (err) {
        console.error("Failed to fetch HTTP chat history:", err);
      }
    };

    loadHistory();
  }, [firebaseToken, job?.createdByUserId]);

  // Dispatch notifications for incoming messages
  useEffect(() => {
    if (!job) return;
    if (isLoadingHistory) return; // avoid spamming notifications when history loads
    if (wsMessages.length === 0) return;

    const lastMessage = wsMessages[wsMessages.length - 1];

    // Only notify if this is a message we received (not sent)
    if (!lastMessage.isSent) {
      addNotification({
        id: lastMessage.id,
        fromUserId: lastMessage.fromUserId,
        toUserId: lastMessage.toUserId,
        message: lastMessage.message,
        dateTimeCreated: lastMessage.dateTimeCreated,
        isSent: false,
        isRead: false,
        senderName: job.createdBy.name,
        jobId: jobId ?? "",
      });
    }
  }, [wsMessages, job, jobId, addNotification, isLoadingHistory]);

  const handleSend = () => {
    if (!input.trim() || !job || !jobId) return;
    if (isPoster) return; // Prevent poster from sending to self

    // Send via WebSocket to job creator with jobId
    sendMessage({
      toUserId: job.createdByUserId,
      text: input.trim(),
      jobData: { id: jobId, title: job.title },
    });
    setInput("");
  };

  const handleDeleteJob = async () => {
    if (!job || !firebaseToken || !jobId) return;

    const confirmed = window.confirm(t("jobDetail.confirmDelete"));
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      await api.deleteJob(jobId, firebaseToken);
      router.push("/my-jobs");
    } catch (error) {
      console.error("Failed to delete job:", error);
      alert(t("jobDetail.deleteError"));
    } finally {
      setIsDeleting(false);
    }
  };

  // Transform WebSocket messages to UI format
  const displayMessages = useMemo(() => {
    // Merge WebSocket and HTTP history, dedupe by id
    const combined = [...httpMessages, ...wsMessages];
    const uniqueById = Array.from(new Map(combined.map((m) => [m.id, m])).values());

    const messages = uniqueById
      // Only messages for this job
      .filter((msg) => msg.jobData?.id === jobId)
      // Only messages involving the logged-in user
      .filter((msg) => {
        if (!user?.id) return true;
        return msg.fromUserId === user.id || msg.toUserId === user.id;
      })
      .map((msg) => ({
        id: msg.id,
        sender: msg.fromUserId === user?.id ? ("me" as const) : ("creator" as const),
        text: msg.message?.text ?? "",
        timestamp: msg.dateTimeCreated,
        status: msg.isRead ? ("seen" as const) : ("delivered" as const),
      }));
    // Sort by timestamp - oldest first (newer messages at bottom)
    return messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [httpMessages, wsMessages, user?.id, jobId]);

  const formattedCreatedAt = useMemo(() => {
    if (!job?.dateTimeCreated) return "";
    return new Date(job.dateTimeCreated).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }, [job?.dateTimeCreated]);

  if (loading) {
    return (
      <div className="min-h-screen bg-muted">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12 space-y-6">
          <div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
          <div className="h-16 bg-gray-200 rounded animate-pulse" />
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2 h-96 bg-gray-200 rounded animate-pulse" />
            <div className="h-96 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted px-4">
        <div className="bg-card shadow-lg rounded-2xl p-8 text-center space-y-4 max-w-md w-full">
          <p className="text-2xl font-semibold text-foreground">{t("jobDetail.jobNotFound")}</p>
          <p className="text-muted-foreground">
            {t("jobDetail.jobNotFoundDesc")}
          </p>
          <div className="flex justify-center gap-3">
            <Button variant="outline" asChild>
              <Link href="/jobs">{t("jobDetail.backToJobs")}</Link>
            </Button>
            <Button asChild>
              <Link href="/post-job">{t("post.title")}</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted">
      <div className="border-b border-border bg-card">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6 flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/jobs" className="flex items-center gap-2">
              <ArrowLeft size={16} />
              <span className="hidden sm:inline">{t("jobDetail.backToJobs")}</span>
              <span className="sm:hidden">{t("jobDetail.back")}</span>
            </Link>
          </Button>
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-primary/20 text-blue-800 text-xs font-semibold uppercase">
              {job.category}
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              {job.title}
            </h1>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 grid lg:grid-cols-3 gap-8">
        {/* Details column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card shadow-sm rounded-2xl p-6 border border-gray-100">
            <div className="flex flex-wrap items-center gap-4 mb-6">
              <div className="flex items-center gap-2 text-foreground">
                <DollarSign size={18} />
                <div>
                  <p className="text-sm text-muted-foreground">{t("jobDetail.budget")}</p>
                  <p className="text-lg font-semibold text-foreground">
                    {job.budgetCurrency} {job.budget.toLocaleString()}{" "}
                    {job.budgetType === "HOURLY" ? t("jobDetail.hourly") : t("jobDetail.fixed")}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-foreground">
                <MapPin size={18} />
                <div>
                  <p className="text-sm text-muted-foreground">{t("jobDetail.location")}</p>
                  <p className="text-lg font-semibold text-foreground">
                    {job.remote ? t("jobDetail.remote") : job.location}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-foreground">
                <Clock size={18} />
                <div>
                  <p className="text-sm text-muted-foreground">{t("jobDetail.posted")}</p>
                  <p className="text-lg font-semibold text-foreground">
                    {formattedCreatedAt}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-foreground">
                <Users size={18} />
                <div>
                  <p className="text-sm text-muted-foreground">{t("jobDetail.applicants")}</p>
                  <p className="text-lg font-semibold text-foreground">
                    {job.applicants}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">
                {t("jobDetail.aboutJob")}
              </h2>
              <p className="text-foreground leading-relaxed">{job.description}</p>

              <div className="flex flex-wrap gap-2 pt-2">
                <span className="inline-flex items-center gap-1 px-3 py-1 text-sm rounded-full bg-gray-100 text-foreground">
                  <Shield size={14} /> {t("jobDetail.verifiedPoster")}
                </span>
                {job.remote && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 text-sm rounded-full bg-green-100 text-green-700">
                    <Wifi size={14} /> {t("jobDetail.remoteFriendly")}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="bg-card shadow-sm rounded-2xl p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-foreground mb-3">
              {t("jobDetail.lookingFor")}
            </h3>
            <ul className="list-disc list-inside text-foreground space-y-2">
              <li>Reliable communicator who can start soon.</li>
              <li>Experience with similar tasks and good reviews.</li>
              <li>Comfortable sharing progress updates and photos.</li>
            </ul>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-card shadow-sm rounded-2xl p-6 border border-gray-100 space-y-4">
            <div className="flex items-center gap-3">
              {job.createdBy.image && (
                <Image
                  src={job.createdBy.image}
                  alt={job.createdBy.name}
                  width={56}
                  height={56}
                  className="rounded-full"
                />
              )}
              <div>
                <p className="text-sm text-muted-foreground">{t("jobDetail.postedBy")}</p>
                <p className="text-base font-semibold text-foreground">
                  {job.createdBy.name}
                </p>
                <div className="flex items-center gap-1 text-sm text-foreground">
                  <Star size={14} className="text-yellow-500 fill-yellow-500" />
                  {job.createdBy.rating} ({job.createdBy.reviews} {t("jobDetail.reviews")})
                </div>
              </div>
            </div>
            {isPoster ? (
              <div className="space-y-3">
                <Button
                  className="w-full"
                  asChild
                >
                  <Link href={`/jobs/${jobId}/edit`} className="flex items-center justify-center gap-2">
                    <Edit2 size={18} />
                    {t("jobDetail.editJob")}
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  className="w-full text-red-600 border-red-700 hover:bg-red-950/50"
                  onClick={handleDeleteJob}
                  disabled={isDeleting}
                >
                  <Trash2 size={18} />
                  {isDeleting ? t("jobDetail.deleting") : t("jobDetail.deleteJob")}
                </Button>
              </div>
            ) : (
              <>
                <Button
                  className="w-full"
                  disabled={isPoster}
                  title={isPoster ? "You cannot apply to your own job" : ""}
                >
                  {t("jobDetail.applyToJob")}
                </Button>
                <Button variant="outline" className="w-full">
                  {t("jobDetail.saveForLater")}
                </Button>
              </>
            )}
          </div>

          <div className="bg-card shadow-sm rounded-2xl p-6 border border-gray-100 flex flex-col h-[28rem]">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm text-muted-foreground">{t("jobDetail.chatWithPoster")}</p>
                <p className="text-base font-semibold text-foreground">
                  {job.createdBy.name}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"
                    }`}
                />
                <span className="text-xs text-muted-foreground">
                  {isConnected ? t("jobDetail.connected") : t("jobDetail.connecting")}
                </span>
              </div>
            </div>

            {!firebaseToken && (
              <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
                <AlertCircle
                  size={16}
                  className="text-yellow-700 flex-shrink-0 mt-0.5"
                />
                <p className="text-xs text-yellow-800">
                  {t("jobDetail.signInToChat")}
                </p>
              </div>
            )}

            {firebaseToken && !isConnected && (
              <div className="mb-3 p-3 bg-primary/10 border border-blue-200 rounded-lg flex items-start gap-2">
                <AlertCircle
                  size={16}
                  className="text-blue-700 flex-shrink-0 mt-0.5"
                />
                <p className="text-xs text-blue-800">
                  {t("jobDetail.connectionUnavailable")}
                </p>
              </div>
            )}

            {chatError && (
              <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <AlertCircle
                  size={16}
                  className="text-red-700 flex-shrink-0 mt-0.5"
                />
                <p className="text-xs text-red-800">{chatError}</p>
              </div>
            )}

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {isLoadingHistory ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin">
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full" />
                  </div>
                </div>
              ) : displayMessages.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-4">
                  {isPoster
                    ? t("jobDetail.posterCannotChat", "You cannot chat with yourself about this job.")
                    : t("jobDetail.startConversation")}
                </p>
              ) : (
                displayMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender === "me" ? "justify-end" : "justify-start"
                      }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-sm ${msg.sender === "me"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-foreground"
                        }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                      <div
                        className={`mt-1 text-[10px] ${msg.sender === "me"
                          ? "text-blue-100"
                          : "text-muted-foreground"
                          }`}
                      >
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                        {msg.sender === "me" && msg.status
                          ? ` • ${msg.status}`
                          : ""}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {isPoster ? (
              <div className="mt-3 p-3 bg-muted border border-border rounded-lg text-xs text-muted-foreground">
                {t("jobDetail.posterCannotChat", "You cannot chat with yourself about this job.")}
              </div>
            ) : (
              <div className="mt-3 flex items-center gap-2 flex-shrink-0">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder={t("jobDetail.writeMessage")}
                  disabled={!firebaseToken}
                  className="flex-1 rounded-full border border-border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
                <Button
                  size="icon"
                  onClick={handleSend}
                  disabled={!firebaseToken}
                  aria-label={t("jobDetail.sendMessage")}
                >
                  <Send size={16} />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
