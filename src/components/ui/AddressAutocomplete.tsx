"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, Loader2 } from "lucide-react";
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
}: AddressAutocompleteProps) {
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
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative flex gap-2">
      <div className="relative flex-1">
        <input
          type="text"
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
          className="field-shell w-full pr-9"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-brand/60" />
          ) : (
            <MapPin className="h-3.5 w-3.5 text-ink-subtle" />
          )}
        </span>

        {open && suggestions.length > 0 && (
          <ul
            role="listbox"
            className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-2xl border border-outline bg-white shadow-soft"
          >
            {suggestions.map((s, i) => (
              <li
                key={s.display_name + i}
                role="option"
                aria-selected={i === activeIdx}
                onMouseDown={() => handleSelect(s)}
                onMouseEnter={() => setActiveIdx(i)}
                className={`flex cursor-pointer items-start gap-3 px-4 py-3 transition-colors ${
                  i === activeIdx ? "bg-brand-soft" : "hover:bg-brand-soft/50"
                } ${i > 0 ? "border-t border-outline" : ""}`}
              >
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{formatPrimary(s)}</p>
                  <p className="truncate text-xs text-ink-muted">{formatSecondary(s)}</p>
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
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand transition-colors hover:bg-brand-soft/70 disabled:opacity-60"
          title={detectLocationLabel}
        >
          {detectingLocation ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
        </button>
      )}
    </div>
  );
}
