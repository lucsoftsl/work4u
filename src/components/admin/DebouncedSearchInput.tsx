"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";

const DEFAULT_DEBOUNCE_MS = 300;

interface DebouncedSearchInputProps {
    id: string;
    label: string;
    placeholder: string;
    /** The committed value (usually from the URL). */
    value: string;
    /** Called with the trimmed text once typing pauses, so lists don't refetch per keystroke. */
    onCommit: (value: string) => void;
    debounceMs?: number;
    className?: string;
}

export function DebouncedSearchInput({
    id,
    label,
    placeholder,
    value,
    onCommit,
    debounceMs = DEFAULT_DEBOUNCE_MS,
    className = "",
}: DebouncedSearchInputProps) {
    const [draft, setDraft] = useState(value);
    const [syncedValue, setSyncedValue] = useState(value);

    // Follow outside changes (back button, "clear filters") without clobbering
    // what is being typed when our own debounced commit lands.
    if (value !== syncedValue) {
        setSyncedValue(value);
        if (draft.trim() !== value) setDraft(value);
    }

    useEffect(() => {
        if (draft.trim() === value) return;
        const timer = setTimeout(() => onCommit(draft.trim()), debounceMs);
        return () => clearTimeout(timer);
    }, [draft, value, onCommit, debounceMs]);

    return (
        <div className="relative">
            <label htmlFor={id} className="sr-only">
                {label}
            </label>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
            <input
                id={id}
                type="search"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={placeholder}
                className={`${className} pl-9`}
            />
        </div>
    );
}
