"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { useTranslation } from "@/lib/i18n";
import { useAuth } from "@/context/AuthContext";
import { getIdToken } from "@/lib/auth-service";
import { apiFetch, errorMessage } from "@/lib/http";
import { deleteUserAccount } from "@/api";

/** GDPR export and account deletion (with a confirm dialog instead of window.confirm). */
export function DataAndDangerSection({ userId }: { userId: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  const { signOut } = useAuth();
  const { push } = useToast();
  const [exporting, setExporting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const token = await getIdToken();
      const response = await apiFetch(`/api/users/${userId}/export`, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error(t("profile.exportDataError"));
      const data = await response.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `work4u-data-export-${userId}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to export data:", err);
      push({ tone: "error", message: errorMessage(err, t("profile.exportDataError")) });
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const token = await getIdToken();
      await deleteUserAccount(token, userId);
      await signOut();
      router.push("/");
    } catch (err) {
      console.error("Failed to delete account:", err);
      push({ tone: "error", message: errorMessage(err, t("profile.deleteError")) });
    } finally {
      setDeleting(false);
      setConfirmOpen(false);
    }
  };

  return (
    <>
      <section aria-labelledby="profile-data-heading" className="rounded-card border border-line bg-surface p-5 md:p-6">
        <h2 id="profile-data-heading" className="font-display text-h3 text-ink">
          {t("profile.yourDataTitle")}
        </h2>
        <p className="mt-1 max-w-prose text-body text-ink-muted">{t("profile.yourDataDesc")}</p>
        <Button variant="secondary" className="mt-4" onClick={handleExport} loading={exporting}>
          <Download className="h-4 w-4" aria-hidden="true" />
          {exporting ? t("profile.preparingExport") : t("profile.downloadMyData")}
        </Button>
      </section>

      <section aria-labelledby="profile-danger-heading" className="rounded-card border border-danger/30 bg-danger-soft p-5 md:p-6">
        <h2 id="profile-danger-heading" className="font-display text-h3 text-ink">
          {t("profile.dangerZone")}
        </h2>
        <p className="mt-1 max-w-prose text-body text-ink">{t("profile.deleteAccountWarning")}</p>
        <Button variant="destructive" className="mt-4" onClick={() => setConfirmOpen(true)} aria-haspopup="dialog">
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          {t("profile.deleteAccount")}
        </Button>
      </section>

      <ConfirmDialog
        open={confirmOpen}
        tone="destructive"
        title={t("profile.deleteConfirmTitle")}
        description={t("profile.deleteConfirmMessage")}
        confirmLabel={deleting ? t("profile.deleting") : t("profile.confirmDelete")}
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => !deleting && setConfirmOpen(false)}
      />
    </>
  );
}
