/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Coins } from "lucide-react";
import currenciesData from "@/data/currencies.json";
import { useTranslation } from "@/lib/i18n";

interface CurrencySelectorProps {
    value: string;
    onChange: (currency: string) => void;
}

interface Currency {
    code: string;
    name: string;
    country: string;
    countryCode: string;
    flag?: string;
}

const CURRENCIES: Currency[] = currenciesData;

export function CurrencySelector({ value, onChange }: CurrencySelectorProps) {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const dropdownRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const filteredCurrencies = CURRENCIES.filter(
        (currency) =>
            currency.code.toLowerCase().includes(search.toLowerCase()) ||
            currency.name.toLowerCase().includes(search.toLowerCase())
    );

    const selectedCurrency = CURRENCIES.find((c) => c.code === value);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelect = (code: string) => {
        onChange(code);
        setIsOpen(false);
        setSearch("");
    };

    return (
        <div className="relative w-full" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => {
                    setIsOpen(!isOpen);
                    if (!isOpen) {
                        setTimeout(() => inputRef.current?.focus(), 0);
                    }
                }}
                className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary flex items-center justify-between bg-card hover:bg-muted transition-colors min-w-40"
            >
                <span className="text-foreground font-medium flex items-center gap-2">
                    {selectedCurrency && (
                        selectedCurrency.flag ? (
                            <img
                                src={selectedCurrency.flag}
                                alt={selectedCurrency.code}
                                className="w-5 h-4 rounded-sm object-cover"
                            />
                        ) : (
                            <Coins size={16} className="text-muted-foreground" />
                        )
                    )}
                    {selectedCurrency ? selectedCurrency.code : t('currencySelector.placeholder')}
                </span>
                <ChevronDown
                    size={18}
                    className={`text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""
                        }`}
                />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-background border border-border rounded-lg shadow-lg z-50 min-w-40">
                    <div className="p-3 border-b border-border">
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder={t('currencySelector.searchPlaceholder')}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-card text-foreground placeholder:text-muted-foreground text-sm"
                        />
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                        {filteredCurrencies.length > 0 ? (
                            filteredCurrencies.map((currency) => (
                                <button
                                    key={currency.code}
                                    type="button"
                                    onClick={() => handleSelect(currency.code)}
                                    className={`w-full text-left px-4 py-3 hover:bg-primary/10 transition-colors flex justify-between items-center ${value === currency.code ? "bg-primary/20" : ""
                                        }`}
                                >
                                    <div className="flex items-center gap-3 flex-1">
                                        {currency.flag ? (
                                            <img
                                                src={currency.flag}
                                                alt={currency.code}
                                                className="w-6 h-4 rounded-sm object-cover"
                                            />
                                        ) : (
                                            <span className="flex h-4 w-6 shrink-0 items-center justify-center rounded-sm bg-muted">
                                                <Coins size={12} className="text-muted-foreground" />
                                            </span>
                                        )}
                                        <div>
                                            <p className="font-medium text-foreground">{currency.code}</p>
                                            <p className="text-sm text-muted-foreground">{currency.name}</p>
                                        </div>
                                    </div>
                                </button>
                            ))
                        ) : (
                            <div className="px-4 py-3 text-center text-muted-foreground text-sm">
                                {t('currencySelector.noResults')}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
