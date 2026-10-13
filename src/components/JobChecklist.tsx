"use client";

import { useEffect, useState, type FormEvent } from "react";
import { AlertCircle, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/http";
import { useTranslation } from "@/lib/i18n";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/QueryState";
import type { JobChecklistItem } from "@/api/types";

interface JobChecklistProps {
  jobId: string;
  firebaseToken: string;
}

export function JobChecklist({ jobId, firebaseToken }: JobChecklistProps) {
  const { t } = useTranslation();
  const [items, setItems] = useState<JobChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newItemText, setNewItemText] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    api
      .getChecklist(jobId, firebaseToken)
      .then((data) => {
        if (isActive) setItems(data);
      })
      .catch((err) => {
        console.error("Failed to load checklist:", err);
        if (isActive) setError(t("checklist.errorLoad"));
      })
      .finally(() => {
        if (isActive) setLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [jobId, firebaseToken, t]);

  const handleAdd = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newItemText.trim()) return;
    setAdding(true);
    setError(null);
    try {
      const item = await api.addChecklistItem(jobId, newItemText.trim(), firebaseToken);
      setItems((prev) => [...prev, item]);
      setNewItemText("");
    } catch (err) {
      console.error("Failed to add checklist item:", err);
      setError(errorMessage(err, t("checklist.errorAdd")));
    } finally {
      setAdding(false);
    }
  };

  // Optimistic toggle / delete with rollback and a visible message on failure.
  const handleToggle = async (item: JobChecklistItem) => {
    const previous = items;
    setError(null);
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, isDone: !i.isDone } : i)));
    try {
      await api.updateChecklistItem(jobId, item.id, { isDone: !item.isDone }, firebaseToken);
    } catch (err) {
      console.error("Failed to update checklist item:", err);
      setItems(previous);
      setError(t("checklist.errorUpdate"));
    }
  };

  const handleDelete = async (itemId: string) => {
    const previous = items;
    setError(null);
    setItems((prev) => prev.filter((i) => i.id !== itemId));
    try {
      await api.deleteChecklistItem(jobId, itemId, firebaseToken);
    } catch (err) {
      console.error("Failed to delete checklist item:", err);
      setItems(previous);
      setError(t("checklist.errorDelete"));
    }
  };

  const doneCount = items.filter((i) => i.isDone).length;

  return (
    <section aria-labelledby="job-checklist-title" aria-busy={loading || undefined} className="rounded-card border border-line bg-surface p-4 md:p-6">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 id="job-checklist-title" className="font-display text-h3 text-ink">
          {t("checklist.title")}
        </h2>
        {items.length > 0 ? (
          <span className="text-caption tabular text-ink-muted">
            {doneCount}/{items.length}
          </span>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="mb-3 flex items-start gap-2 rounded-control bg-danger-soft p-3 text-label font-normal text-ink">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden="true" />
          {error}
        </p>
      ) : null}

      {loading ? (
        <div className="space-y-3" aria-hidden="true">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-5 w-1/2" />
        </div>
      ) : items.length === 0 ? (
        <p className="text-body text-ink-muted">{t("checklist.empty")}</p>
      ) : (
        <ul className="divide-y divide-line">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-2">
              <Checkbox
                wrapperClassName="min-w-0 flex-1"
                checked={item.isDone}
                onChange={() => handleToggle(item)}
                label={<span className={item.isDone ? "break-words text-ink-muted line-through" : "break-words text-ink"}>{item.text}</span>}
              />
              {/* Always visible: hover-only controls are unreachable on touch (design-tokens §6, active job). */}
              <Button
                variant="ghost"
                size="icon"
                className="text-ink-muted hover:bg-danger-soft hover:text-danger"
                onClick={() => handleDelete(item.id)}
                aria-label={`${t("checklist.removeAria")}: ${item.text}`}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleAdd} className="mt-4 flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <label htmlFor={`checklist-new-${jobId}`} className="sr-only">
            {t("checklist.addAria")}
          </label>
          <input
            id={`checklist-new-${jobId}`}
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            placeholder={t("checklist.addPlaceholder")}
            className="min-h-[48px] w-full rounded-control border border-line-strong bg-surface px-3 text-body text-ink placeholder:text-ink-subtle hover:border-ink-muted focus:border-primary focus:outline-none focus:shadow-focus"
          />
        </div>
        <Button type="submit" size="icon" className="h-12 w-12" loading={adding} disabled={!newItemText.trim()} aria-label={t("checklist.addAria")}>
          {!adding ? <Plus className="h-5 w-5" aria-hidden="true" /> : null}
        </Button>
      </form>
    </section>
  );
}
