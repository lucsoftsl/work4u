"use client";

import { useId, useState } from "react";
import { X } from "lucide-react";
import { useTr } from "@/b2b/setup/i18n";
import { inputCls } from "@/b2b/components/catalog/ui";
import { MAX_TAGS, MAX_TAG_LENGTH, addTag, removeTag, type TagError } from "./tags";

interface Props { tags: string[]; onChange: (tags: string[]) => void; disabled?: boolean }

/** Enter (or comma) adds a chip; invalid tags show an inline error and are not added. */
export function TagsInput({ tags, onChange, disabled }: Props) {
  const { tr, trn } = useTr();
  const id = useId();
  const [text, setText] = useState("");
  const [error, setError] = useState<TagError | null>(null);

  const messages: Record<TagError, string> = {
    tooLong: trn("b2b.clients.tags.err.tooLong", { one: "A tag can have up to {n} character.", other: "A tag can have up to {n} characters." }, MAX_TAG_LENGTH),
    leadingChar: tr("b2b.clients.tags.err.leading", "A tag can't start with = + - or @."),
    tooMany: trn("b2b.clients.tags.err.tooMany", { one: "You can add up to {n} tag.", other: "You can add up to {n} tags." }, MAX_TAGS),
    duplicate: tr("b2b.clients.tags.err.duplicate", "This tag is already added."),
  };

  const commit = () => {
    const res = addTag(tags, text);
    setError(res.error);
    if (!res.error) { onChange(res.tags); setText(""); }
  };

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-bold text-ops-ink">{tr("b2b.clients.tags", "Tags")}</label>
      {tags.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {tags.map((t) => (
            <li key={t} className="inline-flex items-center gap-1 rounded-full border border-ops-border-strong bg-ops-surface pl-3 text-sm font-bold text-ops-ink">
              {t}
              <button type="button" disabled={disabled} onClick={() => onChange(removeTag(tags, t))} aria-label={tr("b2b.clients.tags.remove", "Remove tag {tag}", { tag: t })}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full hover:bg-ops-canvas focus-visible:outline focus-visible:outline-2">
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <input
        id={id} value={text} disabled={disabled} maxLength={MAX_TAG_LENGTH + 20} autoComplete="off"
        aria-invalid={!!error} aria-describedby={`${id}-msg`} className={inputCls}
        onChange={(e) => { setText(e.target.value); if (error) setError(null); }}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); commit(); } }}
        onBlur={() => { if (text.trim()) commit(); }}
      />
      <p id={`${id}-msg`} className={error ? "text-xs font-bold text-sig-vermilion-ink" : "text-xs text-ops-ink-muted"}>
        {error ? messages[error] : tr("b2b.clients.tags.hint", "Press Enter to add a tag.")}
      </p>
    </div>
  );
}
