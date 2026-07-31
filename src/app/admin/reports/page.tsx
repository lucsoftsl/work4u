"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { reportsApi } from "@/lib/reports-api";
import type { Report, ReportStatus } from "@/api/types";

const STATUS_STYLES: Record<ReportStatus, string> = {
    OPEN: "bg-red-50 text-red-700",
    REVIEWING: "bg-amber-50 text-amber-700",
    RESOLVED: "bg-green-50 text-green-700",
    DISMISSED: "bg-muted text-muted-foreground",
};

const REASON_LABEL_KEY: Record<Report["reason"], string> = {
    NO_SHOW: "adminReports.reasonNoShow",
    INAPPROPRIATE_BEHAVIOR: "adminReports.reasonInappropriateBehavior",
    SCAM_OR_FRAUD: "adminReports.reasonScamOrFraud",
    POOR_QUALITY_WORK: "adminReports.reasonPoorQualityWork",
    PAYMENT_DISPUTE: "adminReports.reasonPaymentDispute",
    FAKE_LISTING: "adminReports.reasonFakeListing",
    OTHER: "adminReports.reasonOther",
};

export default function AdminReportsPage() {
    const { t } = useTranslation();
    const { user, firebaseToken } = useAuth();
    const router = useRouter();

    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<ReportStatus | "">("OPEN");
    const [actingOnId, setActingOnId] = useState<string | null>(null);
    const [notesById, setNotesById] = useState<Record<string, string>>({});
    const [revertStatusById, setRevertStatusById] = useState<Record<string, "" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED">>({});

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
                const data = await reportsApi.listReports(firebaseToken, statusFilter ? { status: statusFilter } : undefined);
                setReports(data);
            } catch (err) {
                console.error("Failed to load reports:", err);
                setError(t("adminReports.loadError"));
            } finally {
                setLoading(false);
            }
        };

        void load();
    }, [firebaseToken, user?.userType, statusFilter, t]);

    async function handleResolve(report: Report, status: "RESOLVED" | "DISMISSED") {
        if (!firebaseToken) return;
        setActingOnId(report.id);
        try {
            const revertJobLifecycleStatus = revertStatusById[report.id] || undefined;
            const updated = await reportsApi.resolveReport(
                report.id,
                { status, resolutionNotes: notesById[report.id] || undefined, revertJobLifecycleStatus },
                firebaseToken
            );
            setReports((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
        } catch (err) {
            console.error("Failed to resolve report:", err);
            alert(err instanceof Error ? err.message : t("adminReports.resolveError"));
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
                <h1 className="mt-4 text-4xl font-bold text-foreground mb-2">{t("adminReports.title")}</h1>
                <p className="text-muted-foreground mb-6">{t("adminReports.subtitle")}</p>

                <div className="mb-6 flex gap-2">
                    {(["OPEN", "REVIEWING", "RESOLVED", "DISMISSED", ""] as const).map((status) => (
                        <button
                            key={status || "all"}
                            onClick={() => setStatusFilter(status)}
                            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                                statusFilter === status ? "border-primary bg-primary/10 text-primary" : "border-border text-foreground"
                            }`}
                        >
                            {status || t("adminReports.filterAll")}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <p className="text-muted-foreground">{t("adminReports.loading")}</p>
                ) : error ? (
                    <p className="text-red-600 font-semibold">{error}</p>
                ) : reports.length === 0 ? (
                    <p className="text-muted-foreground">{t("adminReports.empty")}</p>
                ) : (
                    <div className="space-y-4">
                        {reports.map((report) => (
                            <div key={report.id} className="border border-border rounded-xl p-5 bg-background">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <p className="font-semibold text-foreground">
                                            {report.reporter?.name || t("adminReports.someone")} {t("adminReports.reportedVerb")} {report.reportedUser?.name || t("adminReports.aUser")}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            {t(REASON_LABEL_KEY[report.reason])}
                                            {report.jobId ? ` · ${t("adminReports.jobDisputeLabel")} (${report.jobId.slice(0, 8)}…)` : ""}
                                        </p>
                                    </div>
                                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${STATUS_STYLES[report.status]}`}>
                                        {report.status}
                                    </span>
                                </div>

                                {report.description && (
                                    <p className="mt-3 text-sm text-foreground bg-muted rounded-lg p-3">{report.description}</p>
                                )}

                                {report.status === "OPEN" || report.status === "REVIEWING" ? (
                                    <div className="mt-4 space-y-2">
                                        <input
                                            value={notesById[report.id] ?? ""}
                                            onChange={(e) => setNotesById((prev) => ({ ...prev, [report.id]: e.target.value }))}
                                            placeholder={t("adminReports.notesPlaceholder")}
                                            className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                                        />
                                        {report.jobId && (
                                            <select
                                                value={revertStatusById[report.id] ?? ""}
                                                onChange={(e) =>
                                                    setRevertStatusById((prev) => ({
                                                        ...prev,
                                                        [report.id]: e.target.value as "" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED",
                                                    }))
                                                }
                                                className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                                            >
                                                <option value="">{t("adminReports.revertOptionKeepDisputed")}</option>
                                                <option value="IN_PROGRESS">{t("adminReports.revertOptionInProgress")}</option>
                                                <option value="COMPLETED">{t("adminReports.revertOptionCompleted")}</option>
                                                <option value="CANCELLED">{t("adminReports.revertOptionCancelled")}</option>
                                            </select>
                                        )}
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleResolve(report, "RESOLVED")}
                                                disabled={actingOnId === report.id}
                                                className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                                            >
                                                {t("adminReports.markResolved")}
                                            </button>
                                            <button
                                                onClick={() => handleResolve(report, "DISMISSED")}
                                                disabled={actingOnId === report.id}
                                                className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground disabled:opacity-50"
                                            >
                                                {t("adminReports.dismiss")}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    report.resolutionNotes && (
                                        <p className="mt-3 text-sm text-muted-foreground italic">{t("adminReports.notePrefix")} {report.resolutionNotes}</p>
                                    )
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
