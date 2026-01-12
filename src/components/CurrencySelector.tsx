/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import currenciesData from "@/data/currencies.json";

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

const CURRENCIES: Currency[] = currenciesData; export function CurrencySelector({ value, onChange }: CurrencySelectorProps) {
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-between bg-white hover:bg-gray-50 transition-colors min-w-40"
            >
                <span className="text-gray-900 font-medium flex items-center gap-2">
                    {selectedCurrency && (
                        <img
                            src={selectedCurrency.flag}
                            alt={selectedCurrency.code}
                            className="w-5 h-4 rounded-sm object-cover"
                        />
                    )}
                    {selectedCurrency ? selectedCurrency.code : "Select currency"}
                </span>
                <ChevronDown
                    size={18}
                    className={`text-gray-500 transition-transform ${isOpen ? "rotate-180" : ""
                        }`}
                />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-300 rounded-lg shadow-lg z-50 min-w-40">
                    <div className="p-3 border-b border-gray-200">
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder="Search currency..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                        {filteredCurrencies.length > 0 ? (
                            filteredCurrencies.map((currency) => (
                                <button
                                    key={currency.code}
                                    type="button"
                                    onClick={() => handleSelect(currency.code)}
                                    className={`w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors flex justify-between items-center ${value === currency.code ? "bg-blue-100" : ""
                                        }`}
                                >
                                    <div className="flex items-center gap-3 flex-1">
                                        <img
                                            src={currency.flag}
                                            alt={currency.code}
                                            className="w-6 h-4 rounded-sm object-cover"
                                        />
                                        <div>
                                            <p className="font-medium text-gray-900">{currency.code}</p>
                                            <p className="text-sm text-gray-500">{currency.name}</p>
                                        </div>
                                    </div>
                                </button>
                            ))
                        ) : (
                            <div className="px-4 py-3 text-center text-gray-500 text-sm">
                                No currencies found
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
