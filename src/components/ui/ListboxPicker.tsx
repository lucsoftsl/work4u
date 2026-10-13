"use client";

import React, { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { Check, ChevronDown } from "lucide-react";
import { FieldShell } from "@/components/ui/Field";
import { cn } from "@/lib/utils";

export interface PickerOption {
  value: string;
  label: string;
  description?: string;
  icon?: ReactNode;
}

/** Case-insensitive match on label, description and value. */
export function filterPickerOptions(options: readonly PickerOption[], query: string): PickerOption[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...options];
  return options.filter((o) => `${o.label} ${o.description ?? ""} ${o.value}`.toLowerCase().includes(q));
}

/** Clamped arrow/Home/End movement; -1 means "nothing active yet". */
export function moveActiveIndex(current: number, key: string, length: number): number {
  if (length === 0) return -1;
  switch (key) {
    case "ArrowDown":
      return Math.min(current + 1, length - 1);
    case "ArrowUp":
      return current <= 0 ? 0 : current - 1;
    case "Home":
      return 0;
    case "End":
      return length - 1;
    default:
      return current;
  }
}

interface ListboxPickerProps {
  options: readonly PickerOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  searchPlaceholder: string;
  noResultsLabel: string;
  /** Visible label (wraps the control in FieldShell). Without it, name the control with labelledBy. */
  label?: string;
  hint?: string;
  error?: string | null;
  required?: boolean;
  id?: string;
  labelledBy?: string;
  className?: string;
  /** Content shown in the trigger for the selected option (defaults to icon + label). */
  renderSelected?: (option: PickerOption) => ReactNode;
}

/**
 * Select-only combobox: a button (aria-haspopup="listbox") opens a searchable listbox.
 * Focus lives in the search input; options are exposed via aria-activedescendant.
 * Esc closes and returns focus to the button; Tab or an outside click closes.
 */
export const ListboxPicker = React.forwardRef<HTMLButtonElement, ListboxPickerProps>(function ListboxPicker(
  { options, value, onChange, placeholder, searchPlaceholder, noResultsLabel, label, hint, error, required, id, labelledBy, className, renderSelected },
  forwardedRef
) {
  const autoId = useId();
  const baseId = id ?? autoId;
  const listId = `${baseId}-list`;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => filterPickerOptions(options, query), [options, query]);
  const selected = options.find((o) => o.value === value);

  const setTriggerRef = useCallback(
    (node: HTMLButtonElement | null) => {
      triggerRef.current = node;
      if (typeof forwardedRef === "function") forwardedRef(node);
      else if (forwardedRef) forwardedRef.current = node;
    },
    [forwardedRef]
  );

  const openList = useCallback(() => {
    const selectedIndex = options.findIndex((o) => o.value === value);
    setQuery("");
    setActiveIdx(selectedIndex);
    setOpen(true);
  }, [options, value]);

  const close = useCallback((returnFocus: boolean) => {
    setOpen(false);
    setQuery("");
    if (returnFocus) triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) close(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, close]);

  useEffect(() => {
    if (!open || activeIdx < 0) return;
    document.getElementById(`${baseId}-opt-${activeIdx}`)?.scrollIntoView({ block: "nearest" });
  }, [open, activeIdx, baseId]);

  const choose = (option: PickerOption) => {
    onChange(option.value);
    close(true);
  };

  const onSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    const { key } = event;
    if (key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close(true);
    } else if (key === "ArrowDown" || key === "ArrowUp") {
      event.preventDefault();
      setActiveIdx((i) => moveActiveIndex(i, key, filtered.length));
    } else if ((key === "Home" || key === "End") && query === "") {
      event.preventDefault();
      setActiveIdx((i) => moveActiveIndex(i, key, filtered.length));
    } else if (key === "Enter") {
      event.preventDefault();
      const option = filtered[activeIdx >= 0 ? activeIdx : 0];
      if (option) choose(option);
    } else if (key === "Tab") {
      close(false);
    }
  };

  const onTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) openList();
    } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey && event.key !== " ") {
      // Type-ahead: open and seed the search with the typed character.
      event.preventDefault();
      setActiveIdx(0);
      setQuery(event.key);
      setOpen(true);
    }
  };

  const describedBy = error ? `${baseId}-error` : hint ? `${baseId}-hint` : undefined;

  const control = (
    <div ref={rootRef} className={cn("relative w-full", className)}>
      <button
        ref={setTriggerRef}
        id={baseId}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        onClick={() => (open ? close(false) : openList())}
        onKeyDown={onTriggerKeyDown}
        className={cn(
          "flex min-h-[48px] w-full items-center justify-between gap-2 rounded-control border bg-surface px-3 py-2.5 text-left text-body text-ink transition-colors duration-fast",
          "hover:border-ink-muted focus-visible:border-primary focus-visible:outline-none focus-visible:shadow-focus",
          error ? "border-danger" : "border-line-strong"
        )}
      >
        <span className={cn("flex min-w-0 items-center gap-2", !selected && "text-ink-subtle")}>
          {selected ? (renderSelected ? renderSelected(selected) : (
            <>
              {selected.icon}
              <span className="truncate">{selected.label}</span>
            </>
          )) : (
            <span className="truncate">{placeholder}</span>
          )}
        </span>
        <ChevronDown aria-hidden="true" className={cn("h-[18px] w-[18px] shrink-0 text-ink-muted transition-transform duration-fast motion-reduce:transition-none", open && "rotate-180")} />
      </button>

      {open ? (
        <div className="absolute left-0 right-0 top-full z-50 mt-1.5 min-w-[12rem] overflow-hidden rounded-card border border-line-strong bg-surface shadow-raised">
          <div className="border-b border-line p-2">
            <input
              ref={searchRef}
              type="text"
              role="combobox"
              aria-expanded="true"
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={activeIdx >= 0 && filtered[activeIdx] ? `${baseId}-opt-${activeIdx}` : undefined}
              aria-label={searchPlaceholder}
              placeholder={searchPlaceholder}
              value={query}
              autoComplete="off"
              onChange={(e) => {
                setQuery(e.target.value);
                setActiveIdx(0);
              }}
              onKeyDown={onSearchKeyDown}
              className="min-h-[44px] w-full rounded-control border border-line-strong bg-surface px-3 text-body text-ink placeholder:text-ink-subtle focus:border-primary focus:outline-none focus:shadow-focus"
            />
          </div>
          <ul id={listId} role="listbox" aria-label={label ?? placeholder} className="max-h-64 overflow-y-auto overscroll-contain">
            {filtered.length === 0 ? (
              <li role="presentation" className="px-4 py-3 text-center text-label font-normal text-ink-muted">
                {noResultsLabel}
              </li>
            ) : (
              filtered.map((option, index) => {
                const isSelected = option.value === value;
                return (
                  <li
                    key={option.value}
                    id={`${baseId}-opt-${index}`}
                    role="option"
                    aria-selected={isSelected}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => choose(option)}
                    onMouseMove={() => setActiveIdx(index)}
                    className={cn(
                      "flex min-h-[44px] cursor-pointer items-center gap-3 px-3 py-2 text-body text-ink",
                      index === activeIdx && "bg-primary-soft",
                      isSelected && "font-bold"
                    )}
                  >
                    {option.icon}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{option.label}</span>
                      {option.description ? <span className="block truncate text-caption font-normal text-ink-muted">{option.description}</span> : null}
                    </span>
                    {isSelected ? <Check aria-hidden="true" className="h-4 w-4 shrink-0 text-primary" /> : null}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );

  if (!label) return control;
  return (
    <FieldShell id={baseId} label={label} hint={hint} error={error} required={required}>
      {control}
    </FieldShell>
  );
});
