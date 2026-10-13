"use client";

import { useId, useRef, type KeyboardEvent } from 'react';
import { Check } from 'lucide-react';
import { LOCALES, useTranslation, type Locale } from '@/lib/i18n';
import { cn } from '@/lib/utils';

/** Per-language text, e.g. { en: 'First job', fr: 'Premier travail', ... }. */
export type LocalizedText = Record<string, string>;

export interface LocalizedFieldDef {
    key: string;
    label: string;
    multiline?: boolean;
}

interface LocalizedFieldTabsProps {
    fields: readonly LocalizedFieldDef[];
    values: Record<string, LocalizedText>;
    onChange: (field: string, locale: Locale, value: string) => void;
    activeLocale: Locale;
    onActiveLocaleChange: (locale: Locale) => void;
}

/** An empty value for every available language. */
export function emptyLocalizedText(): LocalizedText {
    return Object.fromEntries(LOCALES.map((locale) => [locale, '']));
}

/** Fills in any language an older record is missing, so every tab is editable. */
export function withAllLocales(text: LocalizedText | undefined): LocalizedText {
    return { ...emptyLocalizedText(), ...text };
}

export function isLocaleComplete(
    fields: readonly LocalizedFieldDef[],
    values: Record<string, LocalizedText>,
    locale: Locale
): boolean {
    return fields.every((field) => (values[field.key]?.[locale] ?? '').trim() !== '');
}

/** First language with an empty field, or null when everything is filled. */
export function firstIncompleteLocale(
    fields: readonly LocalizedFieldDef[],
    values: Record<string, LocalizedText>
): Locale | null {
    return LOCALES.find((locale) => !isLocaleComplete(fields, values, locale)) ?? null;
}

/** "fr" → "Français": each language named in itself, so admins recognise it regardless of UI language. */
export function nativeLanguageName(locale: Locale): string {
    try {
        const name = new Intl.DisplayNames([locale], { type: 'language' }).of(locale) ?? locale;
        return name.charAt(0).toLocaleUpperCase(locale) + name.slice(1);
    } catch {
        return locale.toUpperCase();
    }
}

const INPUT_CLASS =
    'w-full px-4 py-2 border border-line rounded-lg bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-primary';

/** One tab per available language; each tab edits that language's copy of every localized field. */
export function LocalizedFieldTabs({
    fields,
    values,
    onChange,
    activeLocale,
    onActiveLocaleChange,
}: LocalizedFieldTabsProps) {
    const { t } = useTranslation();
    const baseId = useId();
    const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

    const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
        const delta = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
        if (event.key === 'Home' || event.key === 'End' || delta !== 0) {
            event.preventDefault();
            const next =
                event.key === 'Home'
                    ? 0
                    : event.key === 'End'
                      ? LOCALES.length - 1
                      : (index + delta + LOCALES.length) % LOCALES.length;
            onActiveLocaleChange(LOCALES[next]);
            tabRefs.current[next]?.focus();
        }
    };

    return (
        <div className="rounded-lg border border-line">
            <div role="tablist" className="flex overflow-x-auto border-b border-line">
                {LOCALES.map((locale, index) => {
                    const selected = locale === activeLocale;
                    const complete = isLocaleComplete(fields, values, locale);
                    return (
                        <button
                            key={locale}
                            ref={(el) => {
                                tabRefs.current[index] = el;
                            }}
                            type="button"
                            role="tab"
                            id={`${baseId}-tab-${locale}`}
                            aria-selected={selected}
                            aria-controls={`${baseId}-panel-${locale}`}
                            tabIndex={selected ? 0 : -1}
                            onClick={() => onActiveLocaleChange(locale)}
                            onKeyDown={(event) => handleKeyDown(event, index)}
                            className={cn(
                                'relative flex min-h-[44px] shrink-0 items-center gap-1.5 whitespace-nowrap px-4 text-sm transition-colors',
                                'after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-primary after:transition-transform',
                                selected ? 'font-semibold text-ink after:scale-x-100' : 'text-ink-muted hover:text-ink after:scale-x-0'
                            )}
                        >
                            {nativeLanguageName(locale)}
                            {complete ? (
                                <Check className="h-3.5 w-3.5 text-success" aria-label={t('admin.languageComplete', 'Complete')} />
                            ) : (
                                <span className="h-1.5 w-1.5 rounded-full bg-warning" aria-label={t('admin.languageIncomplete', 'Missing text')} />
                            )}
                        </button>
                    );
                })}
            </div>

            {LOCALES.map((locale) => (
                <div
                    key={locale}
                    role="tabpanel"
                    id={`${baseId}-panel-${locale}`}
                    aria-labelledby={`${baseId}-tab-${locale}`}
                    hidden={locale !== activeLocale}
                    className="space-y-4 p-4"
                >
                    {fields.map((field) => {
                        const inputId = `${baseId}-${field.key}-${locale}`;
                        const props = {
                            id: inputId,
                            lang: locale,
                            value: values[field.key]?.[locale] ?? '',
                            onChange: (event: { target: { value: string } }) =>
                                onChange(field.key, locale, event.target.value),
                            className: INPUT_CLASS,
                        };
                        return (
                            <div key={field.key}>
                                <label htmlFor={inputId} className="mb-2 block text-sm font-medium text-ink">
                                    {field.label} *
                                </label>
                                {field.multiline ? <textarea rows={3} {...props} /> : <input type="text" {...props} />}
                            </div>
                        );
                    })}
                </div>
            ))}
        </div>
    );
}
