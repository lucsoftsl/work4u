"use client";

import { useEffect, useId, useRef, useState } from "react";
import { MapPin, Loader2 } from "lucide-react";
import { FieldShell } from "@/components/ui/Field";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { AddressComponents } from "@/lib/geocode";

interface Suggestion {
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    road?: string;
    house_number?: string;
    town?: string;
    city?: string;
    village?: string;
    municipality?: string;
    postcode?: string;
    state?: string;
    county?: string;
  };
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (result: { address: string; lat: number; lng: number; components: AddressComponents }) => void;
  placeholder?: string;
  detectLocationLabel?: string;
  onDetectLocation?: () => void;
  detectingLocation?: boolean;
  /** Visible label above the input. Omit when the page attaches its own label (id + aria-labelledby). */
  label?: string;
  /** Input id (defaults to a generated one). */
  id?: string;
  hint?: string;
  error?: string | null;
  required?: boolean;
}

function formatPrimary(s: Suggestion): string {
  const a = s.address;
  if (!a) return s.display_name.split(",")[0];
  const street = [a.road, a.house_number].filter(Boolean).join(" ");
  return street || s.display_name.split(",")[0];
}

function formatSecondary(s: Suggestion): string {
  const a = s.address;
  if (!a) return s.display_name.split(",").slice(1, 3).join(",").trim();
  return [a.town ?? a.city ?? a.village ?? a.municipality, a.postcode, a.state].filter(Boolean).join(", ");
}

export function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder,
  detectLocationLabel,
  onDetectLocation,
  detectingLocation,
  label,
  id,
  hint,
  error,
  required,
}: AddressAutocompleteProps) {
  const { t } = useTranslation();
  const autoId = useId();
  const inputId = id ?? autoId;
  const listId = `${inputId}-suggestions`;
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // True only when value changed because the user typed — not from map/external updates.
  const userTypedRef = useRef(false);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!userTypedRef.current) {
      // Value was set externally (map click/drag or GPS) — close dropdown, don't search.
      setSuggestions([]);
      setOpen(false);
      return;
    }
    userTypedRef.current = false;

    if (!value.trim() || value.trim().length < 3) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const url =
          `https://nominatim.openstreetmap.org/search` +
          `?q=${encodeURIComponent(value)}&format=json&limit=5&addressdetails=1`;
        const res = await fetch(url, {
          headers: { "User-Agent": "Work4U/1.0" },
        });
        if (res.ok) {
          const data: Suggestion[] = await res.json();
          setSuggestions(data);
          setOpen(data.length > 0);
          setActiveIdx(-1);
        }
      } catch {
        // network error — just close
      } finally {
        setLoading(false);
      }
    }, 650);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value]);

  function handleSelect(s: Suggestion) {
    const a = s.address;
    const street = [a?.road, a?.house_number].filter(Boolean).join(" ");
    const resolvedCity = a?.town ?? a?.city ?? a?.village ?? a?.municipality;
    const postcode = a?.postcode ?? "";
    const readable = [street || s.display_name.split(",")[0], resolvedCity, postcode].filter(Boolean).join(", ");
    const components: AddressComponents = {
      road: a?.road,
      house_number: a?.house_number,
      city: resolvedCity,
      state: a?.state ?? a?.county,
      postcode: a?.postcode,
    };
    // Only call onSelect — it carries the address string too. Calling onChange here
    // would spread the stale value in LocationPicker and reset the coordinates.
    onSelect({ address: readable, lat: parseFloat(s.lat), lng: parseFloat(s.lon), components });
    setSuggestions([]);
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape" && open) {
      e.preventDefault();
      setOpen(false);
      return;
    }
    if (e.key === "ArrowDown" && !open && suggestions.length > 0) {
      e.preventDefault();
      setOpen(true);
      return;
    }
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && activeIdx >= 0) {
      e.preventDefault();
      handleSelect(suggestions[activeIdx]);
    } else if (e.key === "Home" || e.key === "End") {
      return;
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  }

  const expanded = open && suggestions.length > 0;
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;

  const row = (
    <div ref={containerRef} className="relative flex gap-2">
      <div className="relative min-w-0 flex-1">
        <input
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={expanded}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={expanded && activeIdx >= 0 ? `${inputId}-opt-${activeIdx}` : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          value={value}
          onChange={(e) => {
            userTypedRef.current = true;
            onChange(e.target.value);
          }}
          onFocus={() => {
            if (suggestions.length > 0) setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          className={cn(
            "min-h-[48px] w-full rounded-control border bg-surface py-2.5 pl-3 pr-10 text-body text-ink placeholder:text-ink-subtle transition-colors duration-fast",
            "hover:border-ink-muted focus:border-primary focus:outline-none focus:shadow-focus",
            error ? "border-danger" : "border-line-strong"
          )}
        />
        <span aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary motion-reduce:animate-none" />
          ) : (
            <MapPin className="h-4 w-4 text-ink-subtle" />
          )}
        </span>

        {expanded && (
          <ul
            id={listId}
            role="listbox"
            aria-label={label ?? placeholder}
            className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-card border border-line-strong bg-surface shadow-raised"
          >
            {suggestions.map((s, i) => (
              <li
                key={s.display_name + i}
                id={`${inputId}-opt-${i}`}
                role="option"
                aria-selected={i === activeIdx}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(s)}
                onMouseMove={() => setActiveIdx(i)}
                className={cn(
                  "flex min-h-[44px] cursor-pointer items-start gap-3 px-3 py-2.5",
                  i === activeIdx && "bg-primary-soft",
                  i > 0 && "border-t border-line"
                )}
              >
                <MapPin aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div className="min-w-0">
                  <p className="truncate text-label text-ink">{formatPrimary(s)}</p>
                  <p className="truncate text-caption text-ink-muted">{formatSecondary(s)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {onDetectLocation && (
        <button
          type="button"
          onClick={onDetectLocation}
          disabled={detectingLocation}
          aria-label={detectLocationLabel ?? t("auth.signUp.detectLocation")}
          title={detectLocationLabel}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-control border border-line-strong bg-primary-soft text-primary transition-colors duration-fast hover:bg-primary-soft/70 focus-visible:shadow-focus disabled:cursor-not-allowed disabled:opacity-45"
        >
          {detectingLocation ? <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <MapPin className="h-5 w-5" aria-hidden="true" />}
        </button>
      )}
    </div>
  );

  if (!label) return row;
  return (
    <FieldShell id={inputId} label={label} hint={hint} error={error} required={required}>
      {row}
    </FieldShell>
  );
}
