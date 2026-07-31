"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { useTranslation } from "@/lib/i18n";
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
        if (isActive) setError(t('checklist.errorLoad'));
      })
      .finally(() => {
        if (isActive) setLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [jobId, firebaseToken, t]);

  const handleAdd = async () => {
    if (!newItemText.trim()) return;
    setAdding(true);
    setError(null);
    try {
      const item = await api.addChecklistItem(jobId, newItemText.trim(), firebaseToken);
      setItems((prev) => [...prev, item]);
      setNewItemText("");
    } catch (err) {
      console.error("Failed to add checklist item:", err);
      setError(err instanceof Error ? err.message : t('checklist.errorAdd'));
    } finally {
      setAdding(false);
    }
  };

  const handleToggle = async (item: JobChecklistItem) => {
    const previous = items;
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, isDone: !i.isDone } : i)));
    try {
      await api.updateChecklistItem(jobId, item.id, { isDone: !item.isDone }, firebaseToken);
    } catch (err) {
      console.error("Failed to update checklist item:", err);
      setItems(previous);
    }
  };

  const handleDelete = async (itemId: string) => {
    const previous = items;
    setItems((prev) => prev.filter((i) => i.id !== itemId));
    try {
      await api.deleteChecklistItem(jobId, itemId, firebaseToken);
    } catch (err) {
      console.error("Failed to delete checklist item:", err);
      setItems(previous);
    }
  };

  if (loading) {
    return (
      <div className="bg-card shadow-sm rounded-2xl p-6 border border-gray-100">
        <Loader2 size={16} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="bg-card shadow-sm rounded-2xl p-6 border border-gray-100">
      <h3 className="text-lg font-semibold text-foreground mb-3">{t('checklist.title')}</h3>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('checklist.empty')}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 group">
              <input
                type="checkbox"
                checked={item.isDone}
                onChange={() => handleToggle(item)}
                className="h-4 w-4 rounded border-border text-primary"
              />
              <span className={`flex-1 text-sm ${item.isDone ? "text-muted-foreground line-through" : "text-foreground"}`}>
                {item.text}
              </span>
              <button
                onClick={() => handleDelete(item.id)}
                className="text-muted-foreground hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label={t('checklist.removeAria')}
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex items-center gap-2">
        <input
          value={newItemText}
          onChange={(e) => setNewItemText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
          placeholder={t('checklist.addPlaceholder')}
          className="flex-1 rounded-full border border-border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <button
          onClick={handleAdd}
          disabled={adding || !newItemText.trim()}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-white disabled:opacity-50"
          aria-label={t('checklist.addAria')}
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}
