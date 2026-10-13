"use client";

import Link from "next/link";
import { useState } from "react";
import { useTranslation } from "@/lib/i18n";
import { absoluteApiUrl } from "@/b2b/api/client";
import type { Attachment, JobWorkspace } from "@/b2b/api/types";
import { isExpired, isImageMime } from "@/b2b/lib/workspace";
import { PartsReadOnly } from "@/b2b/components/PartsReadOnly";
import { TimerChip } from "@/b2b/components/tech/TimerChip";
import { PausedChip } from "@/b2b/components/tech/PausedChip";

export type EvidenceAvailability = "loading" | "ready" | "migration" | "error";

function EvidenceFile({ file }: { file: Attachment }) {
  const { t } = useTranslation();
  const [failed, setFailed] = useState(false);
  if (failed || isExpired(file.urlExpiresAt) || !file.url) return <p className="text-sm">{file.name}: {t("b2b.review.evidence.previewUnavailable", "Preview unavailable. Reload evidence to refresh the link.")}</p>;
  return (
    <a href={absoluteApiUrl(file.url)} target="_blank" rel="noopener noreferrer" className="block min-w-0 rounded border border-ops-border p-2 text-sm underline">
      {isImageMime(file.mime) ? (
        // Signed, short-lived API image; no transformation through Next's image proxy.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={absoluteApiUrl(file.url)} alt={file.name} onError={() => setFailed(true)} className="mb-1 h-28 w-full rounded object-contain" />
      ) : null}
      <span className="break-words">{file.name} ({file.category})</span>
    </a>
  );
}

/** Display only fields supplied by the current job/report; never infer a signature image from a filename. */
export function CompletionEvidence({ orgId, jobId, job, files, availability, onReload }: {
  orgId: string; jobId: string; job: JobWorkspace; files: Attachment[]; availability: EvidenceAvailability; onReload: () => void;
}) {
  const { t } = useTranslation();
  const required = t("b2b.review.evidence.required", "Required");
  const checklist = job.checklist;
  const photos = files.filter((file) => isImageMime(file.mime));
  return (
    <section aria-label={t("b2b.review.evidence.title", "Completion evidence")} className="space-y-4 rounded border border-ops-border bg-ops-canvas p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-bold">{t("b2b.review.evidence.title", "Completion evidence")}</h3>
        <Link href={`/ops/${encodeURIComponent(orgId)}/jobs/${encodeURIComponent(jobId)}`} className="inline-flex min-h-[44px] items-center font-bold underline">{t("b2b.review.evidence.report", "View completion report")}</Link>
      </div>
      <div>
        <h4 className="font-bold">{t("b2b.review.evidence.checklist", "Checklist")} {job.requirements?.checklist ? `· ${required}` : ""}</h4>
        {!Array.isArray(checklist) ? <p>{t("b2b.review.evidence.checklistUnavailable", "Checklist evidence is unavailable.")}</p>
          : checklist.length === 0 ? <p>{t("b2b.review.evidence.noChecklist", "No checklist items recorded.")}</p>
          : <><p>{checklist.filter((item) => item.done).length}/{checklist.length} {t("b2b.review.evidence.checked", "items checked")}</p><ul className="space-y-1">{checklist.map((item) => <li key={item.id} className="flex flex-wrap gap-2"><span className="font-bold">{item.done ? t("b2b.review.evidence.done", "Done") : t("b2b.review.evidence.notDone", "Not done")}</span><span className="break-words">{item.text}</span></li>)}</ul></>}
      </div>
      <div>
        <h4 className="font-bold">{t("b2b.review.evidence.notes", "Completion notes")} {job.requirements?.notes ? `· ${required}` : ""}</h4>
        <p className="whitespace-pre-wrap break-words">{job.completionNotes === undefined ? t("b2b.review.evidence.notesUnavailable", "Completion notes are unavailable.") : job.completionNotes?.trim() || t("b2b.review.evidence.noNotes", "No completion notes recorded.")}</p>
      </div>
      <div>
        <h4 className="font-bold">{t("b2b.review.evidence.photos", "Photos and documents")} {job.requirements?.photo ? `· ${required}` : ""}</h4>
        {availability === "loading" ? <p role="status">{t("b2b.review.evidence.loadingFiles", "Loading photo and document evidence…")}</p>
          : availability === "migration" ? <p role="status">{t("b2b.review.evidence.migration", "Photo and document evidence is not available yet for this workspace.")}</p>
          : availability === "error" ? <p role="alert">{t("b2b.review.evidence.filesError", "Photo and document evidence could not be loaded.")}</p>
          : <><p>{photos.length ? `${photos.length} ${t("b2b.review.evidence.photoCount", "photo attachments")}` : job.photoKeys === undefined ? t("b2b.review.evidence.photoMetadataUnavailable", "No photo attachments returned; legacy photo evidence is unavailable.") : !job.photoKeys.length ? t("b2b.review.evidence.noPhotos", "No photo evidence recorded.") : null}</p><div className="grid gap-2 sm:grid-cols-2">{files.map((file) => <EvidenceFile key={`${file.id}:${file.url}`} file={file} />)}</div></>}
        {!!job.photoKeys?.length && <p>{job.photoKeys.length} {t("b2b.review.evidence.legacy", "legacy photo references recorded; preview links are not supplied by the API.")}</p>}
      </div>
      <div>
        <h4 className="font-bold">{t("b2b.review.evidence.signature", "Signature")} {job.requirements?.signature ? `· ${required}` : ""}</h4>
        {job.signature ? <><p className="break-words">{job.signature.name}</p><p>{job.signature.signedAt}</p><p>{t("b2b.review.evidence.signatureImage", "Drawn signature image is not identified by the API; the recorded name is shown above.")}</p></>
          : <p>{job.signature === undefined ? t("b2b.review.evidence.signatureUnavailable", "Signature evidence is unavailable.") : t("b2b.review.evidence.noSignature", "No signature recorded.")}</p>}
      </div>
      {job.time && job.time.state !== "NOT_STARTED" ? (
        <div>
          <h4 className="font-bold">{t("b2b.tech.timer.workedTitle", "Worked time")}</h4>
          <TimerChip time={job.time} /> <PausedChip time={job.time} />
        </div>
      ) : null}
      <PartsReadOnly orgId={orgId} jobId={jobId} heading="h4" />
      <button type="button" onClick={onReload} className="min-h-[44px] font-bold underline">{t("b2b.review.evidence.reload", "Reload evidence")}</button>
    </section>
  );
}
