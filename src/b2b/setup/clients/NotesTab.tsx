"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Briefcase, CheckCircle2, History } from "lucide-react";
import { useTr } from "@/b2b/setup/i18n";
import { addNote, getClientTimeline, listNotes, sk, type TimelineItem } from "@/b2b/setup/api";
import { setupErrorMessage } from "@/b2b/setup/errors";
import { ErrorAlert, ListSkeleton, btnPrimary, inputCls } from "@/b2b/components/catalog/ui";
import { NoteItem } from "./NoteItem";
import { NOTE_MAX, buildFeed, validateNoteBody } from "./noteRules";
import { shortDate } from "./parts";

interface Props { orgId: string; clientId: string; can: (p: string) => boolean; offline: boolean }

function SystemEntry({ orgId, item }: { orgId: string; item: TimelineItem }) {
  const { tr } = useTr();
  const ref = typeof item.reference === "string" ? item.reference : "";
  const title = typeof item.title === "string" ? item.title : "";
  const actor = typeof item.actorName === "string" ? item.actorName : "";
  const Icon = item.type === "JOB_COMPLETED" ? CheckCircle2 : item.type === "JOB_CREATED" ? Briefcase : History;
  let text: string;
  if (item.type === "JOB_CREATED") text = tr("b2b.clients.timeline.jobCreated", "Job created: {job}", { job: [ref, title].filter(Boolean).join(" ") });
  else if (item.type === "JOB_COMPLETED") text = tr("b2b.clients.timeline.jobCompleted", "Job completed: {job}", { job: [ref, title].filter(Boolean).join(" ") });
  else text = actor ? tr("b2b.clients.timeline.eventBy", "Client updated by {name}", { name: actor }) : tr("b2b.clients.timeline.event", "Client updated");
  const jobId = typeof item.jobId === "string" ? item.jobId : "";
  return (
    <li className="flex items-start gap-2 border-l-2 border-dashed border-ops-border-strong px-3 py-1 text-sm text-ops-ink-muted">
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1 break-words">{jobId ? <Link href={`/ops/${encodeURIComponent(orgId)}/jobs/${encodeURIComponent(jobId)}`} className="underline">{text}</Link> : text}</span>
      <span className="shrink-0 text-xs">{shortDate(item.at)}</span>
    </li>
  );
}

export function NotesTab({ orgId, clientId, can, offline }: Props) {
  const { tr } = useTr();
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const canAdd = can("customer.manage");
  const notes = useQuery({ queryKey: sk.notes(orgId, clientId), queryFn: () => listNotes(orgId, clientId) });
  const timeline = useQuery({ queryKey: sk.timeline(orgId, clientId), queryFn: () => getClientTimeline(orgId, clientId), retry: false });
  const add = useMutation({
    mutationFn: () => addNote(orgId, clientId, { body: body.trim() }),
    onSuccess: async () => { setBody(""); await qc.invalidateQueries({ queryKey: ["org", orgId, "customer", clientId] }); },
  });
  const invalid = validateNoteBody(body);
  const feed = notes.data ? buildFeed(notes.data.items, timeline.data?.items ?? []) : [];

  return (
    <section aria-labelledby="notes-h" className="space-y-3">
      <h2 id="notes-h" className="text-lg font-bold text-ops-ink">{tr("b2b.clients.tab.notes", "Notes")}</h2>
      {canAdd && (
        <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); if (!invalid && !offline) add.mutate(); }}>
          <label htmlFor="note-new" className="block text-sm font-bold text-ops-ink">{tr("b2b.clients.note.add", "Add a note")}</label>
          <textarea id="note-new" rows={3} value={body} maxLength={NOTE_MAX} aria-describedby="note-hint" onChange={(e) => setBody(e.target.value)} className={`${inputCls} py-2`} />
          <p id="note-hint" className="text-xs text-ops-ink-muted">{tr("b2b.clients.notes.hint", "Plain text, up to 4,000 characters. Visible to people who can view this client.")}</p>
          {add.isError && <ErrorAlert message={setupErrorMessage(add.error, tr)} />}
          <button type="submit" disabled={!!invalid || add.isPending || offline} className={btnPrimary}>{tr("b2b.clients.note.post", "Add note")}</button>
        </form>
      )}
      <div aria-live="polite">
        {notes.isPending ? <ListSkeleton /> : notes.isError ? <ErrorAlert message={tr("b2b.clients.notes.err", "We couldn't load the notes.")} onRetry={() => void notes.refetch()} retryLabel={tr("b2b.common.retry", "Retry")} />
          : feed.length === 0 ? <p className="text-sm text-ops-ink-muted">{tr("b2b.clients.notes.empty", "No notes yet.")}</p>
          : (
            <ul className="space-y-2">
              {feed.map((f) => f.kind === "note"
                ? <NoteItem key={`n-${f.note.id}`} orgId={orgId} clientId={clientId} note={f.note} can={can} offline={offline} />
                : <SystemEntry key={`s-${f.item.type}-${f.at}-${String(f.item.jobId ?? f.item.action ?? "")}`} orgId={orgId} item={f.item} />)}
            </ul>
          )}
      </div>
    </section>
  );
}
