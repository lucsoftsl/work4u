"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { getCategoriesWithTranslations } from "@/lib/category-utils";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Field";

const CATEGORIES_COLLAPSED = 6;

interface FilterPanelProps {
  categories: string[];
  availableOnly: boolean;
  onToggleCategory: (id: string) => void;
  onAvailableOnly: (value: boolean) => void;
}

export function WorkerFilterPanel({ categories, availableOnly, onToggleCategory, onAvailableOnly }: FilterPanelProps) {
  const { t } = useTranslation();
  const [showAll, setShowAll] = useState(false);
  const all = getCategoriesWithTranslations(t);
  // Selected categories always stay visible, even when the list is collapsed.
  const shown = showAll ? all : all.filter((c, i) => i < CATEGORIES_COLLAPSED || categories.includes(c.id));

  return (
    <div className="space-y-6">
      <fieldset>
        <legend className="mb-2 text-micro uppercase text-ink-muted">{t("jobs.category")}</legend>
        <div className="space-y-0.5">
          {shown.map((cat) => (
            <Checkbox key={cat.id} label={cat.name} checked={categories.includes(cat.id)} onChange={() => onToggleCategory(cat.id)} />
          ))}
        </div>
        {all.length > CATEGORIES_COLLAPSED ? (
          <Button variant="ghost" size="sm" className="-ml-3 mt-1" aria-expanded={showAll} onClick={() => setShowAll((v) => !v)}>
            {showAll ? t("common.showLess") : t("common.showMore")}
          </Button>
        ) : null}
      </fieldset>

      <fieldset className="border-t border-line pt-3">
        <legend className="sr-only">{t("workers.availability")}</legend>
        <Checkbox label={t("workers.availableOnly")} checked={availableOnly} onChange={(e) => onAvailableOnly(e.target.checked)} />
      </fieldset>
    </div>
  );
}

interface FiltersSheetProps {
  open: boolean;
  onClose: () => void;
  resultCount: number;
  children: ReactNode;
}

export function WorkerFiltersSheet({ open, onClose, resultCount, children }: FiltersSheetProps) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="worker-filters-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="mx-auto mb-0 mt-auto max-h-[85dvh] w-full max-w-2xl rounded-t-sheet bg-surface p-0 text-ink shadow-raised backdrop:bg-ink/40 motion-safe:animate-sheet-up"
    >
      <div className="flex max-h-[85dvh] flex-col">
        <div className="flex items-center justify-between border-b border-line px-4 py-2">
          <h2 id="worker-filters-title" className="font-display text-h3 text-ink">
            {t("jobs.filters")}
          </h2>
          <Button variant="ghost" size="icon" aria-label={t("common.close")} onClick={onClose}>
            <X className="h-5 w-5" aria-hidden="true" />
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{children}</div>
        <div className="border-t border-line p-4">
          <Button size="lg" className="w-full" onClick={onClose}>
            {t("workers.showResults").replace("{count}", String(resultCount))}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
