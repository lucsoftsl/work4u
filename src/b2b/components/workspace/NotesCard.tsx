"use client";

import { useId, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { NotebookPen } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { patchJob } from "@/b2b/api/endpoints";
import type { JobWorkspace } from "@/b2b/api/types";
import { useOrg } from "@/b2b/context/OrgContext";
import { describeB2bError, type DescribedError } from "@/b2b/lib/workspace";
import { TransitionError } from "./TransitionControl";
import { btnClass, Card, fieldClass } from "./ui";
import { useJobCache } from "./useJobCache";

type NoteField = "internalNotes" | "customerNotes";

function NoteEditor({ job, field, label, hint }: { job: JobWorkspace; field: NoteField; label: string; hint: string }) {
  const { orgId, can } = useOrg();
  const toast = useToast();
  const { merge, refresh } = useJobCache(orgId, job.id);
  const id = useId();
  const [draft, setDraft] = useState<string | undefined>(undefined);
  const [error, setError] = useState<DescribedError | null>(null);
  const editable = can("job.update");
  const saved = job[field] ?? "";
  const value = draft ?? saved;
  const dirty = draft !== undefined && draft !== saved;

  const save = useMutation({
    mutationFn: () => patchJob(orgId, job.id, job.version, { [field]: (draft ?? "").trim() }),
    onSuccess: (updated) => { merge(updated); setDraft(undefined); setError(null); toast.push({ message: `${label} saved`, tone: "success" }); },
    onError: (e) => setError(describeB2bError(e)),
  });

  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-bold text-ops-ink">{label}</label>
      {editable ? (
        <>
          <textarea id={id} rows={3} value={value} onChange={(e) => setDraft(e.target.value)} disabled={save.isPending} className={fieldClass} aria-describedby={`${id}-h`} />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <p id={`${id}-h`} className="text-xs text-ops-ink-muted">{hint}</p>
            <button type="button" disabled={!dirty || save.isPending} aria-busy={save.isPending || undefined} onClick={() => { setError(null); save.mutate(); }} className={btnClass("primary")}>Save note</button>
          </div>
          {error ? <TransitionError error={error} onReload={() => { setError(null); void refresh(); }} /> : null}
        </>
      ) : (
        <p id={id} className="whitespace-pre-wrap text-sm text-ops-ink">{saved || <span className="text-ops-ink-subtle">No notes.</span>}</p>
      )}
    </div>
  );
}

/** Internal notes are omitted by the API for technicians: show nothing for them (not an error). */
export function NotesCard({ job }: { job: JobWorkspace }) {
  const hasInternal = job.internalNotes !== undefined;
  return (
    <Card title="Notes" icon={<NotebookPen className="h-4 w-4" aria-hidden="true" />}>
      <div className="grid gap-5 md:grid-cols-2">
        {hasInternal ? <NoteEditor job={job} field="internalNotes" label="Internal notes" hint="Only your team sees this." /> : null}
        <NoteEditor job={job} field="customerNotes" label="Customer-visible notes" hint="The customer can see this." />
      </div>
    </Card>
  );
}
