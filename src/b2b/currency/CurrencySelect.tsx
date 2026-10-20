"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { ChevronDown } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { plural } from "@/b2b/lib/plural";
import { currencyLabel, groupCurrencies, type CurrencyInfo } from "./search";
import { useCurrencies } from "./useCurrencies";

const INPUT = "min-h-[44px] w-full rounded border bg-ops-surface py-2 pl-3 pr-11 text-base text-ops-ink placeholder:text-ops-ink-subtle focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ops-accent disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm";
const OPTION = "flex min-h-[44px] cursor-pointer items-center px-3 py-2 text-base sm:text-sm";

const flatOf = (items: CurrencyInfo[], value: string) => groupCurrencies(items, "").flatMap((g) => g.items).findIndex((c) => c.code === value);

interface Props {
  label: string;
  value: string;
  onChange: (code: string) => void;
  id?: string;
  name?: string;
  disabled?: boolean;
  /** Cannot be changed (for example the company currency once amounts exist): stays focusable so an error can point at it. */
  locked?: boolean;
  required?: boolean;
  error?: string | null;
  hint?: string;
  className?: string;
  labelClassName?: string;
}

/**
 * Searchable currency dropdown (WAI-ARIA 1.2 editable combobox with a list popup). Type a code or a name in the user's language;
 * arrow keys move, Enter picks, Esc closes. Popular currencies first, then A to Z. Picking does NOT save anything by itself: the screen
 * decides (the company profile saves the company currency; every other selector calls `remember()` of useEffectiveCurrency).
 */
export function CurrencySelect({ label, value, onChange, id, name, disabled, locked, required, error, hint, className, labelClassName }: Props) {
  const { t, locale } = useTranslation();
  const { items, status, refetch } = useCurrencies();
  const autoId = useId();
  const base = id ?? `cur-${autoId.replace(/:/g, "")}`;
  const listId = `${base}-list`;
  const statusId = `${base}-status`;
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  // A value the list does not know (an old code, or the list is still loading) is still shown and kept.
  const all = useMemo<CurrencyInfo[]>(() => (value && !items.some((c) => c.code === value) ? [{ code: value, name: "", symbol: value, minorUnits: 2, popular: false }, ...items] : items), [items, value]);
  const groups = useMemo(() => groupCurrencies(all, query), [all, query]);
  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups]);
  const selected = all.find((c) => c.code === value);
  const shown = open ? query : selected ? currencyLabel(selected) : value;
  const hasOptions = flat.length > 0;
  const expanded = open && hasOptions;
  const optionId = (code: string) => `${base}-opt-${code}`;
  const activeCode = expanded ? flat[Math.min(active, flat.length - 1)]?.code : undefined;

  const groupLabel = (id: "popular" | "all" | "results") =>
    id === "popular" ? t("b2b.currency.popular", "Popular") : id === "all" ? t("b2b.currency.all", "All currencies") : t("b2b.currency.results", "Matching currencies");

  const liveText = !open ? "" : status === "loading" ? t("b2b.currency.loading", "Loading currencies…")
    : !hasOptions ? t("b2b.currency.none", "No currency matches “{q}”").replace("{q}", query.trim())
    : plural(t, locale, "b2b.currency.count", { one: "{n} currency available", other: "{n} currencies available" }, flat.length);

  const openList = () => {
    if (disabled || locked || open) return;
    setQuery("");
    setActive(Math.max(0, flatOf(all, value)));
    setOpen(true);
  };
  const close = () => { setOpen(false); setQuery(""); };
  const choose = (code: string) => {
    onChange(code);
    close();
    inputRef.current?.focus();
  };

  useEffect(() => {
    if (!activeCode) return;
    document.getElementById(optionId(activeCode))?.scrollIntoView?.({ block: "nearest" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCode]);

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (!open) { openList(); return; }
        setActive((a) => (flat.length ? (a + 1) % flat.length : 0));
        return;
      case "ArrowUp":
        e.preventDefault();
        if (!open) { openList(); return; }
        setActive((a) => (flat.length ? (a - 1 + flat.length) % flat.length : 0));
        return;
      case "Home": if (open) { e.preventDefault(); setActive(0); } return;
      case "End": if (open) { e.preventDefault(); setActive(Math.max(0, flat.length - 1)); } return;
      case "Enter":
        if (open) { e.preventDefault(); if (activeCode) choose(activeCode); }
        return;
      case "Escape":
        if (open) { e.preventDefault(); e.stopPropagation(); close(); }
        return;
      case "Tab": if (open) close(); return;
    }
  };

  const describedBy = [hint ? `${base}-hint` : null, error ? `${base}-err` : null, status === "error" ? `${base}-load` : null, statusId].filter(Boolean).join(" ");

  return (
    <div className={className}>
      <label htmlFor={base} id={`${base}-label`} className={labelClassName ?? "mb-1 block text-sm font-bold text-ops-ink"}>{label}</label>
      <div className="relative">
        <input
          ref={inputRef} id={base} name={name} type="text" role="combobox" autoComplete="off" autoCapitalize="off" spellCheck={false} enterKeyHint="done"
          aria-expanded={expanded} aria-controls={listId} aria-autocomplete="list" aria-haspopup="listbox"
          aria-activedescendant={activeCode ? optionId(activeCode) : undefined}
          aria-describedby={describedBy || undefined} aria-invalid={error ? true : undefined} aria-required={required || undefined}
          disabled={disabled} readOnly={locked || undefined} aria-disabled={locked || undefined} value={shown} placeholder={open ? t("b2b.currency.placeholder", "Type a code or a name") : undefined}
          onChange={(e) => { if (locked) return; setQuery(e.target.value); setActive(0); if (!open) setOpen(true); }}
          onClick={openList} onKeyDown={onKeyDown} onBlur={close}
          className={cn(INPUT, error ? "border-sig-vermilion-ink" : "border-ops-border-strong", locked && "cursor-not-allowed opacity-60")}
        />
        <button
          type="button" tabIndex={-1} disabled={disabled || locked} aria-label={open ? t("b2b.currency.hide", "Hide currencies") : t("b2b.currency.show", "Show currencies")}
          onMouseDown={(e) => e.preventDefault()} onClick={() => { if (open) close(); else { inputRef.current?.focus(); openList(); } }}
          className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center rounded text-ops-ink-muted disabled:opacity-60"
        >
          <ChevronDown className={cn("h-4 w-4 transition-transform motion-reduce:transition-none", open && "rotate-180")} aria-hidden="true" />
        </button>
        {open && !hasOptions ? (
          <div aria-hidden="true" className="absolute z-20 mt-1 w-full rounded border border-ops-border bg-ops-surface px-3 py-3 text-sm text-ops-ink-muted shadow-lg">{liveText}</div>
        ) : null}
        {expanded ? (
          <div
            role="listbox" id={listId} aria-labelledby={`${base}-label`}
            className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto overscroll-contain rounded border border-ops-border bg-ops-surface shadow-lg"
            onMouseDown={(e) => e.preventDefault()}
          >
            {groups.map((g) => (
              <div key={g.id} role="group" aria-label={groupLabel(g.id)}>
                {g.id !== "results" ? <div aria-hidden="true" className="sticky top-0 bg-ops-canvas px-3 py-1 text-xs font-bold uppercase tracking-wide text-ops-ink-muted">{groupLabel(g.id)}</div> : null}
                {g.items.map((c) => {
                  const isActive = c.code === activeCode;
                  return (
                    <div
                      key={c.code} id={optionId(c.code)} role="option" aria-selected={c.code === value} onClick={() => choose(c.code)} onMouseMove={() => setActive(flat.indexOf(c))}
                      className={cn(OPTION, "text-ops-ink", isActive ? "bg-ops-ink text-white" : "hover:bg-ops-canvas", c.code === value && !isActive && "font-bold")}
                    >
                      <span className="min-w-0 break-words">{currencyLabel(c)}</span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        ) : null}
      </div>
      <div id={statusId} role="status" className="sr-only">{liveText}</div>
      {status === "error" ? (
        <p id={`${base}-load`} role="alert" className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-ops-ink-muted">
          {t("b2b.currency.loadError", "Couldn't load the full currency list. The most common ones are still available.")}
          <button type="button" onClick={refetch} className="inline-flex min-h-[44px] items-center font-bold underline">{t("b2b.common.retry", "Retry")}</button>
        </p>
      ) : null}
      {hint ? <p id={`${base}-hint`} className="mt-1 text-xs text-ops-ink-muted">{hint}</p> : null}
      {error ? <p id={`${base}-err`} role="alert" className="mt-1 text-xs font-bold text-sig-vermilion-ink">{error}</p> : null}
    </div>
  );
}
