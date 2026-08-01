"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, Plus, RefreshCw, Search, Settings, Trash2 } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { Button } from "@/components/ui/Button";
import {
    fetchTranslations,
    createTranslationKey,
    updateTranslationValues,
    deleteTranslationKey,
    triggerTranslationsDeploy,
    type TranslationKeyEntry,
    type TranslationLocale,
} from "@/lib/admin-api";
import { siteSettingsApi } from "@/lib/site-settings-api";

const LOCALES: TranslationLocale[] = ["en", "fr", "es", "hu", "ro"];
const PAGE_SIZE = 50;

export default function AdminTranslationsPage() {
    const { t } = useTranslation();
    const { user, firebaseToken } = useAuth();
    const router = useRouter();

    const [entries, setEntries] = useState<TranslationKeyEntry[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [searchInput, setSearchInput] = useState("");
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [savingCell, setSavingCell] = useState<string | null>(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [deploying, setDeploying] = useState(false);
    const [deployMessage, setDeployMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [showDeploySettings, setShowDeploySettings] = useState(false);

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
                const result = await fetchTranslations(firebaseToken, { search, page, limit: PAGE_SIZE });
                setEntries(result.entries);
                setTotal(result.total);
            } catch (err) {
                console.error("Failed to load translations:", err);
                setError(t("adminTranslations.loadError"));
            } finally {
                setLoading(false);
            }
        };

        void load();
    }, [firebaseToken, user?.userType, search, page, t]);

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        setSearch(searchInput.trim());
    };

    async function handleValueBlur(key: string, locale: TranslationLocale, value: string) {
        if (!firebaseToken) return;
        const entry = entries.find((e) => e.key === key);
        if (!entry || (entry.values[locale] ?? "") === value) return;

        const cellId = `${key}:${locale}`;
        setSavingCell(cellId);
        try {
            const updated = await updateTranslationValues(key, { [locale]: value }, firebaseToken);
            setEntries((prev) =>
                prev.map((e) => (e.key === key ? { ...e, values: { ...e.values, ...updated.values } } : e))
            );
        } catch (err) {
            console.error("Failed to update translation value:", err);
            alert(err instanceof Error ? err.message : t("adminTranslations.saveError"));
        } finally {
            setSavingCell(null);
        }
    }

    async function handleDelete(key: string) {
        if (!firebaseToken || !confirm(t("admin.deleteConfirm"))) return;
        try {
            await deleteTranslationKey(key, firebaseToken);
            setEntries((prev) => prev.filter((e) => e.key !== key));
            setTotal((prev) => prev - 1);
        } catch (err) {
            console.error("Failed to delete translation key:", err);
            alert(err instanceof Error ? err.message : t("adminTranslations.deleteError"));
        }
    }

    async function handleCreate(key: string, values: Partial<Record<TranslationLocale, string>>) {
        if (!firebaseToken) return;
        try {
            const created = await createTranslationKey(key, values, firebaseToken);
            setEntries((prev) => [created, ...prev]);
            setTotal((prev) => prev + 1);
            setShowAddForm(false);
        } catch (err) {
            console.error("Failed to create translation key:", err);
            alert(err instanceof Error ? err.message : t("adminTranslations.createError"));
        }
    }

    async function handleDeploy() {
        if (!firebaseToken) return;
        setDeploying(true);
        setDeployMessage(null);
        try {
            await triggerTranslationsDeploy(firebaseToken);
            setDeployMessage({ type: "success", text: t("adminTranslations.deployTriggered") });
        } catch (err) {
            setDeployMessage({
                type: "error",
                text: err instanceof Error ? err.message : t("adminTranslations.deployError"),
            });
        } finally {
            setDeploying(false);
        }
    }

    if (user?.userType !== "ADMIN") {
        return null;
    }

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    return (
        <div className="min-h-screen bg-card">
            <div className="max-w-7xl mx-auto px-4 py-16">
                <Link href="/admin" className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
                    <ArrowLeft className="w-4 h-4" />
                    {t("admin.backToDashboard")}
                </Link>
                <div className="mt-4 flex items-center justify-between gap-4 mb-2">
                    <h1 className="text-4xl font-bold text-foreground">{t("adminTranslations.title")}</h1>
                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            onClick={() => setShowDeploySettings((v) => !v)}
                            title={t("adminTranslations.deploySettingsTitle")}
                        >
                            <Settings className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" onClick={handleDeploy} disabled={deploying} className="gap-2">
                            <RefreshCw className={`w-4 h-4 ${deploying ? "animate-spin" : ""}`} />
                            {deploying ? t("adminTranslations.deploying") : t("adminTranslations.syncAndDeploy")}
                        </Button>
                        <Button onClick={() => setShowAddForm((v) => !v)} className="gap-2">
                            <Plus className="w-4 h-4" />
                            {t("adminTranslations.newKey")}
                        </Button>
                    </div>
                </div>
                <p className="text-muted-foreground mb-2">{t("adminTranslations.subtitle")}</p>
                {deployMessage && (
                    <p className={`text-sm font-semibold mb-6 ${deployMessage.type === "success" ? "text-green-700" : "text-red-600"}`}>
                        {deployMessage.text}
                    </p>
                )}
                {!deployMessage && <div className="mb-8" />}

                {showDeploySettings && firebaseToken && (
                    <DeploySettingsPanel token={firebaseToken} onClose={() => setShowDeploySettings(false)} />
                )}

                {showAddForm && (
                    <AddKeyForm
                        onCancel={() => setShowAddForm(false)}
                        onCreate={handleCreate}
                    />
                )}

                <form onSubmit={handleSearchSubmit} className="mb-6">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                        <input
                            type="text"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            placeholder={t("adminTranslations.searchPlaceholder")}
                            className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>
                </form>

                {loading ? (
                    <p className="text-muted-foreground">{t("adminTranslations.loading")}</p>
                ) : error ? (
                    <p className="text-red-600 font-semibold">{error}</p>
                ) : entries.length === 0 ? (
                    <p className="text-muted-foreground">{t("adminTranslations.empty")}</p>
                ) : (
                    <div className="overflow-x-auto border border-border rounded-xl">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-background border-b border-border text-left">
                                    <th className="p-3 font-semibold text-foreground w-64">{t("adminTranslations.keyColumn")}</th>
                                    {LOCALES.map((locale) => (
                                        <th key={locale} className="p-3 font-semibold text-foreground min-w-[200px]">
                                            {locale}
                                        </th>
                                    ))}
                                    <th className="p-3 w-10" />
                                </tr>
                            </thead>
                            <tbody>
                                {entries.map((entry) => (
                                    <tr key={entry.key} className="border-b border-border last:border-0">
                                        <td className="p-3 align-top font-mono text-xs text-muted-foreground break-all">
                                            {entry.key}
                                        </td>
                                        {LOCALES.map((locale) => (
                                            <td key={locale} className="p-2 align-top">
                                                <textarea
                                                    defaultValue={entry.values[locale] ?? ""}
                                                    onBlur={(e) => handleValueBlur(entry.key, locale, e.target.value)}
                                                    disabled={savingCell === `${entry.key}:${locale}`}
                                                    rows={2}
                                                    className="w-full resize-y rounded-lg border border-border bg-card px-2 py-1 text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                                                />
                                            </td>
                                        ))}
                                        <td className="p-2 align-top">
                                            <button
                                                onClick={() => handleDelete(entry.key)}
                                                title={t("adminTranslations.deleteKey")}
                                                className="p-2 text-muted-foreground hover:text-red-600 transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {!loading && !error && totalPages > 1 && (
                    <div className="flex items-center justify-between mt-6">
                        <p className="text-sm text-muted-foreground">
                            {t("adminTranslations.pageIndicator")
                                .replace("{page}", String(page))
                                .replace("{totalPages}", String(totalPages))
                                .replace("{total}", String(total))}
                        </p>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page <= 1}
                            >
                                {t("adminTranslations.previousPage")}
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                disabled={page >= totalPages}
                            >
                                {t("adminTranslations.nextPage")}
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

interface AddKeyFormProps {
    onCancel: () => void;
    onCreate: (key: string, values: Partial<Record<TranslationLocale, string>>) => Promise<void>;
}

function AddKeyForm({ onCancel, onCreate }: AddKeyFormProps) {
    const { t } = useTranslation();
    const [key, setKey] = useState("");
    const [values, setValues] = useState<Partial<Record<TranslationLocale, string>>>({});
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!key.trim() || !values.en?.trim()) return;
        setSaving(true);
        try {
            await onCreate(key.trim(), values);
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="mb-6 border border-border rounded-xl p-4 bg-background space-y-4">
            <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                    {t("adminTranslations.keyColumn")} *
                </label>
                <input
                    type="text"
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    placeholder="section.someNewKey"
                    className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {LOCALES.map((locale) => (
                    <div key={locale}>
                        <label className="block text-xs text-muted-foreground mb-1">
                            {locale}
                            {locale === "en" ? " *" : ""}
                        </label>
                        <input
                            type="text"
                            value={values[locale] ?? ""}
                            onChange={(e) => setValues((prev) => ({ ...prev, [locale]: e.target.value }))}
                            className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>
                ))}
            </div>
            <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
                    {t("admin.cancel")}
                </Button>
                <Button type="submit" disabled={saving || !key.trim() || !values.en?.trim()}>
                    {saving ? t("admin.saving") : t("adminTranslations.createKey")}
                </Button>
            </div>
        </form>
    );
}

interface DeploySettingsPanelProps {
    token: string;
    onClose: () => void;
}

function DeploySettingsPanel({ token, onClose }: DeploySettingsPanelProps) {
    const { t } = useTranslation();
    const [url, setUrl] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        siteSettingsApi
            .adminGetDeploySettings(token)
            .then((data) => setUrl(data.frontendDeployHookUrl ?? ""))
            .catch((err) => {
                console.error("Failed to load deploy settings:", err);
                setError(t("adminTranslations.deploySettingsLoadError"));
            })
            .finally(() => setLoading(false));
    }, [token, t]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        setSaved(false);
        setError(null);
        try {
            const data = await siteSettingsApi.adminSetDeploySettings(
                { frontendDeployHookUrl: url.trim() || null },
                token
            );
            setUrl(data.frontendDeployHookUrl ?? "");
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
        } catch (err) {
            setError(err instanceof Error ? err.message : t("adminTranslations.deploySettingsSaveError"));
        } finally {
            setSaving(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="mb-6 border border-border rounded-xl p-4 bg-background space-y-3">
            <label className="block text-sm font-medium text-foreground">
                {t("adminTranslations.deployHookUrlLabel")}
            </label>
            <p className="text-xs text-muted-foreground">{t("adminTranslations.deployHookUrlHint")}</p>
            {loading ? (
                <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
            ) : (
                <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://api.vercel.com/v1/integrations/deploy/..."
                    className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
            )}
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex items-center gap-3 pt-1">
                <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
                    {t("admin.cancel")}
                </Button>
                <Button type="submit" disabled={loading || saving}>
                    {saving ? t("admin.saving") : t("adminContact.save")}
                </Button>
                {saved && (
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-green-700">
                        <Check className="h-4 w-4" />
                        {t("adminContact.saved")}
                    </span>
                )}
            </div>
        </form>
    );
}
