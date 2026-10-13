"use client";

import React, { useMemo } from "react";
import { ListboxPicker, type PickerOption } from "@/components/ui/ListboxPicker";
import { useTranslation } from "@/lib/i18n";

export interface CategoryOption {
    id: string;
    name: string;
    icon?: string;
}

interface CategorySelectorProps {
    value: string;
    onChange: (categoryId: string) => void;
    categories: CategoryOption[];
    placeholder?: string;
    /** Visible field label; also pass id/error for validation. */
    label?: string;
    id?: string;
    hint?: string;
    error?: string | null;
    required?: boolean;
}

/** Accessible category listbox (see ListboxPicker). The ref reaches the trigger button. */
export const CategorySelector = React.forwardRef<HTMLButtonElement, CategorySelectorProps>(function CategorySelector(
    { value, onChange, categories, placeholder, label, id, hint, error, required },
    ref
) {
    const { t } = useTranslation();
    const options = useMemo<PickerOption[]>(
        () =>
            categories.map((c) => ({
                value: c.id,
                label: c.name,
                icon: c.icon ? <span aria-hidden="true" className="text-body leading-none">{c.icon}</span> : undefined,
            })),
        [categories]
    );

    return (
        <ListboxPicker
            ref={ref}
            id={id}
            label={label}
            hint={hint}
            error={error}
            required={required}
            options={options}
            value={value}
            onChange={onChange}
            placeholder={placeholder ?? t("categorySelector.placeholder")}
            searchPlaceholder={t("categorySelector.searchPlaceholder")}
            noResultsLabel={t("categorySelector.noResults")}
        />
    );
});
