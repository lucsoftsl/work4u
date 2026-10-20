"use client";

import { useTranslation } from "@/lib/i18n";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, FolderLock, Trash2, Upload } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { absoluteApiUrl } from "@/b2b/api/client";
import { deleteAttachment, qk, uploadAttachment } from "@/b2b/api/endpoints";
import type { Attachment, AttachmentCategory } from "@/b2b/api/types";
import { useOrg } from "@/b2b/context/OrgContext";
import { ATTACHMENT_CATEGORIES, categoryLabel, describeB2bError, isExpired, isImageMime, validateUpload } from "@/b2b/lib/workspace";
import { useAttachments } from "./queries";
import { Banner, btnClass, Card, ConfirmBox, ErrorRetry, fieldClass, Skeleton } from "./ui";

const sizeLabel = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

/** Shown instead of the tab content when attachments aren't migrated yet (not an error). */
export function FilesUnavailable() {
  const { t: tx } = useTranslation();
  return (
    <div className="flex flex-col items-center gap-2 rounded border border-dashed border-ops-border-strong bg-ops-surface p-8 text-center">
      <FolderLock className="h-8 w-8 text-ops-ink-subtle" aria-hidden="true" />
      <p className="text-base font-bold text-ops-ink">{tx("b2b.files.unavailable", "Files aren't available yet")}</p>
      <p className="max-w-md text-sm text-ops-ink-muted">{tx("b2b.files.unavailableBody", "Photo and document uploads will appear here once they're switched on for your workspace.")}</p>
    </div>
  );
}

function Thumb({ att, onExpired }: { att: Attachment; onExpired: () => void }) {
  const { t: tx } = useTranslation();
  const [failed, setFailed] = useState(false);
  if (!isImageMime(att.mime) || failed) {
    return <a href={absoluteApiUrl(att.url)} target="_blank" rel="noopener noreferrer" className="flex h-24 w-full items-center justify-center rounded bg-ops-canvas text-ops-ink-muted" aria-label={tx("b2b.files.open", "Open {name}").replace("{name}", att.name)}><FileText className="h-8 w-8" aria-hidden="true" /></a>;
  }
  return (
    <a href={absoluteApiUrl(att.url)} target="_blank" rel="noopener noreferrer" aria-label={tx("b2b.files.open", "Open {name}").replace("{name}", att.name)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- signed, short-lived API URL */}
      <img src={absoluteApiUrl(att.url)} alt={att.name} loading="lazy" onError={() => { setFailed(true); onExpired(); }} className="h-24 w-full rounded bg-ops-canvas object-cover" />
    </a>
  );
}

export function FilesTab({ jobId, canEdit }: { jobId: string; canEdit: boolean }) {
  const { t: tx, locale } = useTranslation();
  const i18n = { t: tx, locale };
  const { orgId } = useOrg();
  const toast = useToast();
  const qc = useQueryClient();
  const q = useAttachments(orgId, jobId);
  const [category, setCategory] = useState<AttachmentCategory>("BEFORE");
  const [filter, setFilter] = useState<AttachmentCategory | "ALL">("ALL");
  const [formError, setFormError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Attachment | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const refetch = () => void qc.invalidateQueries({ queryKey: qk.attachments(orgId, jobId) });

  // Signed URLs live 5 minutes: refresh just before the earliest expires.
  const items = useMemo(() => q.data?.items ?? [], [q.data]);
  useEffect(() => {
    if (items.length === 0) return;
    const soonest = Math.min(...items.map((a) => Date.parse(a.urlExpiresAt)));
    const wait = Math.max(1000, soonest - Date.now() - 10_000);
    const id = setTimeout(refetch, wait);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const upload = useMutation({
    mutationFn: (file: File) => uploadAttachment(orgId, jobId, category, file),
    onSuccess: () => { toast.push({ message: tx("b2b.files.uploaded", "File uploaded"), tone: "success" }); setFormError(null); if (fileRef.current) fileRef.current.value = ""; refetch(); },
    onError: (e) => setFormError(describeB2bError(e, i18n).message),
  });
  const del = useMutation({
    mutationFn: (id: string) => deleteAttachment(orgId, jobId, id),
    onSuccess: () => { toast.push({ message: tx("b2b.files.deleted", "File deleted"), tone: "success" }); setToDelete(null); refetch(); },
    onError: (e) => { setToDelete(null); setFormError(describeB2bError(e, i18n).message); },
  });

  if (q.migrationPending) return <FilesUnavailable />;
  if (q.isPending) return <div role="status" aria-busy="true" className="grid grid-cols-2 gap-3 md:grid-cols-4"><span className="sr-only">{tx("b2b.files.loading", "Loading files")}</span>{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)}</div>;
  if (q.isError) return <ErrorRetry message={tx("b2b.files.loadError", "Couldn't load files.")} onRetry={() => void q.refetch()} />;

  const cats = ATTACHMENT_CATEGORIES.filter((c) => items.some((a) => a.category === c));
  const shown = filter === "ALL" ? items : items.filter((a) => a.category === filter);
  const stale = items.some((a) => isExpired(a.urlExpiresAt));

  const onPick = (file: File | undefined) => {
    if (!file) return;
    const problem = validateUpload(file, category, i18n);
    if (problem) { setFormError(problem); if (fileRef.current) fileRef.current.value = ""; return; }
    setFormError(null);
    upload.mutate(file);
  };
  const pdfOk = category === "CUSTOMER_PROVIDED" || category === "INTERNAL";

  return (
    <div className="space-y-4">
      {canEdit ? (
        <Card title={tx("b2b.files.upload", "Upload")} icon={<Upload className="h-4 w-4" aria-hidden="true" />}>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label htmlFor="file-cat" className="mb-1 block text-sm font-bold text-ops-ink">{tx("b2b.files.category", "Category")}</label>
              <select id="file-cat" value={category} onChange={(e) => { setCategory(e.target.value as AttachmentCategory); setFormError(null); }} className={`${fieldClass} min-h-[44px]`}>
                {ATTACHMENT_CATEGORIES.map((c) => <option key={c} value={c}>{categoryLabel(c, i18n)}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="file-input" className="mb-1 block text-sm font-bold text-ops-ink">{tx("b2b.files.file", "File")}</label>
              <input id="file-input" ref={fileRef} type="file" disabled={upload.isPending} accept={pdfOk ? "image/jpeg,image/png,image/webp,application/pdf" : "image/jpeg,image/png,image/webp"}
                onChange={(e) => onPick(e.target.files?.[0])} className="min-h-[44px] max-w-full text-sm text-ops-ink file:mr-3 file:min-h-[44px] file:rounded file:border file:border-ops-border-strong file:bg-ops-surface file:px-3 file:font-bold" />
            </div>
          </div>
          <p className="mt-2 text-xs text-ops-ink-muted">{pdfOk ? tx("b2b.files.hintPdf", "JPEG, PNG, WebP or PDF. Up to 8 MB.") : tx("b2b.files.hint", "JPEG, PNG or WebP. Up to 8 MB.")}{upload.isPending ? ` ${tx("b2b.files.uploading", "Uploading…")}` : ""}</p>
        </Card>
      ) : null}
      {formError ? <Banner tone="danger" role="alert">{formError}</Banner> : null}
      {stale ? <Banner tone="info">{tx("b2b.files.expired", "Some links expired.")} <button type="button" className="font-bold underline" onClick={refetch}>{tx("b2b.files.refresh", "Refresh")}</button></Banner> : null}
      {items.length === 0 ? <p className="rounded border border-dashed border-ops-border-strong bg-ops-surface p-6 text-center text-sm text-ops-ink-muted">{tx("b2b.files.none", "No files yet.")}</p> : (
        <>
          {cats.length > 1 ? (
            <div role="group" aria-label={tx("b2b.files.filter", "Filter files by category")} className="flex flex-wrap gap-2">
              {(["ALL", ...cats] as const).map((c) => (
                <button key={c} type="button" aria-pressed={filter === c} onClick={() => setFilter(c)}
                  className={`inline-flex min-h-[44px] items-center rounded-full border px-3 text-sm font-bold ${filter === c ? "border-ops-ink bg-ops-ink text-white" : "border-ops-border-strong bg-ops-surface text-ops-ink-muted"}`}>
                  {c === "ALL" ? tx("b2b.files.all", "All") : categoryLabel(c, i18n)}
                </button>
              ))}
            </div>
          ) : null}
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
            {shown.map((a) => (
              <li key={a.id} className="min-w-0 rounded border border-ops-border bg-ops-surface p-2">
                <Thumb att={a} onExpired={refetch} />
                <p className="mt-2 truncate text-sm font-bold text-ops-ink" title={a.name}>{a.name}</p>
                <p className="text-xs text-ops-ink-muted">{categoryLabel(a.category, i18n)} · {sizeLabel(a.sizeBytes)}</p>
                {canEdit ? (
                  <button type="button" onClick={() => setToDelete(a)} className={btnClass("secondary", "mt-2 w-full")} aria-label={tx("b2b.files.deleteNamed", "Delete {name}").replace("{name}", a.name)}>
                    <Trash2 className="h-4 w-4" aria-hidden="true" />{tx("b2b.files.delete", "Delete")}
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </>
      )}
      <ConfirmBox open={!!toDelete} title={tx("b2b.files.deleteAsk", "Delete this file?")} description={toDelete ? tx("b2b.files.deleteBody", "{name} will be removed from the job.").replace("{name}", toDelete.name) : undefined} confirmLabel={tx("b2b.files.delete", "Delete")} loading={del.isPending}
        onConfirm={() => toDelete && del.mutate(toDelete.id)} onCancel={() => setToDelete(null)} />
    </div>
  );
}
