/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useMemo } from "react";
import { Coins } from "lucide-react";
import currenciesData from "@/data/currencies.json";
import { ListboxPicker, type PickerOption } from "@/components/ui/ListboxPicker";
import { useTranslation } from "@/lib/i18n";

interface CurrencySelectorProps {
    value: string;
    onChange: (currency: string) => void;
    /** Visible field label; also pass id/error for validation. */
    label?: string;
    id?: string;
    hint?: string;
    error?: string | null;
    /** Id of an external label element (when `label` is not used). */
    labelledBy?: string;
}

interface Currency {
    code: string;
    name: string;
    country: string;
    countryCode: string;
    flag?: string;
}

const CURRENCIES: Currency[] = currenciesData;

function Flag({ currency }: { currency: Currency }) {
    return currency.flag ? (
        <img src={currency.flag} alt="" width={24} height={16} className="h-4 w-6 shrink-0 rounded-control object-cover" />
    ) : (
        <span aria-hidden="true" className="flex h-4 w-6 shrink-0 items-center justify-center rounded-control bg-sunken">
            <Coins size={12} className="text-ink-muted" />
        </span>
    );
}

/** Accessible, searchable currency listbox (see ListboxPicker). The ref reaches the trigger button. */
export const CurrencySelector = React.forwardRef<HTMLButtonElement, CurrencySelectorProps>(function CurrencySelector(
    { value, onChange, label, id, hint, error, labelledBy },
    ref
) {
    const { t } = useTranslation();
    const options = useMemo<PickerOption[]>(
        () => CURRENCIES.map((c) => ({ value: c.code, label: c.code, description: c.name, icon: <Flag currency={c} /> })),
        []
    );

    return (
        <ListboxPicker
            ref={ref}
            id={id}
            label={label}
            hint={hint}
            error={error}
            labelledBy={labelledBy}
            options={options}
            value={value}
            onChange={onChange}
            placeholder={t("currencySelector.placeholder")}
            searchPlaceholder={t("currencySelector.searchPlaceholder")}
            noResultsLabel={t("currencySelector.noResults")}
            className="min-w-40"
        />
    );
});
