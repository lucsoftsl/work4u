"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import {
    fetchModeratedJobs,
    moderateJob,
    scheduleJobDeletion,
} from "@/lib/admin-api";
import type { Job, JobModerationStatus } from "@/api/types";

const MODERATION_STATUSES: JobModerationStatus[] = ["NONE", "FLAGGED", "VIOLATION"];

const STATUS_STYLES: Record<JobModerationStatus, string> = {
    NONE: "bg-green-50 text-green-700",
    FLAGGED: "bg-amber-50 text-amber-700",
    VIOLATION: "bg-red-50 text-red-700",
};

export default function AdminJobsPage() {
    const { t } = useTranslation();
    const { user, firebaseToken } = useAuth();
    const router = useRouter();

    const FILTERS: { label: string; value: JobModerationStatus | "ALL" }[] = [
        { label: t("adminJobs.filterAll"), value: "ALL" },
        { label: t("adminJobs.filterFlagged"), value: "FLAGGED" },
        { label: t("adminJobs.filterViolation"), value: "VIOLATION" },
    ];

    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actingOnId, setActingOnId] = useState<string | null>(null);
    const [filter, setFilter] = useState<JobModerationStatus | "ALL">("ALL");

    useEffect(() => {
        if (user && user.userType !== "ADMIN") {
            router.push("/");
        }
    }, [user, router]);

    useEffect(() => {
        if (!firebaseToken || user?.userType !== "ADMIN") return;

        const load = async () => {
            try {
                setLoading(true);
                setError(null);
                const data = await fetchModeratedJobs(
                    firebaseToken,
                    filter === "ALL" ? undefined : { moderationStatus: filter }
                );
                setJobs(data);
            } catch (err) {
                console.error("Failed to load jobs:", err);
                setError(t("adminJobs.loadError"));
            } finally {
                setLoading(false);
            }
        };

        void load();
    }, [firebaseToken, user?.userType, filter, t]);

    async function handleSetModeration(target: Job, moderationStatus: JobModerationStatus) {
        if (!firebaseToken) return;
        let moderationNote: string | undefined;
        if (moderationStatus !== "NONE") {
            const note = window.prompt(
                `Mark "${target.title}" as ${moderationStatus}. Note (optional, Cancel to abort):`
            );
            if (note === null) return;
            moderationNote = note || undefined;
        }
        setActingOnId(target.id);
        try {
            const updated = await moderateJob(target.id, moderationStatus, firebaseToken, moderationNote);
            setJobs((prev) => prev.map((j) => (j.id === updated.id ? updated : j)));
        } catch (err) {
            console.error("Failed to moderate job:", err);
            alert(err instanceof Error ? err.message : t("adminJobs.moderateError"));
        } finally {
            setActingOnId(null);
        }
    }

    async function handleScheduleDeletion(target: Job) {
        if (!firebaseToken) return;
        const daysInput = window.prompt(
            `Schedule deletion of "${target.title}" in how many days? (Cancel to abort)`
        );
        if (daysInput === null) return;
        const days = Number(daysInput);
        if (!Number.isFinite(days) || days <= 0) {
            alert(t("adminJobs.positiveDaysError"));
            return;
        }
        setActingOnId(target.id);
        try {
            const updated = await scheduleJobDeletion(target.id, days, firebaseToken);
            setJobs((prev) => prev.map((j) => (j.id === updated.id ? updated : j)));
        } catch (err) {
            console.error("Failed to schedule job deletion:", err);
            alert(err instanceof Error ? err.message : t("adminJobs.scheduleDeletionError"));
        } finally {
            setActingOnId(null);
        }
    }

    if (user?.userType !== "ADMIN") {
        return null;
    }

    return (
        <div className="min-h-screen bg-card">
            <div className="max-w-5xl mx-auto px-4 py-16">
                <Link href="/admin" className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
                    <ArrowLeft className="w-4 h-4" />
                    {t("admin.backToDashboard")}
                </Link>
                <h1 className="mt-4 text-4xl font-bold text-foreground mb-2">{t("adminJobs.title")}</h1>
                <p className="text-muted-foreground mb-6">
                    {t("adminJobs.subtitle")}
                </p>

                <div className="flex gap-2 mb-10">
                    {FILTERS.map((f) => (
                        <button
                            key={f.value}
                            onClick={() => setFilter(f.value)}
                            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                                filter === f.value
                                    ? "bg-primary text-primary-foreground"
                                    : "border border-border text-foreground hover:bg-muted"
                            }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <p className="text-muted-foreground">{t("adminJobs.loading")}</p>
                ) : error ? (
                    <p className="text-red-600 font-semibold">{error}</p>
                ) : jobs.length === 0 ? (
                    <p className="text-muted-foreground">{t("adminJobs.empty")}</p>
                ) : (
                    <div className="border border-border rounded-xl divide-y divide-border overflow-hidden">
                        {jobs.map((job) => (
                            <div key={job.id} className="flex flex-wrap items-center justify-between gap-4 p-4 bg-background">
                                <div className="min-w-0">
                                    <p className="font-semibold text-foreground truncate">{job.title}</p>
                                    <p className="text-sm text-muted-foreground truncate">
                                        {job.category} · {job.createdBy?.name ?? job.createdByUserId} · {job.location}
                                    </p>
                                    {job.moderationNote && (
                                        <p className="text-xs text-muted-foreground mt-1 italic truncate">
                                            {t("adminJobs.notePrefix")} {job.moderationNote}
                                        </p>
                                    )}
                                    {job.scheduledDeletionAt && (
                                        <p className="flex items-center gap-1 text-xs text-amber-700 mt-1">
                                            <Clock className="w-3 h-3" />
                                            {t("adminJobs.scheduledDeletionPrefix")} {new Date(job.scheduledDeletionAt).toLocaleString()}
                                        </p>
                                    )}
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${STATUS_STYLES[job.moderationStatus]}`}>
                                        {job.moderationStatus}
                                    </span>
                                    <select
                                        defaultValue=""
                                        disabled={actingOnId === job.id}
                                        onChange={(e) => {
                                            const status = e.target.value as JobModerationStatus;
                                            e.target.value = "";
                                            if (status) handleSetModeration(job, status);
                                        }}
                                        className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground bg-background hover:bg-muted disabled:opacity-50"
                                    >
                                        <option value="" disabled>
                                            {t("adminJobs.setStatusPlaceholder")}
                                        </option>
                                        {MODERATION_STATUSES.map((status) => (
                                            <option key={status} value={status}>
                                                {status}
                                            </option>
                                        ))}
                                    </select>
                                    <button
                                        onClick={() => handleScheduleDeletion(job)}
                                        disabled={actingOnId === job.id}
                                        className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-50"
                                    >
                                        {t("adminJobs.scheduleDeletion")}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
